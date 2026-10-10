package com.safehaven.rescuemesh

import android.content.Context
import android.util.Log
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.safehaven.rescuemesh.db.RescueMeshDatabase
import com.safehaven.rescuemesh.db.SOSMessageEntity
import kotlinx.coroutines.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

var onBeaconsChanged: (() -> Unit)? = null
var onGroupChanged: (() -> Unit)? = null
var onPeersChanged: ((Int) -> Unit)? = null
var onMessageReceived: ((RelayMessage) -> Unit)? = null

private var beaconJob: Job? = null
private var myBeaconId: String? = null

class RescueMeshManager(
    private val context: Context,
    private val deviceName: String,
    private val database: RescueMeshDatabase
) {

    companion object {
        private const val TAG = "RescueMesh"
        private const val SERVICE_ID = "com.safehaven.mesh"
        private const val BEACON_TTL_MS = 30 * 60 * 1000L
    }

    private val connectionsClient = Nearby.getConnectionsClient(context)
    private val gson = Gson()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Thread-safe: Nearby callbacks and IO coroutines both touch these.
    private val connectedEndpoints: MutableSet<String> = ConcurrentHashMap.newKeySet()
    private val pendingEndpoints: MutableSet<String> = ConcurrentHashMap.newKeySet()
    private val processedMessages: MutableSet<String> = ConcurrentHashMap.newKeySet()
    
    private val processedSOS: MutableSet<String> = ConcurrentHashMap.newKeySet()

    /** Set from UI/ViewModel to be notified of SOS messages from other devices. */
    var onSOSReceived: ((SOSMessage) -> Unit)? = null

    // ---------------------------------------------------------------- Setup

    fun startAdvertising() {
        val options = AdvertisingOptions.Builder()
            .setStrategy(Strategy.P2P_CLUSTER) // mesh needs CLUSTER, not STAR
            .build()

        connectionsClient.startAdvertising(
            deviceName, SERVICE_ID, connectionLifecycleCallback, options
        )
            .addOnSuccessListener { Log.d(TAG, "Advertising Started") }
            .addOnFailureListener { Log.e(TAG, "Advertising Failed", it) }
    }

    fun startDiscovery() {
        val options = DiscoveryOptions.Builder()
            .setStrategy(Strategy.P2P_CLUSTER)
            .build()

        connectionsClient.startDiscovery(SERVICE_ID, endpointDiscoveryCallback, options)
            .addOnSuccessListener { Log.d(TAG, "Discovery Started") }
            .addOnFailureListener { Log.e(TAG, "Discovery Failed", it) }
    }

    fun stopAllConnections() {
        beaconJob?.cancel()
        connectionsClient.stopAdvertising()
        connectionsClient.stopDiscovery()
        connectionsClient.stopAllEndpoints()
        connectedEndpoints.clear()
        pendingEndpoints.clear()
        scope.coroutineContext.cancelChildren()
    }
    // -------------------------------------------------------------- Sending

    /** Sends to every connected endpoint except [exclude]. */
    private fun broadcast(json: String, exclude: String? = null) {
        val targets = connectedEndpoints.filter { it != exclude }
        if (targets.isEmpty()) return
        connectionsClient.sendPayload(
            targets,
            Payload.fromBytes(json.toByteArray(Charsets.UTF_8))
        )
    }

    fun sendMessage(message: String) = broadcast(message)

    fun sendRelayMessage(relayMessage: RelayMessage) {
        processedMessages.add(relayMessage.messageId)
        broadcast(gson.toJson(relayMessage))
        Log.d(TAG, "Relay Message Sent")
    }

    fun createSOS(emergencyText: String) {
        val sos = SOSMessage(
            id = UUID.randomUUID().toString(),
            senderId = deviceName,
            emergencyText = emergencyText,
            timestamp = System.currentTimeMillis(),
            status = "QUEUED"
        )
        processedSOS.add(sos.id)

        if (connectedEndpoints.isEmpty()) {
            scope.launch {
                database.sosDao().insertSOS(
                    SOSMessageEntity(
                        id = sos.id,
                        senderId = sos.senderId,
                        emergencyText = sos.emergencyText,
                        timestamp = sos.timestamp,
                        status = sos.status
                    )
                )
                Log.d(TAG, "SOS Saved To Room DB")
            }
            return
        }

        forwardSOS(sos)
    }

    private fun forwardSOS(sos: SOSMessage, exclude: String? = null) {
        broadcast(gson.toJson(sos), exclude)
        sos.status = "FORWARDED"
        Log.d(TAG, "SOS Forwarded")
    }

    private fun sendQueuedSOS() {
        scope.launch {
            val queued = database.sosDao().getAllSOS()
            queued.forEach {
                val sos = SOSMessage(
                    id = it.id,
                    senderId = it.senderId,
                    emergencyText = it.emergencyText,
                    timestamp = it.timestamp,
                    status = it.status
                )
                forwardSOS(sos)
                database.sosDao().deleteSOS(it)
            }
        }
    }

    fun sendGroupStatus(status: String) {
        val groupStatus = GroupStatus(
            userId = deviceName,
            status = status,
            timestamp = System.currentTimeMillis()
        )
        broadcast(gson.toJson(groupStatus))
    }
    // ADJUST the constructor arguments to match YOUR RelayMessage.kt
    fun sendText(receiverId: String, text: String, ttl: Int = 5) {
        sendRelayMessage(
            RelayMessage(
                messageId = UUID.randomUUID().toString(),
                senderId = deviceName,
                receiverId = receiverId,
                text = text,
                timestamp = System.currentTimeMillis(),
                ttl = ttl
            )
        )
    }

    fun getGroupStatuses(): List<GroupStatus> = GroupStore.getStatuses()

    fun sendGroupStatus(status: String) {
        val gs = GroupStatus(deviceName, status, System.currentTimeMillis())
        GroupStore.updateStatus(gs)          // show my own status locally too
        onGroupChanged?.invoke()
        broadcast(gson.toJson(gs))
    }

    // -------------------------------------------------------------- Beacons

    // Owner keeps the beacon alive: re-publishes every 60 s with a fresh timestamp
// (same beaconId, newer timestamp => receivers accept it and relay it again).
    fun activateBeacon(
        latitude: Double, longitude: Double, capacity: Int, message: String,
        shelter: Boolean, food: Boolean, medical: Boolean
    ) {
        val id = myBeaconId ?: UUID.randomUUID().toString().also { myBeaconId = it }
        beaconJob?.cancel()
        beaconJob = scope.launch {
            val stopAt = System.currentTimeMillis() + BeaconStore.EXPIRY_MS
            while (isActive && System.currentTimeMillis() < stopAt) {
                publishBeacon(
                    Beacon(
                        beaconId = id, ownerId = deviceName,
                        latitude = latitude, longitude = longitude,
                        timestamp = System.currentTimeMillis(),
                        capacity = capacity, message = BeaconSafety.sanitize(message),
                        isVerified = false, shelter = shelter, food = food, medical = medical
                    )
                )
                delay(60_000)
            }
        }
    }
    
    fun deactivateBeacon() {
        beaconJob?.cancel()
        val id = myBeaconId ?: return
        // tombstone: tells every phone to drop it
        publishBeacon(
            Beacon(
                beaconId = id, ownerId = deviceName, latitude = 0.0, longitude = 0.0,
                timestamp = System.currentTimeMillis(), deactivated = true
            )
        )
        myBeaconId = null
    }
    
    private fun publishBeacon(beacon: Beacon) {
        BeaconStore.addBeacon(beacon)
        onBeaconsChanged?.invoke()
        broadcast(gson.toJson(beacon))
    }
    
    private fun handleBeacon(beacon: Beacon, from: String) {
        if (System.currentTimeMillis() - beacon.timestamp > BeaconStore.EXPIRY_MS) return
        if (!BeaconStore.addBeacon(beacon)) return          // already have it -> stop the loop
        onBeaconsChanged?.invoke()
        broadcast(gson.toJson(beacon), from)                // relay to everyone except the sender
    }

    fun getNearbyBeacons(): List<Beacon> = BeaconStore.getAllBeacons()

    // ---------------------------------------------------------- Relay / SOS

    private fun handleRelayMessage(msg: RelayMessage, fromEndpoint: String) {
        if (!processedMessages.add(msg.messageId)) return   // already seen
    
        val forMe = msg.receiverId == deviceName
        val broadcast = msg.receiverId == "*"
    
        if (forMe || broadcast) {
            onMessageReceived?.invoke(msg)   // NEW: pushes it to React via the plugin
            Log.d(TAG, "Relay Delivered")
            if (forMe) return                // addressed to me: stop here
            // "*" is a broadcast, so fall through and keep relaying it
        }
    
        if (msg.ttl <= 0) {
            Log.d(TAG, "TTL Expired")
            return
        }
    
        broadcast(gson.toJson(msg.copy(ttl = msg.ttl - 1)), fromEndpoint)
    }

    private fun handleSOS(sos: SOSMessage, fromEndpoint: String) {
        if (!processedSOS.add(sos.id)) return // already seen

        Log.d(TAG, "SOS Received: ${sos.emergencyText}")
        onSOSReceived?.invoke(sos)
        forwardSOS(sos, fromEndpoint) // keep it moving through the mesh
    }

    // ------------------------------------------------------------ Callbacks

    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {

        override fun onEndpointFound(
            endpointId: String,
            info: DiscoveredEndpointInfo
        ) {
            Log.d(TAG, "Found Device: $endpointId")

            if (endpointId in connectedEndpoints || endpointId in pendingEndpoints) return

            // Both devices advertise AND discover. Only the one with the smaller
            // name initiates, otherwise both request at once and collide.
            if (deviceName >= info.endpointName) return

            pendingEndpoints.add(endpointId)
            connectionsClient.requestConnection(
                deviceName, endpointId, connectionLifecycleCallback
            ).addOnFailureListener {
                pendingEndpoints.remove(endpointId)
                Log.e(TAG, "Request Connection Failed", it)
            }
        }

        override fun onEndpointLost(endpointId: String) {
            pendingEndpoints.remove(endpointId)
            Log.d(TAG, "Lost Device: $endpointId")
        }
    }
    private fun syncStateTo(endpointId: String) {
        val now = System.currentTimeMillis()
    
        // 1. Every beacon that hasn't expired
        BeaconStore.getAllBeacons()
            .filter { now - it.timestamp <= BeaconStore.EXPIRY_MS }
            .forEach { sendTo(endpointId, gson.toJson(it)) }
    
        // 2. Every known group status
        GroupStore.getStatuses()
            .forEach { sendTo(endpointId, gson.toJson(it)) }
    }
    
    private fun sendTo(endpointId: String, json: String) {
        connectionsClient.sendPayload(
            endpointId,
            Payload.fromBytes(json.toByteArray(Charsets.UTF_8))
        )
    }
    
    private fun syncStateTo(endpointId: String) {
        val now = System.currentTimeMillis()
        BeaconStore.getAllBeacons()
            .filter { now - it.timestamp <= BeaconStore.EXPIRY_MS }
            .forEach { sendTo(endpointId, gson.toJson(it)) }
        GroupStore.getStatuses().forEach { sendTo(endpointId, gson.toJson(it)) }
    }
    
    private fun sendTo(endpointId: String, json: String) {
        connectionsClient.sendPayload(endpointId, Payload.fromBytes(json.toByteArray(Charsets.UTF_8)))
    }
    private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
    
        override fun onConnectionInitiated(
            endpointId: String,
            connectionInfo: ConnectionInfo
        ) {
            Log.d(TAG, "Connection Initiated")
            connectionsClient.acceptConnection(endpointId, payloadCallback)
        }
    
        override fun onConnectionResult(
            endpointId: String,
            resolution: ConnectionResolution
        ) {
            pendingEndpoints.remove(endpointId)
    
            if (resolution.status.statusCode == ConnectionsStatusCodes.STATUS_OK) {
                connectedEndpoints.add(endpointId)
                syncStateTo(endpointId)                          // NEW: send beacons + statuses
                sendQueuedSOS()
                onPeersChanged?.invoke(connectedEndpoints.size)  // NEW: tell the UI
                Log.d(TAG, "Connected: $endpointId")
            } else {
                Log.d(TAG, "Connection Failed")
            }
        }
    
        override fun onDisconnected(endpointId: String) {
            connectedEndpoints.remove(endpointId)
            pendingEndpoints.remove(endpointId)
            onPeersChanged?.invoke(connectedEndpoints.size)      // NEW: tell the UI
            Log.d(TAG, "Disconnected: $endpointId")
        }
    }
    private val payloadCallback = object : PayloadCallback() {

        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            val bytes = payload.asBytes() ?: return
            val json = String(bytes, Charsets.UTF_8)
        
            val obj: JsonObject = try {
                JsonParser.parseString(json).asJsonObject
            } catch (_: Exception) {
                Log.d(TAG, "Normal Message: $json")
                return
            }
        
            try {
                when {
                    obj.has("beaconId") ->
                        handleBeacon(gson.fromJson(obj, Beacon::class.java), endpointId)
        
                    // CHANGED: only update, notify and relay when the status is new or newer
                    obj.has("userId") && obj.has("status") -> {
                        val gs = gson.fromJson(obj, GroupStatus::class.java)
                        if (GroupStore.updateStatus(gs)) {
                            onGroupChanged?.invoke()
                            broadcast(gson.toJson(gs), endpointId)
                            Log.d(TAG, "Group Status Received: ${gs.status}")
                        }
                    }
        
                    obj.has("emergencyText") ->
                        handleSOS(gson.fromJson(obj, SOSMessage::class.java), endpointId)
        
                    obj.has("messageId") ->
                        handleRelayMessage(gson.fromJson(obj, RelayMessage::class.java), endpointId)
        
                    else -> Log.d(TAG, "Normal Message: $json")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Bad payload", e)
            }
        }
        override fun onPayloadTransferUpdate(
            endpointId: String,
            update: PayloadTransferUpdate
        ) {
            when (update.status) {
                PayloadTransferUpdate.Status.IN_PROGRESS ->
                    Log.d(TAG, "Transfer Progress: ${update.bytesTransferred}")
                PayloadTransferUpdate.Status.SUCCESS ->
                    Log.d(TAG, "Transfer Successful")
                PayloadTransferUpdate.Status.FAILURE ->
                    Log.d(TAG, "Transfer Failed")
                PayloadTransferUpdate.Status.CANCELED ->
                    Log.d(TAG, "Transfer Cancelled")
            }
        }
    }
}

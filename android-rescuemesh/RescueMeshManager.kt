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
        connectionsClient.stopAdvertising()
        connectionsClient.stopDiscovery()
        connectionsClient.stopAllEndpoints()
        connectedEndpoints.clear()
        pendingEndpoints.clear()
        scope.cancel()
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

    fun getGroupStatuses(): List<GroupStatus> = GroupStore.getStatuses()

    fun saveSafetyPack(pack: SafetyPack) = SafetyPackStore.savePack(pack)

    fun getSafetyPack(): SafetyPack? = SafetyPackStore.getPack()

    // -------------------------------------------------------------- Beacons

    fun broadcastBeacon(
        latitude: Double,
        longitude: Double,
        capacity: Int,
        message: String
    ) {
        val beacon = Beacon(
            beaconId = UUID.randomUUID().toString(),
            ownerId = deviceName,
            latitude = latitude,
            longitude = longitude,
            timestamp = System.currentTimeMillis(),
            capacity = capacity,
            message = message,
            isVerified = false
        )
        processedBeacons.add(beacon.beaconId) // don't re-handle our own beacon
        BeaconStore.addBeacon(beacon)         // show it locally too
        relayBeacon(beacon)
    }

    private fun handleBeacon(beacon: Beacon, fromEndpoint: String) {
        if (!processedBeacons.add(beacon.beaconId)) return // already seen

        val age = System.currentTimeMillis() - beacon.timestamp
        if (age > BEACON_TTL_MS) {
            Log.d(TAG, "Beacon Expired")
            return
        }

        BeaconStore.addBeacon(beacon)
        relayBeacon(beacon, fromEndpoint)
        Log.d(TAG, "Beacon Received")
    }

    private fun relayBeacon(beacon: Beacon, exclude: String? = null) {
        broadcast(gson.toJson(beacon), exclude)
        Log.d(TAG, "Beacon Relayed")
    }

    fun getNearbyBeacons(): List<Beacon> = BeaconStore.getAllBeacons()

    // ---------------------------------------------------------- Relay / SOS

    private fun handleRelayMessage(msg: RelayMessage, fromEndpoint: String) {
        if (!processedMessages.add(msg.messageId)) return // already seen

        if (msg.receiverId == deviceName) {
            Log.d(TAG, "Relay Delivered")
            return
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
                sendQueuedSOS()
                Log.d(TAG, "Connected: $endpointId")
            } else {
                Log.d(TAG, "Connection Failed")
            }
        }

        override fun onDisconnected(endpointId: String) {
            connectedEndpoints.remove(endpointId)
            pendingEndpoints.remove(endpointId)
            Log.d(TAG, "Disconnected: $endpointId")
        }
    }

    private val payloadCallback = object : PayloadCallback() {

        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            val bytes = payload.asBytes() ?: return
            val json = String(bytes, Charsets.UTF_8)

            // Gson never throws on missing fields, so the old try/catch chain
            // matched the first type every time. Detect the type by its keys.
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

                    obj.has("userId") && obj.has("status") -> {
                        val gs = gson.fromJson(obj, GroupStatus::class.java)
                        GroupStore.updateStatus(gs)
                        Log.d(TAG, "Group Status Received: ${gs.status}")
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

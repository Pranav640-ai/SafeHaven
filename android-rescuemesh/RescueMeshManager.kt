package com.safehaven.rescuemesh

import android.content.Context
import java.util.UUID
import android.util.Log
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import com.google.gson.Gson
import com.safehaven.rescuemesh.db.RescueMeshDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.*

import com.safehaven.rescuemesh.db.SOSMessageEntity

class RescueMeshManager(
    private val context: Context,
    private val deviceName: String,
    private val database: RescueMeshDatabase
){

    companion object {
        private const val TAG = "RescueMesh"
        private const val SERVICE_ID = "com.safehaven.mesh"
    }

    private val connectionsClient =
        Nearby.getConnectionsClient(context)

    private val connectedEndpoints =
        mutableSetOf<String>()

    private val gson = Gson()

    private val processedMessages =
        mutableSetOf<String>()
    private val processedBeacons =
    mutableSetOf<String>()

    fun startAdvertising() {

        val advertisingOptions =
            AdvertisingOptions.Builder()
                .setStrategy(Strategy.P2P_STAR)
                .build()

        connectionsClient.startAdvertising(
            deviceName,
            SERVICE_ID,
            connectionLifecycleCallback,
            advertisingOptions
        )
            .addOnSuccessListener {
                Log.d(TAG, "Advertising Started")
            }
            .addOnFailureListener {
                Log.e(TAG, "Advertising Failed", it)
            }
    }

    fun startDiscovery() {

        val discoveryOptions =
            DiscoveryOptions.Builder()
                .setStrategy(Strategy.P2P_STAR)
                .build()

        connectionsClient.startDiscovery(
            SERVICE_ID,
            endpointDiscoveryCallback,
            discoveryOptions
        )
            .addOnSuccessListener {
                Log.d(TAG, "Discovery Started")
            }
            .addOnFailureListener {
                Log.e(TAG, "Discovery Failed", it)
            }
    }

    fun sendMessage(message: String) {

        val payload =
            Payload.fromBytes(message.toByteArray())

        connectedEndpoints.forEach { endpointId ->

            connectionsClient.sendPayload(
                endpointId,
                payload
            )
        }
    }

    fun sendRelayMessage(
        relayMessage: RelayMessage
    ) {

        val json =
            gson.toJson(relayMessage)

        val payload =
            Payload.fromBytes(
                json.toByteArray()
            )

        connectedEndpoints.forEach { endpointId ->

            connectionsClient.sendPayload(
                endpointId,
                payload
            )
        }

        Log.d(
            TAG,
            "Relay Message Sent"
        )
    }
    fun createSOS(
        emergencyText: String
    ) {
    
        val sos = SOSMessage(
            id = java.util.UUID.randomUUID().toString(),
            senderId = deviceName,
            emergencyText = emergencyText,
            timestamp = System.currentTimeMillis(),
            status = "QUEUED"
        )
    
        if (connectedEndpoints.isEmpty()) {

        CoroutineScope(
            Dispatchers.IO
        ).launch {
    
            database.sosDao().insertSOS(
    
                SOSMessageEntity(
                    id = sos.id,
                    senderId = sos.senderId,
                    emergencyText = sos.emergencyText,
                    timestamp = sos.timestamp,
                    status = sos.status
                )
            )
        }
    
        Log.d(
            TAG,
            "SOS Saved To Room DB"
        )

    return
}
    
        forwardSOS(sos)
    }
    private fun forwardSOS(
        sos: SOSMessage
    ) {
    
        val json =
            gson.toJson(sos)
    
        val payload =
            Payload.fromBytes(
                json.toByteArray()
            )
    
        connectedEndpoints.forEach {
    
            connectionsClient.sendPayload(
                it,
                payload
            )
        }
    
        sos.status = "FORWARDED"
    
        Log.d(
            TAG,
            "SOS Forwarded"
        )
    }

   private fun sendQueuedSOS() {

        CoroutineScope(Dispatchers.IO).launch {
    
            val queuedSOS =
                database.sosDao().getAllSOS()
    
            queuedSOS.forEach {
    
                val sos =
                    SOSMessage(
                        id = it.id,
                        senderId = it.senderId,
                        emergencyText =
                            it.emergencyText,
                        timestamp = it.timestamp,
                        status = it.status
                    )
    
                forwardSOS(sos)
    
                database
                    .sosDao()
                    .deleteSOS(it)
            }
        }
    }

    fun sendGroupStatus(
        status: String
    ) {
    
        val groupStatus =
            GroupStatus(
                userId = deviceName,
                status = status,
                timestamp = System.currentTimeMillis()
            )
    
        val json =
            gson.toJson(groupStatus)
    
        val payload =
            Payload.fromBytes(
                json.toByteArray()
            )
    
        connectedEndpoints.forEach {
    
            connectionsClient.sendPayload(
                it,
                payload
            )
        }
    }
    fun getGroupStatuses():
            List<GroupStatus> {
    
        return GroupStore.getStatuses()
    }
    fun saveSafetyPack(
        pack: SafetyPack
    ) {
    
        SafetyPackStore.savePack(pack)
    }
    
    fun getSafetyPack():
            SafetyPack? {
    
        return SafetyPackStore.getPack()
    }
    private fun handleBeacon(
        beacon: Beacon
    ) {
    
        if (
            processedBeacons.contains(
                beacon.beaconId
            )
        ) {
            return
        }
    
        processedBeacons.add(
            beacon.beaconId
        )
    
        val age =
            System.currentTimeMillis() -
            beacon.timestamp
    
        if (
            age >
            30 * 60 * 1000
        ) {
    
            Log.d(
                TAG,
                "Beacon Expired"
            )
    
            return
        }
    
        BeaconStore.addBeacon(
            beacon
        )
    
        relayBeacon(
            beacon
        )
    
        Log.d(
            TAG,
            "Beacon Received"
        )
    }
    private fun relayBeacon(
        beacon: Beacon
    ) {
    
        val json =
            gson.toJson(beacon)
    
        val payload =
            Payload.fromBytes(
                json.toByteArray()
            )
    
        connectedEndpoints.forEach {
    
            connectionsClient.sendPayload(
                it,
                payload
            )
        }
    
        Log.d(
            TAG,
            "Beacon Relayed"
        )
    }
    fun getNearbyBeacons():
        List<Beacon> {
    
        return BeaconStore.getAllBeacons()
    }
    fun stopAllConnections() {

        connectionsClient.stopAdvertising()
        connectionsClient.stopDiscovery()
        connectionsClient.stopAllEndpoints()
    }

    private val endpointDiscoveryCallback =
        object : EndpointDiscoveryCallback() {

            override fun onEndpointFound(
                endpointId: String,
                discoveredEndpointInfo: DiscoveredEndpointInfo
            ) {

                Log.d(
                    TAG,
                    "Found Device: $endpointId"
                )

                connectionsClient.requestConnection(
                    deviceName,
                    endpointId,
                    connectionLifecycleCallback
                )
            }

            override fun onEndpointLost(
                endpointId: String
            ) {

                Log.d(
                    TAG,
                    "Lost Device: $endpointId"
                )
            }
        }
        private fun relayMessage(
            msg: RelayMessage
        ) {
        
            val json =
                gson.toJson(msg)
        
            val payload =
                Payload.fromBytes(
                    json.toByteArray()
                )
        
            connectedEndpoints.forEach {
        
                connectionsClient.sendPayload(
                    it,
                    payload
                )
            }
        }
        fun broadcastBeacon(
            latitude: Double,
            longitude: Double,
            capacity: Int,
            message: String
        ) {
        
            val beacon =
                Beacon(
                    beaconId = UUID.randomUUID().toString(),
                    ownerId = deviceName,
                    latitude = latitude,
                    longitude = longitude,
                    timestamp = System.currentTimeMillis(),
                    capacity = capacity,
                    message = message,
                    isVerified = false
                )
        
            relayBeacon(beacon)
        }
    private fun handleRelayMessage(
        msg: RelayMessage
    ) {
    
        if (
            processedMessages.contains(
                msg.messageId
            )
        ) {
            return
        }
    
        processedMessages.add(
            msg.messageId
        )
    
        if (
            msg.receiverId ==
            deviceName
        ) {
    
            Log.d(
                TAG,
                "Relay Delivered"
            )
    
            return
        }
    
        if (msg.ttl <= 0) {
    
            Log.d(
                TAG,
                "TTL Expired"
            )
    
            return
        }
    
        relayMessage(
            msg.copy(
                ttl = msg.ttl - 1
            )
        )
    }
    private val connectionLifecycleCallback =
        object : ConnectionLifecycleCallback() {

            override fun onConnectionInitiated(
                endpointId: String,
                connectionInfo: ConnectionInfo
            ) {

                Log.d(
                    TAG,
                    "Connection Initiated"
                )

                connectionsClient.acceptConnection(
                    endpointId,
                    payloadCallback
                )
            }

            override fun onConnectionResult(
                endpointId: String,
                resolution: ConnectionResolution
            ) {

                if (
                    resolution.status.statusCode ==
                    ConnectionsStatusCodes.STATUS_OK
                ) {

                    connectedEndpoints.add(
                        endpointId
                    )
                    sendQueuedSOS()
                    Log.d(
                        TAG,
                        "Connected: $endpointId"
                    )

                } else {

                    Log.d(
                        TAG,
                        "Connection Failed"
                    )
                }
            }

            override fun onDisconnected(
                endpointId: String
            ) {

                connectedEndpoints.remove(
                    endpointId
                )

                Log.d(
                    TAG,
                    "Disconnected: $endpointId"
                )
            }
        }

    private val payloadCallback =
        object : PayloadCallback() {

         override fun onPayloadReceived(
        endpointId: String,
        payload: Payload
    ) {
    
        val bytes =
            payload.asBytes()
                ?: return
    
        val json =
            String(bytes)
        try {
        
            val beacon =
                gson.fromJson(
                    json,
                    Beacon::class.java
                )
        
            if (beacon.beaconId.isNotBlank()) {
        
                handleBeacon(
                    beacon
                )
        
                return
            }
        
        } catch (_: Exception) {
        }

        try {

        val groupStatus =
            gson.fromJson(
                json,
                GroupStatus::class.java
            )
    
        if (groupStatus.userId.isNotBlank()) {
    
            GroupStore.updateStatus(
                groupStatus
            )
    
            Log.d(
                TAG,
                "Group Status Received: ${groupStatus.status}"
            )
    
            return
        }
    
    } catch (_: Exception) {
    }
    
        try {
    
            val sos =
                gson.fromJson(
                    json,
                    SOSMessage::class.java
                )
    
            Log.d(
                TAG,
                "SOS Received: ${sos.emergencyText}"
            )
    
            return
    
        } catch (_: Exception) {
        }
    
        try {
    
            val relay =
                gson.fromJson(
                    json,
                    RelayMessage::class.java
                )
    
            handleRelayMessage(
                relay
            )
    
            return
    
        } catch (_: Exception) {
        }
    
        Log.d(
            TAG,
            "Normal Message: $json"
        )
    }
         override fun onPayloadTransferUpdate(
    endpointId: String,
    update: PayloadTransferUpdate
) {

    when (update.status) {

        PayloadTransferUpdate.Status.IN_PROGRESS -> {

            Log.d(
                TAG,
                "Transfer Progress: ${update.bytesTransferred}"
            )
        }

        PayloadTransferUpdate.Status.SUCCESS -> {

            Log.d(
                TAG,
                "Transfer Successful"
            )
        }

        PayloadTransferUpdate.Status.FAILURE -> {

            Log.d(
                TAG,
                "Transfer Failed"
            )
        }

        PayloadTransferUpdate.Status.CANCELED -> {

            Log.d(
                TAG,
                "Transfer Cancelled"
            )
        }
    }
}
}
}

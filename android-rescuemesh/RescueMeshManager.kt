package com.safehaven.rescuemesh

import android.content.Context
import android.util.Log
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*

class RescueMeshManager(
    private val context: Context,
    private val deviceName: String
) {

    companion object {
        private const val TAG = "RescueMesh"
        private const val SERVICE_ID = "com.safehaven.mesh"
    }

    private val connectionsClient =
        Nearby.getConnectionsClient(context)

    private val connectedEndpoints = mutableSetOf<String>()

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
                .addOnSuccessListener {
                    Log.d(TAG, "Message Sent")
                }
                .addOnFailureListener {
                    Log.e(TAG, "Message Failed", it)
                }
        }
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

                Log.d(TAG, "Found Device: $endpointId")

                connectionsClient.requestConnection(
                    deviceName,
                    endpointId,
                    connectionLifecycleCallback
                )
            }

            override fun onEndpointLost(endpointId: String) {

                Log.d(TAG, "Lost Device: $endpointId")
            }
        }

    private val connectionLifecycleCallback =
        object : ConnectionLifecycleCallback() {

            override fun onConnectionInitiated(
                endpointId: String,
                connectionInfo: ConnectionInfo
            ) {

                Log.d(TAG, "Connection Initiated")

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

                    connectedEndpoints.add(endpointId)

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

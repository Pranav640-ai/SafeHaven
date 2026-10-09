package com.safehaven.rescuemesh

import android.content.Context
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import org.json.JSONObject
import java.util.UUID

/**
 * Refactored from the RescueMeshManager / RelayMessage / SOSMessage / BeaconStore
 * work on main. Runs entirely on this Android device: no internet or backend.
 * P2P_CLUSTER enables several links; relaying is application-managed and best-effort.
 */
class RescueMeshManager(
    context: Context,
    private val emit: (String, JSObject) -> Unit
) {
    companion object {
        private const val SERVICE = "com.safehaven.rescuemesh"
        private const val MAX_HOPS = 4
        private const val MAX_BYTES = 8 * 1024
    }

    private val client = Nearby.getConnectionsClient(context)
    private val peers = linkedMapOf<String, String>()
    private val pending = linkedMapOf<String, String>()
    private val discovered = linkedMapOf<String, String>()
    private val seen = LinkedHashSet<String>()
    private val pendingSOS = mutableListOf<JSONObject>()
    private val beaconStore = linkedMapOf<String, JSONObject>()
    private var ownBeaconId: String? = null
    private var name: String = "SafeHaven"
    private var identity: String = UUID.randomUUID().toString()
    private var running = false
    private var advertising = false
    private var discovering = false

    private fun event(type: String, payload: JSObject = JSObject()) {
        emit(type, payload)
    }

    private fun remember(id: String): Boolean {
        if (!seen.add(id)) return false
        if (seen.size > 2048) seen.remove(seen.first())
        return true
    }

    fun state(): JSObject {
        val p = JSArray()
        peers.forEach { (id, title) -> p.put(JSObject().put("id", id).put("name", title)) }
        val d = JSArray()
        discovered.forEach { (id, title) -> d.put(JSObject().put("id", id).put("name", title)) }
        val b = JSArray()
        beaconStore.values.filter { it.optLong("expiresAt") > System.currentTimeMillis() }
            .forEach { b.put(JSObject(it.toString())) }
        return JSObject().put("running", running).put("advertising", advertising)
            .put("discovering", discovering).put("peers", p).put("discovered", d)
            .put("beacons", b).put("queuedSOS", pendingSOS.size)
            .put("identity", identity).put("deviceName", name)
    }

    private fun update() = event("state", state())
    private fun failure(action: String, e: Exception) {
        event("error", JSObject().put("action", action).put("message", e.message ?: "Nearby operation failed"))
        update()
    }

    fun start(deviceName: String) {
        name = deviceName.trim().take(32).ifEmpty { "SafeHaven" }
        if (running) { update(); return }
        running = true
        client.startAdvertising(
            name, SERVICE, connections,
            AdvertisingOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()
        ).addOnSuccessListener { advertising = true; update() }
            .addOnFailureListener { advertising = false; failure("advertise", it) }
        client.startDiscovery(
            SERVICE, discovery,
            DiscoveryOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()
        ).addOnSuccessListener { discovering = true; update() }
            .addOnFailureListener { discovering = false; failure("discover", it) }
        update()
    }

    fun stop() {
        client.stopAdvertising()
        client.stopDiscovery()
        client.stopAllEndpoints()
        peers.clear(); pending.clear(); discovered.clear()
        running = false; advertising = false; discovering = false
        update()
    }

    fun accept(endpointId: String) {
        require(pending.remove(endpointId) != null) { "No pending authentication request" }
        client.acceptConnection(endpointId, payloadCallback)
            .addOnFailureListener { failure("accept", it) }
    }
    fun reject(endpointId: String) {
        require(pending.remove(endpointId) != null) { "No pending authentication request" }
        client.rejectConnection(endpointId)
        update()
    }

    private val discovery = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            if (!running) return
            discovered[endpointId] = info.endpointName
            event("discovered", JSObject().put("id", endpointId).put("name", info.endpointName))
            client.requestConnection(name, endpointId, connections)
                .addOnFailureListener { failure("connect", it) }
            update()
        }
        override fun onEndpointLost(endpointId: String) {
            discovered.remove(endpointId)
            update()
        }
    }

    private val connections = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            pending[endpointId] = info.endpointName
            event("connectionRequest", JSObject().put("id", endpointId)
                .put("name", info.endpointName).put("code", info.authenticationDigits))
        }
        override fun onConnectionResult(endpointId: String, resolution: ConnectionResolution) {
            val endpointName = pending.remove(endpointId) ?: discovered[endpointId]
            if (resolution.status.statusCode == ConnectionsStatusCodes.STATUS_OK) {
                peers[endpointId] = endpointName ?: "Nearby device"
                event("connected", JSObject().put("id", endpointId).put("name", peers[endpointId]))
                flushSOS()
                beaconStore.values.filter { it.optLong("expiresAt") > System.currentTimeMillis() }
                    .forEach { transmit(it, endpointId) }
            } else {
                event("connectionFailed", JSObject().put("id", endpointId)
                    .put("message", "Connection rejected or unsuccessful"))
            }
            update()
        }
        override fun onDisconnected(endpointId: String) {
            peers.remove(endpointId)
            event("disconnected", JSObject().put("id", endpointId))
            update()
        }
    }

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            val data = payload.asBytes() ?: return
            if (data.size > MAX_BYTES) return
            val packet = try { JSONObject(String(data, Charsets.UTF_8)) } catch (_: Exception) { return }
            val id = packet.optString("id")
            if (packet.optInt("v") != 1 || id.isBlank() || !remember(id)) return
            val hops = packet.optInt("ttl", 0)
            if (hops < 0 || hops > MAX_HOPS) return
            val type = packet.optString("type")
            val expiry = packet.optLong("expiresAt", Long.MAX_VALUE)
            if (expiry <= System.currentTimeMillis()) return

            when (type) {
                "chat", "sos", "checkin" -> {
                    event("message", JSObject(packet.toString()).put("received", true))
                    val ack = makePacket("ack", "", 3).put("refId", id)
                    transmit(ack, endpointId) // Return the acknowledgement to the phone that sent this hop.
                }
                "beacon" -> {
                    if (packet.has("latitude") && packet.has("longitude")) {
                        val previous = beaconStore[packet.optString("beaconId")]
                        if (previous == null || packet.optLong("createdAt") >= previous.optLong("createdAt")) {
                            beaconStore[packet.optString("beaconId")] = packet
                            event("beacon", JSObject(packet.toString()))
                        }
                    }
                }
                "beaconRemove" -> {
                    beaconStore.remove(packet.optString("refId"))
                    event("beaconRemoved", JSObject().put("id", packet.optString("refId")))
                }
                "ack" -> event("ack", JSObject(packet.toString()))
                else -> return
            }
            if (hops > 0) {
                packet.put("ttl", hops - 1)
                sendAll(packet, endpointId)
            }
            update()
        }
        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
            // Transport completion is not interpreted as peer delivery; app-level ack is required.
        }
    }

    private fun makePacket(type: String, text: String, ttl: Int): JSONObject =
        JSONObject().put("v", 1).put("id", UUID.randomUUID().toString())
            .put("type", type).put("from", identity).put("fromName", name)
            .put("body", text).put("createdAt", System.currentTimeMillis()).put("ttl", ttl)

    private fun transmit(packet: JSONObject, endpointId: String) {
        val bytes = packet.toString().toByteArray(Charsets.UTF_8)
        if (bytes.size > MAX_BYTES) { event("error", JSObject().put("action", "payload").put("message", "Message too large")); return }
        client.sendPayload(endpointId, Payload.fromBytes(bytes))
            .addOnFailureListener { failure("send", it) }
    }
    private fun sendAll(packet: JSONObject, except: String? = null) {
        peers.keys.filter { it != except }.forEach { transmit(packet, it) }
    }
    fun chat(text: String): JSObject {
        require(peers.isNotEmpty()) { "No connected phones. Start Nearby and confirm a connection first." }
        val trimmed = text.trim()
        require(trimmed.isNotBlank() && trimmed.length <= 500) { "Message must be 1–500 characters" }
        val p = makePacket("chat", trimmed, MAX_HOPS)
        remember(p.getString("id")); sendAll(p)
        return JSObject().put("id", p.getString("id")).put("status", "offered")
    }
    fun checkIn(status: String): JSObject {
        require(peers.isNotEmpty()) { "No connected phones" }
        require(status in listOf("safe", "needHelp")) { "Invalid check-in state" }
        val p = makePacket("checkin", status, MAX_HOPS)
        remember(p.getString("id")); sendAll(p)
        return JSObject().put("id", p.getString("id")).put("status", "offered")
    }
    fun sos(text: String): JSObject {
        require(text.isNotBlank() && text.length <= 500) { "SOS must be 1–500 characters" }
        val p = makePacket("sos", text.trim(), MAX_HOPS)
        remember(p.getString("id"))
        if (peers.isEmpty()) { pendingSOS.add(p); update(); return JSObject().put("id", p.getString("id")).put("status", "queued-in-memory") }
        sendAll(p)
        return JSObject().put("id", p.getString("id")).put("status", "offered")
    }
    private fun flushSOS() {
        if (peers.isEmpty()) return
        val sending = pendingSOS.toList()
        pendingSOS.clear()
        sending.forEach { sendAll(it); event("queuedSOSOffered", JSObject().put("id", it.getString("id"))) }
        update()
    }
    fun beacon(text: String, lat: Double, lon: Double, minutes: Int): JSObject {
        require(lat in -90.0..90.0 && lon in -180.0..180.0) { "Invalid location" }
        require(minutes in 5..180) { "Expiry must be 5–180 minutes" }
        require(text.isNotBlank() && text.length <= 140) { "Invalid beacon description" }
        val beaconId = ownBeaconId ?: UUID.randomUUID().toString().also { ownBeaconId = it }
        val p = makePacket("beacon", text.trim(), MAX_HOPS)
            .put("beaconId", beaconId).put("latitude", lat).put("longitude", lon)
            .put("expiresAt", System.currentTimeMillis() + minutes * 60_000L)
            .put("unverified", true)
        remember(p.getString("id")); beaconStore[beaconId] = p; sendAll(p)
        update()
        return JSObject().put("id", beaconId).put("status", if (peers.isEmpty()) "local-only" else "offered")
    }
    fun withdrawBeacon(): JSObject {
        val id = ownBeaconId ?: return JSObject().put("status", "none")
        ownBeaconId = null
        beaconStore.remove(id)
        val p = makePacket("beaconRemove", "", MAX_HOPS).put("refId", id)
        remember(p.getString("id")); sendAll(p); update()
        return JSObject().put("id", id).put("status", if (peers.isEmpty()) "local-only" else "offered")
    }
}

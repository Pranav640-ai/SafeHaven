package com.safehaven.rescuemesh

import android.content.Context
import com.google.android.gms.common.api.ApiException
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import org.json.JSONObject
import org.json.JSONArray
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
    private var allowUnverified = false
    private val discovered = linkedMapOf<String, String>()
    private val seen = LinkedHashSet<String>()
    private val pendingSOS = mutableListOf<JSONObject>()
    private val carriedSOS = mutableListOf<JSONObject>()
    private val pendingCheckIns = mutableListOf<JSONObject>()
    private val checkInStore = linkedMapOf<String, JSONObject>()
    private val queueStore = MeshQueueStore(context)
    private var queueError: String? = null
    private val beaconStore = linkedMapOf<String, JSONObject>()
    private var ownBeaconId: String? = null
    private var name: String = "Meridian"
    private var identity: String = UUID.randomUUID().toString()
    private var running = false
    private var advertising = false
    private var discovering = false
    private var role = "auto"
    private var session = 0
    private val connecting = mutableSetOf<String>()

    init {
        try {
            val saved = queueStore.read()
            identity = saved.optString("identity").ifBlank { identity }
            name = saved.optString("name").ifBlank { name }
            for ((key, target) in listOf("sos" to pendingSOS, "carried" to carriedSOS, "checkins" to pendingCheckIns)) {
                val items = saved.optJSONArray(key) ?: JSONArray()
                for (i in 0 until items.length()) {
                    val packet = items.optJSONObject(i) ?: continue
                    if (packet.optLong("expiresAt") > System.currentTimeMillis()) {
                        target.add(packet); remember(packet.optString("id"))
                    }
                }
            }
            val checkins = saved.optJSONArray("receivedCheckins") ?: JSONArray()
            for (i in 0 until checkins.length()) {
                val p = checkins.optJSONObject(i) ?: continue
                if (p.optLong("expiresAt") > System.currentTimeMillis()) checkInStore[p.optString("from")] = p
            }
        } catch (_: Exception) { queueError = "Saved queue could not be opened on this phone. Do not rely on previously queued messages." }
    }
    private fun persist() {
        try { queueStore.write(JSONObject().put("identity", identity).put("name", name)
            .put("receivedCheckins", JSONArray(checkInStore.values.toList()))
            .put("sos", JSONArray(pendingSOS)).put("carried", JSONArray(carriedSOS)).put("checkins", JSONArray(pendingCheckIns)))
            queueError = null
        } catch (_: Exception) { queueError = "Unable to save the encrypted offline queue. Keep this app open and do not rely on later delivery."; event("error", JSObject().put("message", queueError)) }
    }
    private fun expireQueues() {
        val now = System.currentTimeMillis()
        val changed = pendingSOS.removeAll { it.optLong("expiresAt") <= now } or
            carriedSOS.removeAll { it.optLong("expiresAt") <= now } or
            pendingCheckIns.removeAll { it.optLong("expiresAt") <= now }
        if (changed) persist()
    }
    private fun event(type: String, payload: JSObject = JSObject()) {
        emit(type, payload)
    }

    private fun remember(id: String): Boolean {
        if (!seen.add(id)) return false
        if (seen.size > 2048) seen.remove(seen.first())
        return true
    }

    fun state(): JSObject {
        expireQueues()
        val p = JSArray()
        peers.forEach { (id, title) -> p.put(JSObject().put("id", id).put("name", title)) }
        val d = JSArray()
        discovered.forEach { (id, title) -> d.put(JSObject().put("id", id).put("name", title)) }
        val b = JSArray()
        beaconStore.values.filter { it.optLong("expiresAt") > System.currentTimeMillis() - 60 * 60_000L }
            .forEach { b.put(JSObject(it.toString())) }
        return JSObject().put("running", running).put("advertising", advertising)
            .put("discovering", discovering).put("role", role).put("peers", p).put("discovered", d)
            .put("beacons", b).put("queuedSOS", pendingSOS.size)
            .put("queuedCheckIns", pendingCheckIns.size).put("carriedSOS", carriedSOS.size)
            .put("queueError", queueError ?: "").put("checkIns", JSONArray(checkInStore.values.filter { it.optLong("expiresAt") > System.currentTimeMillis() }))
            .put("identity", identity).put("deviceName", name).put("allowUnverified", allowUnverified)
    }

    private fun update() = event("state", state())
    private fun failure(action: String, e: Exception) {
        val code = (e as? ApiException)?.statusCode
        val hint = when (code) {
            8011, 8012 -> "Turn on Bluetooth and Wi-Fi on both phones, then stop and start Nearby again."
            else -> "Check Nearby devices/location permissions and Google Play services, then retry."
        }
        event("error", JSObject().put("action", action).put("statusCode", code ?: -1)
            .put("message", "$action failed${code?.let { " ($it)" } ?: ""}: ${e.message ?: "Nearby unavailable"}. $hint"))
        update()
    }

    fun start(deviceName: String, helpNetwork: Boolean = false, connectionRole: String = "auto") {
        require(connectionRole in listOf("auto", "host", "join")) { "Choose automatic, host or join" }
        queueError?.let { event("error", JSObject().put("message", it)) }
        if (running) { update(); return }
        name = deviceName.trim().take(32).ifEmpty { "Meridian" }
        allowUnverified = helpNetwork
        role = connectionRole
        running = true
        val generation = ++session
        // Explicit host/join avoids both phones requesting each other simultaneously.
        // A separate service prevents a two-phone client joining a cluster session.
        val service = if (role == "auto") SERVICE else "$SERVICE.two-phone.v1"
        val strategy = if (role == "auto") Strategy.P2P_CLUSTER else Strategy.P2P_POINT_TO_POINT
        fun startupFailed(action: String, e: Exception) {
            if (generation != session) return
            stop(false)
            failure(action, e)
        }
        fun discover() {
            client.startDiscovery(service, discovery, DiscoveryOptions.Builder().setStrategy(strategy).build())
                .addOnSuccessListener { if (generation == session) { discovering = true; update() } }
                .addOnFailureListener { startupFailed("Discovery", it) }
        }
        if (role == "join") discover()
        else client.startAdvertising(name, service, connections, AdvertisingOptions.Builder().setStrategy(strategy).build())
            .addOnSuccessListener {
                if (generation == session) {
                    advertising = true
                    if (role == "auto") discover()
                    update()
                }
            }.addOnFailureListener { startupFailed("Advertising", it) }
        update()
    }

    fun stop(clearQueue: Boolean = true) {
        ++session
        connecting.clear()
        client.stopAdvertising()
        client.stopDiscovery()
        client.stopAllEndpoints()
        peers.clear(); pending.clear(); discovered.clear()
        if (clearQueue) { seen.clear(); pendingSOS.clear(); pendingCheckIns.clear(); carriedSOS.clear(); checkInStore.clear(); persist() }
        ownBeaconId = null; beaconStore.clear()
        running = false; advertising = false; discovering = false; allowUnverified = false
        update()
    }

    fun accept(endpointId: String) {
        require(pending.containsKey(endpointId)) { "No pending authentication request" }
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
            if (!running || peers.containsKey(endpointId) || pending.containsKey(endpointId) || !connecting.add(endpointId)) return
            discovered[endpointId] = info.endpointName
            event("discovered", JSObject().put("id", endpointId).put("name", info.endpointName))
            client.requestConnection(name, endpointId, connections)
                .addOnFailureListener { connecting.remove(endpointId); if (running) failure("Connection request", it) }
            update()
        }
        override fun onEndpointLost(endpointId: String) {
            discovered.remove(endpointId)
            update()
        }
    }

    private val connections = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            if (!running) { client.rejectConnection(endpointId); return }
            connecting.add(endpointId)
            pending[endpointId] = info.endpointName
            if (allowUnverified) { accept(endpointId); return }
            event("connectionRequest", JSObject().put("id", endpointId)
                .put("name", info.endpointName).put("code", info.authenticationDigits))
        }
        override fun onConnectionResult(endpointId: String, resolution: ConnectionResolution) {
            connecting.remove(endpointId)
            if (!running) { pending.remove(endpointId); client.disconnectFromEndpoint(endpointId); return }
            val endpointName = pending.remove(endpointId) ?: discovered[endpointId]
            if (resolution.status.statusCode == ConnectionsStatusCodes.STATUS_OK) {
                peers[endpointId] = endpointName ?: "Nearby device"
                if (role != "auto") {
                    client.stopDiscovery(); client.stopAdvertising()
                    discovering = false; advertising = false
                }
                event("connected", JSObject().put("id", endpointId).put("name", peers[endpointId]))
                flushSOS()
                pendingCheckIns.forEach { transmit(it, endpointId) }
                carriedSOS.forEach { transmit(it, endpointId) }
                beaconStore.values.filter { it.optLong("expiresAt") > System.currentTimeMillis() }
                    .forEach { transmit(it, endpointId) }
            } else {
                event("connectionFailed", JSObject().put("id", endpointId)
                    .put("message", "Connection could not complete (${resolution.status.statusCode}). Try discovery again."))
            }
            update()
        }
        override fun onDisconnected(endpointId: String) {
            peers.remove(endpointId); pending.remove(endpointId); connecting.remove(endpointId)
            if (role != "auto" && running) stop(false)
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
            if (packet.optInt("v") != 1 || id.isBlank()) return
            val hops = packet.optInt("ttl", 0)
            if (hops < 0 || hops > MAX_HOPS) return
            val type = packet.optString("type")
            val expiry = packet.optLong("expiresAt", Long.MAX_VALUE)
            if (expiry <= System.currentTimeMillis()) return
            if (packet.optLong("createdAt") <= 0 || packet.optLong("createdAt") > System.currentTimeMillis() + 5 * 60_000L) return
            if (packet.optString("from") == identity && type != "ack") return
            if (!remember(id)) return

            when (type) {
                "chat", "sos", "checkin" -> {
                    if (type == "checkin" && packet.optString("body") in listOf("safe", "needHelp", "unknown")) {
                        val prev = checkInStore[packet.optString("from")]
                        if (prev == null || prev.optLong("createdAt") < packet.optLong("createdAt")) {
                            if (checkInStore.size >= 128) checkInStore.remove(checkInStore.keys.first())
                            checkInStore[packet.optString("from")] = JSONObject(packet.toString()).put("expiresAt", minOf(expiry, System.currentTimeMillis() + 24 * 60 * 60_000L))
                            persist()
                        }
                    }
                    if (type == "sos" && hops > 0 && carriedSOS.size < 64) {
                        carriedSOS.add(JSONObject(packet.toString()).put("ttl", hops - 1)
                            .put("expiresAt", minOf(expiry, System.currentTimeMillis() + 24 * 60 * 60_000L)))
                        persist()
                    }
                    event("message", JSObject(packet.toString()).put("received", true))
                    val ack = makePacket("ack", "", 3).put("refId", id)
                    transmit(ack, endpointId) // Return the acknowledgement to the phone that sent this hop.
                }
                "beacon" -> {
                    if (packet.optDouble("latitude", Double.NaN) in -90.0..90.0 && packet.optDouble("longitude", Double.NaN) in -180.0..180.0 && expiry <= System.currentTimeMillis() + 185 * 60_000L) {
                        val previous = beaconStore[packet.optString("beaconId")]
                        if (previous == null || packet.optLong("createdAt") >= previous.optLong("createdAt")) {
                            if (beaconStore.size >= 128) beaconStore.remove(beaconStore.keys.first())
                            beaconStore[packet.optString("beaconId")] = packet
                            event("beacon", JSObject(packet.toString()))
                        }
                    }
                }
                "beaconRemove" -> {
                    beaconStore.remove(packet.optString("refId"))
                    event("beaconRemoved", JSObject().put("id", packet.optString("refId")))
                }
                "ack" -> {
                    pendingSOS.removeAll { it.optString("id") == packet.optString("refId") }
                    pendingCheckIns.removeAll { it.optString("id") == packet.optString("refId") }
                    persist()
                    event("ack", JSObject(packet.toString()))
                }
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
        require(status in listOf("safe", "needHelp", "unknown")) { "Invalid check-in state" }
        val p = makePacket("checkin", status, MAX_HOPS).put("expiresAt", System.currentTimeMillis() + 24 * 60 * 60_000L)
        pendingCheckIns.clear(); pendingCheckIns.add(p); checkInStore[identity] = p; persist(); check(queueError == null) { queueError ?: "Unable to save queue" }
        remember(p.getString("id")); sendAll(p); update()
        return JSObject().put("id", p.getString("id")).put("status", if (peers.isEmpty()) "queued-on-device" else "offered")
    }
    fun sos(text: String): JSObject {
        require(text.isNotBlank() && text.length <= 500) { "SOS must be 1–500 characters" }
        require(pendingSOS.size < 20) { "Cancel an existing queued SOS before adding another" }
        val p = makePacket("sos", text.trim(), MAX_HOPS).put("expiresAt", System.currentTimeMillis() + 24 * 60 * 60_000L)
        pendingSOS.add(p); persist(); check(queueError == null) { queueError ?: "Unable to save queue" }; remember(p.getString("id")); sendAll(p); update()
        return JSObject().put("id", p.getString("id")).put("status", if (peers.isEmpty()) "queued-on-device" else "offered")
    }
    fun cancelQueuedSOS(): JSObject {
        val removed = pendingSOS.size
        pendingSOS.clear(); persist(); update()
        return JSObject().put("cancelled", removed)
    }
    private fun flushSOS() {
        if (peers.isEmpty()) return
        expireQueues()
        pendingSOS.toList().forEach { sendAll(it); event("queuedSOSOffered", JSObject().put("id", it.getString("id"))) }
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

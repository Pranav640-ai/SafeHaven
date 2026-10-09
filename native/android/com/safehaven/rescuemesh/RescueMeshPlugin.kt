package com.safehaven.rescuemesh

import android.Manifest
import android.os.Build
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "RescueMesh",
    permissions = [
        Permission(alias = "location", strings = [Manifest.permission.ACCESS_FINE_LOCATION]),
        Permission(alias = "bluetooth", strings = [
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_ADVERTISE
        ]),
        Permission(alias = "wifi", strings = [Manifest.permission.NEARBY_WIFI_DEVICES])
    ]
)
class RescueMeshPlugin : Plugin() {
    private val mesh by lazy {
        RescueMeshManager(context) { event, details ->
            notifyListeners(event, details)
        }
    }

    private fun aliasesForVersion(): Array<String> = when {
        Build.VERSION.SDK_INT >= 33 -> arrayOf("bluetooth", "wifi")
        Build.VERSION.SDK_INT >= 31 -> arrayOf("bluetooth", "location")
        else -> arrayOf("location")
    }

    private fun missingPermissions(): Boolean {
        val required = when {
            Build.VERSION.SDK_INT >= 33 -> listOf(
                Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_ADVERTISE, Manifest.permission.NEARBY_WIFI_DEVICES
            )
            Build.VERSION.SDK_INT >= 31 -> listOf(
                Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_ADVERTISE, Manifest.permission.ACCESS_FINE_LOCATION
            )
            else -> listOf(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        return required.any { ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED }
    }

    @PluginMethod
    fun start(call: PluginCall) {
        if (missingPermissions()) {
            requestPermissionForAliases(aliasesForVersion(), call, "permissionsFinished")
        } else {
            launch(call)
        }
    }
    @PermissionCallback
    private fun permissionsFinished(call: PluginCall) {
        if (missingPermissions()) call.reject("Nearby permission denied. Enable Bluetooth, Nearby devices and location permissions in Android Settings.")
        else launch(call)
    }
    private fun launch(call: PluginCall) {
        try {
            mesh.start(call.getString("deviceName") ?: "SafeHaven")
            call.resolve(mesh.state())
        } catch (e: Exception) { call.reject(e.message ?: "Cannot start Nearby", null, e) }
    }

    @PluginMethod fun getState(call: PluginCall) { call.resolve(mesh.state()) }
    @PluginMethod fun stop(call: PluginCall) { mesh.stop(); call.resolve(mesh.state()) }
    @PluginMethod fun accept(call: PluginCall) {
        try { mesh.accept(call.getString("id") ?: ""); call.resolve() }
        catch (e: Exception) { call.reject(e.message ?: "Cannot accept peer") }
    }
    @PluginMethod fun rejectPeer(call: PluginCall) {
        try { mesh.reject(call.getString("id") ?: ""); call.resolve() }
        catch (e: Exception) { call.reject(e.message ?: "Cannot reject peer") }
    }
    @PluginMethod fun sendChat(call: PluginCall) {
        try { call.resolve(mesh.chat(call.getString("text") ?: "")) }
        catch (e: Exception) { call.reject(e.message ?: "Cannot send message") }
    }
    @PluginMethod fun sendSOS(call: PluginCall) {
        try { call.resolve(mesh.sos(call.getString("text") ?: "")) }
        catch (e: Exception) { call.reject(e.message ?: "Cannot queue SOS") }
    }
    @PluginMethod fun sendCheckIn(call: PluginCall) {
        try { call.resolve(mesh.checkIn(call.getString("status") ?: "")) }
        catch (e: Exception) { call.reject(e.message ?: "Cannot send check-in") }
    }
    @PluginMethod fun publishBeacon(call: PluginCall) {
        val lat = call.getDouble("latitude")
        val lon = call.getDouble("longitude")
        if (lat == null || lon == null) { call.reject("Current GPS coordinates required"); return }
        try { call.resolve(mesh.beacon(call.getString("text") ?: "", lat, lon, call.getInt("minutes") ?: 30)) }
        catch (e: Exception) { call.reject(e.message ?: "Cannot publish beacon") }
    }
    @PluginMethod fun withdrawBeacon(call: PluginCall) { call.resolve(mesh.withdrawBeacon()) }
    override fun handleOnDestroy() { mesh.stop(); super.handleOnDestroy() }
}

package com.safehaven.rescuemesh

import java.util.concurrent.ConcurrentHashMap

/**
 * Beacon cache. addBeacon() returns true only when the beacon is NEW or NEWER than
 * what we already have - the manager uses that to decide whether to relay it,
 * which prevents relay loops without a separate "processed" set.
 */
object BeaconStore {

    const val EXPIRY_MS = 30 * 60 * 1000L        // beacon becomes "Expired"
    private const val PRUNE_AFTER_MS = 60 * 60 * 1000L // removed from list entirely

    private val beacons = ConcurrentHashMap<String, Beacon>()
    private val latestSeen = ConcurrentHashMap<String, Long>() // also remembers deactivated ones

    fun addBeacon(beacon: Beacon): Boolean {
        val seen = latestSeen[beacon.beaconId] ?: Long.MIN_VALUE
        if (beacon.timestamp <= seen) return false
        latestSeen[beacon.beaconId] = beacon.timestamp

        if (beacon.deactivated) beacons.remove(beacon.beaconId)
        else beacons[beacon.beaconId] = beacon
        return true
    }

    fun getBeacon(id: String): Beacon? = beacons[id]

    fun getAllBeacons(): List<Beacon> {
        pruneOld()
        return beacons.values.sortedByDescending { it.timestamp }
    }

    private fun pruneOld() {
        val now = System.currentTimeMillis()
        beacons.entries.removeIf { now - it.value.timestamp > PRUNE_AFTER_MS }
    }
}

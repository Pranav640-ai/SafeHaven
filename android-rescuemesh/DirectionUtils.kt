package com.safehaven.rescuemesh

import android.location.Location

object DirectionUtils {

    fun calculateDistance(
        currentLat: Double,
        currentLng: Double,
        beaconLat: Double,
        beaconLng: Double
    ): Float {

        val result = FloatArray(1)

        Location.distanceBetween(
            currentLat,
            currentLng,
            beaconLat,
            beaconLng,
            result
        )

        return result[0]
    }

    fun calculateBearing(
        currentLat: Double,
        currentLng: Double,
        beaconLat: Double,
        beaconLng: Double
    ): Float {

        val current = Location("current")
        current.latitude = currentLat
        current.longitude = currentLng

        val beacon = Location("beacon")
        beacon.latitude = beaconLat
        beacon.longitude = beaconLng

        return current.bearingTo(beacon)
    }
}

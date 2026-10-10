package com.safehaven.rescuemesh

import android.location.Location

object DirectionUtils {

    const val WARNING =
        "Direction only. Not a verified safe route. Avoid floodwaters and restricted areas."

    private val POINTS = arrayOf("N", "NE", "E", "SE", "S", "SW", "W", "NW")

    // ---- your original functions (names kept) ----

    fun calculateDistance(
        currentLat: Double,
        currentLng: Double,
        beaconLat: Double,
        beaconLng: Double
    ): Float {
        val result = FloatArray(1)
        Location.distanceBetween(currentLat, currentLng, beaconLat, beaconLng, result)
        return result[0]
    }

    /** Now returns 0..360 (was -180..180), clockwise from true north. */
    fun calculateBearing(
        currentLat: Double,
        currentLng: Double,
        beaconLat: Double,
        beaconLng: Double
    ): Float {
        val current = Location("current").apply {
            latitude = currentLat
            longitude = currentLng
        }
        val beacon = Location("beacon").apply {
            latitude = beaconLat
            longitude = beaconLng
        }
        return (current.bearingTo(beacon) + 360f) % 360f
    }

    // ---- aliases used by DirectionFinder ----

    fun distanceMeters(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Float =
        calculateDistance(lat1, lng1, lat2, lng2)

    fun bearingDegrees(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Float =
        calculateBearing(lat1, lng1, lat2, lng2)

    // ---- new helpers ----

    /** 0..360 degrees -> N, NE, E, SE, S, SW, W, NW */
    fun compassLabel(degrees: Float): String =
        POINTS[(((degrees % 360f) + 360f + 22.5f) / 45f).toInt() % 8]

    /** 430 m  /  1.2 km */
    fun formatDistance(meters: Float): String =
        if (meters < 1000f) "${meters.toInt()} m" else "%.1f km".format(meters / 1000f)

    /** Angle to rotate the on-screen arrow: bearing minus phone heading, -180..180. */
    fun relativeAngle(bearing: Float, heading: Float): Float =
        ((bearing - heading + 540f) % 360f) - 180f
}

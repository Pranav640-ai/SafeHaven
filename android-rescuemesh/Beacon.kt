package com.safehaven.rescuemesh

data class Beacon(
    val beaconId: String,
    val ownerId: String,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long,
    val capacity: Int,
    val message: String,
    val isVerified: Boolean = false
)

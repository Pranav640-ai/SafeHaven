package com.safehaven.rescuemesh

data class SOSMessage(
    val id: String,
    val senderId: String,
    val emergencyText: String,
    val timestamp: Long,
    var status: String
)

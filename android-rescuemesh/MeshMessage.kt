package com.safehaven.rescuemesh

data class MeshMessage(
    val id: String,
    val sender: String,
    val receiver: String,
    val message: String,
    val timestamp: Long
)

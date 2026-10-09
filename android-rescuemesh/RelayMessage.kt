package com.safehaven.rescuemesh

data class RelayMessage(
    val messageId: String,
    val senderId: String,
    val receiverId: String,
    val message: String,
    val timestamp: Long,
    val ttl: Int = 5
)

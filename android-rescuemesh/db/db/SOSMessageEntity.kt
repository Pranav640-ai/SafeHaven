package com.safehaven.rescuemesh.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sos_messages")
data class SOSMessageEntity(

    @PrimaryKey
    val id: String,

    val senderId: String,

    val emergencyText: String,

    val timestamp: Long,

    val status: String
)

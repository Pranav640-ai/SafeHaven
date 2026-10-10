package com.safehaven.rescuemesh.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        SOSMessageEntity::class
    ],
    version = 1
)
abstract class RescueMeshDatabase :
    RoomDatabase() {

    abstract fun sosDao():
            SOSDao
}

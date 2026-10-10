package com.safehaven.rescuemesh.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        SOSMessageEntity::class,          // existing
        EmergencyContactEntity::class,    // NEW (from Safetypackdb.kt)
        CachedAlertEntity::class,         // NEW
        ItineraryItemEntity::class,       // NEW
        EmergencyPhraseEntity::class      // NEW
    ],
    version = 2,                          // CHANGED: your current version + 1
    exportSchema = false
)
abstract class RescueMeshDatabase : RoomDatabase() {

    abstract fun sosDao(): SOSDao                    // existing, keep as is
    abstract fun safetyPackDao(): SafetyPackDao      // NEW

    companion object {
        @Volatile
        private var INSTANCE: RescueMeshDatabase? = null

        fun getInstance(context: Context): RescueMeshDatabase =
            INSTANCE ?: synchronized(this) {
                Room.databaseBuilder(
                    context.applicationContext,
                    RescueMeshDatabase::class.java,
                    "rescuemesh.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { INSTANCE = it }
            }
    }
}

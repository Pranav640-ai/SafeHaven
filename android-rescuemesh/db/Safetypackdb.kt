package com.safehaven.rescuemesh.db

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Transaction

/** Feature 9 - Offline Safety Pack tables. Add all four entities + safetyPackDao() to RescueMeshDatabase. */

@Entity(tableName = "emergency_contacts")
data class EmergencyContactEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val category: String,   // POLICE, AMBULANCE, DISASTER, EMBASSY, HOTEL, OTHER
    val name: String,
    val phone: String
)

@Entity(tableName = "cached_alerts")
data class CachedAlertEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val body: String,
    val sourceUrl: String,
    val fetchedAt: Long
)

@Entity(tableName = "itinerary_items")
data class ItineraryItemEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val type: String,       // HOTEL, DESTINATION, PLAN
    val title: String,
    val details: String,
    val dateText: String
)

@Entity(tableName = "emergency_phrases")
data class EmergencyPhraseEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val english: String,
    val local: String,
    val language: String
)

@Dao
abstract class SafetyPackDao {

    // Contacts
    @Query("SELECT * FROM emergency_contacts ORDER BY category, name")
    abstract suspend fun contacts(): List<EmergencyContactEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun upsertContact(contact: EmergencyContactEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun insertContacts(contacts: List<EmergencyContactEntity>)

    @Query("DELETE FROM emergency_contacts WHERE id = :id")
    abstract suspend fun deleteContact(id: Long)

    @Query("SELECT COUNT(*) FROM emergency_contacts")
    abstract suspend fun contactCount(): Int

    // Cached alerts
    @Query("SELECT * FROM cached_alerts ORDER BY fetchedAt DESC")
    abstract suspend fun alerts(): List<CachedAlertEntity>

    @Insert
    abstract suspend fun insertAlerts(alerts: List<CachedAlertEntity>)

    @Query("DELETE FROM cached_alerts")
    abstract suspend fun clearAlerts()

    @Transaction
    open suspend fun replaceAlerts(alerts: List<CachedAlertEntity>) {
        clearAlerts()
        insertAlerts(alerts)
    }

    // Itinerary
    @Query("SELECT * FROM itinerary_items ORDER BY type, dateText")
    abstract suspend fun itinerary(): List<ItineraryItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun upsertItineraryItem(item: ItineraryItemEntity)

    @Query("DELETE FROM itinerary_items WHERE id = :id")
    abstract suspend fun deleteItineraryItem(id: Long)

    // Phrases
    @Query("SELECT * FROM emergency_phrases ORDER BY id")
    abstract suspend fun phrases(): List<EmergencyPhraseEntity>

    @Insert
    abstract suspend fun insertPhrases(phrases: List<EmergencyPhraseEntity>)

    @Query("SELECT COUNT(*) FROM emergency_phrases")
    abstract suspend fun phraseCount(): Int
}

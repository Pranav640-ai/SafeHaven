package com.safehaven.rescuemesh

import com.safehaven.rescuemesh.db.CachedAlertEntity
import com.safehaven.rescuemesh.db.EmergencyContactEntity
import com.safehaven.rescuemesh.db.EmergencyPhraseEntity
import com.safehaven.rescuemesh.db.ItineraryItemEntity
import com.safehaven.rescuemesh.db.SafetyPackDao

data class SafetyPackData(
    val contacts: List<EmergencyContactEntity>,
    val alerts: List<CachedAlertEntity>,
    val itinerary: List<ItineraryItemEntity>,
    val phrases: List<EmergencyPhraseEntity>
)

/**
 * Feature 9 - Room-backed Offline Safety Pack.
 * Replaces the in-memory SafetyPack.kt / SafetyPackStore.kt (data was lost on app restart).
 */
class SafetyPackRepository(private val dao: SafetyPackDao) {

    /** Call once at startup. Numbers are India defaults - double-check them before demo. */
    suspend fun seedDefaultsIfEmpty() {
        if (dao.contactCount() == 0) {
            dao.insertContacts(
                listOf(
                    EmergencyContactEntity(category = "OTHER", name = "National Emergency", phone = "112"),
                    EmergencyContactEntity(category = "POLICE", name = "Police", phone = "100"),
                    EmergencyContactEntity(category = "AMBULANCE", name = "Ambulance", phone = "108"),
                    EmergencyContactEntity(category = "OTHER", name = "Fire", phone = "101"),
                    EmergencyContactEntity(category = "DISASTER", name = "State Disaster Helpline", phone = "1070"),
                    EmergencyContactEntity(category = "DISASTER", name = "District Disaster Helpline", phone = "1077"),
                    EmergencyContactEntity(category = "OTHER", name = "Tourist Helpline", phone = "1363")
                )
            )
        }
        if (dao.phraseCount() == 0) {
            dao.insertPhrases(
                listOf(
                    EmergencyPhraseEntity(english = "Help me", local = "எனக்கு உதவி தேவை", language = "Tamil"),
                    EmergencyPhraseEntity(english = "I need a doctor", local = "எனக்கு மருத்துவர் தேவை", language = "Tamil"),
                    EmergencyPhraseEntity(english = "Where is the shelter?", local = "தங்குமிடம் எங்கே?", language = "Tamil"),
                    EmergencyPhraseEntity(english = "Help me", local = "मेरी मदद करो", language = "Hindi"),
                    EmergencyPhraseEntity(english = "I need a doctor", local = "मुझे डॉक्टर चाहिए", language = "Hindi"),
                    EmergencyPhraseEntity(english = "Where is the shelter?", local = "आश्रय कहाँ है?", language = "Hindi")
                )
            )
        }
    }

    suspend fun getPack() = SafetyPackData(
        contacts = dao.contacts(),
        alerts = dao.alerts(),
        itinerary = dao.itinerary(),
        phrases = dao.phrases()
    )

    suspend fun saveContact(contact: EmergencyContactEntity) = dao.upsertContact(contact)
    suspend fun deleteContact(id: Long) = dao.deleteContact(id)

    /** Call from JS while ONLINE so the last alerts are available offline. */
    suspend fun cacheAlerts(alerts: List<CachedAlertEntity>) = dao.replaceAlerts(alerts)

    suspend fun saveItineraryItem(item: ItineraryItemEntity) = dao.upsertItineraryItem(item)
    suspend fun deleteItineraryItem(id: Long) = dao.deleteItineraryItem(id)
}

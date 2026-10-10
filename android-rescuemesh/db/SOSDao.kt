package com.safehaven.rescuemesh.db

import androidx.room.*

@Dao
interface SOSDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSOS(
        sos: SOSMessageEntity
    )

    @Query(
        "SELECT * FROM sos_messages"
    )
    suspend fun getAllSOS():
            List<SOSMessageEntity>

    @Delete
    suspend fun deleteSOS(
        sos: SOSMessageEntity
    )
}

package com.safehaven.rescuemesh

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.room.Room
import com.safehaven.rescuemesh.db.RescueMeshDatabase

class MainActivity : ComponentActivity() {

    private lateinit var rescueDb: RescueMeshDatabase

    private lateinit var mesh: RescueMeshManager

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {

        super.onCreate(savedInstanceState)

        /*
         * Room Database
         */
        rescueDb =
            Room.databaseBuilder(
                applicationContext,
                RescueMeshDatabase::class.java,
                "rescuemesh_db"
            ).build()

        /*
         * RescueMesh Manager
         */
        mesh =
            RescueMeshManager(
                context = this,
                deviceName =
                    android.os.Build.MODEL,
                database = rescueDb
            )

        /*
         * Start Mesh Network
         */
        mesh.startAdvertising()

        mesh.startDiscovery()

        /*
         * TEST FEATURE 1
         */
        mesh.sendMessage(
            "Hello SafeHaven"
        )

        /*
         * TEST FEATURE 3
         */
        mesh.createSOS(
            "Need Help Near Waterfall"
        )

        /*
         * TEST FEATURE 4
         */
        mesh.broadcastBeacon(
            latitude = 12.923,
            longitude = 80.123,
            capacity = 8,
            message =
            "Temporary Shelter Available"
        )

        /*
         * TEST FEATURE 5B
         */
        mesh.sendGroupStatus(
            "SAFE"
        )
    }

    override fun onDestroy() {

        super.onDestroy()

        mesh.stopAllConnections()
    }
}

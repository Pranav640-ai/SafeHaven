package com.safehaven.rescuemesh

object BeaconStore {

    private val beacons =
        mutableListOf<Beacon>()

    fun addBeacon(
        beacon: Beacon
    ) {
        beacons.removeAll {
            it.beaconId == beacon.beaconId
        }

        beacons.add(beacon)
    }

    fun getAllBeacons():
            List<Beacon> {

        return beacons
    }
}

package com.safehaven.rescuemesh

object SafetyPackStore {

    private var safetyPack:
            SafetyPack? = null

    fun savePack(
        pack: SafetyPack
    ) {

        safetyPack = pack
    }

    fun getPack():
            SafetyPack? {

        return safetyPack
    }
}

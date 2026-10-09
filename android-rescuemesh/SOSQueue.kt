package com.safehaven.rescuemesh

object SOSQueue {

    private val pendingSOS =
        mutableListOf<SOSMessage>()

    fun addSOS(
        sos: SOSMessage
    ) {
        pendingSOS.add(sos)
    }

    fun getAllSOS():
            MutableList<SOSMessage> {

        return pendingSOS
    }

    fun removeSOS(
        sos: SOSMessage
    ) {
        pendingSOS.remove(sos)
    }
}

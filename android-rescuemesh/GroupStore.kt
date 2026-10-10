package com.safehaven.rescuemesh

object GroupStore {

    private val statuses =
        mutableListOf<GroupStatus>()

    fun updateStatus(
        groupStatus: GroupStatus
    ) {

        statuses.removeAll {
            it.userId == groupStatus.userId
        }

        statuses.add(groupStatus)
    }

    fun getStatuses()
            : List<GroupStatus> {

        return statuses
    }
}

package com.safehaven.rescuemesh

import java.util.concurrent.ConcurrentHashMap

/**
 * Keeps the newest status per user. updateStatus() returns true only when the
 * status is new/newer, so the manager relays it exactly once per update.
 */
object GroupStore {

    private val statuses = ConcurrentHashMap<String, GroupStatus>()

    fun updateStatus(status: GroupStatus): Boolean {
        var changed = false
        statuses.compute(status.userId) { _, old ->
            if (old == null || status.timestamp > old.timestamp) {
                changed = true
                status
            } else old
        }
        return changed
    }

    fun getStatuses(): List<GroupStatus> = statuses.values.sortedBy { it.userId }
}

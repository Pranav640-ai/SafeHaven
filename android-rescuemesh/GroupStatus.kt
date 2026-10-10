package com.safehaven.rescuemesh

/** Feature 8 - Group Safety Check-In (replace GroupStatus.kt). */
data class GroupStatus(
    val userId: String,
    val status: String,   // SAFE | NEED_HELP | UNKNOWN
    val timestamp: Long
)

object GroupStatusType {
    const val SAFE = "SAFE"
    const val NEED_HELP = "NEED_HELP"
    const val UNKNOWN = "UNKNOWN"

    private val ALL = setOf(SAFE, NEED_HELP, UNKNOWN)

    fun normalize(raw: String?): String =
        raw?.trim()?.uppercase()?.replace(' ', '_')?.takeIf { it in ALL } ?: UNKNOWN
}

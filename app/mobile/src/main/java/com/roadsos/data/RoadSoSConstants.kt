package com.roadsos.data

object RoadSoSConstants {
    val ACCIDENT_TYPES = listOf("hospital", "ambulance", "police", "towing")
    const val PER_TYPE_LIMIT = 2
    const val RADIUS_KM = 15.0

    val SERVICE_SECTIONS = listOf(
        ServiceSection("hospital", "Trauma / Hospital", 0xFFEF4444),
        ServiceSection("ambulance", "Ambulance", 0xFFEF4444),
        ServiceSection("police", "Police", 0xFF2563EB),
        ServiceSection("towing", "Tow Truck", 0xFF6B7280),
    )
}

data class ServiceSection(
    val type: String,
    val label: String,
    val color: Long,
)

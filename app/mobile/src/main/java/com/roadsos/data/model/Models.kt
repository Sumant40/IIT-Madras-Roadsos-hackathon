package com.roadsos.data.model

import com.squareup.moshi.Json

data class ChatRequest(
    val message: String,
    @Json(name = "user_lat") val userLat: Double? = null,
    @Json(name = "user_lng") val userLng: Double? = null,
)

data class ChatResponse(
    val intent: String,
    val message: String,
    @Json(name = "suggested_action") val suggestedAction: SuggestedAction,
    val guidance: List<String>? = null,
)

data class SuggestedAction(
    @Json(name = "service_type") val serviceType: String? = null,
    @Json(name = "service_types") val serviceTypes: List<String>? = null,
    @Json(name = "search_lat") val searchLat: Double? = null,
    @Json(name = "search_lng") val searchLng: Double? = null,
    val urgent: Boolean = false,
    @Json(name = "accident_mode") val accidentMode: Boolean = false,
)

data class NearbyRequest(
    val lat: Double,
    val lng: Double,
    @Json(name = "radius_km") val radiusKm: Double = 15.0,
    val types: List<String>? = null,
    @Json(name = "accident_mode") val accidentMode: Boolean = false,
    @Json(name = "per_type_limit") val perTypeLimit: Int? = null,
)

data class NearbyResponse(
    @Json(name = "total_found") val totalFound: Int,
    val services: List<ServiceItem>,
)

data class ServiceItem(
    val id: Long,
    val name: String,
    val type: String,
    val lat: Double,
    val lng: Double,
    @Json(name = "distance_meters") val distanceMeters: Double,
    val phone: String? = null,
)

data class CountryEmergencyResponse(
    @Json(name = "country_code") val countryCode: String,
    @Json(name = "country_name") val countryName: String,
    val numbers: EmergencyNumbers,
)

data class EmergencyNumbers(
    val police: String,
    val ambulance: String,
    val fire: String? = null,
)

data class HealthResponse(
    val status: String,
    val service: String? = null,
)

data class SosCardCache(
    val savedAt: String,
    val lat: Double,
    val lng: Double,
    val countryCode: String?,
    val emergencyNumbers: EmergencyNumbers?,
    val services: List<ServiceItem>,
)

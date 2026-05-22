package com.roadsos.data

import android.content.Context
import com.roadsos.data.api.ApiClient
import com.roadsos.data.local.SosCardStore
import com.roadsos.data.model.ChatRequest
import com.roadsos.data.model.ChatResponse
import com.roadsos.data.model.CountryEmergencyResponse
import com.roadsos.data.model.NearbyRequest
import com.roadsos.data.model.ServiceItem
import com.roadsos.data.model.SosCardCache
import com.roadsos.data.model.SuggestedAction

class RoadSoSRepository(context: Context) {
    private val api = ApiClient.api
    private val sosStore = SosCardStore(context.applicationContext)

    suspend fun health() = api.health()

    suspend fun chat(message: String, userLat: Double?, userLng: Double?): ChatResponse =
        api.chat(ChatRequest(message = message, userLat = userLat, userLng = userLng))

    suspend fun country(lat: Double, lng: Double): CountryEmergencyResponse =
        api.country(lat, lng)

    suspend fun nearby(
        lat: Double,
        lng: Double,
        action: SuggestedAction,
    ): List<ServiceItem> {
        val isAccident = action.accidentMode
        val request = NearbyRequest(
            lat = lat,
            lng = lng,
            radiusKm = RoadSoSConstants.RADIUS_KM,
            types = when {
                isAccident -> action.serviceTypes ?: RoadSoSConstants.ACCIDENT_TYPES
                action.serviceType != null -> listOf(action.serviceType)
                else -> null
            },
            accidentMode = isAccident,
            perTypeLimit = if (isAccident) RoadSoSConstants.PER_TYPE_LIMIT else null,
        )
        return api.nearby(request).services
    }

    suspend fun nearbyAccidentBundle(lat: Double, lng: Double): List<ServiceItem> =
        api.nearby(
            NearbyRequest(
                lat = lat,
                lng = lng,
                radiusKm = RoadSoSConstants.RADIUS_KM,
                types = RoadSoSConstants.ACCIDENT_TYPES,
                accidentMode = true,
                perTypeLimit = RoadSoSConstants.PER_TYPE_LIMIT,
            )
        ).services

    suspend fun saveSosCard(
        lat: Double,
        lng: Double,
        countryCode: String?,
        numbers: com.roadsos.data.model.EmergencyNumbers?,
        services: List<ServiceItem>,
    ) = sosStore.save(lat, lng, countryCode, numbers, services)

    suspend fun loadSosCard(): SosCardCache? = sosStore.load()
}

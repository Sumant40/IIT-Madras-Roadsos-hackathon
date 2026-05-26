package com.roadsos.data.api

import com.roadsos.data.model.ChatRequest
import com.roadsos.data.model.ChatResponse
import com.roadsos.data.model.CountryEmergencyResponse
import com.roadsos.data.model.HealthResponse
import com.roadsos.data.model.NearbyRequest
import com.roadsos.data.model.NearbyResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface RoadSoSApi {
    @GET("health")
    suspend fun health(): HealthResponse

    @POST("chat/")
    suspend fun chat(@Body request: ChatRequest): ChatResponse

    @POST("emergency/nearby")
    suspend fun nearby(@Body request: NearbyRequest): NearbyResponse

    @GET("emergency/country")
    suspend fun country(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
    ): CountryEmergencyResponse
}

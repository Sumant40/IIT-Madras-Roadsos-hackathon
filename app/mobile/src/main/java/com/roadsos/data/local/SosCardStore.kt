package com.roadsos.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.roadsos.data.model.EmergencyNumbers
import com.roadsos.data.model.ServiceItem
import com.roadsos.data.model.SosCardCache
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore("roadsos_sos")

class SosCardStore(private val context: Context) {
    private val key = stringPreferencesKey("sos_card_json")
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val adapter = moshi.adapter(SosCardCache::class.java)

    suspend fun save(
        lat: Double,
        lng: Double,
        countryCode: String?,
        emergencyNumbers: EmergencyNumbers?,
        services: List<ServiceItem>,
    ) {
        val cache = SosCardCache(
            savedAt = java.time.Instant.now().toString(),
            lat = lat,
            lng = lng,
            countryCode = countryCode,
            emergencyNumbers = emergencyNumbers,
            services = services,
        )
        context.dataStore.edit { prefs ->
            prefs[key] = adapter.toJson(cache)
        }
    }

    suspend fun load(): SosCardCache? {
        val json = context.dataStore.data.map { it[key] }.first() ?: return null
        return runCatching { adapter.fromJson(json) }.getOrNull()
    }
}

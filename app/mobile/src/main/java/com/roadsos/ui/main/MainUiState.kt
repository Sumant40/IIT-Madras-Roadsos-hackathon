package com.roadsos.ui.main

import com.roadsos.data.model.CountryEmergencyResponse
import com.roadsos.data.model.ServiceItem
import com.roadsos.data.model.SosCardCache

data class ChatMessage(
    val id: Long,
    val text: String,
    val isUser: Boolean,
)

data class MainUiState(
    val messages: List<ChatMessage> = emptyList(),
    val input: String = "",
    val services: List<ServiceItem> = emptyList(),
    val selectedServiceId: Long? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val accidentMode: Boolean = false,
    val guidance: List<String> = emptyList(),
    val countryInfo: CountryEmergencyResponse? = null,
    val userLat: Double? = null,
    val userLng: Double? = null,
    val searchLat: Double? = null,
    val searchLng: Double? = null,
    val activeTab: MainTab = MainTab.CHAT,
    val showSosCard: Boolean = false,
    val sosCard: SosCardCache? = null,
    val snackbar: String? = null,
)

enum class MainTab { CHAT, MAP }

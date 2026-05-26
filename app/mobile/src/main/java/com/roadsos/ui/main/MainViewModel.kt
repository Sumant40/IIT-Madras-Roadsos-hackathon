package com.roadsos.ui.main

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.roadsos.data.RoadSoSRepository
import com.roadsos.data.model.SuggestedAction
import com.roadsos.util.LatLng
import com.roadsos.util.LocationHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = RoadSoSRepository(application)
    private val locationHelper = LocationHelper(application)

    private val _state = MutableStateFlow(
        MainUiState(
            messages = listOf(
                ChatMessage(
                    1L,
                    "Hello. I am RoadSoS. How can I help you? Are you in an emergency?",
                    false,
                ),
            ),
        ),
    )
    val state: StateFlow<MainUiState> = _state.asStateFlow()

    init {
        refreshLocation()
    }

    fun refreshLocation() {
        viewModelScope.launch {
            runCatching { locationHelper.getCurrentLocation() }
                .getOrNull()
                ?.let { loc ->
                    _state.update {
                        it.copy(userLat = loc.lat, userLng = loc.lng)
                    }
                    fetchCountry(loc.lat, loc.lng)
                }
        }
    }

    fun onInputChange(value: String) {
        _state.update { it.copy(input = value) }
    }

    fun setTab(tab: MainTab) {
        _state.update { it.copy(activeTab = tab) }
    }

    fun selectService(service: com.roadsos.data.model.ServiceItem) {
        _state.update {
            it.copy(
                selectedServiceId = service.id,
                searchLat = service.lat,
                searchLng = service.lng,
                activeTab = MainTab.MAP,
            )
        }
    }

    fun dismissSosCard() {
        _state.update { it.copy(showSosCard = false) }
    }

    fun openSosCard() {
        viewModelScope.launch {
            val cached = repository.loadSosCard()
            _state.update { it.copy(showSosCard = true, sosCard = cached) }
        }
    }

    fun clearSnackbar() {
        _state.update { it.copy(snackbar = null) }
    }

    fun sendMessage() {
        val text = _state.value.input.trim()
        if (text.isBlank() || _state.value.isLoading) return

        viewModelScope.launch {
            _state.update {
                it.copy(
                    input = "",
                    isLoading = true,
                    error = null,
                    services = emptyList(),
                    selectedServiceId = null,
                    accidentMode = false,
                    guidance = emptyList(),
                    activeTab = MainTab.CHAT,
                )
            }
            _state.update {
                it.copy(messages = it.messages + ChatMessage(System.currentTimeMillis(), text, true))
            }

            try {
                val userLat = _state.value.userLat
                val userLng = _state.value.userLng
                val chat = repository.chat(text, userLat, userLng)
                val action = chat.suggestedAction

                _state.update {
                    it.copy(
                        messages = it.messages + ChatMessage(
                            System.currentTimeMillis() + 1,
                            chat.message,
                            false,
                        ),
                        guidance = chat.guidance.orEmpty(),
                    )
                }

                if (chat.guidance?.isNotEmpty() == true) {
                    val guidanceText = chat.guidance.mapIndexed { i, s -> "${i + 1}. $s" }.joinToString("\n")
                    _state.update {
                        it.copy(
                            messages = it.messages + ChatMessage(
                                System.currentTimeMillis() + 2,
                                "While you wait:\n$guidanceText",
                                false,
                            ),
                        )
                    }
                }

                val lat = action.searchLat ?: userLat
                val lng = action.searchLng ?: userLng
                val shouldFetch = lat != null && lng != null && (
                    action.accidentMode ||
                        action.serviceType != null ||
                        !action.serviceTypes.isNullOrEmpty()
                    )

                if (shouldFetch && lat != null && lng != null) {
                    val country = runCatching { repository.country(lat, lng) }.getOrNull()
                    if (country != null) {
                        _state.update { it.copy(countryInfo = country) }
                    }

                    val services = repository.nearby(lat, lng, action)
                    repository.saveSosCard(
                        lat, lng,
                        country?.countryCode,
                        country?.numbers,
                        services,
                    )

                    _state.update {
                        it.copy(
                            services = services,
                            selectedServiceId = services.firstOrNull()?.id,
                            accidentMode = action.accidentMode,
                            searchLat = lat,
                            searchLng = lng,
                            activeTab = MainTab.MAP,
                            sosCard = repository.loadSosCard(),
                        )
                    }
                }
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        error = "Could not reach server. Check API URL and backend.",
                        messages = it.messages + ChatMessage(
                            System.currentTimeMillis() + 3,
                            "Sorry, I am having trouble connecting to the server.",
                            false,
                        ),
                    )
                }
            } finally {
                _state.update { it.copy(isLoading = false) }
            }
        }
    }

    fun loadSharedEmergency(lat: Double, lng: Double) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val country = repository.country(lat, lng)
                val services = repository.nearbyAccidentBundle(lat, lng)
                repository.saveSosCard(lat, lng, country.countryCode, country.numbers, services)
                _state.update {
                    it.copy(
                        countryInfo = country,
                        services = services,
                        selectedServiceId = services.firstOrNull()?.id,
                        accidentMode = true,
                        searchLat = lat,
                        searchLng = lng,
                        userLat = lat,
                        userLng = lng,
                        activeTab = MainTab.MAP,
                        sosCard = repository.loadSosCard(),
                        messages = it.messages + ChatMessage(
                            System.currentTimeMillis(),
                            "Emergency location loaded. Nearest services are on the map.",
                            false,
                        ),
                    )
                }
            } catch (e: Exception) {
                val cached = repository.loadSosCard()
                _state.update {
                    it.copy(
                        error = if (cached != null) "Offline — showing last saved services." else "Could not load services.",
                        services = cached?.services.orEmpty(),
                        sosCard = cached,
                        showSosCard = cached != null,
                    )
                }
            } finally {
                _state.update { it.copy(isLoading = false) }
            }
        }
    }

    private suspend fun fetchCountry(lat: Double, lng: Double) {
        runCatching { repository.country(lat, lng) }
            .getOrNull()
            ?.let { country ->
                _state.update { it.copy(countryInfo = country) }
            }
    }
}

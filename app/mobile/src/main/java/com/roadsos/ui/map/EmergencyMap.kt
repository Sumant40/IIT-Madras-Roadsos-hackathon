package com.roadsos.ui.map

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import com.roadsos.data.model.ServiceItem
import com.roadsos.ui.main.CountryOverlay
import com.roadsos.ui.main.MapLegendOverlay

@Composable
fun EmergencyMap(
    services: List<ServiceItem>,
    userLat: Double?,
    userLng: Double?,
    victimLat: Double? = null,
    victimLng: Double? = null,
    selectedId: Long?,
    accidentMode: Boolean,
    countryOverlay: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    onMarkerClick: (ServiceItem) -> Unit = {},
) {
    val defaultIndia = LatLng(20.5937, 78.9629)
    val center = when {
        victimLat != null && victimLng != null -> LatLng(victimLat, victimLng)
        userLat != null && userLng != null -> LatLng(userLat, userLng)
        services.isNotEmpty() -> LatLng(services.first().lat, services.first().lng)
        else -> defaultIndia
    }

    val cameraState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(center, 13f)
    }

    LaunchedEffect(services, userLat, userLng, victimLat, victimLng, selectedId) {
        val points = buildList {
            if (victimLat != null && victimLng != null) add(LatLng(victimLat, victimLng))
            if (userLat != null && userLng != null) add(LatLng(userLat, userLng))
            services.forEach { add(LatLng(it.lat, it.lng)) }
        }
        if (points.isEmpty()) return@LaunchedEffect
        if (points.size == 1) {
            cameraState.move(CameraUpdateFactory.newLatLngZoom(points.first(), 14f))
        } else {
            val builder = com.google.android.gms.maps.model.LatLngBounds.builder()
            points.forEach { builder.include(it) }
            cameraState.move(CameraUpdateFactory.newLatLngBounds(builder.build(), 120))
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraState,
            properties = MapProperties(isMyLocationEnabled = userLat != null),
            uiSettings = MapUiSettings(zoomControlsEnabled = true, myLocationButtonEnabled = true),
        ) {
            if (victimLat != null && victimLng != null) {
                Marker(
                    state = MarkerState(LatLng(victimLat, victimLng)),
                    title = "Emergency location",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED),
                )
            }

            services.forEach { service ->
                val hue = when (service.type) {
                    "hospital", "ambulance" -> BitmapDescriptorFactory.HUE_RED
                    "police" -> BitmapDescriptorFactory.HUE_BLUE
                    "fire_station" -> BitmapDescriptorFactory.HUE_ORANGE
                    "towing" -> BitmapDescriptorFactory.HUE_VIOLET
                    else -> BitmapDescriptorFactory.HUE_AZURE
                }
                Marker(
                    state = MarkerState(LatLng(service.lat, service.lng)),
                    title = service.name,
                    snippet = "${service.type} · ${"%.1f".format(service.distanceMeters / 1000)} km",
                    icon = BitmapDescriptorFactory.defaultMarker(hue),
                    onClick = {
                        onMarkerClick(service)
                        true
                    },
                )
            }
        }

        if (accidentMode) {
            MapLegendOverlay(modifier = Modifier.align(Alignment.BottomStart).padding(12.dp))
        }
        Box(modifier = Modifier.align(Alignment.TopEnd).padding(12.dp)) {
            countryOverlay()
        }

        if (services.isEmpty() && userLat == null) {
            Text(
                text = "Add MAPS_API_KEY in local.properties for map tiles",
                style = MaterialTheme.typography.bodySmall,
                color = Color.White,
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(16.dp),
            )
        }
    }
}

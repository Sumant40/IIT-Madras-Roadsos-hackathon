package com.roadsos.ui.sos

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.roadsos.data.model.SosCardCache

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SosCardScreen(
    cache: SosCardCache?,
    onClose: () -> Unit,
    onShare: (String) -> Unit,
) {
    val text = buildSosCardText(cache)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Offline SOS Card") },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                },
                actions = {
                    TextButton(onClick = { onShare(text) }) {
                        Icon(Icons.Default.Share, contentDescription = null)
                        Text("Share")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("RoadSoS Emergency Card", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

            if (cache == null) {
                Text("No cached data. Run a search while online first.")
                return@Column
            }

            Text("Location: ${cache.lat}, ${cache.lng}")
            Text("Saved: ${cache.savedAt}")
            cache.countryCode?.let { Text("Country: $it") }

            cache.emergencyNumbers?.let { numbers ->
                Text("National emergency", fontWeight = FontWeight.Bold)
                Text("Ambulance: ${numbers.ambulance}")
                Text("Police: ${numbers.police}")
                numbers.fire?.let { Text("Fire: $it") }
            }

            Text("Nearest services (cached)", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
            cache.services.forEach { s ->
                Text(
                    "${s.type} — ${s.name}${s.phone?.let { " · $it" } ?: ""} (${"%.1f".format(s.distanceMeters / 1000)} km)",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Text(
                "Keep this information available offline after one online search.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
        }
    }
}

fun buildSosCardText(cache: SosCardCache?): String {
    if (cache == null) return "RoadSoS — no cached emergency data."
    return buildString {
        appendLine("RoadSoS Emergency Card")
        appendLine("Location: ${cache.lat}, ${cache.lng}")
        appendLine("Saved: ${cache.savedAt}")
        cache.emergencyNumbers?.let {
            appendLine("Ambulance: ${it.ambulance}")
            appendLine("Police: ${it.police}")
        }
        appendLine("Services:")
        cache.services.forEach { s ->
            appendLine("- ${s.type}: ${s.name} ${s.phone ?: ""}")
        }
    }
}

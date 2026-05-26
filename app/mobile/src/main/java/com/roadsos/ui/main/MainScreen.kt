package com.roadsos.ui.main

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.roadsos.data.RoadSoSConstants
import com.roadsos.data.model.CountryEmergencyResponse
import com.roadsos.data.model.ServiceItem
import com.roadsos.ui.map.EmergencyMap
import com.roadsos.ui.sos.SosCardScreen
import com.roadsos.util.LatLng
import com.roadsos.util.dialNumber
import com.roadsos.util.openDirections
import com.roadsos.util.shareEmergencyLink
import com.roadsos.util.shareSosCardText

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    viewModel: MainViewModel = viewModel(),
    sharedLat: Double? = null,
    sharedLng: Double? = null,
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val snackbarHost = remember { SnackbarHostState() }
    val listState = rememberLazyListState()

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { _ -> viewModel.refreshLocation() }

    LaunchedEffect(Unit) {
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            ),
        )
    }

    LaunchedEffect(sharedLat, sharedLng) {
        if (sharedLat != null && sharedLng != null) {
            viewModel.loadSharedEmergency(sharedLat, sharedLng)
        }
    }

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.lastIndex)
        }
    }

    LaunchedEffect(state.snackbar) {
        state.snackbar?.let {
            snackbarHost.showSnackbar(it)
            viewModel.clearSnackbar()
        }
    }

    val origin = if (state.userLat != null && state.userLng != null) {
        LatLng(state.userLat!!, state.userLng!!)
    } else null

    val shareCenter = if (state.searchLat != null && state.searchLng != null) {
        LatLng(state.searchLat!!, state.searchLng!!)
    } else origin

    if (state.showSosCard) {
        SosCardScreen(
            cache = state.sosCard,
            onClose = { viewModel.dismissSosCard() },
            onShare = { text -> shareSosCardText(context, text) },
        )
        return
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHost) },
        bottomBar = {
            if (state.activeTab == MainTab.CHAT) {
                ChatBottomBar(
                    state = state,
                    shareCenter = shareCenter,
                    onInputChange = viewModel::onInputChange,
                    onSend = viewModel::sendMessage,
                    onShare = {
                        shareCenter?.let { shareEmergencyLink(context, it.lat, it.lng) }
                    },
                    onSosCard = viewModel::openSosCard,
                )
            }
        },
        floatingActionButton = {
            val ambulance = state.countryInfo?.numbers?.ambulance ?: "112"
            FloatingActionButton(
                onClick = { dialNumber(context, ambulance) },
                containerColor = MaterialTheme.colorScheme.primary,
            ) {
                Text("SOS\n$ambulance", style = MaterialTheme.typography.labelSmall, color = Color.White)
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Text("RoadSoS", fontWeight = FontWeight.Bold)
                        if (state.accidentMode) {
                            AccidentChip()
                        }
                    }
                },
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                TabButton("Chat", state.activeTab == MainTab.CHAT) { viewModel.setTab(MainTab.CHAT) }
                TabButton("Map", state.activeTab == MainTab.MAP) { viewModel.setTab(MainTab.MAP) }
            }

            Box(modifier = Modifier.weight(1f)) {
            when (state.activeTab) {
                MainTab.CHAT -> ChatTab(
                    modifier = Modifier.fillMaxSize(),
                    state = state,
                    listState = listState,
                    origin = origin,
                    onSelectService = viewModel::selectService,
                    onCall = { dialNumber(context, it) },
                    onDirections = { openDirections(context, it, origin) },
                )
                MainTab.MAP -> EmergencyMap(
                    services = state.services,
                    userLat = state.userLat,
                    userLng = state.userLng,
                    victimLat = if (sharedLat != null) sharedLat else null,
                    victimLng = if (sharedLng != null) sharedLng else null,
                    selectedId = state.selectedServiceId,
                    accidentMode = state.accidentMode,
                    countryOverlay = { CountryOverlay(state.countryInfo) },
                    modifier = Modifier.fillMaxSize(),
                    onMarkerClick = viewModel::selectService,
                )
            }
            }
        }
    }
}

@Composable
private fun TabButton(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        color = if (selected) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.surface,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                if (label == "Chat") Icons.Default.Message else Icons.Default.Map,
                contentDescription = null,
                tint = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.size(16.dp),
            )
            Text(
                label,
                color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun AccidentChip() {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
    ) {
        Text(
            "Accident Mode",
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
fun CountryOverlay(countryInfo: CountryEmergencyResponse?) {
    if (countryInfo == null) return
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f))) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(
                "${countryInfo.countryCode} · ${countryInfo.countryName}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            val ctx = LocalContext.current
            TextButton(onClick = { com.roadsos.util.dialNumber(ctx, countryInfo.numbers.ambulance) }) {
                Text("Ambulance ${countryInfo.numbers.ambulance}", color = MaterialTheme.colorScheme.primary)
            }
            if (countryInfo.numbers.police != countryInfo.numbers.ambulance) {
                Text("Police ${countryInfo.numbers.police}", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
fun MapLegendOverlay(modifier: Modifier = Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f))) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text("Accident Mode", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            Text("Red — Hospital / Ambulance", style = MaterialTheme.typography.labelSmall)
            Text("Blue — Police", style = MaterialTheme.typography.labelSmall)
            Text("Grey — Tow", style = MaterialTheme.typography.labelSmall)
            Text("Green — You", style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun ChatTab(
    state: MainUiState,
    listState: androidx.compose.foundation.lazy.LazyListState,
    origin: LatLng?,
    onSelectService: (ServiceItem) -> Unit,
    onCall: (String) -> Unit,
    onDirections: (ServiceItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(state.messages, key = { it.id }) { msg ->
                MessageBubble(msg)
            }
            if (state.isLoading) {
                item {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                }
            }
        }

        if (state.guidance.isNotEmpty()) {
            GuidancePanel(state.guidance)
        }

        if (state.services.isNotEmpty()) {
            if (state.accidentMode) {
                GroupedResults(state.services, state.selectedServiceId, onSelectService, onCall, onDirections)
            } else {
                FlatResults(state.services, state.selectedServiceId, onSelectService, onCall, onDirections)
            }
        }
    }
}

@Composable
private fun ChatBottomBar(
    state: MainUiState,
    shareCenter: LatLng?,
    onInputChange: (String) -> Unit,
    onSend: () -> Unit,
    onShare: () -> Unit,
    onSosCard: () -> Unit,
) {
    Surface(color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding(),
        ) {
            if (shareCenter != null || state.services.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (shareCenter != null) {
                        TextButton(onClick = onShare, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.size(4.dp))
                            Text("Share location")
                        }
                    }
                    if (state.services.isNotEmpty()) {
                        TextButton(onClick = onSosCard, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.CreditCard, contentDescription = null, modifier = Modifier.size(18.dp))
                            Text("SOS Card")
                        }
                    }
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = state.input,
                    onValueChange = onInputChange,
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("E.g., I just had an accident...") },
                    singleLine = true,
                    enabled = !state.isLoading,
                )
                IconButton(onClick = onSend, enabled = !state.isLoading) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send")
                }
            }
        }
    }
}

@Composable
private fun MessageBubble(msg: ChatMessage) {
    val align = if (msg.isUser) Alignment.CenterEnd else Alignment.CenterStart
    val bg = if (msg.isUser) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.surface
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = align) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = bg,
            modifier = Modifier.fillMaxWidth(0.88f),
        ) {
            Text(
                msg.text,
                modifier = Modifier.padding(12.dp),
                style = MaterialTheme.typography.bodyMedium,
                color = if (msg.isUser) Color.White else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@Composable
private fun GuidancePanel(steps: List<String>) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text("While you wait", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            steps.forEachIndexed { i, step ->
                Text("${i + 1}. $step", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}

@Composable
private fun GroupedResults(
    services: List<ServiceItem>,
    selectedId: Long?,
    onSelect: (ServiceItem) -> Unit,
    onCall: (String) -> Unit,
    onDirections: (ServiceItem) -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .height(200.dp)
            .padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        RoadSoSConstants.SERVICE_SECTIONS.forEach { section ->
            val items = services.filter { it.type == section.type }
            if (items.isNotEmpty()) {
                item {
                    Text(
                        section.label,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 4.dp),
                    )
                }
                items(items, key = { it.id }) { service ->
                    ServiceCard(service, selectedId == service.id, onSelect, onCall, onDirections)
                }
            }
        }
    }
}

@Composable
private fun FlatResults(
    services: List<ServiceItem>,
    selectedId: Long?,
    onSelect: (ServiceItem) -> Unit,
    onCall: (String) -> Unit,
    onDirections: (ServiceItem) -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .height(180.dp)
            .padding(horizontal = 12.dp),
    ) {
        items(services, key = { it.id }) { service ->
            ServiceCard(service, selectedId == service.id, onSelect, onCall, onDirections)
        }
    }
}

@Composable
private fun ServiceCard(
    service: ServiceItem,
    selected: Boolean,
    onSelect: (ServiceItem) -> Unit,
    onCall: (String) -> Unit,
    onDirections: (ServiceItem) -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
            .clickable { onSelect(service) },
        colors = CardDefaults.cardColors(
            containerColor = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
            else MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(service.name, fontWeight = FontWeight.SemiBold)
            Text("${"%.1f".format(service.distanceMeters / 1000)} km · ${service.type}", style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { onDirections(service) }) { Text("Directions") }
                service.phone?.let { TextButton(onClick = { onCall(it) }) { Text("Call") } }
            }
        }
    }
}

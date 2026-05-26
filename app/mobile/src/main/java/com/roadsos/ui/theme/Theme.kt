package com.roadsos.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColors = darkColorScheme(
    primary = Color(0xFFEF4444),
    onPrimary = Color.White,
    secondary = Color(0xFF2563EB),
    background = Color(0xFF0F172A),
    surface = Color(0xFF111827),
    onBackground = Color(0xFFF8FAFC),
    onSurface = Color(0xFFF8FAFC),
)

private val LightColors = lightColorScheme(
    primary = Color(0xFFEF4444),
    onPrimary = Color.White,
    secondary = Color(0xFF1D4ED8),
    background = Color(0xFFEEF2F7),
    surface = Color.White,
)

@Composable
fun RoadSoSTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    MaterialTheme(
        colorScheme = if (dark) DarkColors else LightColors,
        content = content,
    )
}

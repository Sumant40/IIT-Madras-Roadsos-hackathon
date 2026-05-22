package com.roadsos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.roadsos.ui.main.MainScreen
import com.roadsos.ui.theme.RoadSoSTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val sharedLat = intent?.data?.getQueryParameter("lat")?.toDoubleOrNull()
        val sharedLng = intent?.data?.getQueryParameter("lng")?.toDoubleOrNull()

        setContent {
            RoadSoSTheme {
                MainScreen(sharedLat = sharedLat, sharedLng = sharedLng)
            }
        }
    }
}

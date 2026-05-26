package com.roadsos

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.roadsos.ui.main.MainScreen
import com.roadsos.ui.theme.RoadSoSTheme

class ShareReceiverActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val uri: Uri? = intent?.data
        val lat = uri?.getQueryParameter("lat")?.toDoubleOrNull()
        val lng = uri?.getQueryParameter("lng")?.toDoubleOrNull()

        setContent {
            RoadSoSTheme {
                MainScreen(sharedLat = lat, sharedLng = lng)
            }
        }

        if (lat == null || lng == null) {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }
    }
}

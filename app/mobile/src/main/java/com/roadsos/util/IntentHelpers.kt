package com.roadsos.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.roadsos.BuildConfig
import com.roadsos.data.model.ServiceItem

fun dialNumber(context: Context, number: String) {
    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number")))
}

fun openDirections(context: Context, destination: ServiceItem, origin: LatLng?) {
    val params = buildString {
        append("https://www.google.com/maps/dir/?api=1")
        append("&destination=${destination.lat},${destination.lng}")
        append("&travelmode=driving")
        if (origin != null) {
            append("&origin=${origin.lat},${origin.lng}")
        }
    }
    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(params)))
}

fun buildShareUrl(lat: Double, lng: Double, label: String? = null): String {
    val base = BuildConfig.WEB_SHARE_BASE.trimEnd('/')
    val uri = Uri.parse("$base/emergency").buildUpon()
        .appendQueryParameter("lat", lat.toString())
        .appendQueryParameter("lng", lng.toString())
    if (!label.isNullOrBlank()) {
        uri.appendQueryParameter("label", label)
    }
    return uri.build().toString()
}

fun shareEmergencyLink(context: Context, lat: Double, lng: Double) {
    val url = buildShareUrl(lat, lng)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, "RoadSoS Emergency Location")
        putExtra(
            Intent.EXTRA_TEXT,
            "I need help — open this link to see my location and nearest services:\n$url",
        )
    }
    context.startActivity(Intent.createChooser(intent, "Share location"))
}

fun shareSosCardText(context: Context, text: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
    }
    context.startActivity(Intent.createChooser(intent, "Share SOS card"))
}

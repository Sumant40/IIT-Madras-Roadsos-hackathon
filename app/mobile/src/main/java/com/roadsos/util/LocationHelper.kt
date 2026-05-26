package com.roadsos.util

import android.annotation.SuppressLint
import android.content.Context
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class LatLng(val lat: Double, val lng: Double)

class LocationHelper(context: Context) {
    private val client = LocationServices.getFusedLocationProviderClient(context)

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): LatLng? = suspendCancellableCoroutine { cont ->
        client.getCurrentLocation(
            Priority.PRIORITY_HIGH_ACCURACY,
            CancellationTokenSource().token,
        ).addOnSuccessListener { location ->
            if (location != null) {
                cont.resume(LatLng(location.latitude, location.longitude))
            } else {
                cont.resume(null)
            }
        }.addOnFailureListener { e ->
            cont.resumeWithException(e)
        }
    }
}

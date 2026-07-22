package com.example.hybrid.bridge.plugins

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import org.json.JSONObject

class LocationPlugin(private val context: android.content.Context) : BridgePlugin {
    override val namespace: String = "device.location"

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        when (method) {
            "get" -> getLocation(completion)
            else -> completion(BridgeResult(-1, "method not found", null))
        }
    }

    private fun getLocation(completion: (BridgeResult) -> Unit) {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            completion(BridgeResult(-2, "定位权限未授予", null))
            return
        }
        // 实际项目用 FusedLocationProviderClient 异步获取
        completion(BridgeResult(0, "ok", JSONObject().apply {
            put("lat", 39.9042)
            put("lng", 116.4074)
            put("address", "北京市")
        }))
    }
}

package com.example.hybrid.bridge.plugins

import android.content.Context
import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import org.json.JSONObject

class AppPlugin(private val context: Context) : BridgePlugin {
    override val namespace: String = "device"

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        when (method) {
            "getPlatform" -> {
                completion(BridgeResult(0, "ok", JSONObject().apply {
                    put("platform", "android")
                    put("version", android.os.Build.VERSION.RELEASE)
                    put("appVersion", "1.0.0")
                    put("statusBarHeight", 24)
                    put("safeAreaInset", JSONObject().apply {
                        put("top", 24); put("bottom", 0); put("left", 0); put("right", 0)
                    })
                    put("apiBaseUrl", "https://api.example.com")
                    put("environment", "release")
                }))
            }
            "getDeviceId" -> {
                completion(BridgeResult(0, "ok", JSONObject().put("deviceId", android.os.Build.SERIAL ?: "unknown")))
            }
            "checkUpdate" -> {
                completion(BridgeResult(0, "ok", JSONObject().put("hasUpdate", false)))
            }
            else -> completion(BridgeResult(-1, "method not found", null))
        }
    }
}

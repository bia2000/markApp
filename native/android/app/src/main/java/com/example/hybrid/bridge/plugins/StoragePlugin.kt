package com.example.hybrid.bridge.plugins

import android.content.Context
import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import org.json.JSONObject

/**
 * 本地存储插件：跨 WebView 共享的 KV 存储（基于 SharedPreferences）
 */
class StoragePlugin(private val context: Context) : BridgePlugin {
    override val namespace: String = "storage.local"

    private val prefs by lazy {
        context.getSharedPreferences("hybrid_storage", Context.MODE_PRIVATE)
    }

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        when (method) {
            "set" -> {
                val key = params.optString("key")
                val value = params.opt("value")
                prefs.edit().apply {
                    when (value) {
                        is String -> putString(key, value)
                        is Int -> putInt(key, value)
                        is Long -> putLong(key, value)
                        is Boolean -> putBoolean(key, value)
                        is Float -> putFloat(key, value)
                        else -> putString(key, value?.toString())
                    }
                }.apply()
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            "get" -> {
                val key = params.optString("key")
                val value: Any? = prefs.all[key]
                completion(BridgeResult(0, "ok", JSONObject().put("value", value ?: JSONObject.NULL)))
            }
            else -> completion(BridgeResult(-1, "method not found", null))
        }
    }
}

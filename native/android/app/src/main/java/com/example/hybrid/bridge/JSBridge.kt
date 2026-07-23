package com.example.hybrid.bridge

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.fragment.app.Fragment
import androidx.appcompat.app.AppCompatActivity
import com.example.hybrid.HybridApp
import com.example.hybrid.shell.HybridWebActivity
import com.example.hybrid.bridge.plugins.CameraPlugin
import com.example.hybrid.bridge.plugins.LocationPlugin
import com.example.hybrid.bridge.plugins.ScanPlugin
import com.example.hybrid.bridge.plugins.StoragePlugin
import com.example.hybrid.bridge.plugins.NavPlugin
import com.example.hybrid.bridge.plugins.SharePlugin
import com.example.hybrid.bridge.plugins.AppPlugin
import org.json.JSONObject

/**
 * JSBridge 核心：注册到 window.NativeBridge，处理 H5 invoke 调用并回传 callback
 *
 * H5 调用方式：
 *   window.NativeBridge.invoke(JSON.stringify({msgType:'invoke', action, callbackId, params}))
 *
 * 原生回传：
 *   webView.evaluateJavascript("window.NativeBridge._recvCallback('$json')", null)
 */
class JSBridge private constructor(private val context: Context) {

    private val mainHandler = Handler(Looper.getMainLooper())
    private val webViews = mutableMapOf<String, WebView>()

    fun attachWebView(id: String, webView: WebView) {
        webViews[id] = webView
    }

    fun detachWebView(id: String) {
        webViews.remove(id)
    }

    @JavascriptInterface
    fun invoke(payload: String) {
        try {
            val msg = JSONObject(payload)
            val action = msg.optString("action")
            val callbackId = msg.optString("callbackId")
            val params = msg.optJSONObject("params") ?: JSONObject()
            val parts = action.split(".")
            val namespace = parts.dropLast(1).joinToString(".")
            val method = parts.lastOrNull() ?: action

            val plugin = plugins[namespace]
            if (plugin == null) {
                callback(callbackId, BridgeResult(-1, "plugin not found: $namespace", null))
                return
            }
            plugin.handle(method, params) { result ->
                callback(callbackId, result)
            }
        } catch (e: Exception) {
            // ignore
        }
    }

    @JavascriptInterface
    fun callSync(action: String, paramsJson: String?): Any {
        // 同步调用：仅轻量场景（getDeviceId / getPlatform）
        return when (action) {
            "device.getPlatform" -> {
                JSONObject().apply {
                    put("code", 0)
                    put("msg", "ok")
                    put("data", JSONObject().apply {
                        put("platform", "android")
                        put("version", android.os.Build.VERSION.RELEASE)
                        put("appVersion", "1.0.0")
                        put("statusBarHeight", 24)
                    })
                }.toString()
            }
            "device.getDeviceId" -> {
                JSONObject().apply {
                    put("code", 0)
                    put("msg", "ok")
                    put("data", JSONObject().apply {
                        put("deviceId", android.os.Build.SERIAL ?: "unknown")
                    })
                }.toString()
            }
            else -> JSONObject().put("code", -1).put("msg", "sync method not found").toString()
        }
    }

    /** 原生回调 H5 */
    fun callback(callbackId: String, result: BridgeResult) {
        val json = JSONObject().apply {
            put("msgType", "callback")
            put("callbackId", callbackId)
            put("result", JSONObject().apply {
                put("code", result.code)
                put("msg", result.msg)
                put("data", result.data ?: JSONObject.NULL)
            })
        }.toString()
        val escaped = json.replace("\\", "\\\\").replace("'", "\\'")
        val js = "window.NativeBridge && window.NativeBridge._recvCallback && window.NativeBridge._recvCallback('$escaped');"
        evalJS(js)
    }

    /** 原生派发事件到 H5 */
    fun dispatchEvent(event: String, data: Any?) {
        val json = JSONObject().apply {
            put("msgType", "event")
            put("event", event)
            put("data", data ?: JSONObject.NULL)
        }.toString()
        val escaped = json.replace("\\", "\\\\").replace("'", "\\'")
        val js = "window.NativeBridge && window.NativeBridge._recvEvent && window.NativeBridge._recvEvent('$escaped');"
        evalJS(js)
    }

    private fun evalJS(js: String) {
        mainHandler.post {
            webViews.values.forEach { webView ->
                webView.evaluateJavascript(js, null)
            }
        }
    }

    companion object {
        private lateinit var instance: JSBridge
        private val plugins = mutableMapOf<String, BridgePlugin>()

        fun init(context: Context) {
            instance = JSBridge(context.applicationContext)
            register(CameraPlugin(context.applicationContext))
            register(LocationPlugin(context.applicationContext))
            register(ScanPlugin(context.applicationContext))
            register(StoragePlugin(context.applicationContext))
            register(NavPlugin(context.applicationContext))
            register(SharePlugin(context.applicationContext))
            register(AppPlugin(context.applicationContext))
        }

        fun register(plugin: BridgePlugin) {
            plugins[plugin.namespace] = plugin
        }

        fun dispatchEvent(event: String, data: Any? = null) {
            instance.dispatchEvent(event, data)
        }

        fun getInstance(): JSBridge = instance
    }
}

data class BridgeResult(val code: Int, val msg: String, val data: Any?)

interface BridgePlugin {
    val namespace: String
    fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit)
}

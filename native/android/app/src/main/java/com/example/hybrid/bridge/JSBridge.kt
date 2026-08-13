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
import com.example.hybrid.bridge.plugins.ShortcutPlugin
import com.example.hybrid.bridge.plugins.WidgetPlugin
import com.example.hybrid.bridge.plugins.AppReadyPlugin
import com.example.hybrid.bridge.plugins.AudioPlugin
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

    /** H5 是否已挂载事件监听器（由 H5 调 app.ready 置位，访问受 eventLock 保护） */
    private var h5Ready = false

    /** H5 未就绪时排队的事件（event, data），待 markH5Ready 后冲刷 */
    private val pendingEvents = mutableListOf<Pair<String, Any?>>()
    private val eventLock = Any()

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

    /**
     * 原生派发事件到 H5。
     * - H5 已就绪：立即派发，返回 true。
     * - H5 未就绪（冷启动 / 白屏期）：排队，待 markH5Ready 后冲刷，返回 false。
     * 这样事件既不丢失，也不会因「WebView 实例在但 H5 监听未挂载」被 JS 端短路丢弃。
     */
    fun dispatchEvent(event: String, data: Any?): Boolean {
        synchronized(eventLock) {
            if (h5Ready) {
                evalEventJS(event, data)
                return true
            }
            pendingEvents.add(event to data)
        }
        return false
    }

    /** H5 通知原生其已就绪（事件监听器已挂载），冲刷此前排队的事件 */
    fun markH5Ready() {
        val queue: List<Pair<String, Any?>>
        synchronized(eventLock) {
            h5Ready = true
            queue = pendingEvents.toList()
            pendingEvents.clear()
        }
        for ((event, data) in queue) {
            evalEventJS(event, data)
        }
    }

    private fun evalEventJS(event: String, data: Any?) {
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
            register(ShortcutPlugin(context.applicationContext))
            register(WidgetPlugin(context.applicationContext))
            register(AppReadyPlugin())
            register(AudioPlugin(context.applicationContext))
        }

        fun register(plugin: BridgePlugin) {
            plugins[plugin.namespace] = plugin
        }

        fun dispatchEvent(event: String, data: Any? = null): Boolean {
            return instance.dispatchEvent(event, data)
        }

        /** H5 就绪握手：收到 app.ready 后冲刷排队的事件 */
        fun markH5Ready() {
            instance.markH5Ready()
        }

        fun getInstance(): JSBridge = instance
    }
}

data class BridgeResult(val code: Int, val msg: String, val data: Any?)

interface BridgePlugin {
    val namespace: String
    fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit)
}

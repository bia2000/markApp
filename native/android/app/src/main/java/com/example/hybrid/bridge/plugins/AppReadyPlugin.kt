package com.example.hybrid.bridge.plugins

import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import com.example.hybrid.bridge.JSBridge
import org.json.JSONObject

/**
 * H5 就绪握手插件（namespace = app）。
 *
 * H5 完成事件监听器挂载后调用 app.ready，原生据此将此前因「H5 尚未就绪」
 * 而排队的事件（如桌面组件点事项记录）统一冲刷给 H5，避免冷启动 / 白屏期
 * 事件丢失。
 */
class AppReadyPlugin : BridgePlugin {
    override val namespace: String = "app"

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        when (method) {
            "ready" -> {
                JSBridge.markH5Ready()
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            else -> completion(BridgeResult(-1, "method not found", null))
        }
    }
}

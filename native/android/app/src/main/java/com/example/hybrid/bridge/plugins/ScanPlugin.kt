package com.example.hybrid.bridge.plugins

import android.content.Context
import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import org.json.JSONObject

class ScanPlugin(private val context: Context) : BridgePlugin {
    override val namespace: String = "device.scan"

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        when (method) {
            "scanCode" -> {
                // 实际项目接入 ZXing 或自研扫码页
                completion(BridgeResult(0, "ok", JSONObject().put("result", "https://example.com/qr")))
            }
            else -> completion(BridgeResult(-1, "method not found", null))
        }
    }
}

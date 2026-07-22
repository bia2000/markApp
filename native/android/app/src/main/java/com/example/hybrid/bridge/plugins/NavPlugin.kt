package com.example.hybrid.bridge.plugins

import android.content.Context
import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import com.example.hybrid.shell.HybridWebActivity
import org.json.JSONObject

class NavPlugin(private val context: Context) : BridgePlugin {
    override val namespace: String = "nav"

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        when (method) {
            "setTitle" -> {
                // 实际项目更新当前 Activity 的 ActionBar 标题
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            "setBarVisible" -> {
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            "setRightButton" -> {
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            "push" -> {
                val url = params.optString("url")
                val title = params.optString("title")
                HybridWebActivity.launch(context, url, title)
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            "pop" -> {
                // 实际项目 finish 当前 Activity
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            "switchTab" -> {
                val index = params.optInt("index", 0)
                // 实际项目通过 EventBus 通知 MainActivity 切换 ViewPager
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            else -> completion(BridgeResult(-1, "method not found", null))
        }
    }
}

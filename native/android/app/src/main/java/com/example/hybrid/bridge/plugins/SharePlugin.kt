package com.example.hybrid.bridge.plugins

import android.content.Context
import android.content.Intent
import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import org.json.JSONObject

class SharePlugin(private val context: Context) : BridgePlugin {
    override val namespace: String = "share"

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        val title = params.optString("title")
        val content = params.optString("content")
        val url = params.optString("url")

        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, title)
            putExtra(Intent.EXTRA_TEXT, "$title\n$content\n$url")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(Intent.createChooser(shareIntent, "分享到").apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        })
        completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
    }
}

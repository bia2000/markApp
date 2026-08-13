package com.example.hybrid.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.example.hybrid.R
import com.example.hybrid.bridge.plugins.EXTRA_ITEM_ID
import com.example.hybrid.bridge.plugins.RECORD_ITEM_ACTION
import com.example.hybrid.bridge.plugins.WIDGET_PAYLOAD_KEY
import com.example.hybrid.bridge.plugins.WIDGET_RECORDS_KEY
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.random.Random

/**
 * 桌面组件点事项记录的广播接收器（不拉起 App）。
 *
 * 收到 RECORD_ITEM_ACTION + EXTRA_ITEM_ID 后，在原生侧直接完成：
 * 1. 追加一条记录到共享存储 widget:records（hybrid_storage），供 H5 后续打开时合并；
 * 2. 重算今日各事项次数，更新 widget:payload 让组件立即 +1；
 * 3. 广播 APPWIDGET_UPDATE 刷新桌面组件。
 *
 * 全程不启动 Activity，实现「点了不打开 App、桌面直接 +1」；记录再经 H5 打开时
 * 合并进其本地 store，保证两端数据一致。
 */
class WidgetRecordReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (RECORD_ITEM_ACTION != intent.action) return
        val itemId = intent.getStringExtra(EXTRA_ITEM_ID)
        if (itemId.isNullOrEmpty()) return

        val prefs = context.getSharedPreferences("hybrid_storage", Context.MODE_PRIVATE)

        // 读取组件 payload，拿到事项标题/颜色用于新记录与重建显示
        val payloadRaw = prefs.getString(WIDGET_PAYLOAD_KEY, null)
        val payload = if (payloadRaw.isNullOrEmpty()) {
            JSONObject()
        } else {
            runCatching { JSONObject(payloadRaw) }.getOrElse { JSONObject() }
        }
        val itemsArr = payload.optJSONArray("items") ?: JSONArray()

        var title = itemId
        var color = "#1989fa"
        var score = 1
        for (i in 0 until itemsArr.length()) {
            val o = itemsArr.getJSONObject(i)
            if (o.optString("id") == itemId) {
                title = o.optString("title", itemId)
                color = o.optString("color", "#1989fa")
                score = o.optInt("score", 1)
                break
            }
        }

        val now = Date()
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(now)
        val timeStr = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(now)
        val record = JSONObject().apply {
            put("id", uid())
            put("itemId", itemId)
            put("title", title)
            put("date", dateStr)
            put("time", timeStr)
            put("score", score)
            put("createdAt", now.time)
        }

        // 1) 追加到共享记录存储（hybrid_storage），H5 打开时合并
        val recordsArr = runCatching { JSONArray(prefs.getString(WIDGET_RECORDS_KEY, "[]")) }
            .getOrElse { JSONArray() }
        recordsArr.put(record)
        prefs.edit().putString(WIDGET_RECORDS_KEY, recordsArr.toString()).apply()

        // 2) 重算今日次数与今日得分，更新 widget:payload（组件立即 +1）
        val counts = mutableMapOf<String, Int>()
        var todayScore = 0
        for (i in 0 until recordsArr.length()) {
            val r = recordsArr.getJSONObject(i)
            if (r.optString("date") == dateStr) {
                val id = r.optString("itemId")
                counts[id] = (counts[id] ?: 0) + 1
                todayScore += r.optInt("score", 1)
            }
        }
        val newItems = JSONArray()
        for (i in 0 until itemsArr.length()) {
            val o = itemsArr.getJSONObject(i)
            val id = o.optString("id")
            o.put("count", counts[id] ?: 0)
            newItems.put(o)
        }
        val newPayload = JSONObject().apply {
            put("date", dateStr)
            put("todayScore", todayScore)
            put("items", newItems)
        }
        prefs.edit().putString(WIDGET_PAYLOAD_KEY, newPayload.toString()).apply()

        // 3) 刷新组件
        requestWidgetUpdate(context)
    }

    private fun uid(): String {
        val t = System.currentTimeMillis().toString(36)
        val r = Random.nextInt(0x1000000).toString(36).padStart(5, '0')
        return "$t$r"
    }

    /** 通知系统刷新所有已添加的桌面组件实例 */
    private fun requestWidgetUpdate(context: Context) {
        try {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, TodoWidgetProvider::class.java))
            if (ids.isNotEmpty()) {
                mgr.notifyAppWidgetViewDataChanged(ids, R.id.widget_list)
                val intent = Intent(context, TodoWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                }
                context.sendBroadcast(intent)
            }
        } catch (e: Exception) {
            // 无组件实例时不报错
        }
    }
}

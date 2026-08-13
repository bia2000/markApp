package com.example.hybrid.bridge.plugins

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.example.hybrid.R
import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import com.example.hybrid.widget.TodoWidgetProvider
import org.json.JSONArray
import org.json.JSONObject

/** 原生 SharedPreferences 中存放组件 payload 的 key（与 StoragePlugin 共用 hybrid_storage） */
const val WIDGET_PAYLOAD_KEY = "widget:payload"

/** 桌面组件点事项记录时，原生直接写入的共享记录 key（hybrid_storage），供 H5 合并 */
const val WIDGET_RECORDS_KEY = "widget:records"

/** 桌面组件点事项记录时，PendingIntent 拉起 App 的自定义 Action */
const val RECORD_ITEM_ACTION = "com.example.hybrid.action.RECORD_ITEM"

/** 记录意图携带的事项 id extra 名 */
const val EXTRA_ITEM_ID = "item_id"

/**
 * 进程内 pending：冷启动时 H5 尚未就绪，先暂存待记录的事项 id，
 * 待 H5 加载完成后通过 widget.getPendingRecord 拉取并消费。
 */
object RecordState {
    var pendingItemId: String? = null
}

/**
 * 桌面组件数据同步插件。
 *
 * H5 在待办数据变化时调用 widget.sync，把「事项 + 今日次数」写入原生
 * SharedPreferences（hybrid_storage），再广播 APPWIDGET_UPDATE 触发组件刷新。
 * 组件本身运行在 App 进程内，直接读这份 SharedPreferences 即可渲染。
 */
class WidgetPlugin(private val context: Context) : BridgePlugin {
    override val namespace: String = "widget"

    private val prefs by lazy {
        context.getSharedPreferences("hybrid_storage", Context.MODE_PRIVATE)
    }

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        when (method) {
            "sync" -> {
                val payload = params.optJSONObject("payload")
                prefs.edit().putString(WIDGET_PAYLOAD_KEY, payload?.toString() ?: "{}").commit()
                requestWidgetUpdate()
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            "getPendingRecord" -> {
                val pending = RecordState.pendingItemId
                RecordState.pendingItemId = null
                completion(BridgeResult(0, "ok", JSONObject().put("pending", pending)))
            }
            "addRecord" -> {
                // H5 内点击事项时，把同一条记录（共用 id）追加进原生共享账本 widget:records，
                // 使 widget:records 成为「H5 内点击 + 桌面点击」的完整账本。
                // 桌面点击的 WidgetRecordReceiver 重算今日次数/得分时只枚举本账本，
                // 因此 H5 内记录的分数/次数不会再被覆盖丢失。
                val record = params.optJSONObject("record")
                if (record != null) {
                    val arr = runCatching { JSONArray(prefs.getString(WIDGET_RECORDS_KEY, "[]")) }
                        .getOrElse { JSONArray() }
                    arr.put(record)
                    prefs.edit().putString(WIDGET_RECORDS_KEY, arr.toString()).apply()
                }
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            "removeRecords" -> {
                // 删除事项时同步清理原生共享账本 widget:records 中的同名记录，
                // 否则该事项的旧分数会在「桌面点别的事项→重算今日得分」时被算进去（虚高）。
                val itemId = params.optString("itemId")
                if (itemId.isNotEmpty()) {
                    val arr = runCatching { JSONArray(prefs.getString(WIDGET_RECORDS_KEY, "[]")) }
                        .getOrElse { JSONArray() }
                    val kept = JSONArray()
                    for (i in 0 until arr.length()) {
                        val r = arr.getJSONObject(i)
                        if (r.optString("itemId") != itemId) kept.put(r)
                    }
                    prefs.edit().putString(WIDGET_RECORDS_KEY, kept.toString()).apply()

                    // 基于清后的账本重算今日次数/得分，并从 payload 剔除该事项，刷新组件
                    val payloadRaw = prefs.getString(WIDGET_PAYLOAD_KEY, null)
                    if (payloadRaw != null) {
                        val payload = runCatching { JSONObject(payloadRaw) }.getOrNull()
                        if (payload != null) {
                            val dateStr = payload.optString("date")
                            val itemsArr = payload.optJSONArray("items") ?: JSONArray()
                            val counts = mutableMapOf<String, Int>()
                            var todayScore = 0
                            for (i in 0 until kept.length()) {
                                val r = kept.getJSONObject(i)
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
                                if (id != itemId) {
                                    o.put("count", counts[id] ?: 0)
                                    newItems.put(o)
                                }
                            }
                            payload.put("items", newItems)
                            payload.put("todayScore", todayScore)
                            prefs.edit().putString(WIDGET_PAYLOAD_KEY, payload.toString()).apply()
                            requestWidgetUpdate()
                        }
                    }
                }
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            "removeRecord" -> {
                // 删除单条得分记录（H5 统计页 removeRecord）时同步清原生账本，
                // 否则该记录残留 → 桌面点别的事项重算今日得分时把它算进去（等于删除无效、得分回到删除前）。
                val recId = params.optString("id")
                if (recId.isNotEmpty()) {
                    val arr = runCatching { JSONArray(prefs.getString(WIDGET_RECORDS_KEY, "[]")) }
                        .getOrElse { JSONArray() }
                    val kept = JSONArray()
                    for (i in 0 until arr.length()) {
                        val r = arr.getJSONObject(i)
                        if (r.optString("id") != recId) kept.put(r)
                    }
                    prefs.edit().putString(WIDGET_RECORDS_KEY, kept.toString()).apply()
                }
                completion(BridgeResult(0, "ok", JSONObject().put("code", 0)))
            }
            else -> completion(BridgeResult(-1, "method not found", null))
        }
    }

    /** 通知系统刷新所有已添加的桌面组件实例 */
    private fun requestWidgetUpdate() {
        try {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, TodoWidgetProvider::class.java))
            if (ids.isNotEmpty()) {
                // 直接更新 + 触发集合数据刷新（让 RemoteViewsFactory 重读 payload）
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

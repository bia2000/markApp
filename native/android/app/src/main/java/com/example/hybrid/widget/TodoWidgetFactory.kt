package com.example.hybrid.widget

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.example.hybrid.R
import com.example.hybrid.bridge.plugins.EXTRA_ITEM_ID
import com.example.hybrid.bridge.plugins.WIDGET_PAYLOAD_KEY
import org.json.JSONObject

/**
 * 读取 widget:payload（H5 经 WidgetPlugin 写入 hybrid_storage）渲染事项列表。
 * 每行点击携带 itemId，交由 MainActivity 的 RECORD_ITEM 意图处理。
 */
class TodoWidgetFactory(private val context: Context, intent: Intent) :
    RemoteViewsService.RemoteViewsFactory {

    private val appWidgetId =
        intent.getIntExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, 0)
    private var items: List<WidgetItem> = emptyList()

    data class WidgetItem(
        val id: String,
        val title: String,
        val color: String,
        val score: Int,
        val count: Int
    )

    override fun onCreate() {
        loadData()
    }

    override fun onDataSetChanged() {
        loadData()
    }

    override fun onDestroy() {
        items = emptyList()
    }

    override fun getCount(): Int = items.size

    override fun getViewAt(position: Int): RemoteViews {
        val item = items.getOrNull(position) ?: return RemoteViews(context.packageName, R.layout.widget_todo_row)
        val rv = RemoteViews(context.packageName, R.layout.widget_todo_row)
        rv.setTextViewText(R.id.row_title, item.title)
        // 事项标题用其主题色，直观区分
        rv.setTextColor(R.id.row_title, parseColor(item.color))
        rv.setTextViewText(R.id.row_count, item.count.toString())
        // 每行显示该事项的分值（点一下得几分），让用户直观看到分数
        rv.setTextViewText(R.id.row_score, "+${item.score}")

        // 点击该行 = 记录一次：把 itemId 填入模板 PendingIntent
        val fill = Intent().apply { putExtra(EXTRA_ITEM_ID, item.id) }
        rv.setOnClickFillInIntent(R.id.row_root, fill)
        return rv
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long =
        items.getOrNull(position)?.id?.hashCode()?.toLong() ?: position.toLong()

    override fun hasStableIds(): Boolean = true

    private fun loadData() {
        val prefs = context.getSharedPreferences("hybrid_storage", Context.MODE_PRIVATE)
        val raw = prefs.getString(WIDGET_PAYLOAD_KEY, null)
        items = if (raw.isNullOrEmpty()) emptyList() else parse(raw)
    }

    private fun parse(raw: String): List<WidgetItem> {
        val list = mutableListOf<WidgetItem>()
        try {
            val obj = JSONObject(raw)
            val arr = obj.optJSONArray("items") ?: return list
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                list.add(
                    WidgetItem(
                        id = o.optString("id"),
                        title = o.optString("title"),
                        color = o.optString("color", "#1989fa"),
                        score = o.optInt("score", 1),
                        count = o.optInt("count", 0)
                    )
                )
            }
        } catch (e: Exception) {
            // 坏数据降级为空
        }
        return list
    }

    private fun parseColor(c: String): Int =
        try {
            Color.parseColor(c)
        } catch (e: Exception) {
            Color.parseColor("#1989fa")
        }
}

package com.example.hybrid.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import com.example.hybrid.R
import com.example.hybrid.bridge.plugins.RECORD_ITEM_ACTION
import com.example.hybrid.bridge.plugins.WIDGET_PAYLOAD_KEY
import com.example.hybrid.shell.MainActivity
import com.example.hybrid.widget.WidgetRecordReceiver
import org.json.JSONObject

/**
 * 桌面组件：展示「记事项」应用的事项列表，点事项即记录一次。
 *
 * RemoteViews 不支持 WebView，故列表数据来自 H5 经 WidgetPlugin 写入的
 * SharedPreferences（widget:payload），由 TodoWidgetFactory 渲染。
 */
class TodoWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_todo)

        // 头部点击：打开 App 首页
        val openIntent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        views.setOnClickPendingIntent(
            R.id.widget_header,
            PendingIntent.getActivity(context, 0, openIntent, pendingFlags())
        )

        // 头部日期：取 payload 里的 date 字段
        val date = context.getSharedPreferences("hybrid_storage", Context.MODE_PRIVATE)
            .getString(WIDGET_PAYLOAD_KEY, null)
            ?.let { raw ->
                try {
                    JSONObject(raw).optString("date", "")
                } catch (e: Exception) {
                    ""
                }
            } ?: ""
        views.setTextViewText(R.id.widget_date, date)

        // 头部今日得分：取 payload 里的 todayScore 字段
        val todayScore = context.getSharedPreferences("hybrid_storage", Context.MODE_PRIVATE)
            .getString(WIDGET_PAYLOAD_KEY, null)
            ?.let { raw ->
                try {
                    JSONObject(raw).optInt("todayScore", 0)
                } catch (e: Exception) {
                    0
                }
            } ?: 0
        views.setTextViewText(R.id.widget_score, "今日 ${todayScore} 分")

        // 列表绑定到 RemoteViewsService
        val serviceIntent = Intent(context, TodoWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        views.setRemoteAdapter(R.id.widget_list, serviceIntent)
        views.setEmptyView(R.id.widget_list, R.id.widget_empty)

        // 列表项点击模板：记录对应事项（具体 itemId 由每行的 fillInIntent 填充）。
        // 走广播到 WidgetRecordReceiver，点击不拉起 App，由原生直接 +1 并刷新组件。
        // 注意：集合控件逐行 fillInIntent 需要在点击时回填 extra，Android 12+ 必须用
        // FLAG_MUTABLE，否则 itemId 被剥离（旧实现用 IMMUTABLE 导致「点了没记上」）。
        val template = Intent(context, WidgetRecordReceiver::class.java).apply {
            action = RECORD_ITEM_ACTION
        }
        views.setPendingIntentTemplate(
            R.id.widget_list,
            PendingIntent.getBroadcast(context, 1, template, mutableFlags())
        )

        appWidgetManager.updateAppWidget(appWidgetId, views)
        // 数据可能已变化，强制集合重读
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_list)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE == intent.action) {
            val ids = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS)
            if (ids != null && ids.isNotEmpty()) {
                onUpdate(context, AppWidgetManager.getInstance(context), ids)
            }
        }
    }

    companion object {
        /** PendingIntent flag：API 23+ 需要 IMMUTABLE，低版本传 0（用于无 fillIn 的普通点击） */
        fun pendingFlags(): Int =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE
            } else {
                0
            }

        /**
         * 集合控件逐行点击的模板 PendingIntent 需要的 flag。
         * 点击时由 fillInIntent 回填 extra（如 EXTRA_ITEM_ID），Android 12+(API 31+)
         * 必须用 FLAG_MUTABLE，否则回填的 extra 被剥离。低版本无此限制，传 0。
         */
        fun mutableFlags(): Int =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_MUTABLE
            } else {
                0
            }
    }
}

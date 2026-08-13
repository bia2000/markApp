package com.example.hybrid.widget

import android.content.Intent
import android.widget.RemoteViewsService

/**
 * 桌面组件列表的数据服务（RemoteViews 集合控件要求走独立进程的服务提供视图）。
 */
class TodoWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return TodoWidgetFactory(applicationContext, intent)
    }
}

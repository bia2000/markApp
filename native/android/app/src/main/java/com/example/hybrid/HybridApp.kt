package com.example.hybrid

import android.app.Application
import com.example.hybrid.bridge.JSBridge
import com.example.hybrid.bridge.EventBus
import com.example.hybrid.offline.OfflinePackage
import com.example.hybrid.webview.WebViewPool

class HybridApp : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
        // 1. 全局初始化
        JSBridge.init(this)
        OfflinePackage.startup(this)
        // 2. 预热 WebView
        WebViewPool.preheat(this)
    }

    companion object {
        lateinit var instance: HybridApp
            private set
    }
}

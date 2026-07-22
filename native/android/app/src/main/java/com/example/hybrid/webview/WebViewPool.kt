package com.example.hybrid.webview

import android.content.Context
import android.webkit.WebView
import android.webkit.WebViewClient
import com.example.hybrid.bridge.JSBridge
import com.example.hybrid.offline.OfflinePackage

/**
 * WebView 池：预热 WebView 实例，减少首次打开页面的白屏时间
 */
object WebViewPool {

    private val pool: ArrayDeque<WebView> = ArrayDeque()
    private const val MAX_SIZE = 3

    /**
     * 启动时预热：创建并加载离线包入口，完成 JS/CSS 解析（不显示）
     */
    fun preheat(context: Context) {
        repeat(2) {
            val wv = createWebView(context)
            val url = OfflinePackage.entryUrl() ?: "https://app.example.com/index.html"
            wv.loadUrl(url)
            pool.add(wv)
        }
    }

    /**
     * 从池中取一个预热好的实例；没有则新建
     */
    fun dequeue(context: Context): WebView {
        return pool.removeFirstOrNull() ?: createWebView(context)
    }

    /**
     * 用完归还（页面级 WebView 可复用）
     */
    fun enqueue(webView: WebView) {
        if (pool.size >= MAX_SIZE) {
            webView.destroy()
            return
        }
        webView.stopLoading()
        webView.loadUrl("about:blank")
        pool.add(webView)
    }

    private fun createWebView(context: Context): WebView {
        return WebView(context).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.useWideViewPort = true
            webViewClient = object : WebViewClient() {}
            addJavascriptInterface(JSBridge(context), "NativeBridge")
        }
    }
}

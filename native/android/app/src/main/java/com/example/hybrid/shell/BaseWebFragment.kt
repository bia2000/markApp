package com.example.hybrid.shell

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.LinearLayout
import androidx.fragment.app.Fragment
import com.example.hybrid.R
import com.example.hybrid.bridge.JSBridge
import java.util.UUID

/**
 * 单个 Tab 承载的 WebView Fragment
 * 子类通过 routePath 指定初始路由
 */
abstract class BaseWebFragment : Fragment() {

    protected lateinit var webView: WebView
    protected abstract val routePath: String
    private val webViewId = UUID.randomUUID().toString()
    private lateinit var loadingOverlay: LinearLayout

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val root = inflater.inflate(R.layout.fragment_web, container, false)

        webView = root.findViewById(R.id.webView)
        loadingOverlay = root.findViewById(R.id.loadingOverlay)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.useWideViewPort = true
        webView.settings.loadWithOverviewMode = true

        // 离线包拦截
        webView.webViewClient = com.example.hybrid.offline.OfflinePackageClient()

        // 监听加载进度
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress >= 100) {
                    loadingOverlay.visibility = View.GONE
                }
            }
        }

        // 注册 JSBridge
        webView.addJavascriptInterface(JSBridge.getInstance(), "NativeBridge")

        // 注册 WebView 到 JSBridge
        JSBridge.getInstance().attachWebView(webViewId, webView)

        return root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadEntry()
    }

    private fun loadEntry() {
        val baseUrl = com.example.hybrid.offline.OfflinePackage.entryUrl() ?: "http://192.168.121.34:5173/"
        // 移除末尾斜杠，添加路由路径
        val cleanBase = baseUrl.removeSuffix("/")
        val url = "$cleanBase$routePath"
        webView.loadUrl(url)
    }

    override fun onDestroyView() {
        // 移除 WebView 注册
        JSBridge.getInstance().detachWebView(webViewId)
        webView.destroy()
        super.onDestroyView()
    }
}
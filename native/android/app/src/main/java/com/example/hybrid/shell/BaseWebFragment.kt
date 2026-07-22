package com.example.hybrid.shell

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.fragment.app.Fragment
import com.example.hybrid.bridge.JSBridge

/**
 * 单个 Tab 承载的 WebView Fragment
 * 子类通过 routePath 指定初始路由
 */
abstract class BaseWebFragment : Fragment() {

    protected lateinit var webView: WebView
    protected abstract val routePath: String

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        webView = WebView(requireContext()).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            // 离线包拦截
            webViewClient = com.example.hybrid.offline.OfflinePackageClient()
            // 注册 JSBridge
            addJavascriptInterface(JSBridge(this@BaseWebFragment), "NativeBridge")
        }
        return webView
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadEntry()
    }

    private fun loadEntry() {
        val url = com.example.hybrid.offline.OfflinePackage.entryUrl() ?: "https://app.example.com/index.html"
        webView.loadUrl(url)
    }

    override fun onDestroyView() {
        webView.destroy()
        super.onDestroyView()
    }
}

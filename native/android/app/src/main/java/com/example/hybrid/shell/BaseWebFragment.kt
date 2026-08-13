package com.example.hybrid.shell

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
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
        // file:// 离线包场景：必须允许页面加载同目录树下的子资源（assets/ 下的 JS/CSS 模块），
        // 否则 WebView 按 file:// 同源策略拦截，ES module 永远加载不出来，H5 启动页「正在加载」卡死。
        webView.settings.allowFileAccessFromFileURLs = true
        webView.settings.allowUniversalAccessFromFileURLs = true

        // 离线包拦截 + 加载遮罩控制：页面完成或失败都隐藏「正在加载」遮罩。
        // 不再依赖 onProgressChanged 到 100（加载失败时进度到不了 100，会一直卡遮罩）。
        webView.webViewClient = object : com.example.hybrid.offline.OfflinePackageClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                loadingOverlay.visibility = View.GONE
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                loadingOverlay.visibility = View.GONE
            }

            @Suppress("OverridingDeprecatedMember")
            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                loadingOverlay.visibility = View.GONE
            }
        }

        // 监听加载进度（仅用于调试进度，遮罩隐藏改由 onPageFinished 负责）
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress >= 100) {
                    loadingOverlay.visibility = View.GONE
                }
            }
        }

        // 兜底保险：无论加载成功/失败，最多 4 秒后强制隐藏「正在加载」遮罩，
        // 避免极个别机型 onPageFinished/onReceivedError 未触发导致永久卡死。
        loadingOverlay.postDelayed({
            loadingOverlay.visibility = View.GONE
        }, 4000)

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

    /**
     * 通知 H5 重新从持久化层读取数据（跨 WebView 数据同步）。
     * 原生切换 Tab 时调用，保证统计页看到最新记录。
     */
    fun resyncData() {
        if (::webView.isInitialized) {
            webView.evaluateJavascript("window.__todoResync && window.__todoResync()", null)
        }
    }

    private fun loadEntry() {
        // 优先加载打包进 APK 的离线 H5（assets/offline），使安装后无需联网；
        // 未打包离线资产时回退到开发服务器，方便本地联调。
        val baseUrl = if (hasBundledOffline()) {
            "file:///android_asset/offline"
        } else {
            com.example.hybrid.offline.OfflinePackage.entryUrl() ?: "http://192.168.121.34:5173/"
        }
        val cleanBase = baseUrl.removeSuffix("/")
        // file:// 下必须指向具体文件(index.html)，否则 WebView 只拿到目录路径会报
        // ERR_FILE_NOT_FOUND；hash 拼在文件名之后作为客户端路由（H5 使用 hash 模式，见 router/index.ts）。
        val url = "$cleanBase/index.html#$routePath"
        webView.loadUrl(url)
    }

    /** assets/offline 下是否打包了离线 H5 */
    private fun hasBundledOffline(): Boolean {
        return try {
            val list = requireContext().assets.list("offline")
            list != null && list.isNotEmpty()
        } catch (e: Exception) {
            false
        }
    }

    override fun onDestroyView() {
        // 移除 WebView 注册
        JSBridge.getInstance().detachWebView(webViewId)
        webView.destroy()
        super.onDestroyView()
    }
}
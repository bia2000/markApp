package com.example.hybrid.shell

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.example.hybrid.R

/**
 * 页面级容器：通过 bridge.nav.push 启动，承载二级页面 WebView
 */
class HybridWebActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_URL = "extra_url"
        const val EXTRA_TITLE = "extra_title"

        fun launch(context: android.content.Context, url: String, title: String?) {
            val intent = Intent(context, HybridWebActivity::class.java).apply {
                putExtra(EXTRA_URL, url)
                title?.let { putExtra(EXTRA_TITLE, it) }
            }
            context.startActivity(intent)
        }
    }

    private lateinit var webView: android.webkit.WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_hybrid_web)

        val url = intent.getStringExtra(EXTRA_URL) ?: return finish()
        val title = intent.getStringExtra(EXTRA_TITLE)

        webView = findViewById(R.id.webView)
        webView.apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = com.example.hybrid.offline.OfflinePackageClient()
            addJavascriptInterface(com.example.hybrid.bridge.JSBridge(this@HybridWebActivity), "NativeBridge")
        }

        title?.let { supportActionBar?.title = it }
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val targetUrl = com.example.hybrid.offline.OfflinePackage.entryUrl() ?: "https://app.example.com$url"
        webView.loadUrl(targetUrl)
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}

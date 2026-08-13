package com.example.hybrid.offline

import android.content.Context
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.File
import java.io.FileInputStream
import java.net.URL
import java.util.zip.ZipInputStream

/**
 * 离线包管理：版本比对、本地解压、WebView 请求拦截
 */
object OfflinePackage {

    private lateinit var rootDir: File
    private var currentVersion: String = "0"

    fun startup(context: Context) {
        rootDir = File(context.filesDir, "offline").apply { mkdirs() }
        loadLocalVersion()
        checkUpdate()
    }

    private fun loadLocalVersion() {
        val manifestFile = File(rootDir, "manifest.json")
        if (manifestFile.exists()) {
            val manifest = manifestFile.readText()
            // 简单解析版本
            val regex = """"version"\s*:\s*"([^"]+)"""".toRegex()
            regex.find(manifest)?.let { currentVersion = it.groupValues[1] }
        }
    }

    /** 请求服务端 manifest，有更新则下载 zip 解压 */
    fun checkUpdate() {
        Thread {
            try {
                val url = URL("https://app.example.com/offline/manifest.json")
                val conn = url.openConnection()
                val manifest = conn.getInputStream().bufferedReader().readText()
                val regex = """"version"\s*:\s*"([^"]+)"""".toRegex()
                val version = regex.find(manifest)?.groupValues?.get(1) ?: return@Thread
                if (version != currentVersion) {
                    val pkgRegex = """"packageUrl"\s*:\s*"([^"]+)"""".toRegex()
                    val pkgUrl = pkgRegex.find(manifest)?.groupValues?.get(1) ?: return@Thread
                    downloadAndExtract(pkgUrl, version)
                }
            } catch (e: Exception) {
                // ignore
            }
        }.start()
    }

    private fun downloadAndExtract(url: String, version: String) {
        try {
            val targetDir = File(rootDir, version).apply {
                if (exists()) deleteRecursively()
                mkdirs()
            }
            val zipFile = File(rootDir, "temp_$version.zip")
            URL(url).openStream().use { input ->
                zipFile.outputStream().use { input.copyTo(it) }
            }
            ZipInputStream(zipFile.inputStream()).use { zis ->
                var entry = zis.nextEntry
                while (entry != null) {
                    val outFile = File(targetDir, entry.name)
                    if (entry.isDirectory) outFile.mkdirs()
                    else {
                        outFile.parentFile?.mkdirs()
                        outFile.outputStream().use { zis.copyTo(it) }
                    }
                    entry = zis.nextEntry
                }
            }
            zipFile.delete()
            currentVersion = version
        } catch (e: Exception) {
            // ignore
        }
    }

    /** 入口 URL：本地离线包 index.html，未命中返回开发服务器地址 */
    fun entryUrl(): String? {
        val entry = File(rootDir, "$currentVersion/index.html")
        // 真机使用电脑局域网 IP，模拟器使用 10.0.2.2
        return if (entry.exists()) "file://${entry.absolutePath}" else "http://192.168.121.34:5173/"
    }

    /** 获取当前离线包版本 */
    fun getCurrentVersion(): String = currentVersion
}

/**
 * WebView 资源拦截：命中离线包则返回本地数据
 */
open class OfflinePackageClient : WebViewClient() {

    override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
        val url = request?.url?.toString() ?: return null
        // 命中离线包：读取本地文件
        if (url.startsWith("https://app.example.com/")) {
            val path = url.substringAfter("https://app.example.com/")
            val version = OfflinePackage.getCurrentVersion()
            // 实际项目：从离线包目录读取对应文件
        }
        return null
    }
}

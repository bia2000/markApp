package com.example.hybrid.bridge.plugins

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import com.example.hybrid.shell.MainActivity
import org.json.JSONObject

/** 快捷方式点击后拉起 App 并触发的自定义 Action */
const val QUICK_ADD_ACTION = "com.example.hybrid.action.QUICK_ADD"

/** 固定 shortcut id，重复请求会更新已存在的快捷方式而非新建 */
const val SHORTCUT_ID = "quick_add"

/**
 * 进程内 pending 标志：冷启动时 H5 尚未注册监听，先暂存，
 * 待 H5 加载完成后通过 shortcut.getPendingQuickAdd 拉取并消费。
 */
object ShortcutState {
    var pendingQuickAdd: Boolean = false
}

class ShortcutPlugin(private val context: Context) : BridgePlugin {
    override val namespace: String = "shortcut"

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        when (method) {
            "requestPin" -> requestPin(params, completion)
            "getPendingQuickAdd" -> {
                val pending = ShortcutState.pendingQuickAdd
                ShortcutState.pendingQuickAdd = false
                completion(BridgeResult(0, "ok", JSONObject().put("pending", pending)))
            }
            else -> completion(BridgeResult(-1, "method not found", null))
        }
    }

    private fun requestPin(params: JSONObject, completion: (BridgeResult) -> Unit) {
        val label = params.optString("label").ifEmpty { "快速记一笔" }

        // 快捷方式点击后启动首页，并带上自定义 Action
        val targetIntent = Intent(context, MainActivity::class.java).apply {
            action = QUICK_ADD_ACTION
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        // 优先使用系统 ShortcutManager.requestPinShortcut（API 26+，弹系统确认框，最稳）。
        // 之前 MIUI 落盘失败是缺权限所致，现在权限已授予，现代 API 即为首选路径。
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            ShortcutManagerCompat.isRequestPinShortcutSupported(context)
        ) {
            try {
                val info = ShortcutInfoCompat.Builder(context, SHORTCUT_ID)
                    .setShortLabel(label)
                    .setLongLabel(label)
                    .setIcon(IconCompat.createWithResource(context, android.R.drawable.sym_def_app_icon))
                    .setIntent(targetIntent)
                    .build()
                val pinned = ShortcutManagerCompat.requestPinShortcut(context, info, null)
                completion(BridgeResult(0, "ok", JSONObject().put("pinned", pinned).put("method", "modern")))
                return
            } catch (e: Exception) {
                // 现代 API 异常，回退到广播
            }
        }

        // 回退 / MIUI：INSTALL_SHORTCUT 广播
        pinShortcutViaBroadcast(context, label, targetIntent, completion)
    }

    /** 通过老式 INSTALL_SHORTCUT 广播请求桌面快捷方式（MIUI 等 ROM 更可靠） */
    private fun pinShortcutViaBroadcast(
        context: Context,
        label: String,
        targetIntent: Intent,
        completion: (BridgeResult) -> Unit
    ) {
        try {
            @Suppress("DEPRECATION")
            val install = Intent("com.android.launcher.action.INSTALL_SHORTCUT").apply {
                putExtra(Intent.EXTRA_SHORTCUT_NAME, label)
                putExtra(Intent.EXTRA_SHORTCUT_INTENT, targetIntent)
                @Suppress("DEPRECATION")
                putExtra(
                    Intent.EXTRA_SHORTCUT_ICON_RESOURCE,
                    Intent.ShortcutIconResource.fromContext(context, android.R.drawable.sym_def_app_icon)
                )
                // 已存在同名快捷方式时不重复添加
                putExtra("duplicate", false)
            }
            context.sendBroadcast(install)
            completion(BridgeResult(0, "ok", JSONObject().put("pinned", true).put("method", "broadcast")))
        } catch (e: Exception) {
            completion(BridgeResult(-2, "request shortcut failed: ${e.message}", null))
        }
    }
}

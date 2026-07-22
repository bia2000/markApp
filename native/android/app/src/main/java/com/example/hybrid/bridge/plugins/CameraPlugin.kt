package com.example.hybrid.bridge.plugins

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import org.json.JSONObject

class CameraPlugin(private val context: android.content.Context) : BridgePlugin {
    override val namespace: String = "device.camera"

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        when (method) {
            "takePhoto" -> takePhoto(params, completion)
            else -> completion(BridgeResult(-1, "method not found: $method", null))
        }
    }

    private fun takePhoto(params: JSONObject, completion: (BridgeResult) -> Unit) {
        val source = params.optString("source", "camera")
        // 1. 权限检查
        val permission = if (source == "album") Manifest.permission.READ_EXTERNAL_STORAGE
        else Manifest.permission.CAMERA

        if (ActivityCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED) {
            // 实际项目应在 Activity 中请求权限，这里返回未授权
            completion(BridgeResult(-2, "权限未授予", null))
            return
        }
        // 2. 调起相机 / 相册
        // 实际项目接入 CameraX 或 Intent(ACTION_IMAGE_CAPTURE)
        completion(BridgeResult(0, "ok", JSONObject().put("uri", "file:///mock/photo.jpg")))
    }
}

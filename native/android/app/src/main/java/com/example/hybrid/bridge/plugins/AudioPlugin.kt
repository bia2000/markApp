package com.example.hybrid.bridge.plugins

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.util.Base64
import androidx.core.app.ActivityCompat
import com.example.hybrid.bridge.BridgePlugin
import com.example.hybrid.bridge.BridgeResult
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream

/**
 * 语音复盘录音桥：H5 发 device.audio.start / device.audio.stop，
 * 原生用 MediaRecorder 录 m4a，stop 时读文件转 base64 回传。
 *
 * 权限：RECORD_AUDIO 在 AndroidManifest 声明，并在 MainActivity 启动预请求，
 * 这里仅做「是否已授权」的检查。离线包 file:// 下 H5 自身 getUserMedia 不可用，
 * 故真机录音必须由原生桥完成。
 */
class AudioPlugin(private val context: Context) : BridgePlugin {
    override val namespace: String = "device.audio"

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var startTime: Long = 0

    override fun handle(method: String, params: JSONObject, completion: (BridgeResult) -> Unit) {
        when (method) {
            "start" -> start(completion)
            "stop" -> stop(completion)
            else -> completion(BridgeResult(-1, "method not found: $method", null))
        }
    }

    private fun start(completion: (BridgeResult) -> Unit) {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            completion(BridgeResult(-2, "麦克风权限未授予", null))
            return
        }
        try {
            val dir = context.getExternalFilesDir(null) ?: context.filesDir
            outputFile = File(dir, "audio_${System.currentTimeMillis()}.m4a")
            recorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioEncodingBitRate(128000)
                setOutputFile(outputFile!!.absolutePath)
                prepare()
                start()
            }
            startTime = System.currentTimeMillis()
            completion(BridgeResult(0, "ok", JSONObject().put("started", true)))
        } catch (e: Exception) {
            recorder?.release()
            recorder = null
            completion(BridgeResult(-3, "录音启动失败: ${e.message}", null))
        }
    }

    private fun stop(completion: (BridgeResult) -> Unit) {
        val rec = recorder
        if (rec == null) {
            completion(BridgeResult(-1, "未在录音", null))
            return
        }
        try {
            rec.stop()
            rec.release()
            recorder = null
            val duration = ((System.currentTimeMillis() - startTime) / 1000).toInt().coerceAtLeast(1)
            val file = outputFile
            if (file == null || !file.exists()) {
                completion(BridgeResult(-1, "录音文件缺失", null))
                return
            }
            val bytes = FileInputStream(file).use { it.readBytes() }
            // 数据已读入内存，删除临时文件，避免外部目录随录音次数无限堆积
            file.delete()
            outputFile = null
            val base64 = Base64.encodeToString(bytes, Base64.DEFAULT)
            val data = JSONObject().apply {
                put("base64", base64)
                put("duration", duration)
                put("format", "m4a")
            }
            completion(BridgeResult(0, "ok", data))
        } catch (e: Exception) {
            completion(BridgeResult(-3, "录音停止失败: ${e.message}", null))
        }
    }
}

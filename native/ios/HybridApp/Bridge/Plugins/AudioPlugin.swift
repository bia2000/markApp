import AVFoundation

/// 语音复盘录音插件：H5 发 device.audio.start / device.audio.stop，
/// 原生用 AVAudioRecorder 录 m4a，stop 时读文件转 base64 回传。
///
/// 权限：首次录音通过 AVAudioSession.requestRecordPermission 弹系统授权；
/// Info.plist 需声明 NSMicrophoneUsageDescription。离线包 file:// 下 H5 自身
/// getUserMedia 不可用，故真机录音必须由原生桥完成。
final class AudioPlugin: BridgePlugin {
    let namespace = "device.audio"
    weak var bridge: JSBridgeContentController?

    private var recorder: AVAudioRecorder?
    private var outputURL: URL?
    private var startTime: TimeInterval = 0

    func handle(method: String, params: Any, completion: @escaping (BridgeResult) -> Void) {
        switch method {
        case "start": start(completion: completion)
        case "stop": stop(completion: completion)
        default: completion(BridgeResult(code: -1, msg: "method not found: \(method)", data: nil))
        }
    }

    private func start(completion: @escaping (BridgeResult) -> Void) {
        let status = AVAudioSession.sharedInstance().recordPermission
        if status == .granted {
            beginRecording(completion: completion)
        } else if status == .notDetermined {
            AVAudioSession.sharedInstance().requestRecordPermission { [weak self] granted in
                DispatchQueue.main.async {
                    if granted { self?.beginRecording(completion: completion) }
                    else { completion(BridgeResult(code: -2, msg: "麦克风权限被拒绝", data: nil)) }
                }
            }
        } else {
            completion(BridgeResult(code: -2, msg: "麦克风权限被拒绝", data: nil))
        }
    }

    private func beginRecording(completion: @escaping (BridgeResult) -> Void) {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
            let dir = FileManager.default.temporaryDirectory
            outputURL = dir.appendingPathComponent("audio_\(Int(Date().timeIntervalSince1970 * 1000)).m4a")
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue
            ]
            recorder = try AVAudioRecorder(url: outputURL!, settings: settings)
            recorder?.record()
            startTime = Date().timeIntervalSince1970
            completion(BridgeResult(code: 0, msg: "ok", data: ["started": true]))
        } catch {
            completion(BridgeResult(code: -3, msg: "录音启动失败: \(error.localizedDescription)", data: nil))
        }
    }

    private func stop(completion: @escaping (BridgeResult) -> Void) {
        guard let rec = recorder else {
            completion(BridgeResult(code: -1, msg: "未在录音", data: nil))
            return
        }
        rec.stop()
        recorder = nil
        let duration = max(1, Int(Date().timeIntervalSince1970 - startTime))
        guard let url = outputURL, let data = try? Data(contentsOf: url) else {
            completion(BridgeResult(code: -1, msg: "录音文件缺失", data: nil))
            return
        }
        let base64 = data.base64EncodedString()
        // 数据已读入内存，删除临时文件，避免 temporaryDirectory 随录音次数无限堆积
        try? FileManager.default.removeItem(at: url)
        outputURL = nil
        completion(BridgeResult(code: 0, msg: "ok", data: ["base64": base64, "duration": duration, "format": "m4a"]))
    }
}

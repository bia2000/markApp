import AVFoundation
import Photos

/// 相机插件：拍照 / 选图
final class CameraPlugin: BridgePlugin {
    weak var hostVC: UIViewController?
    var bridge: JSBridgeContentController?
    let namespace = "device.camera"

    func handle(method: String, params: Any, completion: @escaping (BridgeResult) -> Void) {
        switch method {
        case "takePhoto":
            takePhoto(params: params, completion: completion)
        default:
            completion(BridgeResult(code: -1, msg: "method not found: \(method)", data: nil))
        }
    }

    private func takePhoto(params: Any, completion: @escaping (BridgeResult) -> Void) {
        let dict = params as? [String: Any] ?? [:]
        let source = dict["source"] as? String ?? "camera"

        if source == "album" {
            pickFromAlbum(completion: completion)
        } else {
            takeFromCamera(completion: completion)
        }
    }

    private func takeFromCamera(completion: @escaping (BridgeResult) -> Void) {
        // 1. 权限检查
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        guard status == .authorized else {
            if status == .notDetermined {
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async {
                        if granted { self.presentCamera(completion: completion) }
                        else { completion(BridgeResult(code: -2, msg: "相机权限被拒绝", data: nil)) }
                    }
                }
                return
            }
            completion(BridgeResult(code: -2, msg: "相机权限被拒绝", data: nil))
            return
        }
        presentCamera(completion: completion)
    }

    private func presentCamera(completion: @escaping (BridgeResult) -> Void) {
        // 实际项目接入 UIImagePickerController 或自研相机
        completion(BridgeResult(code: 0, msg: "ok", data: ["uri": "file:///mock/photo.jpg"]))
    }

    private func pickFromAlbum(completion: @escaping (BridgeResult) -> Void) {
        completion(BridgeResult(code: 0, msg: "ok", data: ["uri": "file:///mock/album.jpg"]))
    }
}

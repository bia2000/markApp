import AVFoundation

/// 扫码插件：二维码 / 条形码
final class ScanPlugin: BridgePlugin {
    var bridge: JSBridgeContentController?
    let namespace = "device.scan"

    func handle(method: String, params: Any, completion: @escaping (BridgeResult) -> Void) {
        switch method {
        case "scanCode":
            // 实际项目接入自研扫码页或第三方扫码 SDK
            completion(BridgeResult(code: 0, msg: "ok", data: ["result": "https://example.com/qr"]))
        default:
            completion(BridgeResult(code: -1, msg: "method not found", data: nil))
        }
    }
}

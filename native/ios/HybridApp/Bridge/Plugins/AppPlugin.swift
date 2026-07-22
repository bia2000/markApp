import Foundation

/// App 级能力插件：检查更新、平台信息
final class AppPlugin: BridgePlugin {
    var bridge: JSBridgeContentController?
    let namespace = "device"

    func handle(method: String, params: Any, completion: @escaping (BridgeResult) -> Void) {
        switch method {
        case "getPlatform":
            let info: [String: Any] = [
                "platform": "ios",
                "version": UIDevice.current.systemVersion,
                "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0",
                "statusBarHeight": UIApplication.shared.statusBarFrame.height,
                "safeAreaInset": [
                    "top": UIApplication.shared.windows.first?.safeAreaInsets.top ?? 0,
                    "bottom": UIApplication.shared.windows.first?.safeAreaInsets.bottom ?? 0,
                    "left": 0,
                    "right": 0
                ],
                "apiBaseUrl": "https://api.example.com",
                "environment": "release"
            ]
            completion(BridgeResult(code: 0, msg: "ok", data: info))
        case "getDeviceId":
            let id = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
            completion(BridgeResult(code: 0, msg: "ok", data: ["deviceId": id]))
        default:
            // app.checkUpdate
            if method == "checkUpdate" {
                completion(BridgeResult(code: 0, msg: "ok", data: ["hasUpdate": false]))
            } else {
                completion(BridgeResult(code: -1, msg: "method not found", data: nil))
            }
        }
    }
}

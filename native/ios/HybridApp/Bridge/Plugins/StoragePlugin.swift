import Foundation

/// 本地存储插件：跨 WebView 共享的 KV 存储
final class StoragePlugin: BridgePlugin {
    var bridge: JSBridgeContentController?
    let namespace = "storage.local"
    private let userDefaults = UserDefaults.standard

    func handle(method: String, params: Any, completion: @escaping (BridgeResult) -> Void) {
        let dict = params as? [String: Any] ?? [:]
        switch method {
        case "set":
            let key = dict["key"] as? String ?? ""
            let value = dict["value"]
            userDefaults.set(value, forKey: key)
            completion(BridgeResult(code: 0, msg: "ok", data: ["code": 0]))
        case "get":
            let key = dict["key"] as? String ?? ""
            let value = userDefaults.object(forKey: key)
            completion(BridgeResult(code: 0, msg: "ok", data: ["value": value ?? NSNull()]))
        default:
            completion(BridgeResult(code: -1, msg: "method not found", data: nil))
        }
    }
}

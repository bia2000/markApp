import CoreLocation

/// 定位插件
final class LocationPlugin: BridgePlugin {
    var bridge: JSBridgeContentController?
    let namespace = "device.location"
    private let manager = CLLocationManager()

    func handle(method: String, params: Any, completion: @escaping (BridgeResult) -> Void) {
        switch method {
        case "get":
            getLocation(completion: completion)
        default:
            completion(BridgeResult(code: -1, msg: "method not found", data: nil))
        }
    }

    private func getLocation(completion: @escaping (BridgeResult) -> Void) {
        let status = manager.authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            manager.requestWhenInUseAuthorization()
            completion(BridgeResult(code: -2, msg: "定位权限未授予", data: nil))
            return
        }
        // 实际项目用 manager.requestLocation() 异步获取
        completion(BridgeResult(code: 0, msg: "ok", data: [
            "lat": 39.9042,
            "lng": 116.4074,
            "address": "北京市"
        ]))
    }
}

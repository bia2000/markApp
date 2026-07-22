import WebKit

/// JSBridge 核心：管理原生能力插件，处理 H5 invoke 调用并回传 callback
final class JSBridgeContentController: WKUserContentController, WKScriptMessageHandler {

    private var plugins: [String: BridgePlugin] = [:]
    private let messageName = "NativeBridgeInvoke"

    override init() {
        super.init()
        add(self, name: messageName)
    }

    func register(plugin: BridgePlugin) {
        plugins[plugin.namespace] = plugin
        plugin.bridge = self
    }

    /// 接收 H5 invoke 消息（window.webkit.messageHandlers.NativeBridgeInvoke.postMessage）
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? String,
              let data = body.data(using: .utf8),
              let msg = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              msg["msgType"] as? String == "invoke" else { return }

        let action = msg["action"] as? String ?? ""
        let callbackId = msg["callbackId"] as? String ?? ""
        let params = msg["params"] ?? [:]
        let namespace = action.split(separator: ".").dropLast().joined(separator: ".")
        let method = action.split(separator: ".").last.map(String.init) ?? action

        guard let plugin = plugins[namespace] else {
            callback(callbackId, result: BridgeResult(code: -1, msg: "plugin not found: \(namespace)", data: nil))
            return
        }

        plugin.handle(method: method, params: params) { [weak self] result in
            self?.callback(callbackId, result: result)
        }
    }

    /// 原生回调 H5
    func callback(_ callbackId: String, result: BridgeResult) {
        let payload: [String: Any] = [
            "msgType": "callback",
            "callbackId": callbackId,
            "result": ["code": result.code, "msg": result.msg, "data": result.data as Any]
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        let escaped = json.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
        let js = "window.NativeBridge && window.NativeBridge._recvCallback && window.NativeBridge._recvCallback('\(escaped)');"
        // 在当前 webView 上执行（由 plugin 持有）
        plugins.values.forEach { $0.evalJS(js) }
    }

    /// 原生派发事件到 H5
    func dispatchEvent(event: String, data: Any?) {
        let payload: [String: Any] = [
            "msgType": "event",
            "event": event,
            "data": data ?? NSNull()
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        let escaped = json.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
        let js = "window.NativeBridge && window.NativeBridge._recvEvent && window.NativeBridge._recvEvent('\(escaped)');"
        plugins.values.forEach { $0.evalJS(js) }
    }
}

/// 统一回调结构
struct BridgeResult {
    let code: Int
    let msg: String
    let data: Any?
}

/// 插件协议
protocol BridgePlugin: AnyObject {
    var namespace: String { get }
    var bridge: JSBridgeContentController? { get set }
    func handle(method: String, params: Any, completion: @escaping (BridgeResult) -> Void)
    func evalJS(_ js: String)
}

extension BridgePlugin {
    func evalJS(_ js: String) {
        // 由具体插件持有 webView 时调用，否则忽略
    }
}

/// 事件总线：原生全局事件派发
enum EventBus {
    static func dispatch(event: String, data: Any? = nil) {
        // 遍历所有活跃的 JSBridge 实例派发
        NotificationCenter.default.post(name: Notification.Name("BridgeEvent"), object: nil, userInfo: ["event": event, "data": data ?? NSNull()])
    }
}

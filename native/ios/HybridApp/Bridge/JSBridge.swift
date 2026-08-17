import WebKit

/// JSBridge 核心：管理原生能力插件，处理 H5 invoke 调用并回传 callback
final class JSBridgeContentController: WKUserContentController, WKScriptMessageHandler {

    /// 全局事件通知名（EventBus.dispatch 发出，由各 WebView 的桥实例转发给 H5）
    static let bridgeEventNotification = Notification.Name("BridgeEvent")

    private var plugins: [String: BridgePlugin] = [:]
    private let messageName = "NativeBridgeInvoke"
    /// 持有所属 WebView，用于把 callback / event 真正执行回 H5（混合架构下每个 Tab 一个 WebView）
    private weak var webView: WKWebView?
    private var eventObserver: NSObjectProtocol?

    override init() {
        super.init()
        add(self, name: messageName)
        // 订阅全局事件（app.foreground / app.background 等），转发到本 WebView 的 H5。
        // 此前该通知无任何 observer，原生前后台事件永远到不了 H5。
        eventObserver = NotificationCenter.default.addObserver(
            forName: Self.bridgeEventNotification,
            object: nil,
            queue: .main
        ) { [weak self] note in
            guard let self,
                  let info = note.userInfo,
                  let event = info["event"] as? String else { return }
            self.dispatchEvent(event: event, data: info["data"])
        }
    }

    deinit {
        if let eventObserver {
            NotificationCenter.default.removeObserver(eventObserver)
        }
    }

    /// 由 HybridWebViewController 在创建 WKWebView 后挂载，使回传链路可用
    func attach(webView: WKWebView) {
        self.webView = webView
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
        webView?.evaluateJavaScript(js, completionHandler: nil)
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
        webView?.evaluateJavaScript(js, completionHandler: nil)
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
}

/// 事件总线：原生全局事件派发
enum EventBus {
    static func dispatch(event: String, data: Any? = nil) {
        // 遍历所有活跃的 JSBridge 实例派发
        NotificationCenter.default.post(name: Notification.Name("BridgeEvent"), object: nil, userInfo: ["event": event, "data": data ?? NSNull()])
    }
}

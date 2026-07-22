import WebKit

/// WebView 池：预热 WebView 实例，减少首次打开页面的白屏时间
final class WebViewPool {

    static let shared = WebViewPool()
    private var pool: [WKWebView] = []
    private let maxSize = 3
    private let preheatQueue = DispatchQueue(label: "com.hybrid.webview.pool")

    private init() {}

    /// 启动时预热：创建并加载离线包入口，完成 JS/CSS 解析（不显示）
    func preheat() {
        preheatQueue.async { [weak self] in
            guard let self = self else { return }
            DispatchQueue.main.async {
                for _ in 0..<2 {
                    self.createPreheated()
                }
            }
        }
    }

    private func createPreheated() {
        let config = WKWebViewConfiguration()
        let bridge = JSBridgeContentController()
        bridge.register(plugin: CameraPlugin())
        bridge.register(plugin: LocationPlugin())
        bridge.register(plugin: NavPlugin())
        config.userContentController = bridge
        let wv = WKWebView(frame: .zero, configuration: config)
        if let url = OfflinePackageHandler.shared.entryURL() {
            wv.load(URLRequest(url: url))
        }
        pool.append(wv)
    }

    /// 从池中取一个预热好的实例；没有则新建
    func dequeue() -> WKWebView {
        if let wv = pool.popLast() {
            return wv
        }
        let config = WKWebViewConfiguration()
        config.userContentController = JSBridgeContentController()
        return WKWebView(frame: .zero, configuration: config)
    }

    /// 用完归还（页面级 WebView 可复用）
    func enqueue(_ webView: WKWebView) {
        guard pool.count < maxSize else { return }
        // 清理状态
        webView.stopLoading()
        webView.loadHTMLString("<html></html>", baseURL: nil)
        pool.append(webView)
    }
}

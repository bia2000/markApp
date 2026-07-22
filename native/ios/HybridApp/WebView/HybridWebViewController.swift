import WebKit

/// 混合 WebViewController：单个 Tab / 页面级容器
final class HybridWebViewController: UIViewController {

    private(set) var webView: WKWebView!
    private let routePath: String

    init(routePath: String) {
        self.routePath = routePath
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()

        let config = WKWebViewConfiguration()
        // 注册 JSBridge 消息处理器
        let bridge = JSBridgeContentController()
        bridge.register(plugin: CameraPlugin())
        bridge.register(plugin: LocationPlugin())
        bridge.register(plugin: ScanPlugin())
        bridge.register(plugin: StoragePlugin())
        bridge.register(plugin: NavPlugin())
        bridge.register(plugin: SharePlugin())
        bridge.register(plugin: AppPlugin())
        config.userContentController = bridge
        config.allowsInlineMediaPlayback = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = false

        webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.bounces = false
        webView.navigationDelegate = OfflinePackageHandler.shared
        webView.uiDelegate = self
        view.addSubview(webView)
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        // 注入接收器脚本
        injectBridgeReceiver()
        loadEntry()
    }

    private func loadEntry() {
        // 优先加载本地离线包入口，fallback 到远程
        if let url = OfflinePackageHandler.shared.entryURL() {
            webView.load(URLRequest(url: url))
        } else if let remote = URL(string: "https://app.example.com/index.html") {
            webView.load(URLRequest(url: remote))
        }
    }

    /// 注入 H5 侧的接收器：window.NativeBridge._recvCallback / _recvEvent
    private func injectBridgeReceiver() {
        let script = """
        (function(){
          window.NativeBridge = window.NativeBridge || {};
          window.NativeBridge._recvCallback = function(payload){
            // 由原生通过 evaluateJavaScript 调用，直接转发给 H5 实现的 _recvCallback
            if (window.__bridgeRecvCallback) window.__bridgeRecvCallback(payload);
          };
          window.NativeBridge._recvEvent = function(payload){
            if (window.__bridgeRecvEvent) window.__bridgeRecvEvent(payload);
          };
        })();
        """
        webView.configuration.userContentController.addUserScript(
            WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
    }
}

extension HybridWebViewController: WKUIDelegate {}

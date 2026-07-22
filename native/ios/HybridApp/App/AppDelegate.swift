import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // 1. 全局初始化：推送注册、SDK 初始化、权限检查
        NotificationCenter.setup()
        OfflinePackageHandler.shared.startup()

        // 2. 创建根容器：原生 TabBar
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = MainTabBarController()
        window.makeKeyAndVisible()
        self.window = window

        // 3. 预热 WebView（在 splash 阶段完成首屏加载）
        WebViewPool.shared.preheat()
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        EventBus.dispatch(event: "app.foreground")
    }

    func applicationWillResignActive(_ application: UIApplication) {
        EventBus.dispatch(event: "app.background")
    }
}

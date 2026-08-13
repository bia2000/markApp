import UIKit

/// 根 TabBar 容器：原生控制 Tab 切换，每个 Tab 承载一个常驻 WebView
final class MainTabBarController: UITabBarController {

    override func viewDidLoad() {
        super.viewDidLoad()
        setupTabs()
        delegate = self
    }

    private func setupTabs() {
        let home = makeTab(title: "记事项", icon: "house", url: "/home")
        let stats = makeTab(title: "统计", icon: "square.grid.2x2", url: "/stats")
        let summary = makeTab(title: "总结", icon: "doc.text", url: "/summary")

        viewControllers = [home, stats, summary].map { nav in
            let navigation = UINavigationController(rootViewController: nav)
            navigation.isNavigationBarHidden = true
            return navigation
        }
    }

    private func makeTab(title: String, icon: String, url: String) -> HybridWebViewController {
        let vc = HybridWebViewController(routePath: url)
        vc.tabBarItem = UITabBarItem(
            title: title,
            image: UIImage(systemName: icon)?.withRenderingMode(.alwaysTemplate),
            selectedImage: UIImage(systemName: icon)?.withRenderingMode(.alwaysTemplate)
        )
        return vc
    }
}

extension MainTabBarController: UITabBarControllerDelegate {
    func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
        // 切换 Tab 不销毁 WebView；通知对应 WebView 重新读取数据，保证统计页最新
        if let top = (viewController as? UINavigationController)?.topViewController as? HybridWebViewController {
            top.webView.evaluateJavaScript("window.__todoResync && window.__todoResync()", completionHandler: nil)
        }
    }
}

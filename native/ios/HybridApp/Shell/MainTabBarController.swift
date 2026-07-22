import UIKit

/// 根 TabBar 容器：原生控制 Tab 切换，每个 Tab 承载一个常驻 WebView
final class MainTabBarController: UITabBarController {

    override func viewDidLoad() {
        super.viewDidLoad()
        setupTabs()
        delegate = self
    }

    private func setupTabs() {
        let home = makeTab(title: "首页", icon: "home", url: "/home")
        let category = makeTab(title: "分类", icon: "grid", url: "/category")
        let message = makeTab(title: "消息", icon: "chat", url: "/message")
        let profile = makeTab(title: "我的", icon: "user", url: "/profile")

        viewControllers = [home, category, message, profile].map { nav in
            let navigation = UINavigationController(rootViewController: nav)
            navigation.isNavigationBarHidden = true
            return navigation
        }
    }

    private func makeTab(title: String, icon: String, url: String) -> HybridWebViewController {
        let vc = HybridWebViewController(routePath: url)
        vc.tabBarItem = UITabBarItem(
            title: title,
            image: UIImage(named: icon)?.withRenderingMode(.alwaysTemplate),
            selectedImage: UIImage(named: "\(icon)_active")?.withRenderingMode(.alwaysTemplate)
        )
        return vc
    }
}

extension MainTabBarController: UITabBarControllerDelegate {
    func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
        // 切换 Tab 不销毁 WebView，状态保持
    }
}

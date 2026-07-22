import UIKit

/// 导航插件：标题、显示/隐藏、右侧按钮、push/pop/switchTab
final class NavPlugin: BridgePlugin {
    var bridge: JSBridgeContentController?
    let namespace = "nav"

    func handle(method: String, params: Any, completion: @escaping (BridgeResult) -> Void) {
        let dict = params as? [String: Any] ?? [:]
        switch method {
        case "setTitle":
            let title = dict["title"] as? String ?? ""
            DispatchQueue.main.async {
                self.currentNav()?.title = title
            }
            completion(BridgeResult(code: 0, msg: "ok", data: ["code": 0]))
        case "setBarVisible":
            // 实际项目控制导航栏可见
            completion(BridgeResult(code: 0, msg: "ok", data: ["code": 0]))
        case "setRightButton":
            completion(BridgeResult(code: 0, msg: "ok", data: ["code": 0]))
        case "push":
            let url = dict["url"] as? String ?? ""
            let title = dict["title"] as? String
            DispatchQueue.main.async {
                let vc = HybridWebViewController(routePath: url)
                if let title = title { vc.title = title }
                self.currentNav()?.navigationController?.pushViewController(vc, animated: dict["animated"] as? Bool ?? true)
            }
            completion(BridgeResult(code: 0, msg: "ok", data: ["code": 0]))
        case "pop":
            DispatchQueue.main.async {
                self.currentNav()?.navigationController?.popViewController(animated: true)
            }
            completion(BridgeResult(code: 0, msg: "ok", data: ["code": 0]))
        case "switchTab":
            let index = dict["index"] as? Int ?? 0
            DispatchQueue.main.async {
                if let tab = UIApplication.shared.windows.first?.rootViewController as? UITabBarController {
                    tab.selectedIndex = index
                }
            }
            completion(BridgeResult(code: 0, msg: "ok", data: ["code": 0]))
        default:
            completion(BridgeResult(code: -1, msg: "method not found", data: nil))
        }
    }

    private func currentNav() -> UIViewController? {
        UIApplication.shared.windows.first?.rootViewController?.topMost()
    }
}

extension UIViewController {
    func topMost() -> UIViewController? {
        if let nav = self as? UINavigationController, let last = nav.viewControllers.last {
            return last.topMost()
        }
        if let tab = self as? UITabBarController, let selected = tab.selectedViewController {
            return selected.topMost()
        }
        if let presented = presentedViewController {
            return presented.topMost()
        }
        return self
    }
}

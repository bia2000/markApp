import UIKit

/// 分享插件
final class SharePlugin: BridgePlugin {
    var bridge: JSBridgeContentController?
    let namespace = "share"

    func handle(method: String, params: Any, completion: @escaping (BridgeResult) -> Void) {
        let dict = params as? [String: Any] ?? [:]
        let title = dict["title"] as? String ?? ""
        let content = dict["content"] as? String ?? ""
        let url = dict["url"] as? String

        let activityItems: [Any] = [title, content].compactMap { $0 as Any } + (url.map { URL(string: $0) } .map { [$0] } ?? [])
        DispatchQueue.main.async {
            let activityVC = UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
            self.currentVC()?.present(activityVC, animated: true)
        }
        completion(BridgeResult(code: 0, msg: "ok", data: ["code": 0]))
    }

    private func currentVC() -> UIViewController? {
        UIApplication.shared.windows.first?.rootViewController?.topMost()
    }
}

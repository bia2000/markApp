import WebKit
import Foundation
import SSZipArchive

/// 离线包管理：版本比对、本地解压、WebView 请求拦截
final class OfflinePackageHandler: NSObject, WKNavigationDelegate {

    static let shared = OfflinePackageHandler()

    /// 离线包根目录（沙盒 Documents/offline）
    private let rootDir: URL = {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return docs.appendingPathComponent("offline", isDirectory: true)
    }()

    /// 当前离线包版本
    private(set) var currentVersion: String = "0"

    private override init() {
        super.init()
    }

    /// 启动时检查更新（异步，不阻塞）
    func startup() {
        try? FileManager.default.createDirectory(at: rootDir, withIntermediateDirectories: true)
        loadLocalVersion()
        checkUpdate()
    }

    private func loadLocalVersion() {
        let versionFile = rootDir.appendingPathComponent("manifest.json")
        guard let data = try? Data(contentsOf: versionFile),
              let manifest = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let v = manifest["version"] as? String else { return }
        currentVersion = v
    }

    /// 请求服务端 manifest，有更新则下载 zip 解压
    func checkUpdate() {
        guard let url = URL(string: "https://app.example.com/offline/manifest.json") else { return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let data = data,
                  let manifest = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let version = manifest["version"] as? String,
                  version != self?.currentVersion,
                  let pkgUrl = manifest["packageUrl"] as? String,
                  let downloadUrl = URL(string: pkgUrl) else { return }
            self?.downloadAndExtract(url: downloadUrl, version: version)
        }.resume()
    }

    private func downloadAndExtract(url: URL, version: String) {
        let task = URLSession.shared.downloadTask(with: url) { [weak self] tempUrl, _, _ in
            guard let tempUrl = tempUrl else { return }
            self?.extract(tempUrl: tempUrl, version: version)
        }
        task.resume()
    }

    private func extract(tempUrl: URL, version: String) {
        let targetDir = rootDir.appendingPathComponent(version, isDirectory: true)
        try? FileManager.default.removeItem(at: targetDir)
        try? FileManager.default.createDirectory(at: targetDir, withIntermediateDirectories: true)
        // 真正解压（SSZipArchive 自带 Zip Slip 路径穿越防护）
        guard SSZipArchive.unzipFile(atPath: tempUrl.path, toDestination: targetDir.path) else {
            // 解压失败：清理坏包目录，不更新版本号，下次启动可重试
            try? FileManager.default.removeItem(at: targetDir)
            return
        }
        // 把 zip 内的 manifest 持久化到根目录：loadLocalVersion 依赖它恢复版本号
        let extractedManifest = targetDir.appendingPathComponent("manifest.json")
        guard FileManager.default.fileExists(atPath: extractedManifest.path) else {
            try? FileManager.default.removeItem(at: targetDir)
            return
        }
        let rootManifest = rootDir.appendingPathComponent("manifest.json")
        try? FileManager.default.removeItem(at: rootManifest)
        try? FileManager.default.copyItem(at: extractedManifest, to: rootManifest)
        currentVersion = version
    }

    /// 入口 URL：本地离线包 index.html
    func entryURL() -> URL? {
        let entry = rootDir.appendingPathComponent(currentVersion).appendingPathComponent("index.html")
        return FileManager.default.fileExists(atPath: entry.path) ? entry : nil
    }

    // MARK: - WKNavigationDelegate 拦截
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(.allow)
    }

    /// 拦截资源请求，命中离线包则返回本地数据
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        // 自定义 scheme 拦截实现，参考美团/支付宝实践
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

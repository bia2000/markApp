# 基于「原生外壳 + H5」混合架构 App 开发模板方案

> 版本：v1.0 ｜ 日期：2026-07-22 ｜ 作者：高级开发工程师

---

## 目录

1. [方案概述](#一方案概述)
2. [整体架构设计](#二整体架构设计)
3. [原生外壳设计](#三原生外壳设计)
4. [通信机制与数据传递](#四通信机制与数据传递)
5. [功能模块划分](#五功能模块划分)
6. [性能优化策略](#六性能优化策略)
7. [跨平台支持](#七跨平台支持)
8. [技术选型建议](#八技术选型建议)
9. [目录结构规划](#九目录结构规划)
10. [关键流程设计](#十关键流程设计)
11. [落地路线与参考方案](#十一落地路线与参考方案)

---

## 一、方案概述

### 1.1 设计目标

提供一套**可直接落地、可复用**的混合 App 开发模板，让业务团队聚焦 H5 业务页面开发，原生外壳一次性建设、长期复用，实现：

- **一套 H5，双端运行**：iOS / Android 共用同一套 H5 业务代码，原生外壳分别实现。
- **原生级体验**：通过 WebView 预加载、离线包、原生导航容器，逼近原生 App 的启动速度与交互流畅度。
- **能力可扩展**：原生能力以插件化方式注册到 JSBridge，新增原生能力无需改动通信框架。
- **工程标准化**：内置登录、首页、个人中心、消息中心、网络请求、路由管理等基础模块，开箱即用。

### 1.2 适用场景

- 业务迭代频繁、需要快速发版（H5 可热更新，绕过应用商店审核）。
- 已有大量 Web 端资产，希望低成本迁移到 App。
- 多业务线共用一个 App 壳，各业务线独立开发 H5。
- 对部分页面有原生体验要求（如相机、地图、首屏闪屏），其余页面用 H5。

### 1.3 设计原则

| 原则 | 说明 |
|------|------|
| **壳与业务分离** | 原生外壳只管生命周期、导航、能力桥接；业务逻辑全部在 H5。 |
| **协议先行** | 原生与 H5 通过统一 JSBridge 协议通信，接口契约化、版本化。 |
| **预加载优先** | WebView 实例池化 + H5 资源离线包，把初始化耗时前置到启动阶段。 |
| **渐进增强** | H5 优先，原生能力按需调用；能力不可用时 H5 有降级方案。 |
| **安全可控** | JSBridge 通道鉴权、域名白名单、敏感操作原生二次确认。 |

### 1.4 与主流方案对比

| 方案 | 特点 | 本模板定位 |
|------|------|-----------|
| **Cordova / Ionic** | 重插件体系，Web 为主，体验偏 Web | 参考其插件化思想，但用原生导航容器提升体验 |
| **React Native / Flutter** | 渲染走原生组件，非 H5 | 不适用（本方案明确是 WebView + H5） |
| **DSBridge** | 开源双端 JSBridge，同步/异步完善 | **通信层可直接采用或参考** |
| **美团 / 支付宝 WebView 方案** | 自研 WebView 池 + 离线包 + 路由分发 | **性能策略重点参考** |
| **微信小程序双线程** | 渲染层与逻辑层分离 | 借鉴其「预加载 Webview」机制 |

> 结论：通信层推荐直接采用 **DSBridge**（成熟、双端一致、支持同步调用），离线包与 WebView 池化参考美团/支付宝实践自研。

---

## 二、整体架构设计

### 2.1 架构总览

系统采用**三层架构**（见上方架构图）：

```
┌─────────────────────────────────────────────────────────┐
│  原生外壳层 (Native Shell)                               │
│  iOS: WKWebView(Swift)  ·  Android: WebView(Kotlin)     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ 应用生命  │ │ 导航容器  │ │WebView池 │ │ 原生能力  │    │
│  │ 周期管理  │ │TabBar/Nav│ │ 预创建复用│ │相机/定位等│    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└───────────────────────┬─────────────────────────────────┘
                        │ 双向通信 (JSBridge)
┌───────────────────────┴─────────────────────────────────┐
│  JSBridge 桥接层                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ 通信协议  │ │同步/异步 │ │ 事件总线  │ │ 离线包    │    │
│  │          │ │  调用    │ │          │ │  管理     │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└───────────────────────┬─────────────────────────────────┘
                        │ 桥接调用
┌───────────────────────┴─────────────────────────────────┐
│  H5 业务层 (Vue3 + Vite + Pinia + Vue Router)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ 路由管理  │ │网络请求  │ │ 状态管理  │ │ UI组件库  │    │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤    │
│  │ 登录注册  │ │ 首页框架  │ │ 个人中心  │ │ 消息中心  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 分层职责

**原生外壳层（Native Shell）**

- 应用生命周期：启动、前后台切换、内存告警、退出回收。
- 导航容器：根 TabBar 容器 + Navigation 栈管理，原生控制页面切换以获得原生转场动画。
- WebView 池：预创建并预热 WebView 实例，减少首次打开页面的白屏时间。
- 原生能力：相机、相册、定位、推送、本地存储、蓝牙、扫码、支付、分享等，封装为 JSBridge 插件。

**JSBridge 桥接层**

- 通信协议：统一消息格式（JSON），支持调用、回调、事件三种消息类型。
- 调用方式：H5 调原生（同步返回 / 异步回调）、原生调 H5（事件推送）。
- 事件总线：原生向 H5 广播事件（如收到推送、网络变化、回到前台），H5 可订阅。
- 离线包管理：H5 资源打包下发、版本比对、本地解压、WebView 请求拦截。

**H5 业务层**

- 框架能力：路由管理、网络请求封装、状态管理（Pinia）、UI 组件库。
- 业务模块：登录注册、首页框架、个人中心、消息中心等。

---

## 三、原生外壳设计

### 3.1 应用生命周期管理

原生外壳负责全局生命周期，并在关键节点通过事件总线通知 H5：

| 生命周期事件 | 触发时机 | H5 可感知的处理 |
|-------------|---------|----------------|
| `app.launch` | 冷启动完成 | 初始化 H5 全局状态、预加载首页资源 |
| `app.foreground` | 从后台回到前台 | 刷新数据、重连 WebSocket、检查登录态 |
| `app.background` | 进入后台 | 暂停轮询、释放视频/音频资源 |
| `network.change` | 网络类型变化 | 提示离线、切换请求策略 |
| `push.receive` | 收到推送 | 更新消息中心未读数 |

### 3.2 导航容器

采用**原生导航 + H5 内容区**的混合导航策略：

- **根容器为原生 TabBar**（iOS: UITabBarController；Android: BottomNavigationView + Fragment），保证 Tab 切换的原生流畅度与状态保持。
- 每个 Tab 承载一个 WebView 实例（Tab 级 WebView 复用，切换 Tab 不销毁 WebView）。
- 页面内跳转（push/pop）由 H5 路由驱动，但**导航栏标题、返回按钮、转场动画由原生渲染**，H5 通过 JSBridge 通知原生更新导航栏。

```
原生 TabBar
├── Tab1 首页    → WebView-1 (首页 H5)
├── Tab2 分类    → WebView-2 (分类 H5)
├── Tab3 消息    → WebView-3 (消息 H5)
└── Tab4 我的    → WebView-4 (我的 H5)
```

**导航栏控制协议**（H5 调原生）：

```js
// 设置导航栏标题
bridge.call('nav.setTitle', { title: '商品详情' })
// 显示/隐藏导航栏
bridge.call('nav.setBarVisible', { visible: false })
// 设置右侧按钮
bridge.call('nav.setRightButton', { text: '分享', action: 'share' })
```

### 3.3 原生能力桥接

原生能力以**插件**形式注册，每个能力对应一个命名空间：

| 命名空间 | 能力 | 说明 |
|---------|------|------|
| `device.camera` | 拍照 / 选图 | 调用系统相机或相册，返回 base64 或本地路径 |
| `device.location` | 定位 | 返回经纬度、地址逆解析 |
| `device.scan` | 扫码 | 二维码 / 条形码 |
| `storage.local` | 本地存储 | 原生 KV 存储，跨 WebView 共享 |
| `push.register` | 推送注册 | 获取设备 token，注册推送 |
| `pay` | 支付 | 拉起微信 / 支付宝 / 苹果支付 |
| `share` | 分享 | 调用系统分享或社交 SDK |
| `media` | 音视频 | 录音、播放、视频通话组件 |

### 3.4 iOS 实现（Swift + WKWebView）

```swift
import WebKit

class HybridWebViewController: UIViewController {
    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        let config = WKWebViewConfiguration()
        // 注册 JSBridge 消息处理器
        let bridge = JSBridgeContentController()
        bridge.register(plugin: CameraPlugin())
        bridge.register(plugin: LocationPlugin())
        config.userContentController = bridge
        // 允许内联媒体播放
        config.allowsInlineMediaPlayback = true
        webView = WKWebView(frame: .zero, configuration: config)
        // 加载离线包资源（拦截请求，优先读本地）
        webView.navigationDelegate = OfflinePackageHandler.shared
        view.addSubview(webView)
        loadEntry()
    }

    private func loadEntry() {
        // 优先加载本地离线包入口，fallback 到远程
        let url = OfflinePackageHandler.shared.entryURL() ?? URL(string: "https://app.example.com/index.html")!
        webView.load(URLRequest(url: url))
    }
}
```

**关键点**：使用 `WKWebView`（非已废弃的 UIWebView）；通过 `WKUserContentController` 注入脚本和接收消息。

### 3.5 Android 实现（Kotlin + WebView）

```kotlin
class HybridWebActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.useWideViewPort = true
            // 离线包拦截
            webViewClient = OfflinePackageClient()
            // 注册 JSBridge
            addJavascriptInterface(JSBridge(this), "NativeBridge")
        }
        setContentView(webView)
        loadEntry()
    }

    private fun loadEntry() {
        val url = OfflinePackage.entryUrl() ?: "https://app.example.com/index.html"
        webView.loadUrl(url)
    }
}
```

**关键点**：`@JavascriptInterface` 注解暴露方法给 JS；注意 4.2 以下系统有安全漏洞（已基本淘汰，可不兼容）。

---

## 四、通信机制与数据传递

### 4.1 JSBridge 协议设计

所有通信消息统一为 JSON 格式，分三类：**调用（invoke）、回调（callback）、事件（event）**。

```json
{
  "msgType": "invoke",
  "namespace": "device.camera",
  "action": "takePhoto",
  "callbackId": "cb_1719000001_001",
  "params": { "quality": "high", "maxWidth": 1080 }
}
```

| 字段 | 说明 |
|------|------|
| `msgType` | `invoke`（H5→原生）/ `callback`（原生→H5 回调）/ `event`（原生→H5 推送） |
| `namespace` | 能力命名空间，对应原生插件 |
| `action` | 具体操作 |
| `callbackId` | 唯一回调标识，用于异步结果匹配 |
| `params` | 调用参数 |

### 4.2 调用方式

**(1) H5 调用原生（异步，推荐）**

```js
// H5 侧封装
const bridge = {
  call(action, params = {}) {
    return new Promise((resolve, reject) => {
      const cbId = genCallbackId()
      callbacks[cbId] = { resolve, reject }
      // 通过 DSBridge 或自研通道发送
      window.NativeBridge.invoke(JSON.stringify({
        msgType: 'invoke',
        action,
        callbackId: cbId,
        params
      }))
    })
  }
}

// 业务调用
const photo = await bridge.call('device.camera.takePhoto', { quality: 'high' })
```

**(2) 同步调用（仅限轻量、必须同步返回的场景）**

```js
// DSBridge 支持同步返回（Android 通过 prompt 拦截，iOS 通过 evaluateJavaScript 回注）
const deviceId = bridge.callSync('device.getDeviceId')
```

> 注意：同步调用会阻塞 JS 线程，仅用于获取设备 ID、网络状态等轻量场景。

**(3) 原生调用 H5（事件推送）**

原生通过 `evaluateJavaScript`（iOS）/ `evaluateJavascript`（Android）向 H5 派发事件：

```js
// 原生注入执行
window.NativeBridge && window.NativeBridge.dispatchEvent(JSON.stringify({
  msgType: 'event',
  event: 'push.receive',
  data: { title: '...', body: '...' }
}))
```

H5 侧事件总线订阅：

```js
bridge.on('push.receive', (data) => {
  messageStore.addUnread()
})
```

### 4.3 事件总线

H5 侧维护一个事件总线，支持 `on / off / once / emit`：

```js
class EventBus {
  constructor() { this.listeners = {} }
  on(event, fn) {
    (this.listeners[event] ||= []).push(fn)
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(fn => fn(data))
  }
  off(event, fn) { /* ... */ }
}
```

### 4.4 数据传递规范

| 数据类型 | 传递方式 | 说明 |
|---------|---------|------|
| 简单值（string/number/bool） | 直接序列化 | JSON 安全 |
| 对象 / 数组 | JSON.stringify | 大对象注意性能 |
| 大数据（图片 base64） | 传本地路径，不传 base64 | 避免序列化卡顿 |
| 文件 | 传 URI，原生侧读写 | 跨平台路径需归一化 |

> **约定**：所有回调统一返回 `{ code, msg, data }` 结构，`code=0` 表示成功。

### 4.5 安全

- **域名白名单**：WebView 只允许加载白名单域名，防止恶意页面调用 Bridge。
- **Bridge 鉴权**：敏感能力（支付、通讯录）调用前原生二次确认或校验 H5 签名。
- **禁用混合内容**：HTTPS 页面禁止加载 HTTP 资源。
- **禁用 file 域**（Android）：防止 file 协议越权访问。

---

## 五、功能模块划分

### 5.1 模块全景

| 模块 | 层级 | 职责 |
|------|------|------|
| 登录 / 注册 | H5 业务 | 账号密码、验证码、第三方登录、Token 管理 |
| 首页框架 | 原生 + H5 | 原生 TabBar + H5 首页内容 |
| 个人中心 | H5 业务 | 用户信息、设置、版本更新 |
| 消息中心 | H5 业务 | 消息列表、未读角标、推送跳转 |
| 网络请求封装 | H5 框架 | Axios 封装、Token 注入、错误统一处理 |
| 路由管理 | H5 框架 | Vue Router + 原生导航联动 |

### 5.2 登录 / 注册模块

- 登录方式：手机号 + 验证码、账号密码、第三方（微信 / 苹果 ID）。
- 登录态由原生与 H5 共同维护：Token 存原生 `storage.local`，H5 启动时通过 Bridge 拉取注入请求头。
- Token 过期：H5 请求返回 401 时，通过事件总线通知原生重新登录，原生弹出登录页（H5）。

```js
// H5 网络请求拦截器
axios.interceptors.request.use(async config => {
  const token = await bridge.call('storage.local.get', { key: 'auth_token' })
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

### 5.3 首页框架

- 原生 TabBar 提供四个 Tab，每个 Tab 对应一个常驻 WebView。
- 首页 H5 内部用 Vue Router 管理二级页面，导航栏由原生渲染。
- 首页支持下拉刷新（原生组件，触发 H5 刷新接口）、上拉加载（H5 自实现）。

### 5.4 个人中心

- 展示用户信息、订单入口、设置、关于、检查更新。
- 检查更新通过原生能力 `app.checkUpdate` 实现，下载安装走原生。

### 5.5 消息中心

- 消息列表 H5 渲染，未读角标由原生维护并显示在 TabBar。
- 收到推送 → 原生 `push.receive` 事件 → H5 刷新列表 + 原生更新角标。
- 点击通知 → 原生路由分发 → 打开对应 H5 页面。

### 5.6 网络请求封装

基于 Axios 统一封装：

- 请求/响应拦截器：Token 注入、统一错误码处理、loading 管理。
- 环境切换：通过 Bridge 读取原生注入的环境信息（debug/release、API 域名）。
- 超时与重试：默认 15s 超时，网络错误自动重试 1 次。
- 请求去重：相同 URL + 参数的并发请求合并。

### 5.7 路由管理

**双栈协同**：原生导航栈（页面级）+ H5 路由栈（页面内）。

- 页面级跳转：通过 `bridge.call('nav.push', { url, title })` 交给原生，原生创建新 WebView 或复用池中实例加载目标 H5，并执行原生转场动画。
- 页面内跳转：H5 内部 Vue Router 处理，不触发原生转场。

```js
// 封装统一跳转
function navigateTo(route) {
  if (route.native) {
    bridge.call('nav.push', { url: route.url, title: route.title })
  } else {
    router.push(route.path)
  }
}
```

---

## 六、性能优化策略

### 6.1 WebView 预加载与池化

**问题**：首次创建 WebView + 加载 H5 首屏通常需要 300-800ms，造成白屏。

**方案**：

- **启动时预热**：App 冷启动后在 splash 阶段，后台创建一个 WebView 实例并预加载离线包入口 HTML（不显示），完成 JS/CSS 解析。
- **WebView 池**：维护 2-3 个预热好的 WebView 实例，打开新页面时从池中取，用完归还。
- **Tab 常驻**：根 Tab 的 WebView 不销毁，切换 Tab 仅切换可见性，状态保持。

```
启动流程:
Splash → 创建预热WebView(加载离线包入口) → 首页直接复用预热实例 → 首屏即时可见
```

### 6.2 离线包机制

**目标**：H5 资源本地化，消除网络请求，实现「秒开」。

**流程**：

1. **打包**：构建时将 H5 产物（HTML/CSS/JS/图片）打成 zip，生成版本号与 manifest.json。
2. **下发**：App 启动时请求最新版本信息，有更新则下载 zip。
3. **解压**：本地解压到沙盒目录。
4. **拦截**：WebView 请求资源时，原生拦截，优先从本地离线包读取，命中则直接返回，未命中走网络。

**版本管理**：

- 增量更新：仅下载 diff 包（bsdiff），减少流量。
- 灰度发布：按版本号 / 用户分批下发。
- 回滚：保留上一版本，新版本异常时自动回退。

**拦截实现**：

- iOS：`WKURLSchemeHandler`（自定义 scheme）或 `WKNavigationDelegate` 拦截。
- Android：`WebViewClient.shouldInterceptRequest`。

### 6.3 缓存机制

| 层级 | 机制 | 用途 |
|------|------|------|
| HTTP 缓存 | Cache-Control / ETag | 接口数据缓存 |
| WebView 缓存 | HTTP 缓存 + DOM Storage | 静态资源缓存 |
| 离线包 | 本地文件 + 版本管理 | 资源本地化 |
| Service Worker | （部分场景） | H5 侧请求拦截、离线兜底 |
| 数据缓存 | Pinia + storage.local | 业务数据持久化 |

### 6.4 首屏加载优化

- **资源体积**：Vite 构建压缩、按需加载、Tree-shaking；首屏 JS 控制在 150KB(gzip) 以内。
- **骨架屏**：H5 首屏内置骨架屏，数据返回前先展示结构。
- **数据预取**：原生在预热 WebView 阶段，通过 Bridge 预请求首屏数据，注入 H5 全局变量，H5 直接渲染。
- **图片懒加载**：Intersection Observer，首屏图片优先加载。

### 6.5 原生 / H5 切换流畅性

- **页面切换动画用原生**：push/pop 由原生驱动转场动画，避免 H5 CSS 动画卡顿。
- **预加载下一页**：用户点击瞬间，先开始原生转场动画，同时 WebView 异步加载目标页（命中离线包则几乎无白屏）。
- **避免 JS 阻塞**：长任务拆分为微任务，保证交互响应。
- **减少 Bridge 调用频次**：批量调用，避免频繁序列化开销。

---

## 七、跨平台支持

### 7.1 iOS 与 Android 原生外壳差异

| 维度 | iOS | Android |
|------|-----|---------|
| WebView 内核 | WKWebView（系统统一） | 系统 WebView（厂商定制，Android 7+ 基于 Chromium） |
| JS 注入方式 | `WKUserContentController.add` | `addJavascriptInterface` |
| JS 调原生 | `WKScriptMessageHandler` | `@JavascriptInterface` 注解 |
| 原生调 JS | `evaluateJavaScript` | `evaluateJavascript` |
| 资源拦截 | `WKURLSchemeHandler` | `shouldInterceptRequest` |
| 推送 | APNs | FCM / 各厂商通道 |
| 拍照权限 | Info.plist 声明 | AndroidManifest + 运行时权限 |
| TabBar | UITabBarController | BottomNavigationView + Fragment |

### 7.2 统一 H5 层适配策略

H5 层通过 JSBridge 抽象抹平平台差异，业务代码不感知平台：

- **统一 API**：Bridge 接口命名与参数双端一致（如 `device.camera.takePhoto` 双端行为相同）。
- **平台检测**：H5 启动时通过 `bridge.call('device.getPlatform')` 获取平台信息，按需处理差异（如状态栏高度、安全区域）。
- **UI 适配**：使用 `env(safe-area-inset-*)` 适配刘海屏；rem / vw 自适应；组件库用 Vant（移动端通用）。
- **样式差异**：Android WebView 滚动惯性弱于 iOS，可通过 `-webkit-overflow-scrolling` 与自定义滚动优化。
- **内核差异兜底**：Android 低版本 WebView 内核旧，需 babel 转译 + polyfill；必要时引导用户升级 WebView 内核。

### 7.3 统一构建与发布

- H5 构建产物（dist）双端共用，打成一个离线包。
- 原生壳各自独立工程，通过配置引用同一份离线包版本号。
- CI/CD：H5 构建后自动上传离线包到 CDN，原生侧启动时拉取最新版本。

---

## 八、技术选型建议

### 8.1 原生侧

| 组件 | iOS | Android |
|------|-----|---------|
| 语言 | Swift | Kotlin |
| WebView | WKWebView | 系统 WebView（建议 minSdk 21+） |
| JSBridge | DSBridge-iOS / 自研 | DSBridge-Android / 自研 |
| 推送 | APNs + UserNotifications | 各厂商推送统一接入 |
| 网络 | URLSession / Alamofire | OkHttp |
| 依赖管理 | SPM / CocoaPods | Gradle |

### 8.2 H5 侧

| 组件 | 选型 | 说明 |
|------|------|------|
| 框架 | Vue 3 | 组合式 API，体积小，生态成熟 |
| 构建 | Vite | 快速冷启动 / HMR，Rollup 打包 |
| 路由 | Vue Router 4 | 支持 history / hash 模式 |
| 状态 | Pinia | 轻量、TypeScript 友好 |
| UI 库 | Vant 4 | 移动端组件齐全 |
| 请求 | Axios | 拦截器机制成熟 |
| 语言 | TypeScript | 类型安全，Bridge 接口可类型化 |
| 工具 | ESLint + Prettier + Husky | 代码规范 |

### 8.3 工程化

| 能力 | 选型 |
|------|------|
| JSBridge | DSBridge（开源，双端同步/异步完善） |
| 离线包 | 自研（参考美团实践） |
| 监控 | Sentry / 自研前端监控（首屏时间、Bridge 耗时、JS 错误） |
| CI/CD | GitLab CI / GitHub Actions |

---

## 九、目录结构规划

### 9.1 整体仓库结构

采用**多仓库**或**Monorepo**均可，推荐 Monorepo（pnpm workspace）：

```
hybrid-app-template/
├── native/
│   ├── ios/                      # iOS 原生工程 (Xcode)
│   │   ├── HybridApp/
│   │   │   ├── App/              # AppDelegate、生命周期
│   │   │   ├── Shell/            # 原生外壳：TabBar、导航容器
│   │   │   ├── WebView/          # WebView 池、预热管理
│   │   │   ├── Bridge/           # JSBridge 核心
│   │   │   │   ├── JSBridge.swift
│   │   │   │   └── Plugins/      # 原生能力插件
│   │   │   │       ├── CameraPlugin.swift
│   │   │   │       ├── LocationPlugin.swift
│   │   │   │       └── ...
│   │   │   └── Offline/          # 离线包管理
│   │   └── Podfile
│   └── android/                  # Android 原生工程
│       ├── app/
│       │   ├── src/main/java/com/example/hybrid/
│       │   │   ├── shell/        # 原生外壳
│       │   │   ├── webview/      # WebView 池
│       │   │   ├── bridge/       # JSBridge 核心
│       │   │   │   ├── JSBridge.kt
│       │   │   │   └── plugins/  # 原生能力插件
│       │   │   └── offline/      # 离线包管理
│       │   └── AndroidManifest.xml
│       └── build.gradle.kts
│
├── h5/                           # H5 业务工程
│   ├── src/
│   │   ├── api/                  # 接口定义（按模块）
│   │   ├── assets/               # 静态资源
│   │   ├── components/           # 公共组件
│   │   ├── composables/          # 组合式函数
│   │   ├── layouts/              # 布局（含骨架屏）
│   │   ├── router/               # 路由配置
│   │   │   └── index.ts
│   │   ├── stores/               # Pinia 状态
│   │   │   ├── user.ts
│   │   │   └── message.ts
│   │   ├── views/                # 业务页面
│   │   │   ├── login/
│   │   │   ├── home/
│   │   │   ├── profile/
│   │   │   └── message/
│   │   ├── bridge/               # JSBridge H5 封装
│   │   │   ├── index.ts          # Bridge 核心
│   │   │   ├── eventbus.ts       # 事件总线
│   │   │   └── types.ts          # 接口类型定义
│   │   ├── utils/                # 工具函数
│   │   │   └── request.ts        # Axios 封装
│   │   ├── App.vue
│   │   └── main.ts
│   ├── public/
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── packages/                     # 共享包（可选）
│   ├── bridge-protocol/          # Bridge 协议定义（TS 类型）
│   └── offline-packager/         # 离线包打包工具
│
├── docs/                         # 文档
└── pnpm-workspace.yaml
```

### 9.2 说明

- `native/ios` 与 `native/android` 各自独立，共享同一份 Bridge 协议定义。
- `h5/bridge` 是 H5 侧对 JSBridge 的封装，业务代码只依赖此层，不直接调底层。
- `packages/bridge-protocol` 用 TypeScript 定义所有 Bridge 接口类型，原生侧对照实现，保证双端一致。

---

## 十、关键流程设计

### 10.1 启动流程

```
App 冷启动
  │
  ├─ 1. 原生初始化（SDK、推送注册、权限检查）
  ├─ 2. 检查离线包更新（异步，不阻塞）
  ├─ 3. 创建预热 WebView，加载本地离线包入口 HTML
  ├─ 4. Splash 展示（原生控制）
  ├─ 5. 离线包加载完成 → 注入环境信息（平台、token、API域名）
  ├─ 6. H5 main.ts 初始化 → Pinia 初始化 → 路由就绪
  ├─ 7. 首页数据预取（原生通过 Bridge 拉取后注入）
  ├─ 8. H5 渲染首屏 → 通知原生隐藏 Splash
  └─ 9. 首屏可交互
```

### 10.2 登录流程

```
H5 登录页
  │
  ├─ 用户输入手机号 → 请求验证码 API
  ├─ 输入验证码 → 调登录 API
  ├─ 登录成功 → 获取 token
  ├─ bridge.call('storage.local.set', { key: 'auth_token', value: token })
  ├─ bridge.call('storage.local.set', { key: 'user_info', value: userInfo })
  ├─ 更新 Pinia user store
  └─ bridge.call('nav.switchTab', { index: 0 })  // 跳转首页
```

### 10.3 页面跳转流程

```
用户点击「商品详情」
  │
  ├─ H5 判断 route.native === true
  ├─ bridge.call('nav.push', { url: '/goods/123', title: '商品详情' })
  ├─ 原生从 WebView 池取空闲实例（或新建）
  ├─ 加载目标 H5（命中离线包，秒开）
  ├─ 原生执行 push 转场动画
  └─ 目标页 H5 就绪，通过 Bridge 更新导航栏标题
```

### 10.4 原生能力调用流程（以拍照为例）

```
H5 页面
  │
  ├─ const photo = await bridge.call('device.camera.takePhoto', { quality: 'high' })
  │
  │  ── JSBridge 通道 ──>
  │
  ├─ 原生 CameraPlugin 收到 invoke
  ├─ 检查相机权限（无则弹窗申请）
  ├─ 调起系统相机
  ├─ 用户拍照 / 取消
  ├─ 原生处理图片（压缩、存储到沙盒）
  ├─ 生成本地 URI
  │
  │  <── callback 回传 ──
  │
  ├─ H5 收到 { code: 0, data: { uri: '...' } }
  └─ H5 用 uri 显示图片 / 上传
```

---

## 十一、落地路线与参考方案

### 11.1 落地路线

| 阶段 | 内容 | 产出 |
|------|------|------|
| **P0 基建** | 原生外壳 + JSBridge 通信打通 + WebView 预热 | 双端能加载 H5、Bridge 可调 |
| **P1 基础模块** | 登录、首页框架、网络请求、路由 | 可登录、可看首页 |
| **P2 性能** | 离线包、首屏优化、监控埋点 | 首屏 < 1s |
| **P3 能力扩展** | 相机、定位、推送、支付、分享 | 原生能力齐备 |
| **P4 业务模块** | 个人中心、消息中心 | 模板完整可用 |
| **P5 工程化** | CI/CD、灰度、热更新 | 可持续迭代 |

### 11.2 参考方案与开源项目

| 项目 | 参考价值 |
|------|---------|
| **DSBridge** | JSBridge 通信层实现（同步/异步/事件） |
| **Cordova** | 插件化原生能力的组织方式 |
| **Ionic** | H5 组件库与主题体系 |
| **美团 WebView 库** | WebView 池化、离线包、路由分发 |
| **mPaaS（蚂蚁）** | 离线包下发、灰度、监控的工程实践 |
| **微信小程序** | 预加载 WebView、双线程安全模型 |

### 11.3 风险与对策

| 风险 | 对策 |
|------|------|
| Android WebView 内核碎片化 | minSdk 21+，引导更新 WebView；关键页面测低端机 |
| 离线包版本不一致导致白屏 | 强制版本校验，失败回退远程 + 上一版本兜底 |
| Bridge 通道被恶意调用 | 域名白名单 + 敏感操作原生确认 |
| H5 与原生导航栈状态不同步 | 统一路由出口，禁止 H5 私自 push 页面级路由 |
| 首屏数据依赖网络 | 原生预热阶段预取数据注入 |

---

## 附录：JSBridge 接口清单（节选）

| 命名空间.方法 | 参数 | 返回 |
|--------------|------|------|
| `device.getPlatform` | - | `{ platform: 'ios'/'android', version }` |
| `device.getDeviceId` | - | `{ deviceId }` |
| `device.camera.takePhoto` | `{ quality, maxWidth }` | `{ uri }` |
| `device.location.get` | `{ type }` | `{ lat, lng, address }` |
| `device.scan.scanCode` | `{ types }` | `{ result }` |
| `storage.local.set` | `{ key, value }` | `{ code }` |
| `storage.local.get` | `{ key }` | `{ value }` |
| `push.register` | - | `{ token }` |
| `nav.setTitle` | `{ title }` | `{ code }` |
| `nav.push` | `{ url, title }` | `{ code }` |
| `nav.pop` | - | `{ code }` |
| `nav.switchTab` | `{ index }` | `{ code }` |
| `pay.wechat` | `{ params }` | `{ result }` |
| `share` | `{ title, content, url }` | `{ code }` |
| `app.checkUpdate` | - | `{ hasUpdate, url }` |

---

*本方案为模板基线，实际项目可按业务需求裁剪与扩展。*

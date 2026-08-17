# markApp —— 原生外壳 + H5 混合架构（目标打卡 · 每日复盘）

一个「原生 App 外壳 + H5 离线包」混合架构的移动应用：**一套 H5 代码同时跑在 iOS / Android 原生 WebView 里**，原生能力（相机、定位、扫码、录音、导航、桌面组件等）以 JSBridge 插件化方式扩展到 H5。H5 业务热更新可绕过应用商店审核，原生壳一次性建设、长期复用。

> 完整技术方案见仓库内 [`混合架构App开发模板方案.md`](混合架构App开发模板方案.md)。

---

## 一、技术栈

| 层 | 技术 |
|----|------|
| H5 业务 | Vue 3 + Vite + TypeScript + Pinia + Vue Router + Vant 4 |
| iOS 外壳 | Swift + `WKWebView`（WebView 池化预热） |
| Android 外壳 | Kotlin + `WebView`（预置离线包） |
| 工程化 | npm workspaces 单仓多包（H5 + 共享 packages） |
| 离线包 | Android：打包进 APK `assets/offline`；iOS：运行时从服务端按版本比对下发 |

---

## 二、仓库结构（monorepo）

```
markApp/
├── .env                          # 全局环境配置（H5 / 离线包 / JSBridge）
├── package.json                  # 根：npm workspaces，提供 dev/build 等脚本
├── pnpm-workspace.yaml
│
├── h5/                           # H5 业务层（@hybrid/h5）
│   ├── src/
│   │   ├── bridge/               # JSBridge H5 侧封装（call / 事件总线 / mock 降级）
│   │   ├── composables/          # 组合式函数
│   │   │   ├── useApp.ts         # 平台识别、原生就绪握手
│   │   │   ├── useWidget.ts      # 桌面组件数据同步
│   │   │   └── useAudioRecorder.ts  # 语音复盘录音（原生桥 / 浏览器 MediaRecorder 双适配）
│   │   ├── router/               # 路由 + 双栈协同跳转（navigate.ts / index.ts）
│   │   ├── stores/               # Pinia：app / todo / goal / summary
│   │   ├── styles/               # 全局样式（含 dialog.scss 居中兜底）
│   │   ├── utils/                # 工具：request(http) / idb / toast / dialog
│   │   ├── views/                # 业务页面（见第三节）
│   │   ├── App.vue               # 根组件（含浏览器降级 TabBar）
│   │   └── main.ts               # 入口（挂载 Bridge 回传入口、初始化 store）
│   └── package.json
│
├── native/                       # 原生外壳层
│   ├── android/                  # Kotlin：JSBridge + plugins + 离线包(assets/offline)
│   └── ios/                      # Swift：WKWebView + Bridge/Plugins + Offline
│
└── packages/                     # 共享包
    ├── bridge-protocol/          # @hybrid/bridge-protocol：双端共享的 action 类型契约
    └── offline-packager/         # @hybrid/offline-packager：离线包打包（manifest + zip）
```

---

## 三、H5 业务模块

| 页面（views） | 路由 | 说明 |
|------|------|------|
| `home` | `/home` | 记事项首页：事项管理、快速打卡、备份导入导出、桌面快捷方式 |
| `stats` | `/stats` | 数据 / 打卡统计（日历打点、周统计、累计排行） |
| `summary` | `/summary` | **每日总结**：文字复盘 + 语音复盘（录音走原生桥，回放 + 删除） |
| `dailyGoal` | `/daily-goal` | 每日目标设定与打卡 |

**语音复盘（重点）**：`/summary` 页支持「文字 / 语音」分段切换。语音录音在**真机走原生桥**（`device.audio.start/stop`，原生录 m4a 回传 base64），浏览器 `localhost` 开发环境走 `MediaRecorder` 双适配。音频 base64 存入 **IndexedDB**（`utils/idb.ts`），store 仅保存按日期的小索引（meta 不含 base64），避免 localStorage 5MB 被撑爆。

---

## 四、架构与关键约定（混合架构必读）

1. **离线包双端机制不同**
   - **Android**：离线包预置在 `native/android/app/src/main/assets/offline/`，打进 APK。改完 H5 必须 `npm run build` → 把 `h5/dist` 整体拷进该目录 → Android Studio 重打 APK。WebView 加载 `file:///android_asset/offline`。
   - **iOS**：离线包在沙盒 `Documents/offline/<version>/`，运行时从 `OFFLINE_MANIFEST_URL` 按版本比对下发。本地改完走 `npm run build:offline` + `npm run pack:offline` 出包上传服务端，真机版本比对后下载。

2. **JSBridge 三消息模型**（统一在 `packages/bridge-protocol` 定义，双端共享）
   - `invoke`：H5 调原生，`call(action, params)` 返回 Promise，按 `callbackId` 匹配回传。
   - `callback`：原生回传结果，H5 在 `main.ts` 挂载 `window.NativeBridge._recvCallback` 接收。
   - `event`：原生主动派发（如 `app.foreground` / `quick_add`），H5 用 `on(event, fn)` 订阅。
   - **浏览器降级**：无原生注入时，`call()` 自动走 `mockCall`，便于纯 Web 调试（如 `device.getPlatform` 返回 `web`）。

3. **原生 Tab vs 浏览器降级 TabBar**
   - 真机：底部 TabBar 由原生壳渲染，每个 Tab = 一个常驻 WebView（iOS 用 WebView 池）。
   - 浏览器（无原生）：`App.vue` 渲染降级 `van-tabbar`，单页面内切换路由。

4. **存储分层**
   - 小数据 / 索引：`localStorage`（如按日期的总结文字、语音 meta 列表）。
   - 大二进制（音频 base64）：`IndexedDB`（`utils/idb.ts`，库名 `notepad` / store `audios`）。

---

## 五、JSBridge 能力清单

类型契约见 `packages/bridge-protocol/src/index.ts`。下表为**已落地**的原生实现：

| 命名空间 | Action | 功能 | 平台 |
|---------|--------|------|------|
| `device` | `getPlatform` / `getDeviceId` | 平台信息 / 设备号 | 双端 |
| `device.camera` | `takePhoto` | 拍照 / 选图 | 双端 |
| `device.audio` | `start` / `stop` | 录音（回传 base64 + 时长 + 格式） | 双端 |
| `device.location` | `get` | 获取定位 | 双端 |
| `device.scan` | `scanCode` | 扫码 | 双端 |
| `storage.local` | `set` / `get` | 原生本地存储（跨 WebView 共享） | 双端 |
| `nav` | `setTitle` / `setBarVisible` / `setRightButton` / `push` / `pop` / `switchTab` / `setTabBar` | 导航栏与转场 | 双端 |
| `share` | （默认） | 分享 | 双端 |
| `app` | `checkUpdate` / `ready` | 版本检查 / H5 就绪握手 | 双端 |
| `shortcut` | `requestPin` / `getPendingQuickAdd` | 桌面「快速记一笔」快捷方式 | Android |
| `widget` | `sync` / `getPendingRecord` / `addRecord` / `removeRecords` / `removeRecord` | 桌面组件数据同步与共享账本 | Android |
| `push` / `pay` | `register` / `wechat` | 推送 / 微信支付 | 协议已定义，原生侧待接入 |

> `push.register` / `pay.wechat` 已在协议层定义类型，但当前原生 plugin 未实现，调用会走 mock 返回。

**H5 调用示例**

```typescript
import { call, on } from '@/bridge'

// 调原生能力（Promise）
const loc = await call('device.location.get', { type: 'gcj02' })
await call('nav.setTitle', { title: '每日总结' })

// 订阅原生事件
on('app.foreground', () => {
  console.log('App 回到前台')
})
```

**网络请求示例**

```typescript
import http from '@/utils/request'

const info = await http.get('/user/info')
const res = await http.post('/auth/login', { phone: '13800138000', code: '123456' })
```

**双栈协同跳转**

```typescript
import { navigateTo, navigateBack } from '@/router/navigate'

// meta.native === true 的页面走原生 WebView 转场；其余 H5 内部路由
await navigateTo('/summary')
navigateBack()
```

---

## 六、新增一个原生能力（标准化步骤）

以新增 `device.audio` 为例：

1. **协议层**：在 `packages/bridge-protocol/src/index.ts` 的 `BridgeActionMap` 增加 `{ params, result }` 类型（H5 与原生共享，类型即契约）。
2. **Android**：
   - 新建 `native/android/.../bridge/plugins/XxxPlugin.kt`（实现 `BridgePlugin`，`namespace.method`）。
   - 在 `JSBridge.kt` 的 `init()` 里 `register(XxxPlugin(ctx))`。
   - 在 `AndroidManifest.xml` 加所需权限（如录音 `RECORD_AUDIO`）；运行时权限在 `MainActivity` 预请求。
3. **iOS**：
   - 新建 `native/ios/HybridApp/Bridge/Plugins/XxxPlugin.swift`。
   - 在 `HybridWebViewController.viewDidLoad` 的注册列表加 `bridge.register(plugin: XxxPlugin())`。
   - 在 `Info.plist` 加权限描述（如 `NSMicrophoneUsageDescription`）。
   - ⚠️ **回传链路必看**：`JSBridgeContentController` 必须持有 `webView`（`bridge.attach(webView:)`），回传用 `webView.evaluateJavaScript(...)`；且注入脚本需提供 `window.NativeBridge.invoke` 转发到 `messageHandlers.NativeBridgeInvoke`，否则真机上 `call()` 会全部降级成 mock、原生能力失效。
4. **H5**：在业务里 `await call('device.xxx.method', params)` 即可。

---

## 七、环境要求

| 工具 | 要求 |
|------|------|
| Node.js | ≥ 18（推荐 LTS） |
| npm | ≥ 9（已适配 workspaces） |
| iOS 原生 | macOS + Xcode 14+ + CocoaPods |
| Android 原生 | Android Studio 2022.1+（API 24+） |

---

## 八、快速开始

```bash
# 1. 安装全部工作区依赖
npm install

# 2. 启动 H5 开发服务器（Vite，HMR）
npm run dev
#    访问 http://localhost:5173/  （或手机访问 http://<电脑IP>:5173/）

# 3. 类型检查 + 生产构建
npm run build
```

**真机快速验证**：手机连电脑，跑 `npm run dev`，手机浏览器访问 `电脑IP:5173`。该地址是 `localhost` 安全上下文，语音复盘会走浏览器 `MediaRecorder` 真录真放，无需打包即可验证 H5 逻辑。

**原生运行（需原生环境）**

```bash
# iOS
cd native/ios && pod install && open HybridApp.xcworkspace   # Xcode 运行

# Android
# 用 Android Studio 打开 native/android 运行（离线包已含最新 h5/dist）
```

---

## 九、构建与离线包

```bash
# H5 构建（含 vue-tsc 类型检查）→ 产物 h5/dist
npm run build

# Android：把 h5/dist 同步进预置离线包，再 Android Studio 重打包 APK
rm -rf native/android/app/src/main/assets/offline
cp -r h5/dist/. native/android/app/src/main/assets/offline/

# iOS：出离线包并上传服务端（运行时按版本下发）
npm run build:offline     # 构建离线包工具
npm run pack:offline      # 生成 manifest.json + package.zip 到 output/
#   自定义：npm run pack:offline -- --version 1.0.1 --src h5/dist --output ./output
```

环境变量统一在根目录 `.env`（详见文件内注释：`APP_VERSION` / `H5_DEV_PORT` / `VITE_API_BASE_URL` / `OFFLINE_MANIFEST_URL` / `BRIDGE_GLOBAL_NAME` 等）。

---

## 十、已知坑 / FAQ

- **iOS 桥双向死链（已修复，加新 action 必看）**：旧版 `JSBridge.callback` 调插件的 `evalJS`（空实现）导致回传不执行；且注入脚本缺 `window.NativeBridge.invoke`，导致 `call()` 全走 mock。修复见第六节第 3 步。所有 iOS 原生能力（相机/定位/扫码/录音）均依赖此链路。
- **真机录音必须走原生**：离线包以 `file://` 加载，`getUserMedia`/`MediaRecorder` 要求安全上下文（https/localhost），`file://` 不满足 → 纯 H5 录音在真机离线包不可用，故录音走 `device.audio` 原生桥。
- **Dialog 居中**：函数式 `showConfirmDialog` 的 `.van-popup--center` 居中 CSS 不被自动打包，已在 `src/styles/dialog.scss` 手动补齐 `position:fixed; top/left:50%; transform:translate(-50%,-50%)`。
- **Toast 跨 WebView 残留**：每个原生 Tab 是独立 WebView，切走时 `setTimeout` 被挂起导致 Toast 不消失；`utils/toast.ts` 已在 `visibilitychange` / 路由切换时强制清理。
- **首屏空白**：检查 `vite.config.ts` 的 `base` 应为相对路径 `./`，且静态服务器需支持 SPA 回退（`try_files $uri $uri/ /index.html`）。
- **跨域**：开发环境 Vite 已配代理；生产由 Nginx 反向代理或后端 CORS。

---

## 十一、代码规范

提交遵循 Conventional Commits（`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`）。分支建议 `main`（稳定）/ `develop`（日常）/ `feature/*` / `hotfix/*`。TypeScript 严格模式，组件 PascalCase、文件 kebab-case。

---

## 十二、许可证

MIT License。

# 混合架构 App 开发模板

> 基于「原生外壳 + H5」三层架构的企业级移动应用开发模板

## 一、项目概述

### 1.1 设计目标

提供一套**可直接落地、可复用**的混合 App 开发模板，让业务团队聚焦 H5 业务页面开发，原生外壳一次性建设、长期复用。

**核心特性**：
- **一套 H5，双端运行**：iOS / Android 共用同一套 H5 业务代码
- **原生级体验**：WebView 预加载 + 离线包 + 原生导航容器
- **能力可扩展**：原生能力以插件化方式注册到 JSBridge
- **工程标准化**：内置登录、首页、个人中心、消息中心等基础模块

### 1.2 适用场景

- 业务迭代频繁、需要快速发版（H5 可热更新，绕过应用商店审核）
- 已有大量 Web 端资产，希望低成本迁移到 App
- 多业务线共用一个 App 壳，各业务线独立开发 H5
- 对部分页面有原生体验要求（如相机、地图、首屏闪屏），其余页面用 H5

### 1.3 技术架构

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

---

## 二、环境要求

### 2.1 基础环境

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | ≥ 18.0.0 | 推荐使用 LTS 版本 |
| npm | ≥ 9.0.0 | 包管理器（已适配 npm workspaces） |
| Git | ≥ 2.0.0 | 版本控制 |

### 2.2 原生开发环境（可选）

**iOS 开发**：
- macOS 12.0+
- Xcode 14.0+
- CocoaPods 1.12+
- iOS 模拟器或真机（iOS 13.0+）

**Android 开发**：
- Android Studio 2022.1+
- Android SDK（API 24+）
- Android 模拟器或真机（Android 7.0+）

### 2.3 开发工具推荐

- **IDE**：VS Code + Volar 插件（H5 开发）、Android Studio（Android 原生）、Xcode（iOS 原生）
- **浏览器**：Chrome 100+（支持最新 JavaScript 特性）

---

## 三、安装步骤

### 3.1 克隆项目

```bash
git clone <repository-url>
cd nativeApp-demo
```

### 3.2 安装依赖

```bash
# 安装所有工作区依赖（H5 + packages）
npm install
```

**依赖说明**：
- 项目使用 npm workspaces 管理多包依赖
- 根目录 [.env](.env) 包含所有环境配置
- 依赖安装后会在根目录生成 `node_modules`

### 3.3 配置环境变量

编辑根目录 [.env](.env) 文件：

```env
# 应用版本号（与离线包版本一致）
APP_VERSION=1.0.0

# 运行环境：development | staging | production
NODE_ENV=development

# H5 开发服务器端口
H5_DEV_PORT=5173

# 远程入口（离线包未命中时的兜底地址）
H5_REMOTE_ENTRY=https://app.example.com/index.html

# API 基础地址
VITE_API_BASE_URL=https://api.example.com

# 网络请求超时（毫秒）
VITE_API_TIMEOUT=15000

# 请求重试次数
VITE_API_RETRY=1

# 离线包配置
OFFLINE_MANIFEST_URL=https://app.example.com/offline/manifest.json
OFFLINE_DOWNLOAD_BASE=https://app.example.com/offline/packages/

# JSBridge 配置
BRIDGE_GLOBAL_NAME=NativeBridge
BRIDGE_DEBUG=true

# 安全配置
BRIDGE_DOMAIN_WHITELIST=app.example.com,localhost,127.0.0.1
```

---

## 四、启动运行说明

### 4.1 开发环境启动

**启动 H5 开发服务器**：

```bash
# 方式一：通过根目录脚本启动
npm run dev

# 方式二：直接启动 H5 工作区
npm run dev --workspace @hybrid/h5
```

**访问地址**：
- Local: `http://localhost:5173/`
- Network: `http://<your-ip>:5173/`

**参数说明**：
- 端口由 `.env` 中的 `H5_DEV_PORT` 控制
- 支持热模块替换（HMR）
- 自动打开浏览器预览

**绕过登录验证**（开发预览用）：

在浏览器控制台执行：
```javascript
sessionStorage.setItem('h5_auth_token', 'preview-token')
```

### 4.2 生产环境启动

**预览构建产物**：

```bash
# 构建生产包
npm run build

# 预览构建结果
npm run preview
```

### 4.3 原生 App 运行（需原生环境）

**iOS**：
```bash
cd native/ios
pod install
# 使用 Xcode 打开 HybridApp.xcworkspace 并运行
```

**Android**：
```bash
# 使用 Android Studio 打开 native/android 并运行
```

### 4.4 常见启动问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 端口被占用 | 5173 端口已被使用 | 修改 `.env` 中的 `H5_DEV_PORT` |
| 依赖安装失败 | npm 缓存问题 | 执行 `npm cache clean --force` 后重试 |
| 类型检查错误 | TypeScript 版本不匹配 | 确保 Node.js ≥ 18，重新安装依赖 |
| API 请求失败 | 后端服务未启动 | mock 数据已兜底，不影响页面展示 |

---

## 五、打包部署指南

### 5.1 H5 打包

**构建命令**：

```bash
# 类型检查 + 构建
npm run build
```

**构建产物**：

- 输出目录：`h5/dist/`
- 主要文件：
  - `index.html` — 入口 HTML
  - `assets/*.js` — JavaScript 模块（代码分割）
  - `assets/*.css` — 样式文件

**构建优化**：

- 代码分割：`vue` + `vant` 单独打包
- Tree Shaking：移除未使用代码
- 压缩：esbuild 压缩 JS/CSS
- 首屏体积：gzip ≈ 97KB（符合 <150KB 要求）

### 5.2 离线包打包

**生成离线包**：

```bash
# 构建离线包工具
npm run build:offline

# 打包 H5 资源为 zip
npm run pack:offline
```

**参数配置**：

```bash
# 自定义参数（可选）
npx tsx packages/offline-packager/src/cli.ts \
  --version 1.0.0 \
  --src h5/dist \
  --output ./offline-packages \
  --package-base https://app.example.com/offline/packages/
```

**离线包结构**：

```
offline-packages/
  v1.0.0/
    ├── manifest.json      # 版本清单
    └── package.zip        # H5 资源压缩包
```

### 5.3 部署流程

**H5 部署**：

1. 构建生产包：`npm run build`
2. 上传 `h5/dist/` 到 CDN 或静态服务器
3. 配置 Nginx/Apache 支持 SPA 路由

**离线包部署**：

1. 打包离线包：`npm run pack:offline`
2. 上传到离线包服务器
3. 更新 `manifest.json` 版本号

**原生 App 发布**：

- iOS：通过 Xcode Archive 上传到 App Store Connect
- Android：生成签名 APK/AAB 上传到 Google Play

---

## 六、项目主要模块功能说明

### 6.1 核心模块架构

```
H5 业务层
├── 路由管理 (router/)
│   ├── 双栈协同路由
│   ├── 路由守卫
│   └── 导航同步
├── 网络请求 (utils/request)
│   ├── Axios 封装
│   ├── Token 注入
│   ├── 请求去重
│   └── 错误重试
├── 状态管理 (stores/)
│   ├── user — 用户登录态
│   ├── app — 应用状态
│   └── message — 消息管理
├── 业务页面 (views/)
│   ├── home — 首页
│   ├── login — 登录注册
│   ├── profile — 个人中心
│   ├── message — 消息中心
│   ├── category — 分类导航
│   ├── goods — 商品详情
│   ├── order — 订单列表
│   └── settings — 设置
└── 原生桥接 (bridge/)
    ├── JSBridge 封装
    ├── 事件总线
    └── 业务快捷方法
```

### 6.2 JSBridge 模块

**支持的原生能力**（17 个 action）：

| 命名空间 | Action | 功能 |
|---------|--------|------|
| `device.camera` | `takePhoto` | 拍照 |
| `device.location` | `getCurrentPosition` | 获取定位 |
| `device.scan` | `scanQRCode` | 扫码 |
| `storage.local` | `get` / `set` / `remove` | 本地存储 |
| `push` | `register` / `unregister` | 推送通知 |
| `pay` | `wechat` / `alipay` | 支付 |
| `share` | `wechat` / `weibo` | 分享 |
| `nav` | `push` / `pop` / `switchTab` | 导航控制 |
| `app` | `checkUpdate` / `exit` | 应用控制 |
| `auth` | `getAuthCode` | 授权登录 |

**使用示例**：

```typescript
import { call } from '@/bridge'

// 拍照
const photo = await call('device.camera.takePhoto', { quality: 0.8 })

// 获取定位
const location = await call('device.location.getCurrentPosition')

// 设置导航栏标题
await call('nav.setTitle', { title: '商品详情' })

// 事件监听
import { eventBus } from '@/bridge'
eventBus.on('app.resume', () => {
  console.log('App 回到前台')
})
```

### 6.3 网络请求模块

**特性**：

- Token 自动注入（从原生 storage.local 拉取）
- 401 自动触发重新登录
- 请求去重（相同 URL + 参数合并）
- 网络错误自动重试（默认 1 次）
- 统一错误处理

**使用示例**：

```typescript
import http from '@/utils/request'

// GET 请求
const data = await http.get('/goods/123')

// POST 请求
const result = await http.post('/auth/login', {
  phone: '13800138000',
  code: '123456'
})

// 静默请求（不显示错误 toast）
const data = await http.get('/user/info', {}, { silent: true })
```

### 6.4 路由管理模块

**双栈协同路由**：

- **页面级跳转**（`meta.native: true`）：走 `bridge.nav.push`，由原生创建新 WebView
- **页面内跳转**：走 `router.push`，由 H5 自身管理

**导航方法**：

```typescript
import { navigateTo, navigateBack } from '@/router/navigate'

// 页面级跳转（原生创建 WebView）
await navigateTo('/goods/123')

// 页面内跳转（H5 路由）
await navigateTo('/settings')

// 返回
await navigateBack()
```

---

## 七、项目目录结构说明

```
nativeApp-demo/
├── .env                          # 全局环境配置
├── .gitignore                    # Git 忽略规则
├── .npmrc                        # npm 配置
├── package.json                  # 根项目配置
├── pnpm-workspace.yaml           # pnpm workspaces 配置
├── README.md                     # 项目文档
│
├── h5/                           # H5 业务层
│   ├── dist/                     # 构建产物
│   ├── src/
│   │   ├── api/                  # API 接口定义
│   │   ├── bridge/               # JSBridge 封装
│   │   ├── components/           # 公共组件
│   │   ├── composables/          # 组合式函数
│   │   ├── layouts/              # 布局组件
│   │   ├── router/               # 路由配置
│   │   ├── stores/               # 状态管理
│   │   ├── styles/               # 全局样式
│   │   ├── utils/                # 工具函数
│   │   ├── views/                # 业务页面
│   │   ├── App.vue               # 根组件
│   │   └── main.ts               # 入口文件
│   ├── index.html                # HTML 模板
│   ├── package.json              # H5 依赖配置
│   ├── tsconfig.json             # TypeScript 配置
│   └── vite.config.ts            # Vite 配置
│
├── native/                       # 原生外壳层
│   ├── android/                  # Android 原生项目
│   │   ├── app/
│   │   │   ├── src/main/
│   │   │   │   ├── java/         # Kotlin 源码
│   │   │   │   ├── res/          # 资源文件
│   │   │   │   └── AndroidManifest.xml
│   │   │   └── build.gradle.kts
│   │   └── build.gradle.kts
│   │
│   └── ios/                      # iOS 原生项目
│       ├── HybridApp/
│       │   ├── App/              # 应用入口
│       │   ├── Bridge/           # JSBridge 实现
│       │   ├── Offline/          # 离线包管理
│       │   ├── Shell/            # 导航容器
│       │   └── WebView/          # WebView 封装
│       └── Podfile
│
└── packages/                     # 共享包
    ├── bridge-protocol/          # Bridge 类型定义
    │   ├── src/index.ts          # 17 个 action 类型
    │   └── package.json
    │
    └── offline-packager/         # 离线包打包工具
        ├── src/cli.ts            # CLI 入口
        └── package.json
```

---

## 八、贡献指南

### 8.1 代码提交规范

使用 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：

- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构代码
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**：

```bash
feat(bridge): 新增蓝牙设备扫描能力

- 新增 device.bluetooth.scan action
- 支持设备过滤和超时设置
- 添加 Android/iOS 双端实现

Closes #123
```

### 8.2 分支管理策略

- `main`: 主分支，稳定版本
- `develop`: 开发分支，日常开发
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复分支

**工作流程**：

1. 从 `develop` 创建 `feature/xxx` 分支
2. 开发完成后提交 Pull Request
3. 代码审查通过后合并到 `develop`
4. 测试通过后合并到 `main`

### 8.3 代码风格

- 遵循 ESLint + Prettier 配置
- 使用 TypeScript 严格模式
- 组件命名：PascalCase
- 文件命名：kebab-case

---

## 九、常见问题解答

### Q1: H5 页面如何调试？

**A**: 
- 浏览器：打开 Chrome DevTools，访问 `http://localhost:5173/`
- 原生 WebView：
  - iOS：Safari → 开发 → 模拟器 → 选择页面
  - Android：Chrome → `chrome://inspect` → 选择设备

### Q2: 如何新增原生能力？

**A**:
1. 在 `packages/bridge-protocol/src/index.ts` 添加类型定义
2. iOS：在 `native/ios/HybridApp/Bridge/Plugins/` 新增 Plugin
3. Android：在 `native/android/app/src/main/java/com/example/hybrid/bridge/plugins/` 新增 Plugin
4. 注册到 JSBridge 插件列表

### Q3: 如何修改 API 地址？

**A**: 编辑根目录 `.env` 文件中的 `VITE_API_BASE_URL`

### Q4: 为什么构建后页面空白？

**A**: 
- 检查 `vite.config.ts` 的 `base` 配置（应为 `'./'`）
- 检查服务器是否支持 SPA 路由（Nginx 配置 `try_files $uri $uri/ /index.html`）

### Q5: 如何处理跨域问题？

**A**:
- 开发环境：Vite 已配置 CORS
- 生产环境：配置 Nginx 反向代理或后端支持 CORS

### Q6: 如何实现热更新？

**A**:
- H5：通过离线包机制实现（原生检查版本 → 下载新包 → 解压覆盖）
- 原生：需发布到应用商店（iOS/Android 审核流程）

### Q7: 如何优化首屏加载速度？

**A**:
- WebView 池化预热（原生层已实现）
- 离线包预加载（原生层已实现）
- 骨架屏（H5 已实现）
- 代码分割 + Tree Shaking（构建时已优化）

### Q8: Token 如何管理？

**A**:
- 存储在原生 `storage.local`（跨 WebView 共享）
- H5 启动时从原生拉取到内存缓存
- 401 时自动清除并触发重新登录

### Q9: 如何支持多语言？

**A**:
- H5：使用 Vue I18n
- 原生：iOS 使用 Localizable.strings，Android 使用 strings.xml
- 通过 Bridge 同步语言设置

### Q10: 如何处理 Android 返回键？

**A**:
- 原生层拦截返回键事件
- 如果 H5 路由栈有历史 → 调用 `navigateBack()`
- 否则退出应用

---

## 十、技术支持

### 文档

- [混合架构App开发模板方案.md](混合架构App开发模板方案.md) — 完整技术方案
- [API 文档](docs/api.md) — 接口文档（待补充）
- [原生开发指南](docs/native-dev.md) — 原生开发指南（待补充）

### 联系方式

- Issue: [GitHub Issues](https://github.com/your-org/nativeApp-demo/issues)
- Email: dev-team@example.com

---

## 十一、许可证

MIT License

Copyright (c) 2026 Your Organization

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
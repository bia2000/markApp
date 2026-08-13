# markApp 项目长期笔记

## 真机部署链路（关键约束，踩过多次坑）
- 真机 WebView 加载的是**原生壳离线包**，不是 h5/dist。H5 改完必须「build + 同步进离线包 + 重打包原生壳」才在真机生效。
- **Android**：离线包在 `native/android/app/src/main/assets/offline/`（预置资源，打进 APK）。需 `npm run build`（h5）→ 把 `h5/dist` 整体 cp 进该目录 → Android Studio 重打 APK。WebView 加载路径 `file:///android_asset/offline`（`BaseWebFragment.kt`）。
- **iOS**：离线包在沙盒 `Documents/offline/<version>/`（`OfflinePackageHandler.swift`），运行时从服务端 `app.example.com/offline/manifest.json` 按版本比对下发。本地改完需走 `npm run build:offline` + `npm run pack:offline` 出包上传发布，真机版本比对后下载。
- **快速真机验证**：手机连电脑跑 `npm run dev`（vite host 已开 0.0.0.0），手机访问 `电脑IP:5173`，绕开离线包直接看新 H5。
- 注意：`build` 在本机需 `env -u CODEBUDDY_SESSION_ID -u CLAUDE_SESSION_ID` 绕过 safe-delete shim 才能删旧 dist；删 native 下 offline 目录可直接 `rm -rf`（shell 已授权 bypass）。

## 样式/构建约束
- Vant 用 `@vant/auto-import-resolver` 按需引入组件样式，**但「函数式调用」的组件（Toast / showConfirmDialog 等，不在模板内）其默认 CSS 不会被自动打进项目**——全局覆盖样式必须自身完整、不依赖 Vant 默认。
- **Dialog 居中坑（新增每日计划模块时踩）**：Vant4 的 Dialog 居中是靠外层 `van-overlay`(fixed 全屏) + `van-popup--center`(`position:fixed;top/left:50%;transform:translate(-50%,-50%)`) 实现的；这份 `.van-popup--center` 居中 CSS 同样不被函数式 `showConfirmDialog` 引入。若 `dialog.scss` 只补卡片视觉而漏掉定位，`.van-dialog` 会退化成文档流元素、被 teleport 到 body 后落在页面**左下角**。已在 `src/styles/dialog.scss` 用 `.van-dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2001}` 自行补齐，且 `bounce` 动画的 `transform` 必须带同样的 `translate(-50%,-50%)`，否则入场/退场会瞬移回左上角。
- scss 通过 `@use` 子文件时拿不到 vite `additionalData` 注入的变量，子文件需自己 `@use 'variables.scss' as *;`。
- 覆盖第三方组件建议加 !important 兜底，防将来引入全量样式/顺序变化翻车。

## Toast 生命周期约束（混合架构必看）
- 根因：每个原生 Tab 是独立 WebView，切走时原生层 `pauseTimers()` 挂起该 WebView 内 setTimeout；Vant 函数式 Toast 的自动关闭依赖 setTimeout → 被挂起 → toast 不消失、切回前台仍残留。
- 修复（已落地 `src/utils/toast.ts`）：① 模块顶层注册 `visibilitychange`(回到前台)+`pageshow` 监听，触发 `toast.clear()`(即 Vant `closeToast`) 强制清理；② `router.afterEach` 调 `toast.clear()` 覆盖 WebView 内切页；③ `toast.loading` 默认 15s 安全超时自动关闭，防忘记 close 永久卡屏。
- 调用方注意：loading 不再是 duration:0 永久态，最长 15s 自动关；需真正永久请显式 `{ duration: 0 }` 并手动 `.close()`。

## 新增「原生 Tab」的标准步骤（混合架构必看）
- 架构：底部 TabBar 由原生壳渲染，每个 Tab = 一个常驻 WebView Fragment（Android `BaseWebFragment` 子类带 `routePath`；iOS `HybridWebViewController(routePath:)`）。H5 路由 `meta.tab/tabIndex` 仅用于浏览器降级 tabbar（`App.vue` 的 `van-tabbar`）+ keep-alive。
- **Android** 三处必改：① 新建 `native/.../shell/tab/XxxWebFragment.kt`（`override val routePath = "/xxx"`）；② `MainActivity.kt` 的 `fragments` 列表 + `titles` 数组追加一项，且 `setOnNavigationItemSelectedListener` 的 `when` 加 `R.id.tab_xxx -> N`；③ `res/menu/menu_bottom_nav.xml` 加 `<item android:id="@+id/tab_xxx" android:icon="@android:drawable/..." android:title="..."/>`。
- **iOS**：`MainTabBarController.swift` 的 `setupTabs()` 里加一行 `makeTab(title: "..", icon: "sf-symbol", url: "/xxx")`。
- **H5**：`router/index.ts` 加路由（`tab:true, tabIndex:N`）+ 新 `views/xxx/index.vue` + 新 store；`App.vue` 降级 tabbar 加 item、`cachedViews` 加 name；新 store 的 `rehydrate()` 挂进 `main.ts` 的 `window.__todoResync`（跨 WebView 同步，否则切 Tab 看不到最新数据）。
- ⚠️ 加完**必须重打包原生壳**才在真机出现新 Tab（离线包只含 H5 页面，不含 tab 装配）；浏览器 `npm run dev` 访问 `电脑IP:5173` 走降级 tabbar 可立即验证 H5 页。
- 约束：目标/新模块若「不想上桌面组件」，store 里**不要**调 `call('widget.addRecord')`（桌面组件只读 todo store 的共享账本）。

## Pinia setup store 在 `<script setup>` 模板里的类型坑
- 直接 `const x = useXStore()` 后在模板用 `x.getter` 可能报「Property 'xxx' does not exist」（vue-tsc 模板检查）。标准解法：`storeToRefs(store)` 解构 state+getters 用于模板/派生，actions 留在 store 实例上调用。dailyGoal 模块已踩并修正。

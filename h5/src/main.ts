/**
 * H5 入口（记事本版）
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { installBridgeReceiver } from './bridge';
import { resyncWidget } from './composables/useWidget';
import { useAppStore } from './stores/app';
import { useTodoStore } from './stores/todo';
import { useSummaryStore } from './stores/summary';
import { useGoalStore } from './stores/goal';
import { eventBus } from './bridge/eventbus';

async function bootstrap(): Promise<void> {
  // 安装 Bridge 接收器（供原生回调用，浏览器环境自动降级）
  installBridgeReceiver();

  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(router);

  // 初始化应用状态（平台信息 + 生命周期事件订阅）
  const appStore = useAppStore();
  await appStore.init();

  // 原生外壳：底部 TabBar 由原生渲染，H5 不再自绘（浏览器预览降级为内置导航）。
  if (appStore.platform && appStore.platform.platform !== 'web') {
    document.documentElement.classList.add('app-native');
  }

  // 跨 WebView 数据同步：原生每个 Tab 是独立 WebView，共享 localStorage 但各自内存态独立。
  // 切到某个 Tab 时重新读取，保证统计/总结/每日计划页看到最新数据。
  const todo = useTodoStore();
  const summary = useSummaryStore();
  const goal = useGoalStore();
  const resync = (): void => {
    todo.rehydrate();
    summary.rehydrate();
    goal.rehydrate();
    // 合并桌面组件（原生）点记录产生的共享记录，使 App 与组件数据一致
    void resyncWidget();
  };
  (window as Window & { __todoResync?: () => void }).__todoResync = resync;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resync();
  });
  window.addEventListener('pageshow', resync);

  app.mount('#app');

  // 移除 splash 占位
  const splash = document.getElementById('app-splash');
  if (splash) splash.remove();

  // 通知原生 H5 已就绪
  eventBus.emit('app.ready');
}

bootstrap().catch((err) => {
  console.error('[main] bootstrap failed', err);
  const splash = document.getElementById('app-splash');
  if (splash) {
    splash.innerHTML = '加载失败，请重启 App';
  }
});

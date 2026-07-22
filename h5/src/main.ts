/**
 * H5 入口
 *
 * 启动流程（对应方案 10.1）：
 * 1. 安装 Bridge 接收器（供原生回调用）
 * 2. 初始化 Pinia
 * 3. 初始化应用状态（平台信息 + 事件订阅）
 * 4. 恢复登录态
 * 5. 挂载 Vue 应用
 * 6. 通知原生隐藏 Splash（通过 app.ready 事件，原生监听）
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { installBridgeReceiver } from './bridge';
import { useAppStore } from './stores/app';
import { useUserStore } from './stores/user';
import { eventBus } from './bridge/eventbus';

async function bootstrap(): Promise<void> {
  // 1. 安装 Bridge 接收器
  installBridgeReceiver();

  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(router);

  // 2. 初始化应用状态
  const appStore = useAppStore();
  await appStore.init();

  // 3. 恢复登录态
  const userStore = useUserStore();
  await userStore.restore().catch((err) => {
    console.warn('[main] restore login failed', err);
  });

  // 4. 挂载
  app.mount('#app');

  // 5. 移除 splash 占位
  const splash = document.getElementById('app-splash');
  if (splash) splash.remove();

  // 6. 通知原生 H5 已就绪（原生监听此事件后隐藏 Splash）
  eventBus.emit('app.ready');
}

bootstrap().catch((err) => {
  console.error('[main] bootstrap failed', err);
  // 兜底：仍然挂载应用，避免白屏
  const splash = document.getElementById('app-splash');
  if (splash) {
    splash.innerHTML = '加载失败，请重启 App';
  }
});

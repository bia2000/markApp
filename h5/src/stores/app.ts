/**
 * 应用全局状态：平台信息、网络状态等
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { call } from '@/bridge';
import { onNetworkChange, onLaunch, onForeground, onBackground } from '@/bridge/helpers';
import type { PlatformInfo, NetworkChangePayload } from '@hybrid/bridge-protocol';

export const useAppStore = defineStore('app', () => {
  const platform = ref<PlatformInfo | null>(null);
  const network = ref<NetworkChangePayload>({ type: 'wifi', isConnected: true });
  const launched = ref(false);
  const foreground = ref(true);

  /** 初始化：获取平台信息 + 订阅生命周期事件 */
  async function init(): Promise<void> {
    try {
      platform.value = await call('device.getPlatform');
    } catch {
      // 浏览器降级：构造默认值
      platform.value = {
        platform: 'web',
        version: '0.0.0',
        appVersion: '1.0.0',
        statusBarHeight: 0,
        safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
        environment: 'debug'
      };
    }

    onLaunch(() => {
      launched.value = true;
    });
    onForeground(() => {
      foreground.value = true;
    });
    onBackground(() => {
      foreground.value = false;
    });
    onNetworkChange((data) => {
      network.value = data;
    });
  }

  return { platform, network, launched, foreground, init };
});

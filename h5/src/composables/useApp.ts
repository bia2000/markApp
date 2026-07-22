/**
 * 网络状态组合式函数
 */
import { computed } from 'vue';
import { useAppStore } from '@/stores/app';

export function useNetwork() {
  const appStore = useAppStore();
  const isOffline = computed(() => !appStore.network.isConnected);
  const networkType = computed(() => appStore.network.type);
  return { isOffline, networkType };
}

/**
 * 平台信息组合式函数
 */
export function usePlatform() {
  const appStore = useAppStore();
  return {
    platform: computed(() => appStore.platform),
    isIOS: computed(() => appStore.platform?.platform === 'ios'),
    isAndroid: computed(() => appStore.platform?.platform === 'android'),
    isWeb: computed(() => appStore.platform?.platform === 'web')
  };
}

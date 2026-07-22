/**
 * 用户状态
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http from '@/utils/request';
import { setCachedToken } from '@/utils/request';
import { storageSet, storageGet, navSwitchTab } from '@/bridge/helpers';
import { eventBus } from '@/bridge/eventbus';

export interface UserInfo {
  userId: string;
  nickname: string;
  avatar: string;
  phone: string;
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(null);
  const userInfo = ref<UserInfo | null>(null);
  const isLoggedIn = computed(() => !!token.value);

  /** 启动时从原生 storage 恢复登录态 */
  async function restore(): Promise<void> {
    const [t, info] = await Promise.all([
      storageGet<string>('auth_token'),
      storageGet<UserInfo>('user_info')
    ]);
    token.value = t ?? null;
    userInfo.value = info ?? null;
    setCachedToken(token.value);
  }

  /** 手机号 + 验证码登录 */
  async function loginByCode(phone: string, code: string): Promise<void> {
    const res = await http.post<{ token: string; user: UserInfo }>('/auth/login/code', {
      phone,
      code
    });
    await applyLogin(res.token, res.user);
  }

  /** 账号密码登录 */
  async function loginByPassword(account: string, password: string): Promise<void> {
    const res = await http.post<{ token: string; user: UserInfo }>('/auth/login/password', {
      account,
      password
    });
    await applyLogin(res.token, res.user);
  }

  async function applyLogin(t: string, info: UserInfo): Promise<void> {
    token.value = t;
    userInfo.value = info;
    setCachedToken(t);
    sessionStorage.setItem('h5_auth_token', t);
    // 持久化到原生 storage（跨 WebView 共享）
    await Promise.all([
      storageSet('auth_token', t),
      storageSet('user_info', info)
    ]);
  }

  /** 退出登录 */
  async function logout(): Promise<void> {
    token.value = null;
    userInfo.value = null;
    setCachedToken(null);
    sessionStorage.removeItem('h5_auth_token');
    await Promise.all([
      storageSet('auth_token', null),
      storageSet('user_info', null)
    ]);
  }

  /** Token 过期：清除登录态，弹出登录页（由原生/H5 路由处理） */
  function handleExpired(): void {
    token.value = null;
    userInfo.value = null;
    setCachedToken(null);
    sessionStorage.removeItem('h5_auth_token');
  }

  // 订阅 auth.expired 事件
  eventBus.on('auth.expired', handleExpired);

  return {
    token,
    userInfo,
    isLoggedIn,
    restore,
    loginByCode,
    loginByPassword,
    logout
  };
});

/**
 * 业务侧常用 Bridge 调用快捷封装
 */
import {
  type BridgeEvent,
  type NetworkChangePayload,
  type PushReceivePayload,
  type TakePhotoParams,
  type LocationParams,
  type ScanParams,
  type NavSetRightButtonParams,
  type NavPushParams,
  type NavSetTabBarParams,
  type PayWechatParams,
  type ShareParams
} from '@hybrid/bridge-protocol';
import { call, callSync, on } from './index';

/** 获取平台信息 */
export const getPlatform = () => call('device.getPlatform');

/** 获取设备 ID（同步） */
export const getDeviceIdSync = () => callSync('device.getDeviceId');

/** 拍照 / 选图 */
export const takePhoto = (params: TakePhotoParams = {}) =>
  call('device.camera.takePhoto', params);

/** 定位 */
export const getLocation = (params: LocationParams = {}) =>
  call('device.location.get', params);

/** 扫码 */
export const scanCode = (params: ScanParams = {}) =>
  call('device.scan.scanCode', params);

/** 本地存储 - 设置 */
export const storageSet = (key: string, value: unknown) =>
  call('storage.local.set', { key, value });

/** 本地存储 - 读取 */
export const storageGet = <T = unknown>(key: string) =>
  call('storage.local.get', { key }).then((res) => res.value as T);

/** 注册推送 */
export const registerPush = () => call('push.register');

/** 设置导航栏标题 */
export const setNavTitle = (title: string) => call('nav.setTitle', { title });

/** 显示/隐藏导航栏 */
export const setNavBarVisible = (visible: boolean) =>
  call('nav.setBarVisible', { visible });

/** 设置右侧按钮 */
export const setNavRightButton = (params: NavSetRightButtonParams) =>
  call('nav.setRightButton', params);

/** 页面级跳转 */
export const navPush = (params: NavPushParams) => call('nav.push', params);

/** 返回 */
export const navPop = () => call('nav.pop');

/** 切换 Tab */
export const navSwitchTab = (index: number) => call('nav.switchTab', { index });

/** 向原生注册底部 TabBar（原生外壳渲染，H5 不再自绘） */
export const setTabBar = (params: NavSetTabBarParams) => call('nav.setTabBar', params);

/** 微信支付 */
export const payWechat = (params: PayWechatParams) => call('pay.wechat', params);

/** 分享 */
export const share = (params: ShareParams) => call('share', params);

/** 检查更新 */
export const checkUpdate = () => call('app.checkUpdate');

// ========== 事件订阅 ==========
export function onLaunch(fn: () => void) {
  return on('app.launch', fn);
}
export function onForeground(fn: () => void) {
  return on('app.foreground', fn);
}
export function onBackground(fn: () => void) {
  return on('app.background', fn);
}
export function onNetworkChange(fn: (data: NetworkChangePayload) => void) {
  return on('network.change', fn as (data: unknown) => void);
}
export function onPushReceive(fn: (data: PushReceivePayload) => void) {
  return on('push.receive', fn as (data: unknown) => void);
}

export type { BridgeEvent };

/**
 * JSBridge 协议类型定义
 * 原生侧与 H5 侧共同遵循的接口契约，保证双端一致
 */

// ========== 消息类型 ==========
export type MsgType = 'invoke' | 'callback' | 'event';

// ========== 平台 ==========
export type Platform = 'ios' | 'android' | 'web';

// ========== 统一回调结构 ==========
export interface BridgeResult<T = unknown> {
  /** 0 表示成功，非 0 为错误码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 业务数据 */
  data: T;
}

// ========== 消息格式 ==========
export interface InvokeMessage<P = unknown> {
  msgType: 'invoke';
  namespace?: string;
  action: string;
  callbackId: string;
  params: P;
}

export interface CallbackMessage<T = unknown> {
  msgType: 'callback';
  callbackId: string;
  result: BridgeResult<T>;
}

export interface EventMessage<T = unknown> {
  msgType: 'event';
  event: string;
  data: T;
}

export type BridgeMessage<P = unknown, R = unknown> =
  | InvokeMessage<P>
  | CallbackMessage<R>
  | EventMessage;

// ========== 平台信息 ==========
export interface PlatformInfo {
  platform: Platform;
  version: string;
  appVersion: string;
  statusBarHeight: number;
  safeAreaInset: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  apiBaseUrl: string;
  environment: 'debug' | 'release';
}

// ========== 各命名空间参数与返回类型 ==========

// device
export interface GetDeviceIdResult {
  deviceId: string;
}

export interface TakePhotoParams {
  quality?: 'high' | 'medium' | 'low';
  maxWidth?: number;
  source?: 'camera' | 'album';
}

export interface TakePhotoResult {
  uri: string;
  width?: number;
  height?: number;
}

export interface LocationParams {
  type?: 'wgs84' | 'gcj02';
}

export interface LocationResult {
  lat: number;
  lng: number;
  address?: string;
}

export interface ScanParams {
  types?: ('qr' | 'barcode')[];
}

export interface ScanResult {
  result: string;
  type?: 'qr' | 'barcode';
}

// storage
export interface StorageSetParams {
  key: string;
  value: unknown;
}

export interface StorageGetParams {
  key: string;
}

// push
export interface PushRegisterResult {
  token: string;
}

// nav
export interface NavSetTitleParams {
  title: string;
}

export interface NavSetBarVisibleParams {
  visible: boolean;
}

export interface NavSetRightButtonParams {
  text?: string;
  icon?: string;
  action: string;
}

export interface NavPushParams {
  url: string;
  title?: string;
  animated?: boolean;
}

export interface NavSwitchTabParams {
  index: number;
}

// pay
export interface PayWechatParams {
  prepayId: string;
  nonceStr: string;
  timeStamp: string;
  sign: string;
}

export interface PayResult {
  result: 'success' | 'fail' | 'cancel';
}

// share
export interface ShareParams {
  title: string;
  content?: string;
  url?: string;
  image?: string;
  platform?: 'wechat' | 'moments' | 'system';
}

// app
export interface CheckUpdateResult {
  hasUpdate: boolean;
  version?: string;
  url?: string;
  force?: boolean;
}

// ========== 完整接口清单映射 ==========
export interface BridgeActionMap {
  'device.getPlatform': { params: void; result: PlatformInfo };
  'device.getDeviceId': { params: void; result: GetDeviceIdResult };
  'device.camera.takePhoto': { params: TakePhotoParams; result: TakePhotoResult };
  'device.location.get': { params: LocationParams; result: LocationResult };
  'device.scan.scanCode': { params: ScanParams; result: ScanResult };
  'storage.local.set': { params: StorageSetParams; result: { code: number } };
  'storage.local.get': { params: StorageGetParams; result: { value: unknown } };
  'push.register': { params: void; result: PushRegisterResult };
  'nav.setTitle': { params: NavSetTitleParams; result: { code: number } };
  'nav.setBarVisible': { params: NavSetBarVisibleParams; result: { code: number } };
  'nav.setRightButton': { params: NavSetRightButtonParams; result: { code: number } };
  'nav.push': { params: NavPushParams; result: { code: number } };
  'nav.pop': { params: void; result: { code: number } };
  'nav.switchTab': { params: NavSwitchTabParams; result: { code: number } };
  'pay.wechat': { params: PayWechatParams; result: PayResult };
  'share': { params: ShareParams; result: { code: number } };
  'app.checkUpdate': { params: void; result: CheckUpdateResult };
}

export type BridgeAction = keyof BridgeActionMap;
export type BridgeParams<A extends BridgeAction> = BridgeActionMap[A]['params'];
export type BridgeReturn<A extends BridgeAction> = BridgeActionMap[A]['result'];

// ========== 事件清单 ==========
export type BridgeEvent =
  | 'app.launch'
  | 'app.foreground'
  | 'app.background'
  | 'network.change'
  | 'push.receive'
  | 'nav.rightButtonTap';

export interface NetworkChangePayload {
  type: 'wifi' | 'cellular' | 'none';
  isConnected: boolean;
}

export interface PushReceivePayload {
  title: string;
  body: string;
  extras?: Record<string, unknown>;
}

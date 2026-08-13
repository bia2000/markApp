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

/** 单个原生 Tab 项（注册给原生外壳渲染底部 TabBar） */
export interface TabBarItem {
  /** 展示文案 */
  title: string;
  /** 该 Tab 对应 H5 路由（原生按 Tab 加载对应 WebView/路由） */
  route: string;
  /** 可选图标标识，原生按需取用 */
  icon?: string;
}

/** H5 向原生注册底部 TabBar 配置 */
export interface NavSetTabBarParams {
  tabs: TabBarItem[];
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

// shortcut（桌面快捷方式：快速记一笔）
export interface ShortcutRequestPinParams {
  /** 桌面图标文案，默认「快速记一笔」 */
  label?: string;
}
export interface ShortcutRequestPinResult {
  pinned: boolean;
  /** 回退到 INSTALL_SHORTCUT 广播方式（API < 26 等） */
  fallback?: boolean;
}
export interface ShortcutGetPendingResult {
  /** 是否存在待消费的「快速记一笔」拉起（冷启动兜底） */
  pending: boolean;
}

// app（H5 就绪握手：H5 监听器挂载完成后调用，触发原生冲刷排队事件）
export interface AppReadyResult {
  code: number;
}

// widget（桌面组件：展示事项列表，点事项即记录一次）
export interface WidgetItem {
  /** 事项 id */
  id: string;
  /** 事项名称 */
  title: string;
  /** 事项主题色（#RRGGBB） */
  color: string;
  /** 每次记录所得分数 */
  score: number;
  /** 今日已记录次数 */
  count: number;
}
export interface WidgetPayload {
  /** 数据日期 YYYY-MM-DD */
  date: string;
  /** 今日得分（全部事项今日记录分值之和） */
  todayScore: number;
  /** 全部事项（含今日次数，便于组件直接渲染） */
  items: WidgetItem[];
}
export interface WidgetSyncParams {
  /** 由 H5 计算好的组件数据 */
  payload: WidgetPayload;
}
export interface WidgetSyncResult {
  code: number;
}
export interface WidgetGetPendingResult {
  /** 待消费的记录事项 id（冷启动兜底），无则为 null */
  pending: string | null;
}
/** 桌面组件共享记录（H5 内点击与桌面点击统一落在此账本） */
export interface WidgetRecord {
  id: string;
  itemId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  score: number;
  createdAt: number;
}
export interface WidgetAddRecordParams {
  /** 一条记录（与 H5 本地记录共用同一 id，合并时按 id 去重） */
  record: WidgetRecord;
}
export interface WidgetRemoveRecordParams {
  /** 待删除事项 id，清除其全部共享记录（删除事项时同步） */
  itemId: string;
}
export interface WidgetRemoveRecordByIdParams {
  /** 单条记录 id，清除该条共享记录（删除单条得分记录时同步） */
  id: string;
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
  'nav.setTabBar': { params: NavSetTabBarParams; result: { code: number } };
  'pay.wechat': { params: PayWechatParams; result: PayResult };
  'share': { params: ShareParams; result: { code: number } };
  'shortcut.requestPin': { params: ShortcutRequestPinParams; result: ShortcutRequestPinResult };
  'shortcut.getPendingQuickAdd': { params: void; result: ShortcutGetPendingResult };
  'widget.sync': { params: WidgetSyncParams; result: WidgetSyncResult };
  'widget.getPendingRecord': { params: void; result: WidgetGetPendingResult };
  'widget.addRecord': { params: WidgetAddRecordParams; result: { code: number } };
  'widget.removeRecords': { params: WidgetRemoveRecordParams; result: { code: number } };
  'widget.removeRecord': { params: WidgetRemoveRecordByIdParams; result: { code: number } };
  'app.checkUpdate': { params: void; result: CheckUpdateResult };
  'app.ready': { params: void; result: AppReadyResult };
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
  | 'nav.rightButtonTap'
  | 'quick_add'
  | 'record_item';

export interface NetworkChangePayload {
  type: 'wifi' | 'cellular' | 'none';
  isConnected: boolean;
}

export interface PushReceivePayload {
  title: string;
  body: string;
  extras?: Record<string, unknown>;
}

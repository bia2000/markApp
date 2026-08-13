/**
 * JSBridge H5 侧封装
 *
 * 设计要点：
 * 1. 统一 invoke / callback / event 三种消息类型
 * 2. 异步调用返回 Promise，回调通过 callbackId 匹配
 * 3. 同步调用 callSync（仅限轻量场景，如 device.getDeviceId）
 * 4. 原生调 H5：通过 dispatchEvent 派发到事件总线
 * 5. 浏览器降级：开发环境无原生注入时，提供 mock 实现，便于纯 Web 调试
 */
import {
  type BridgeAction,
  type BridgeParams,
  type BridgeReturn,
  type BridgeResult,
  type CallbackMessage,
  type EventMessage,
  type InvokeMessage,
  type PlatformInfo
} from '@hybrid/bridge-protocol';
import { eventBus } from './eventbus';

// ========== 全局 Bridge 对象类型 ==========
interface NativeBridgeGlobal {
  invoke?: (payload: string) => void;
  callSync?: (action: string, params?: unknown) => unknown;
  dispatchEvent?: (payload: string) => void;
  // 原生回填：原生通过此方法回传 callback
  _recvCallback?: (payload: string) => void;
  _recvEvent?: (payload: string) => void;
}

function getNative(): NativeBridgeGlobal | undefined {
  const name = (import.meta.env.BRIDGE_GLOBAL_NAME as string) || 'NativeBridge';
  return (window as unknown as Record<string, NativeBridgeGlobal>)[name];
}

// ========== 回调管理 ==========
interface CallbackEntry {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
}

const callbacks: Map<string, CallbackEntry> = new Map();
let callbackSeq = 0;

function genCallbackId(): string {
  callbackSeq += 1;
  return `cb_${Date.now()}_${String(callbackSeq).padStart(4, '0')}`;
}

const DEFAULT_TIMEOUT = 60_000;

// ========== 浏览器降级 mock ==========
const mockPlatform: PlatformInfo = {
  platform: 'web',
  version: '0.0.0',
  appVersion: '1.0.0',
  statusBarHeight: 0,
  safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  environment: 'debug'
};

const mockStorage: Record<string, unknown> = {};

function mockCall<A extends BridgeAction>(
  action: A,
  params: BridgeParams<A>
): Promise<BridgeResult<BridgeReturn<A>>> {
  let data: unknown = null;
  switch (action) {
    case 'device.getPlatform':
      data = mockPlatform;
      break;
    case 'device.getDeviceId':
      data = { deviceId: 'mock-device-001' };
      break;
    case 'storage.local.set':
      mockStorage[(params as { key: string }).key] = (params as { value: unknown }).value;
      data = { code: 0 };
      break;
    case 'storage.local.get':
      data = { value: mockStorage[(params as { key: string }).key] };
      break;
    case 'nav.push':
    case 'nav.pop':
    case 'nav.switchTab':
    case 'nav.setTabBar':
    case 'nav.setTitle':
    case 'nav.setBarVisible':
    case 'nav.setRightButton':
    case 'share':
      data = { code: 0 };
      break;
    case 'shortcut.requestPin':
      data = { pinned: false };
      break;
    case 'shortcut.getPendingQuickAdd':
      data = { pending: false };
      break;
    case 'widget.sync':
      data = { code: 0 };
      break;
    case 'widget.getPendingRecord':
      data = { pending: null };
      break;
    case 'app.checkUpdate':
      data = { hasUpdate: false };
      break;
    case 'app.ready':
      data = { code: 0 };
      break;
    default:
      return Promise.resolve({
        code: -1,
        msg: `mock not implemented: ${action}`,
        data: null as unknown as BridgeReturn<A>
      });
  }
  return Promise.resolve({
    code: 0,
    msg: 'ok',
    data: data as BridgeReturn<A>
  });
}

// ========== 核心 API ==========
const BRIDGE_DEBUG = (import.meta.env.BRIDGE_DEBUG as string) === 'true';

function log(tag: string, payload: unknown): void {
  if (BRIDGE_DEBUG) console.log(`%c[Bridge:${tag}]`, 'color:#1989fa', payload);
}

/**
 * 异步调用原生能力（推荐）
 */
export function call<A extends BridgeAction>(
  action: A,
  params: BridgeParams<A> = {} as BridgeParams<A>,
  timeout = DEFAULT_TIMEOUT
): Promise<BridgeReturn<A>> {
  const native = getNative();

  // 无原生注入：降级到 mock
  if (!native || typeof native.invoke !== 'function') {
    return mockCall(action, params).then((res) => {
      if (res.code !== 0) throw new Error(res.msg);
      return res.data;
    });
  }

  return new Promise<BridgeReturn<A>>((resolve, reject) => {
    const callbackId = genCallbackId();
    const entry: CallbackEntry = {
      resolve: (data) => resolve(data as BridgeReturn<A>),
      reject,
      timer: timeout > 0 ? setTimeout(() => {
        if (callbacks.has(callbackId)) {
          callbacks.delete(callbackId);
          reject(new Error(`Bridge call timeout: ${action} (${callbackId})`));
        }
      }, timeout) : undefined
    };
    callbacks.set(callbackId, entry);

    const msg: InvokeMessage<BridgeParams<A>> = {
      msgType: 'invoke',
      action,
      callbackId,
      params
    };
    log('invoke', msg);
    try {
      native.invoke!(JSON.stringify(msg));
    } catch (err) {
      callbacks.delete(callbackId);
      if (entry.timer) clearTimeout(entry.timer);
      reject(err as Error);
    }
  });
}

/**
 * 同步调用（仅限轻量场景，如 device.getDeviceId）
 */
export function callSync<A extends BridgeAction>(
  action: A,
  params?: BridgeParams<A>
): BridgeReturn<A> {
  const native = getNative();
  if (!native || typeof native.callSync !== 'function') {
    // 降级：仅支持 getPlatform / getDeviceId
    if (action === 'device.getPlatform') return mockPlatform as unknown as BridgeReturn<A>;
    if (action === 'device.getDeviceId')
      return { deviceId: 'mock-device-001' } as unknown as BridgeReturn<A>;
    throw new Error(`callSync not available in browser: ${action}`);
  }
  const result = native.callSync(action, params) as BridgeResult<BridgeReturn<A>>;
  if (result && typeof result === 'object' && 'code' in result) {
    if (result.code !== 0) throw new Error(result.msg);
    return result.data;
  }
  return result as BridgeReturn<A>;
}

/**
 * 原生回调 H5：原生通过 evaluateJavaScript 调用此方法
 * 由 main.ts 挂载到 window.NativeBridge._recvCallback
 */
export function _recvCallback(payload: string): void {
  let msg: CallbackMessage;
  try {
    msg = JSON.parse(payload);
  } catch (err) {
    console.error('[Bridge] callback payload parse error', err);
    return;
  }
  log('callback', msg);
  const entry = callbacks.get(msg.callbackId);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  callbacks.delete(msg.callbackId);
  if (msg.result.code === 0) {
    entry.resolve(msg.result.data);
  } else {
    entry.reject(new Error(msg.result.msg || `Bridge call failed: ${msg.result.code}`));
  }
}

/**
 * 原生派发事件到 H5：原生通过 evaluateJavaScript 调用此方法
 * 由 main.ts 挂载到 window.NativeBridge._recvEvent
 */
export function _recvEvent(payload: string): void {
  let msg: EventMessage;
  try {
    msg = JSON.parse(payload);
  } catch (err) {
    console.error('[Bridge] event payload parse error', err);
    return;
  }
  log('event', msg);
  eventBus.emit(msg.event, msg.data);
}

// ========== 事件订阅便捷方法 ==========
export function on(event: string, fn: (data: unknown) => void): () => void {
  return eventBus.on(event, fn);
}

export function once(event: string, fn: (data: unknown) => void): () => void {
  return eventBus.once(event, fn);
}

export function off(event: string, fn: (data: unknown) => void): void {
  eventBus.off(event, fn);
}

// ========== 安装到 window（供原生回调用） ==========
export function installBridgeReceiver(): void {
  const name = (import.meta.env.BRIDGE_GLOBAL_NAME as string) || 'NativeBridge';
  const holder = (window as unknown as Record<string, NativeBridgeGlobal>)[name] || {};
  holder._recvCallback = _recvCallback;
  holder._recvEvent = _recvEvent;
  (window as unknown as Record<string, NativeBridgeGlobal>)[name] = holder;
}

// ========== 默认导出 ==========
export default {
  call,
  callSync,
  on,
  once,
  off,
  installBridgeReceiver
};

/**
 * 统一 Toast 封装（混合架构安全版）
 * --------------------------------------------------
 * 基于 Vant 函数式 Toast，补齐项目缺失的「类型化 + 品牌化」表现，
 * 并根治混合架构下的生命周期问题（见底部 clear() 说明）。
 *
 *   - success / error / warning / info 自带内联 SVG 图标（白描边，落在品牌色圆形底上）
 *   - loading 默认禁止背景点击，并带 15s 安全超时自动关闭（防永久卡屏）
 *   - 统一默认参数（时长 2s、居中、入场动画见 styles/toast.scss）
 *
 * 视觉风格与动画由 src/styles/toast.scss 统一控制，改一处全项目生效。
 *
 * 用法：
 *   import toast from '@/utils/toast';
 *   toast.success('已保存');
 *   toast.error('网络异常');
 *   toast.warning('请先同意协议');
 *   toast.info('敬请期待');
 *   const t = toast.loading('提交中…');   // t.close();  // 一般 15s 内会自动关
 */
import { showToast, showLoadingToast, closeToast, type ToastWrapperInstance } from 'vant';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  /** 展示时长(ms)。0 表示不自动关闭；普通提示默认 2000，loading 默认 15000 */
  duration?: number;
  /** 是否禁止背景点击（loading 默认 true） */
  forbidClick?: boolean;
  /** 位置 */
  position?: 'top' | 'middle' | 'bottom';
  /** 关闭回调 */
  onClose?: () => void;
}

// 白描边 SVG，渲染在品牌色圆形底上（见 toast.scss）。线条收窄至 2，缩小后更精致。
function icon(inner: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `fill="none" stroke="#ffffff" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const ICONS: Record<ToastType, string> = {
  success: icon('<path d="M5 13l4 4L19 7"/>'),
  error: icon('<path d="M6 6l12 12M18 6L6 18"/>'),
  warning: icon('<path d="M12 3l9 16H3z"/><path d="M12 10v4"/><path d="M12 17v.05"/>'),
  info: icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6v.05"/>')
};

// ============ 生命周期兜底（混合架构）============
// 每个原生 Tab 是独立 WebView；切走时原生层 pauseTimers() 挂起该 WebView 内所有
// setTimeout，而 Vant 自带关闭依赖 setTimeout → 被挂起就不消失。
// 因此「切回前台」时用「是否已超过展示时长」来补关，而不是无条件关闭——
// 否则会误杀仍在展示期内的活跃 toast（表现为闪一下消失后再弹，即「再次显示」）。
let activeToast: ToastWrapperInstance | null = null;
let shownAt = 0;
let shownDuration = 2000;

function track(inst: ToastWrapperInstance, duration: number): ToastWrapperInstance {
  shownAt = Date.now();
  shownDuration = duration;
  activeToast = inst;
  // 包装 close：手动关闭时同步释放引用（Vant 全局 closeToast 不经此，由下方兜底处理）
  const origClose = inst.close.bind(inst);
  inst.close = () => {
    if (activeToast === inst) activeToast = null;
    origClose();
  };
  return inst;
}

function show(type: ToastType, message: string, options: ToastOptions = {}): ToastWrapperInstance {
  const { duration = 2000, forbidClick = false, position = 'middle', onClose } = options;
  const inst = showToast({
    type: 'text',
    message,
    icon: ICONS[type],
    className: `app-toast app-toast--${type}`,
    duration,
    forbidClick,
    position,
    onClose
  });
  return track(inst, duration);
}

export function success(message: string, options?: ToastOptions): ToastWrapperInstance {
  return show('success', message, options);
}
export function error(message: string, options?: ToastOptions): ToastWrapperInstance {
  return show('error', message, options);
}
export function warning(message: string, options?: ToastOptions): ToastWrapperInstance {
  return show('warning', message, options);
}
export function info(message: string, options?: ToastOptions): ToastWrapperInstance {
  return show('info', message, options);
}

/**
 * loading：默认带 15s 安全超时自动关闭，避免「忘记调用 close 导致永久卡屏」。
 * 若确需永久显示直到手动关闭，显式传 { duration: 0 } 并通过返回的实例 .close() 关闭。
 */
export function loading(message = '加载中…', options?: ToastOptions): ToastWrapperInstance {
  const { duration = 15000, forbidClick = true, position = 'middle', onClose } = options ?? {};
  const inst = showLoadingToast({
    message,
    className: 'app-toast app-toast--loading',
    duration,
    forbidClick,
    position,
    onClose
  });
  return track(inst, duration);
}

/**
 * 仅当 toast 已超出展示时长才强制关闭。
 * 用于根治混合架构 pauseTimers 导致的「回前台后仍残留」——
 * 但绝不误杀仍在展示期内的活跃 toast（避免上一代实现的「闪退后再次显示」）。
 */
function tryClearExpired(): void {
  if (activeToast && Date.now() - shownAt >= shownDuration) {
    activeToast = null;
    closeToast();
  }
}

/** 立即关闭当前 toast（切路由等场景使用） */
export function clear(): void {
  activeToast = null;
  closeToast();
}

if (typeof document !== 'undefined') {
  // 切回前台（原生 Tab 切回当前 WebView）——补关被 pauseTimers 挂起定时器的残留 toast
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tryClearExpired();
  });
  // 页面从 bfcache / WebView 恢复
  window.addEventListener('pageshow', tryClearExpired);
}

const toast = Object.assign((message: string, options?: ToastOptions) => info(message, options), {
  success,
  error,
  warning,
  info,
  loading,
  clear
});

export default toast;

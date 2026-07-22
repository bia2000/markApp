/**
 * 双栈协同路由工具
 *
 * - route.meta.native === true：通过 bridge.call('nav.push') 交给原生
 *   原生从 WebView 池取实例加载目标 H5，并执行原生转场动画
 * - 否则：H5 内部 Vue Router 处理，不触发原生转场
 */
import router from '@/router';
import { navPush, navPop } from '@/bridge/helpers';

interface NavigateOptions {
  /** 强制走原生（覆盖 meta.native） */
  native?: boolean;
  /** 原生导航栏标题 */
  title?: string;
  /** 是否带转场动画，默认 true */
  animated?: boolean;
  /** 路由 query */
  query?: Record<string, string | number | undefined>;
}

/** 统一跳转出口（业务代码只能用此方法，禁止私自 push 页面级路由） */
export function navigateTo(path: string, options: NavigateOptions = {}): Promise<void> {
  const route = router.resolve(path);
  const useNative = options.native ?? route.meta?.native === true;

  if (useNative) {
    // 拼接完整 URL（带 query）
    let url = path;
    if (options.query) {
      const qs = new URLSearchParams(
        Object.entries(options.query)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString();
      if (qs) url += `?${qs}`;
    }
    return navPush({
      url,
      title: options.title ?? (route.meta?.title as string),
      animated: options.animated ?? true
    }).then(() => void 0);
  }

  return router.push({ path, query: options.query }).then(() => void 0);
}

/** 返回上一页 */
export function navigateBack(): void {
  // 优先走原生 pop（页面级返回，带原生转场）
  // 这里简化：若 history.length > 1 走 H5，否则走原生
  if (window.history.length > 1) {
    router.back();
  } else {
    navPop().catch(() => router.back());
  }
}

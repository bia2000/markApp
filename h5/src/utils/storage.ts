/**
 * 轻量持久化存储
 *
 * 说明：本应用为记事本，数据需跨刷新保留。
 * 生产环境若运行在原生 WebView 内，可改为 bridge.call('storage.local.set/get')；
 * 这里统一走 localStorage，浏览器与构建产物均可直接使用。
 */
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 隐私模式 / 配额超限时静默失败，不影响主流程
  }
}

export const storage = {
  getJSON<T>(key: string, fallback: T): T {
    const raw = safeGet(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  setJSON(key: string, value: unknown): void {
    safeSet(key, JSON.stringify(value));
  }
};

/**
 * 统一本地 ID 生成器（全项目唯一实现，避免各 store/composable 各写一份）。
 *
 * 时间戳 36 进制保证大体递增，随机后缀避免同毫秒碰撞；
 * 仅用于本地持久化数据的 id，不要求全局唯一/密码学安全。
 */
export function uid(prefix?: string): string {
  const core = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${core}` : core;
}

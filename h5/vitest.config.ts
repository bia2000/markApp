/**
 * Vitest 配置：核心纯逻辑单测（stores / utils）
 * - happy-dom 提供 localStorage / window 等浏览器环境
 * - 复用 vite 的 `@` alias，源码内绝对路径导入无需改写
 */
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 与 vite.config.ts 保持一致：协议包直接链到源码
      '@hybrid/bridge-protocol': fileURLToPath(
        new URL('../../packages/bridge-protocol/src/index.ts', import.meta.url)
      )
    }
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts']
  }
});

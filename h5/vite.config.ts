import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { VantResolver } from '@vant/auto-import-resolver';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  // 读取根目录 .env（用户偏好：所有必要配置统一写入 .env）
  const env = loadEnv(mode, process.cwd(), '');
  const rootEnv = loadEnv(mode, fileURLToPath(new URL('../', import.meta.url)), '');

  const port = Number(rootEnv.H5_DEV_PORT || 5173);

  return {
    base: './',
    // 从根目录加载 .env（用户偏好：所有必要配置统一写入根 .env）
    envDir: fileURLToPath(new URL('../', import.meta.url)),
    server: {
      port,
      host: '0.0.0.0',
      cors: true
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@hybrid/bridge-protocol': fileURLToPath(
          new URL('../packages/bridge-protocol/src/index.ts', import.meta.url)
        )
      }
    },
    plugins: [
      vue(),
      Components({
        resolvers: [VantResolver()]
      })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/variables.scss" as *;`
        }
      }
    },
    build: {
      target: 'es2015',
      cssCodeSplit: true,
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // 控制首屏 JS 体积（方案要求 gzip < 150KB）
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
            vant: ['vant']
          }
        }
      }
    }
  };
});

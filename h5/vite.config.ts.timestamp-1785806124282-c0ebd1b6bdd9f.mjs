// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/admin/Desktop/demo/markApp/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/admin/Desktop/demo/markApp/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import Components from "file:///C:/Users/admin/Desktop/demo/markApp/node_modules/unplugin-vue-components/dist/vite.js";
import { VantResolver } from "file:///C:/Users/admin/Desktop/demo/markApp/node_modules/@vant/auto-import-resolver/dist/index.js";
import { fileURLToPath, URL } from "node:url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/admin/Desktop/demo/markApp/h5/vite.config.ts";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rootEnv = loadEnv(mode, fileURLToPath(new URL("../", __vite_injected_original_import_meta_url)), "");
  const port = Number(rootEnv.H5_DEV_PORT || 5173);
  return {
    base: "./",
    // 从根目录加载 .env（用户偏好：所有必要配置统一写入根 .env）
    envDir: fileURLToPath(new URL("../", __vite_injected_original_import_meta_url)),
    server: {
      port,
      host: "0.0.0.0",
      cors: true
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url)),
        "@hybrid/bridge-protocol": fileURLToPath(
          new URL("../packages/bridge-protocol/src/index.ts", __vite_injected_original_import_meta_url)
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
      target: "es2015",
      cssCodeSplit: true,
      sourcemap: false,
      minify: "esbuild",
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // 控制首屏 JS 体积（方案要求 gzip < 150KB）
          manualChunks: {
            vue: ["vue", "vue-router", "pinia"],
            vant: ["vant"]
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhZG1pblxcXFxEZXNrdG9wXFxcXGRlbW9cXFxcbWFya0FwcFxcXFxoNVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYWRtaW5cXFxcRGVza3RvcFxcXFxkZW1vXFxcXG1hcmtBcHBcXFxcaDVcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2FkbWluL0Rlc2t0b3AvZGVtby9tYXJrQXBwL2g1L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcclxuaW1wb3J0IENvbXBvbmVudHMgZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvdml0ZSc7XHJcbmltcG9ydCB7IFZhbnRSZXNvbHZlciB9IGZyb20gJ0B2YW50L2F1dG8taW1wb3J0LXJlc29sdmVyJztcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCwgVVJMIH0gZnJvbSAnbm9kZTp1cmwnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIC8vIFx1OEJGQlx1NTNENlx1NjgzOVx1NzZFRVx1NUY1NSAuZW52XHVGRjA4XHU3NTI4XHU2MjM3XHU1MDRGXHU1OTdEXHVGRjFBXHU2MjQwXHU2NzA5XHU1RkM1XHU4OTgxXHU5MTREXHU3RjZFXHU3RURGXHU0RTAwXHU1MTk5XHU1MTY1IC5lbnZcdUZGMDlcclxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuICBjb25zdCByb290RW52ID0gbG9hZEVudihtb2RlLCBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4uLycsIGltcG9ydC5tZXRhLnVybCkpLCAnJyk7XHJcblxyXG4gIGNvbnN0IHBvcnQgPSBOdW1iZXIocm9vdEVudi5INV9ERVZfUE9SVCB8fCA1MTczKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGJhc2U6ICcuLycsXHJcbiAgICAvLyBcdTRFQ0VcdTY4MzlcdTc2RUVcdTVGNTVcdTUyQTBcdThGN0QgLmVudlx1RkYwOFx1NzUyOFx1NjIzN1x1NTA0Rlx1NTk3RFx1RkYxQVx1NjI0MFx1NjcwOVx1NUZDNVx1ODk4MVx1OTE0RFx1N0Y2RVx1N0VERlx1NEUwMFx1NTE5OVx1NTE2NVx1NjgzOSAuZW52XHVGRjA5XHJcbiAgICBlbnZEaXI6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi4vJywgaW1wb3J0Lm1ldGEudXJsKSksXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgcG9ydCxcclxuICAgICAgaG9zdDogJzAuMC4wLjAnLFxyXG4gICAgICBjb3JzOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgICdAJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpLFxyXG4gICAgICAgICdAaHlicmlkL2JyaWRnZS1wcm90b2NvbCc6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgICBuZXcgVVJMKCcuLi9wYWNrYWdlcy9icmlkZ2UtcHJvdG9jb2wvc3JjL2luZGV4LnRzJywgaW1wb3J0Lm1ldGEudXJsKVxyXG4gICAgICAgIClcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgdnVlKCksXHJcbiAgICAgIENvbXBvbmVudHMoe1xyXG4gICAgICAgIHJlc29sdmVyczogW1ZhbnRSZXNvbHZlcigpXVxyXG4gICAgICB9KVxyXG4gICAgXSxcclxuICAgIGNzczoge1xyXG4gICAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XHJcbiAgICAgICAgc2Nzczoge1xyXG4gICAgICAgICAgYWRkaXRpb25hbERhdGE6IGBAdXNlIFwiQC9zdHlsZXMvdmFyaWFibGVzLnNjc3NcIiBhcyAqO2BcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICB0YXJnZXQ6ICdlczIwMTUnLFxyXG4gICAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXHJcbiAgICAgIHNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxyXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDE1MDAsXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgIC8vIFx1NjNBN1x1NTIzNlx1OTk5Nlx1NUM0RiBKUyBcdTRGNTNcdTc5RUZcdUZGMDhcdTY1QjlcdTY4NDhcdTg5ODFcdTZDNDIgZ3ppcCA8IDE1MEtCXHVGRjA5XHJcbiAgICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgICAgdnVlOiBbJ3Z1ZScsICd2dWUtcm91dGVyJywgJ3BpbmlhJ10sXHJcbiAgICAgICAgICAgIHZhbnQ6IFsndmFudCddXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfTtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa1QsU0FBUyxjQUFjLGVBQWU7QUFDeFYsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsZUFBZSxXQUFXO0FBSjhKLElBQU0sMkNBQTJDO0FBTWxQLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBRXhDLFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUMzQyxRQUFNLFVBQVUsUUFBUSxNQUFNLGNBQWMsSUFBSSxJQUFJLE9BQU8sd0NBQWUsQ0FBQyxHQUFHLEVBQUU7QUFFaEYsUUFBTSxPQUFPLE9BQU8sUUFBUSxlQUFlLElBQUk7QUFFL0MsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBO0FBQUEsSUFFTixRQUFRLGNBQWMsSUFBSSxJQUFJLE9BQU8sd0NBQWUsQ0FBQztBQUFBLElBQ3JELFFBQVE7QUFBQSxNQUNOO0FBQUEsTUFDQSxNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsSUFDUjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxjQUFjLElBQUksSUFBSSxTQUFTLHdDQUFlLENBQUM7QUFBQSxRQUNwRCwyQkFBMkI7QUFBQSxVQUN6QixJQUFJLElBQUksNENBQTRDLHdDQUFlO0FBQUEsUUFDckU7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsSUFBSTtBQUFBLE1BQ0osV0FBVztBQUFBLFFBQ1QsV0FBVyxDQUFDLGFBQWEsQ0FBQztBQUFBLE1BQzVCLENBQUM7QUFBQSxJQUNIO0FBQUEsSUFDQSxLQUFLO0FBQUEsTUFDSCxxQkFBcUI7QUFBQSxRQUNuQixNQUFNO0FBQUEsVUFDSixnQkFBZ0I7QUFBQSxRQUNsQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsTUFDUixjQUFjO0FBQUEsTUFDZCxXQUFXO0FBQUEsTUFDWCxRQUFRO0FBQUEsTUFDUix1QkFBdUI7QUFBQSxNQUN2QixlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUE7QUFBQSxVQUVOLGNBQWM7QUFBQSxZQUNaLEtBQUssQ0FBQyxPQUFPLGNBQWMsT0FBTztBQUFBLFlBQ2xDLE1BQU0sQ0FBQyxNQUFNO0FBQUEsVUFDZjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=

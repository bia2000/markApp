/**
 * 记事本路由：三个底部 Tab —— 记事项 / 统计 / 总结
 *
 * 底部 TabBar 由原生外壳渲染（方案：根容器为原生 TabBar，每个 Tab 承载一个 WebView）。
 * H5 在 main.ts 启动时会通过 bridge.nav.setTabBar 把本文件的 tab 配置注册给原生壳，
 * 原生按 route 加载对应页面；原生壳点击 Tab 切换时由原生驱动（无需 H5 自绘）。
 * 浏览器预览无原生壳，App.vue 会降级渲染一个 Vant TabBar 以便切换。
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import { setNavTitle } from '@/bridge/helpers';
import toast from '@/utils/toast';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/home/index.vue'),
    meta: { title: '记事项', tab: true, tabIndex: 0 }
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/stats/index.vue'),
    meta: { title: '统计', tab: true, tabIndex: 1 }
  },
  {
    path: '/summary',
    name: 'summary',
    component: () => import('@/views/summary/index.vue'),
    meta: { title: '总结', tab: true, tabIndex: 2 }
  },
  {
    path: '/daily-goal',
    name: 'dailyGoal',
    component: () => import('@/views/dailyGoal/index.vue'),
    meta: { title: '每日计划', tab: true, tabIndex: 3 }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// 记事本无需登录，直接进入
router.beforeEach((_to, _from, next) => {
  next();
});

// 同步导航栏标题（原生外壳可感知）
router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  if (title) setNavTitle(title).catch(() => void 0);
  // 切页时清理残留 toast（混合架构 WebView 内切页场景补充保险）
  toast.clear();
});

export default router;

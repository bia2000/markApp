/**
 * H5 业务路由配置
 *
 * 双栈协同原则：
 * - 页面级跳转（route.meta.native === true）走 bridge.call('nav.push')，由原生创建/复用 WebView
 * - 页面内跳转走 router.push，由 H5 自身管理
 * - 默认 tab 页面（首页/分类/消息/我的）使用原生 TabBar，H5 不再渲染底部 tab
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { setNavTitle } from '@/bridge/helpers';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/home/index.vue'),
    meta: { title: '首页', tab: true, tabIndex: 0 }
  },
  {
    path: '/category',
    name: 'category',
    component: () => import('@/views/category/index.vue'),
    meta: { title: '分类', tab: true, tabIndex: 1 }
  },
  {
    path: '/message',
    name: 'message',
    component: () => import('@/views/message/index.vue'),
    meta: { title: '消息', tab: true, tabIndex: 2 }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/profile/index.vue'),
    meta: { title: '我的', tab: true, tabIndex: 3 }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', native: true, hideTabBar: true }
  },
  // 页面级路由示例：原生 push 加载
  {
    path: '/goods/:id',
    name: 'goods-detail',
    component: () => import('@/views/goods/detail.vue'),
    meta: { title: '商品详情', native: true, hideTabBar: true }
  },
  {
    path: '/order/list',
    name: 'order-list',
    component: () => import('@/views/order/list.vue'),
    meta: { title: '我的订单', native: true, hideTabBar: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/settings/index.vue'),
    meta: { title: '设置', native: true, hideTabBar: true }
  }
];

const router = createRouter({
  // WebView 内运行使用 hash 模式更稳定，避免原生容器 history 拦截差异
  history: createWebHistory(),
  routes
});

// 路由守卫：未登录访问受保护页面 → 跳转登录
router.beforeEach((to, _from, next) => {
  const token = sessionStorage.getItem('h5_auth_token');
  const whiteList = ['/login', '/home', '/category'];
  if (!token && !whiteList.includes(to.path)) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

// 路由后置：同步导航栏标题到原生
router.afterEach((to) => {
  const title = (to.meta.title as string) || '';
  if (title) {
    setNavTitle(title).catch(() => void 0);
  }
});

export default router;

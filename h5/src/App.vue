<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="cachedViews">
      <component :is="Component" />
    </keep-alive>
  </router-view>

  <!-- 底部 Tab：原生外壳环境下由原生 TabBar 渲染，H5 不自绘；
       浏览器开发预览无原生壳，降级为内置导航以便切换页面 -->
  <van-tabbar v-if="isWeb" route fixed safe-area-inset-bottom>
    <van-tabbar-item to="/home" icon="notes-o">记事项</van-tabbar-item>
    <van-tabbar-item to="/stats" icon="chart-trending-o">统计</van-tabbar-item>
    <van-tabbar-item to="/summary" icon="comment-o">总结</van-tabbar-item>
    <van-tabbar-item to="/daily-goal" icon="flag-o">每日计划</van-tabbar-item>
  </van-tabbar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePlatform } from '@/composables/useApp';

// 是否浏览器环境（无原生壳）：决定 H5 是否渲染降级导航
const { isWeb } = usePlatform();

// Tab 页常驻内存，切换不重新加载
const cachedViews = computed(() => ['home', 'stats', 'summary', 'dailyGoal']);
</script>

<style lang="scss">
@use '@/styles/index.scss';
</style>

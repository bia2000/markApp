<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="cachedViews">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup lang="ts">
import { computed } from "vue";

// Tab 页常驻内存（保持状态，切换 Tab 不重新加载）
const cachedViews = computed(() => ["home", "category", "message", "profile"]);
</script>

<style lang="scss">
@use "@/styles/index.scss";
</style>

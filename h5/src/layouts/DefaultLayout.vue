<template>
  <div class="layout" :style="layoutStyle">
    <!-- 顶部安全区占位 -->
    <div class="layout__safe-top" :style="{ height: safeTopPx }" />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();

const safeTopPx = computed(
  () => `${appStore.platform?.statusBarHeight ?? 0}px`,
);
const layoutStyle = computed(() => ({
  paddingTop: "0px",
  paddingBottom: "0px",
}));
</script>

<style lang="scss" scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: $color-background;
}
.layout__safe-top {
  width: 100%;
  background: transparent;
}
</style>

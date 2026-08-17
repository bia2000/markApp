<template>
  <div class="history-page">
    <!-- 顶部返回栏：原生外壳与浏览器环境统一提供返回入口 -->
    <van-nav-bar
      title="历史目标"
      left-arrow
      fixed
      placeholder
      safe-area-inset-top
      @click-left="onBack"
    />

    <div class="body">
      <van-empty v-if="history.length === 0" description="暂无历史目标" />

      <van-collapse v-else v-model="active">
        <van-collapse-item v-for="grp in history" :key="grp.date" :name="grp.date">
          <template #title>
            <div class="grp-head">
              <span class="grp-date">{{ grp.label }}</span>
              <span class="muted">{{ grp.done }}/{{ grp.total }} 完成</span>
            </div>
          </template>
          <div
            v-for="item in grp.items"
            :key="item.id"
            class="grp-item"
            :class="{ 'is-done': item.done }"
          >
            <van-icon
              :name="item.done ? 'checked' : 'circle'"
              :color="item.done ? '#1989fa' : '#c8c9cc'"
            />
            <span>{{ item.title }}</span>
          </div>
        </van-collapse-item>
      </van-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useGoalStore } from '@/stores/goal';
import { navigateBack } from '@/router/navigate';

const goalStore = useGoalStore();
const { history } = storeToRefs(goalStore);

// 默认展开最近一天，其余折叠
const active = ref<string[]>([]);

const onBack = (): void => navigateBack();

onMounted(() => {
  goalStore.rehydrate();
  if (history.value.length) active.value = [history.value[0].date];
});
</script>

<style lang="scss" scoped>
.history-page {
  min-height: 100%;
  background: $color-background;

  .body {
    padding: $spacing-md $spacing-md calc(#{$tabbar-height} + #{$safe-bottom});
  }

  .grp-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    width: 100%;
  }
  .grp-date {
    font-size: $font-md;
    font-weight: 600;
    color: $color-text;
  }
  .muted {
    font-size: $font-sm;
    color: $color-text-disabled;
    font-weight: 400;
  }

  .grp-item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    font-size: $font-sm;
    color: $color-text-secondary;
    padding: 6px 0;
    &.is-done {
      color: $color-text-disabled;
      text-decoration: line-through;
    }
  }
}
</style>

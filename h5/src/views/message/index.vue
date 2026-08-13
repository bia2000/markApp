<template>
  <div class="message">
    <van-sticky>
      <van-nav-bar title="消息">
        <template #right>
          <van-icon name="checked" size="18" @click="onMarkAllRead" />
        </template>
      </van-nav-bar>
    </van-sticky>

    <!-- 系统通知入口 -->
    <div class="message__entries card">
      <div class="message__entry" v-for="e in entries" :key="e.type">
        <van-badge :content="e.count > 0 ? e.count : ''" :max="99">
          <van-icon :name="e.icon" size="28" :color="e.color" />
        </van-badge>
        <span>{{ e.title }}</span>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message__list">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="store.loading"
          :finished="store.finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <van-cell
            v-for="item in store.list"
            :key="item.id"
            class="message__item"
            :class="{ 'message__item--unread': !item.read }"
            @click="onItemClick(item)"
          >
            <template #icon>
              <van-icon
                :name="iconForType(item.type)"
                size="32"
                :color="colorForType(item.type)"
                class="message__item-icon"
              />
            </template>
            <template #title>
              <div class="message__item-title">
                {{ item.title }}
                <van-tag v-if="!item.read" type="danger">新</van-tag>
              </div>
              <div class="message__item-content">{{ item.content }}</div>
            </template>
            <template #value>
              <span class="message__item-time">{{
                formatTime(item.createdAt)
              }}</span>
            </template>
          </van-cell>
        </van-list>
      </van-pull-refresh>

      <van-empty
        v-if="!store.loading && store.list.length === 0"
        description="暂无消息"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import toast from "@/utils/toast";
import { useMessageStore, type MessageItem } from "@/stores/message";

defineOptions({ name: "message" });

const store = useMessageStore();
const refreshing = ref(false);

const entries = ref([
  {
    type: "system",
    title: "系统通知",
    icon: "setting-o",
    color: "#1989fa",
    count: 0,
  },
  {
    type: "order",
    title: "订单消息",
    icon: "orders-o",
    color: "#07c160",
    count: 0,
  },
  {
    type: "activity",
    title: "活动消息",
    icon: "gift-o",
    color: "#ff976a",
    count: 0,
  },
]);

function iconForType(type: MessageItem["type"]): string {
  return entries.value.find((e) => e.type === type)?.icon ?? "info-o";
}
function colorForType(type: MessageItem["type"]): string {
  return entries.value.find((e) => e.type === type)?.color ?? "#1989fa";
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}-${d.getDate()}`;
}

async function onLoad(): Promise<void> {
  await store.fetchList();
}

async function onRefresh(): Promise<void> {
  await store.fetchList(true);
  refreshing.value = false;
  toast.success("刷新成功");
}

async function onItemClick(item: MessageItem): Promise<void> {
  if (!item.read) await store.markRead(item.id).catch(() => void 0);
  toast.info(item.title);
}

async function onMarkAllRead(): Promise<void> {
  await store.markAllRead();
  toast.success("已全部标记为已读");
}

onMounted(() => {
  if (store.list.length === 0) store.fetchList(true);
});
</script>

<style lang="scss" scoped>
.message {
  min-height: 100vh;
  background: $color-background;
  padding-bottom: calc(#{$tabbar-height} + #{$safe-bottom});

  &__entries {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-md;
    margin: 0 $spacing-lg;
    padding: $spacing-lg;
  }
  &__entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-sm;
    color: $color-text;
  }

  &__list {
    margin-top: $spacing-md;
    background: $color-background-light;
  }
  &__item {
    padding: $spacing-md $spacing-lg;
    align-items: center;
    &--unread {
      background: rgba(25, 137, 250, 0.04);
    }
  }
  &__item-icon {
    margin-right: $spacing-md;
  }
  &__item-title {
    font-size: $font-md;
    color: $color-text;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }
  &__item-content {
    margin-top: $spacing-xs;
    font-size: $font-sm;
    color: $color-text-secondary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }
  &__item-time {
    font-size: $font-xs;
    color: $color-text-disabled;
  }
}
</style>

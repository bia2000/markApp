<template>
  <div class="order-list">
    <van-sticky>
      <van-nav-bar title="我的订单" left-arrow @click-left="navigateBack" />
      <van-tabs v-model:active="activeTab" sticky @change="onTabChange">
        <van-tab
          v-for="t in tabs"
          :key="t.key"
          :title="t.title"
          :name="t.key"
        />
      </van-tabs>
    </van-sticky>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div v-for="o in list" :key="o.id" class="card order-list__item">
          <div class="order-list__header">
            <span class="order-list__no">订单号：{{ o.no }}</span>
            <van-tag :type="statusTagType(o.status)">{{
              statusText(o.status)
            }}</van-tag>
          </div>
          <div class="order-list__body">
            <van-image width="64" height="64" radius="6" :src="o.image" />
            <div class="order-list__info">
              <div class="order-list__title">{{ o.title }}</div>
              <div class="order-list__price">¥{{ o.price }}</div>
            </div>
          </div>
          <div class="order-list__footer">
            <van-button size="small" plain @click="onDetail(o)"
              >查看详情</van-button
            >
            <van-button
              v-if="o.status === 'unpaid'"
              size="small"
              type="danger"
              @click="onPay(o)"
            >
              去支付
            </van-button>
          </div>
        </div>
      </van-list>
      <van-empty v-if="!loading && list.length === 0" description="暂无订单" />
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { showToast } from "vant";
import http from "@/utils/request";
import { navigateBack } from "@/router/navigate";

interface OrderItem {
  id: string;
  no: string;
  title: string;
  image: string;
  price: number;
  status:
    | "unpaid"
    | "undelivered"
    | "unreceived"
    | "unreviewed"
    | "done"
    | "closed";
}

const tabs = [
  { key: "all", title: "全部" },
  { key: "unpaid", title: "待付款" },
  { key: "undelivered", title: "待发货" },
  { key: "unreceived", title: "待收货" },
  { key: "unreviewed", title: "待评价" },
];

const activeTab = ref("all");
const list = ref<OrderItem[]>([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);

function statusText(s: OrderItem["status"]): string {
  return (
    {
      unpaid: "待付款",
      undelivered: "待发货",
      unreceived: "待收货",
      unreviewed: "待评价",
      done: "已完成",
      closed: "已关闭",
    } as const
  )[s];
}
function statusTagType(
  s: OrderItem["status"],
): "primary" | "warning" | "success" | "default" {
  if (s === "unpaid") return "warning";
  if (s === "done") return "success";
  if (s === "closed") return "default";
  return "primary";
}

async function load(): Promise<void> {
  try {
    const res = await http.get<{ items: OrderItem[]; total: number }>(
      "/orders",
      {
        page: page.value,
        pageSize: 10,
        status: activeTab.value === "all" ? undefined : activeTab.value,
      },
    );
    list.value.push(...res.items);
    if (res.items.length < 10) finished.value = true;
    else page.value += 1;
  } catch {
    finished.value = true;
  } finally {
    loading.value = false;
  }
}

function onLoad(): void {
  load();
}

async function onRefresh(): Promise<void> {
  page.value = 1;
  list.value = [];
  finished.value = false;
  await load();
  refreshing.value = false;
}

function onTabChange(): void {
  page.value = 1;
  list.value = [];
  finished.value = false;
  loading.value = true;
  load();
}

function onDetail(o: OrderItem): void {
  showToast(`订单 ${o.no}`);
}
function onPay(o: OrderItem): void {
  showToast(`支付 ${o.no}`);
}
</script>

<style lang="scss" scoped>
.order-list {
  min-height: 100vh;
  background: $color-background;

  &__item {
    margin: $spacing-md $spacing-lg;
  }
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: $spacing-sm;
    border-bottom: 1px solid $color-border;
  }
  &__no {
    font-size: $font-sm;
    color: $color-text-secondary;
  }
  &__body {
    display: flex;
    gap: $spacing-md;
    padding: $spacing-md 0;
  }
  &__info {
    flex: 1;
  }
  &__title {
    font-size: $font-md;
    color: $color-text;
  }
  &__price {
    margin-top: $spacing-xs;
    color: $color-danger;
    font-weight: 600;
  }
  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-sm;
    padding-top: $spacing-sm;
    border-top: 1px solid $color-border;
  }
}
</style>

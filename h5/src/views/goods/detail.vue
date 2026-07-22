<template>
  <div class="goods-detail">
    <van-sticky>
      <van-nav-bar
        :title="goods?.title || '商品详情'"
        left-arrow
        @click-left="onBack"
      />
    </van-sticky>

    <van-skeleton v-if="loading" title :row="6" />

    <template v-else-if="goods">
      <van-image width="100%" height="320" fit="cover" :src="goods.image" />

      <div class="card">
        <div class="goods-detail__price">
          <span class="goods-detail__now">¥{{ goods.price }}</span>
          <span v-if="goods.originPrice" class="goods-detail__origin">
            ¥{{ goods.originPrice }}
          </span>
        </div>
        <div class="goods-detail__title">{{ goods.title }}</div>
        <div class="goods-detail__tags">
          <van-tag v-for="t in goods.tags" :key="t" type="primary" plain>
            {{ t }}
          </van-tag>
        </div>
      </div>

      <div class="card">
        <div class="goods-detail__section-title">商品详情</div>
        <div class="goods-detail__desc">{{ goods.description }}</div>
      </div>
    </template>

    <van-empty v-else description="商品不存在" />

    <van-action-bar>
      <van-action-bar-icon icon="chat-o" text="客服" @click="onContact" />
      <van-action-bar-icon icon="cart-o" text="购物车" @click="onCart" />
      <van-action-bar-button
        type="warning"
        text="加入购物车"
        @click="onAddCart"
      />
      <van-action-bar-button type="danger" text="立即购买" @click="onBuy" />
    </van-action-bar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { showToast } from "vant";
import http from "@/utils/request";
import { navigateBack } from "@/router/navigate";

interface GoodsDetail {
  id: string;
  title: string;
  image: string;
  price: number;
  originPrice?: number;
  tags?: string[];
  description: string;
}

const route = useRoute();
const goods = ref<GoodsDetail | null>(null);
const loading = ref(true);

function onBack(): void {
  navigateBack();
}
function onContact(): void {
  showToast("客服");
}
function onCart(): void {
  showToast("购物车");
}
function onAddCart(): void {
  showToast("已加入购物车");
}
function onBuy(): void {
  showToast("立即购买");
}

onMounted(async () => {
  const id = route.params.id as string;
  try {
    goods.value = await http.get<GoodsDetail>(`/goods/${id}`);
  } catch {
    // 接口失败：mock 兜底
    goods.value = {
      id,
      title: `示例商品 ${id}`,
      image:
        "https://via.placeholder.com/750x640/ebedf0/323233?text=Goods+Detail",
      price: 3800,
      originPrice: 4500,
      tags: ["现车", "直达", "当日发"],
      description:
        "本商品为示例数据，用于在无后端环境下展示商品详情页 UI。实际项目中将通过接口拉取真实数据。服务范围：全国主要城市直达运输，门到门服务，全程可追踪。",
    };
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.goods-detail {
  min-height: 100vh;
  background: $color-background;
  padding-bottom: 60px;

  &__price {
    display: flex;
    align-items: baseline;
    gap: $spacing-sm;
  }
  &__now {
    color: $color-danger;
    font-size: $font-xl;
    font-weight: 600;
  }
  &__origin {
    color: $color-text-disabled;
    font-size: $font-sm;
    text-decoration: line-through;
  }
  &__title {
    margin-top: $spacing-sm;
    font-size: $font-lg;
    color: $color-text;
    font-weight: 500;
  }
  &__tags {
    margin-top: $spacing-sm;
    display: flex;
    gap: $spacing-xs;
    flex-wrap: wrap;
  }
  &__section-title {
    font-size: $font-md;
    font-weight: 600;
    margin-bottom: $spacing-sm;
  }
  &__desc {
    font-size: $font-sm;
    color: $color-text-secondary;
    line-height: 1.6;
  }
}
</style>

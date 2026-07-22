<template>
  <div class="home">
    <!-- 搜索栏（原生风格） -->
    <van-sticky>
      <van-nav-bar title="首页" />
      <div class="home__search">
        <van-search
          v-model="keyword"
          placeholder="搜索商品"
          shape="round"
          @click-input="onSearchClick"
        />
      </div>
    </van-sticky>

    <!-- 内容区 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <!-- 骨架屏 -->
      <SkeletonHome v-if="initialLoading" />

      <template v-else>
        <!-- banner -->
        <van-swipe
          class="home__banner"
          :autoplay="4000"
          indicator-color="white"
        >
          <van-swipe-item
            v-for="b in banners"
            :key="b.id"
            @click="onBannerClick(b)"
          >
            <div
              class="home__banner-item"
              :style="{ backgroundImage: `url(${b.image})` }"
            />
          </van-swipe-item>
        </van-swipe>

        <!-- 金刚位 -->
        <div class="home__entries card">
          <div
            v-for="e in entries"
            :key="e.id"
            class="home__entry"
            @click="onEntryClick(e)"
          >
            <van-icon :name="e.icon" size="28" color="#1989fa" />
            <span class="home__entry-title">{{ e.title }}</span>
          </div>
        </div>

        <!-- 信息流 -->
        <div class="home__feed">
          <div class="home__feed-title">为你推荐</div>
          <van-list
            v-model:loading="feedLoading"
            :finished="feedFinished"
            finished-text="没有更多了"
            @load="onLoad"
          >
            <div class="home__feed-grid">
              <div
                v-for="item in feed"
                :key="item.id"
                class="home__feed-card"
                @click="onFeedClick(item)"
              >
                <div
                  class="home__feed-img"
                  :style="{ backgroundImage: `url(${item.image})` }"
                />
                <div class="home__feed-info">
                  <div class="home__feed-name">{{ item.title }}</div>
                  <div class="home__feed-price">
                    <span class="home__feed-now">¥{{ item.price }}</span>
                    <span v-if="item.originPrice" class="home__feed-origin">
                      ¥{{ item.originPrice }}
                    </span>
                  </div>
                  <div v-if="item.tags?.length" class="home__feed-tags">
                    <van-tag
                      v-for="t in item.tags"
                      :key="t"
                      plain
                      type="primary"
                    >
                      {{ t }}
                    </van-tag>
                  </div>
                </div>
              </div>
            </div>
          </van-list>
        </div>
      </template>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { showToast } from "vant";
import SkeletonHome from "@/components/SkeletonHome.vue";
import {
  homeApi,
  type HomeBanner,
  type HomeEntry,
  type HomeFeedItem,
} from "@/api";
import { navigateTo } from "@/router/navigate";

defineOptions({ name: "home" });

const keyword = ref("");
const refreshing = ref(false);
const initialLoading = ref(true);
const feedLoading = ref(false);
const feedFinished = ref(false);

const banners = ref<HomeBanner[]>([]);
const entries = ref<HomeEntry[]>([]);
const feed = ref<HomeFeedItem[]>([]);
const page = ref(1);
const pageSize = 10;

async function loadAll(): Promise<void> {
  const [b, e] = await Promise.all([
    homeApi.banners().catch(() => mockBanners),
    homeApi.entries().catch(() => mockEntries),
  ]);
  banners.value = b;
  entries.value = e;
}

async function loadFeed(): Promise<void> {
  try {
    const res = await homeApi.feed(page.value, pageSize);
    feed.value.push(...res.items);
    if (res.items.length < pageSize) feedFinished.value = true;
    else page.value += 1;
  } catch {
    // 接口失败：使用 mock 数据兜底（开发预览）
    if (page.value === 1) {
      feed.value.push(...mockFeed);
    }
    feedFinished.value = true;
  } finally {
    feedLoading.value = false;
  }
}

// mock 数据（接口不可达时用于本地预览）
const mockBanners: HomeBanner[] = [
  {
    id: "1",
    image: "https://via.placeholder.com/750x280/1989fa/ffffff?text=Banner+1",
    link: "/goods/1",
  },
  {
    id: "2",
    image: "https://via.placeholder.com/750x280/07c160/ffffff?text=Banner+2",
    link: "/goods/2",
  },
];
const mockEntries: HomeEntry[] = [
  { id: "e1", title: "整车发货", icon: "logistics", link: "/goods/1" },
  { id: "e2", title: "零担发货", icon: "gift-o", link: "/goods/2" },
  { id: "e3", title: "专线发货", icon: "send-gift-o", link: "/goods/3" },
  { id: "e4", title: "运单查询", icon: "search", link: "/order/list" },
];
const mockFeed: HomeFeedItem[] = [
  {
    id: "f1",
    title: "北京到上海整车运输 现车直达当日发",
    image: "https://via.placeholder.com/300x300/ebedf0/323233?text=Goods+1",
    price: 3800,
    originPrice: 4500,
    tags: ["现车", "直达"],
  },
  {
    id: "f2",
    title: "广州到杭州零担运输 天天发车",
    image: "https://via.placeholder.com/300x300/ebedf0/323233?text=Goods+2",
    price: 280,
    tags: ["零担"],
  },
  {
    id: "f3",
    title: "深圳到成都专线 限时送达",
    image: "https://via.placeholder.com/300x300/ebedf0/323233?text=Goods+3",
    price: 5200,
    originPrice: 6000,
    tags: ["专线"],
  },
  {
    id: "f4",
    title: "上海到南京搬家服务 上门打包",
    image: "https://via.placeholder.com/300x300/ebedf0/323233?text=Goods+4",
    price: 800,
    tags: ["搬家"],
  },
];

async function onRefresh(): Promise<void> {
  page.value = 1;
  feed.value = [];
  feedFinished.value = false;
  await loadAll();
  await loadFeed();
  refreshing.value = false;
  showToast("刷新成功");
}

function onLoad(): void {
  loadFeed();
}

function onSearchClick(): void {
  showToast("搜索待接入");
}
function onBannerClick(b: HomeBanner): void {
  navigateTo(b.link).catch(() => void 0);
}
function onEntryClick(e: HomeEntry): void {
  navigateTo(e.link).catch(() => void 0);
}
function onFeedClick(item: HomeFeedItem): void {
  navigateTo(`/goods/${item.id}`).catch(() => void 0);
}

onMounted(async () => {
  try {
    await loadAll();
  } finally {
    initialLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.home {
  padding-bottom: calc(#{$tabbar-height} + #{$safe-bottom});

  &__search {
    background: $color-background-light;
  }

  &__banner {
    margin: $spacing-md $spacing-lg;
    border-radius: $radius-lg;
    overflow: hidden;
    height: 140px;
  }
  &__banner-item {
    width: 100%;
    height: 140px;
    background-size: cover;
    background-position: center;
    background-color: $color-border;
  }

  &__entries {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $spacing-md;
    margin: 0 $spacing-lg;
    padding: $spacing-lg;
  }
  &__entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
  }
  &__entry-title {
    font-size: $font-xs;
    color: $color-text;
  }

  &__feed {
    margin-top: $spacing-md;
  }
  &__feed-title {
    padding: $spacing-md $spacing-lg;
    font-size: $font-lg;
    font-weight: 600;
    color: $color-text;
  }
  &__feed-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-md;
    padding: 0 $spacing-lg;
  }
  &__feed-card {
    background: $color-background-light;
    border-radius: $radius-lg;
    overflow: hidden;
    margin-bottom: $spacing-md;
  }
  &__feed-img {
    width: 100%;
    height: 130px;
    background-size: cover;
    background-position: center;
    background-color: $color-border;
  }
  &__feed-info {
    padding: $spacing-sm $spacing-sm $spacing-md;
  }
  &__feed-name {
    font-size: $font-sm;
    color: $color-text;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  &__feed-price {
    margin-top: $spacing-xs;
    display: flex;
    align-items: baseline;
    gap: $spacing-xs;
  }
  &__feed-now {
    color: $color-danger;
    font-size: $font-md;
    font-weight: 600;
  }
  &__feed-origin {
    color: $color-text-disabled;
    font-size: $font-xs;
    text-decoration: line-through;
  }
  &__feed-tags {
    margin-top: $spacing-xs;
    display: flex;
    gap: $spacing-xs;
    flex-wrap: wrap;
  }
}
</style>

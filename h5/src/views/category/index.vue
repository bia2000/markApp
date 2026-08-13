<template>
  <div class="category">
    <van-sticky>
      <van-nav-bar title="分类" />
      <van-search v-model="keyword" placeholder="搜索分类" shape="round" />
    </van-sticky>

    <div class="category__body">
      <!-- 侧栏 -->
      <van-sidebar v-model="activeCate" class="category__sidebar">
        <van-sidebar-item
          v-for="c in categories"
          :key="c.id"
          :title="c.title"
        />
      </van-sidebar>

      <!-- 右侧子分类 -->
      <div class="category__content">
        <template v-if="currentCate">
          <div class="category__banner">
            <van-image
              width="100%"
              height="80"
              fit="cover"
              :src="currentCate.banner"
              radius="8"
            />
          </div>
          <div
            class="category__group"
            v-for="g in currentCate.groups"
            :key="g.id"
          >
            <div class="category__group-title">{{ g.title }}</div>
            <div class="category__group-grid">
              <div
                v-for="s in g.items"
                :key="s.id"
                class="category__sub"
                @click="onSubClick(s)"
              >
                <van-image width="50" height="50" round :src="s.icon" />
                <span>{{ s.title }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import toast from "@/utils/toast";
import { navigateTo } from "@/router/navigate";

defineOptions({ name: "category" });

interface SubItem {
  id: string;
  title: string;
  icon: string;
  link: string;
}
interface Group {
  id: string;
  title: string;
  items: SubItem[];
}
interface Cate {
  id: string;
  title: string;
  banner: string;
  groups: Group[];
}

// mock 数据
const categories = ref<Cate[]>([
  {
    id: "logistics",
    title: "物流",
    banner: "https://via.placeholder.com/600x120/1989fa/ffffff?text=Logistics",
    groups: [
      {
        id: "send",
        title: "发货",
        items: [
          { id: "s1", title: "整车发货", icon: "", link: "/goods/1" },
          { id: "s2", title: "零担发货", icon: "", link: "/goods/2" },
          { id: "s3", title: "专线发货", icon: "", link: "/goods/3" },
        ],
      },
      {
        id: "track",
        title: "查询",
        items: [
          { id: "t1", title: "运单查询", icon: "", link: "/order/list" },
          { id: "t2", title: "历史记录", icon: "", link: "/order/list" },
        ],
      },
    ],
  },
  {
    id: "move",
    title: "搬家",
    banner: "https://via.placeholder.com/600x120/07c160/ffffff?text=Move",
    groups: [
      {
        id: "home",
        title: "居民搬家",
        items: [{ id: "h1", title: "小型搬家", icon: "", link: "/goods/4" }],
      },
    ],
  },
]);

const keyword = ref("");
const activeCate = ref(0);
const currentCate = computed(() => categories.value[activeCate.value]);

function onSubClick(s: SubItem): void {
  navigateTo(s.link).catch(() => toast.info("敬请期待"));
}
</script>

<style lang="scss" scoped>
.category {
  min-height: 100vh;
  background: $color-background;
  padding-bottom: calc(#{$tabbar-height} + #{$safe-bottom});

  &__body {
    display: flex;
  }
  &__sidebar {
    width: 88px;
    flex-shrink: 0;
    :deep(.van-sidebar-item) {
      padding: $spacing-md $spacing-sm;
    }
  }
  &__content {
    flex: 1;
    padding: $spacing-md;
    overflow: hidden;
  }
  &__banner {
    margin-bottom: $spacing-md;
  }
  &__group {
    background: $color-background-light;
    border-radius: $radius-lg;
    padding: $spacing-md;
    margin-bottom: $spacing-md;
  }
  &__group-title {
    font-size: $font-md;
    font-weight: 600;
    color: $color-text;
    margin-bottom: $spacing-md;
  }
  &__group-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-md;
  }
  &__sub {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-sm;
    color: $color-text;
  }
}
</style>

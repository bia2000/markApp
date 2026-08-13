<template>
  <div class="profile">
    <van-sticky>
      <van-nav-bar title="我的" />
    </van-sticky>

    <!-- 用户信息头部 -->
    <div class="profile__header" @click="onHeaderClick">
      <van-image
        round
        width="60"
        height="60"
        :src="user?.avatar || defaultAvatar"
        class="profile__avatar"
      />
      <div class="profile__info">
        <div class="profile__name">{{ user?.nickname || "点击登录" }}</div>
        <div class="profile__phone">
          {{ maskedPhone || "登录后享受更多服务" }}
        </div>
      </div>
      <van-icon name="arrow" color="#fff" />
    </div>

    <!-- 订单状态 -->
    <div class="card profile__orders">
      <div class="profile__section-title">
        <span>我的订单</span>
        <van-button
          size="mini"
          plain
          type="primary"
          @click="navigateTo('/order/list')"
        >
          查看全部
        </van-button>
      </div>
      <div class="profile__order-grid">
        <div
          v-for="o in orderEntries"
          :key="o.key"
          class="profile__order-item"
          @click="onOrderClick(o.key)"
        >
          <van-badge :content="o.count > 0 ? o.count : ''" :max="99">
            <van-icon :name="o.icon" size="26" color="#1989fa" />
          </van-badge>
          <span>{{ o.title }}</span>
        </div>
      </div>
    </div>

    <!-- 功能列表 -->
    <van-cell-group inset class="profile__group">
      <van-cell
        title="地址管理"
        icon="location-o"
        is-link
        @click="onMenuClick('address')"
      />
      <van-cell
        title="优惠券"
        icon="coupon-o"
        is-link
        :value="couponText"
        @click="onMenuClick('coupon')"
      />
      <van-cell
        title="我的钱包"
        icon="balance-o"
        is-link
        @click="onMenuClick('wallet')"
      />
    </van-cell-group>

    <van-cell-group inset class="profile__group">
      <van-cell
        title="设置"
        icon="setting-o"
        is-link
        @click="navigateTo('/settings')"
      />
      <van-cell
        title="帮助中心"
        icon="question-o"
        is-link
        @click="onMenuClick('help')"
      />
      <van-cell
        title="关于我们"
        icon="info-o"
        is-link
        @click="onMenuClick('about')"
      />
      <van-cell
        title="检查更新"
        icon="upgrade"
        is-link
        @click="onCheckUpdate"
      />
    </van-cell-group>

    <div v-if="userStore.isLoggedIn" class="profile__logout">
      <van-button block type="danger" plain @click="onLogout"
        >退出登录</van-button
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import confirm from "@/utils/dialog";
import toast from "@/utils/toast";
import { useUserStore } from "@/stores/user";
import { useMessageStore } from "@/stores/message";
import { navigateTo } from "@/router/navigate";
import { checkUpdate } from "@/bridge/helpers";

defineOptions({ name: "profile" });

const router = useRouter();
const userStore = useUserStore();
const messageStore = useMessageStore();

const defaultAvatar = "https://via.placeholder.com/120/1989fa/ffffff?text=U";
const user = computed(() => userStore.userInfo);

const maskedPhone = computed(() => {
  const p = user.value?.phone;
  if (!p) return "";
  return p.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
});

const orderEntries = ref([
  { key: "unpaid", title: "待付款", icon: "balance-o", count: 0 },
  { key: "undelivered", title: "待发货", icon: "logistics", count: 0 },
  { key: "unreceived", title: "待收货", icon: "gift-o", count: 0 },
  { key: "unreviewed", title: "待评价", icon: "comment-o", count: 0 },
]);

const couponText = ref("3 张");

function onHeaderClick(): void {
  if (!userStore.isLoggedIn) {
    navigateTo("/login").catch(() => router.push("/login"));
  }
}

function onOrderClick(key: string): void {
  toast.info(`${key} 订单`);
}

function onMenuClick(key: string): void {
  toast.info("敬请期待");
}

async function onCheckUpdate(): Promise<void> {
  try {
    const res = await checkUpdate();
    if (res.hasUpdate) {
      toast.success(`发现新版本 ${res.version ?? ""}`);
    } else {
      toast.success("已是最新版本");
    }
  } catch {
    toast.error("检查更新失败");
  }
}

async function onLogout(): Promise<void> {
  try {
    await confirm({ title: "提示", message: "确定退出登录？" });
    await userStore.logout();
    messageStore.$reset();
    toast.success("已退出");
    router.replace("/home");
  } catch {
    /* 取消 */
  }
}

onMounted(() => {
  // 模拟订单数
  // 真实场景调用 userApi.ordersCount()
});
</script>

<style lang="scss" scoped>
.profile {
  min-height: 100vh;
  background: $color-background;
  padding-bottom: calc(#{$tabbar-height} + #{$safe-bottom});

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-xl $spacing-lg;
    background: linear-gradient(
      135deg,
      $color-primary 0%,
      $color-primary-dark 100%
    );
    color: #fff;
  }
  &__avatar {
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.4);
  }
  &__info {
    flex: 1;
  }
  &__name {
    font-size: $font-lg;
    font-weight: 600;
  }
  &__phone {
    margin-top: $spacing-xs;
    font-size: $font-sm;
    opacity: 0.85;
  }

  &__orders {
    margin-top: -$spacing-md;
    position: relative;
    z-index: 1;
  }
  &__section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: $font-md;
    font-weight: 600;
    margin-bottom: $spacing-md;
  }
  &__order-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $spacing-md;
  }
  &__order-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-sm;
    color: $color-text;
  }

  &__group {
    margin-top: $spacing-md;
  }

  &__logout {
    padding: $spacing-xl $spacing-lg;
  }
}
</style>

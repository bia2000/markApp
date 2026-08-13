<template>
  <div class="settings">
    <van-sticky>
      <van-nav-bar title="设置" left-arrow @click-left="navigateBack" />
    </van-sticky>

    <van-cell-group inset>
      <van-cell title="消息通知" center>
        <template #right-icon>
          <van-switch v-model="msgNotify" size="22" />
        </template>
      </van-cell>
      <van-cell title="免打扰模式" center>
        <template #right-icon>
          <van-switch v-model="quietMode" size="22" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset>
      <van-cell
        title="清除缓存"
        is-link
        :value="cacheText"
        @click="onClearCache"
      />
      <van-cell title="隐私设置" is-link @click="onPrivacy" />
    </van-cell-group>

    <van-cell-group inset>
      <van-cell title="当前版本" :value="version" />
    </van-cell-group>

    <div class="settings__footer">
      <van-button block type="danger" plain @click="onLogout"
        >退出登录</van-button
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import confirm from "@/utils/dialog";
import toast from "@/utils/toast";
import { useUserStore } from "@/stores/user";
import { navigateBack } from "@/router/navigate";
import { useRouter } from "vue-router";

const userStore = useUserStore();
const router = useRouter();

const msgNotify = ref(true);
const quietMode = ref(false);
const cacheSize = ref(12.3);
const version = import.meta.env.VITE_APP_VERSION || "1.0.0";

const cacheText = computed(() => `${cacheSize.value.toFixed(1)} MB`);

async function onClearCache(): Promise<void> {
  try {
    await confirm({ title: "提示", message: "确定清除缓存？" });
    cacheSize.value = 0;
    toast.success("已清除");
  } catch {
    /* 取消 */
  }
}

function onPrivacy(): void {
  toast.info("隐私设置");
}

async function onLogout(): Promise<void> {
  try {
    await confirm({ title: "提示", message: "确定退出登录？" });
    await userStore.logout();
    toast.success("已退出");
    router.replace("/home");
  } catch {
    /* 取消 */
  }
}
</script>

<style lang="scss" scoped>
.settings {
  min-height: 100vh;
  background: $color-background;

  :deep(.van-cell-group--inset) {
    margin: $spacing-md $spacing-lg;
  }
  &__footer {
    padding: $spacing-xl $spacing-lg;
  }
}
</style>

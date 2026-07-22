<template>
  <div class="login">
    <div class="login__header">
      <div class="login__logo">Hybrid</div>
      <div class="login__title">欢迎登录</div>
      <div class="login__subtitle">一套 H5，双端运行</div>
    </div>

    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="验证码登录" name="code">
        <van-form @submit="onCodeSubmit">
          <van-cell-group inset>
            <van-field
              v-model="phone"
              name="phone"
              label="手机号"
              placeholder="请输入手机号"
              type="tel"
              maxlength="11"
              :rules="[
                { required: true, message: '请输入手机号' },
                { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
              ]"
            />
            <van-field
              v-model="code"
              name="code"
              label="验证码"
              placeholder="请输入验证码"
              maxlength="6"
              :rules="[{ required: true, message: '请输入验证码' }]"
            >
              <template #button>
                <van-button
                  size="small"
                  type="primary"
                  plain
                  :disabled="countdown > 0"
                  @click.prevent="onSendCode"
                >
                  {{ countdown > 0 ? `${countdown}s` : "获取验证码" }}
                </van-button>
              </template>
            </van-field>
          </van-cell-group>
          <div class="login__submit">
            <van-button
              block
              type="primary"
              native-type="submit"
              :loading="loading"
            >
              登录
            </van-button>
          </div>
        </van-form>
      </van-tab>

      <van-tab title="密码登录" name="password">
        <van-form @submit="onPwdSubmit">
          <van-cell-group inset>
            <van-field
              v-model="account"
              name="account"
              label="账号"
              placeholder="手机号 / 用户名"
              :rules="[{ required: true, message: '请输入账号' }]"
            />
            <van-field
              v-model="password"
              type="password"
              name="password"
              label="密码"
              placeholder="请输入密码"
              :rules="[{ required: true, message: '请输入密码' }]"
            />
          </van-cell-group>
          <div class="login__submit">
            <van-button
              block
              type="primary"
              native-type="submit"
              :loading="loading"
            >
              登录
            </van-button>
          </div>
        </van-form>
      </van-tab>
    </van-tabs>

    <div class="login__agreement">
      <van-checkbox v-model="agreed" shape="square" icon-size="16">
        我已阅读并同意
        <a href="javascript:void(0)">《用户协议》</a>
        和
        <a href="javascript:void(0)">《隐私政策》</a>
      </van-checkbox>
    </div>

    <div class="login__third">
      <van-divider>第三方登录</van-divider>
      <div class="login__third-actions">
        <van-button
          icon="wechat-pay"
          round
          type="success"
          @click="onWechatLogin"
        >
          微信
        </van-button>
        <van-button icon="apple-o" round type="default" @click="onAppleLogin">
          Apple
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { showSuccessToast, showFailToast } from "vant";
import { useUserStore } from "@/stores/user";
import { authApi } from "@/api";
import { navSwitchTab } from "@/bridge/helpers";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const activeTab = ref<"code" | "password">("code");
const phone = ref("");
const code = ref("");
const account = ref("");
const password = ref("");
const agreed = ref(false);
const loading = ref(false);
const countdown = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

function startCountdown(): void {
  countdown.value = 60;
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
}

async function onSendCode(): Promise<void> {
  if (!/^1\d{10}$/.test(phone.value)) {
    showFailToast("请输入正确的手机号");
    return;
  }
  try {
    await authApi.sendCode({ phone: phone.value, scene: "login" });
    showSuccessToast("验证码已发送");
    startCountdown();
  } catch {
    /* request 已统一 toast */
  }
}

async function onCodeSubmit(): Promise<void> {
  if (!agreed.value) {
    showFailToast("请先同意协议");
    return;
  }
  loading.value = true;
  try {
    await userStore.loginByCode(phone.value, code.value);
    showSuccessToast("登录成功");
    await navigateAfterLogin();
  } catch {
    /* request 已统一 toast */
  } finally {
    loading.value = false;
  }
}

async function onPwdSubmit(): Promise<void> {
  if (!agreed.value) {
    showFailToast("请先同意协议");
    return;
  }
  loading.value = true;
  try {
    await userStore.loginByPassword(account.value, password.value);
    showSuccessToast("登录成功");
    await navigateAfterLogin();
  } catch {
    /* request 已统一 toast */
  } finally {
    loading.value = false;
  }
}

async function navigateAfterLogin(): Promise<void> {
  const redirect = route.query.redirect as string | undefined;
  if (redirect) {
    router.replace(redirect);
  } else {
    // 跳转首页 Tab（交给原生 TabBar 切换）
    try {
      await navSwitchTab(0);
    } catch {
      router.replace("/home");
    }
  }
}

function onWechatLogin(): void {
  showFailToast("微信登录待接入");
}

function onAppleLogin(): void {
  showFailToast("Apple 登录待接入");
}
</script>

<style lang="scss" scoped>
.login {
  min-height: 100vh;
  background: $color-background-light;
  padding-bottom: calc(#{$safe-bottom} + #{$spacing-xl});

  &__header {
    padding: $spacing-xl $spacing-lg $spacing-lg;
    text-align: center;
  }
  &__logo {
    width: 64px;
    height: 64px;
    margin: 0 auto $spacing-md;
    border-radius: $radius-lg;
    background: linear-gradient(
      135deg,
      $color-primary 0%,
      $color-primary-dark 100%
    );
    color: #fff;
    font-size: $font-lg;
    font-weight: 600;
    line-height: 64px;
    letter-spacing: 1px;
  }
  &__title {
    font-size: $font-xl;
    font-weight: 600;
    color: $color-text;
  }
  &__subtitle {
    margin-top: $spacing-xs;
    font-size: $font-sm;
    color: $color-text-secondary;
  }
  &__submit {
    padding: $spacing-lg $spacing-md 0;
  }
  &__agreement {
    padding: $spacing-lg $spacing-lg 0;
    font-size: $font-sm;
    color: $color-text-secondary;
    :deep(.van-checkbox__label) {
      margin-left: $spacing-sm;
      line-height: 1.6;
    }
    a {
      color: $color-primary;
    }
  }
  &__third {
    margin-top: $spacing-xl;
    padding: 0 $spacing-lg;
  }
  &__third-actions {
    display: flex;
    justify-content: center;
    gap: $spacing-lg;
  }
}
</style>

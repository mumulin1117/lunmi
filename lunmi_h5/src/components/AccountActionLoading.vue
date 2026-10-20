<template>
  <view class="account-action-loading" :style="loading_style">
    <view class="loading-card">
      <view class="loading-spinner" />
      <text class="loading-title">{{ $t(loading_copy.title) }}</text>
      <text class="loading-caption">{{ loading_copy.caption }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import theme from '@/config/theme.json'

const props = defineProps({
  action: {
    type: String,
    default: 'logout',
    validator: (value) => ['login', 'create', 'purchase', 'logout', 'delete'].includes(value)
  }
})

const loading_messages = {
  login: { title: 'Logging in...', caption: 'Getting your account ready.' },
  create: { title: 'Creating account...', caption: 'Setting up your account.' },
  purchase: { title: 'Purchasing...', caption: 'Waiting for App Store confirmation.' },
  logout: { title: 'Logging out...', caption: 'Securing your session.' },
  delete: { title: 'Deleting account...', caption: 'Updating your account status.' }
}

const loading_copy = computed(() => loading_messages[props.action])

const loading_style = {
  '--account-loading-background': theme.colors.page.background,
  '--account-loading-title': theme.colors.text.title,
  '--account-loading-secondary': theme.colors.text.secondary,
  '--account-loading-accent': theme.colors.button.primary,
  '--account-loading-overlay': theme.colors.surface.scrim_soft,
  '--account-loading-border': theme.colors.surface.highlight_border,
  '--account-loading-track': theme.colors.surface.highlight,
  '--account-loading-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.account-action-loading {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--account-loading-overlay);
  backdrop-filter: blur(8rpx);
}

.loading-card {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  padding: 42rpx 36rpx;
  border: 1rpx solid var(--account-loading-border);
  border-radius: 36rpx;
  background: var(--account-loading-background);
  box-shadow: 0 28rpx 80rpx var(--account-loading-shadow);
  flex-direction: column;
}

.loading-spinner {
  width: 70rpx;
  height: 70rpx;
  border: 7rpx solid var(--account-loading-track);
  border-top-color: var(--account-loading-accent);
  border-right-color: var(--account-loading-accent);
  border-radius: 50%;
  animation: account-loading-spin .72s linear infinite;
}

.loading-title {
  display: block;
  margin-top: 28rpx;
  color: var(--account-loading-title);
  font-size: 32rpx;
  font-weight: 800;
}

.loading-caption {
  display: block;
  margin-top: 12rpx;
  color: var(--account-loading-secondary);
  font-size: 24rpx;
}

@keyframes account-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <view class="login-redirect-loading" :style="theme_style">
    <view class="login-redirect-loading__spinner" />
    <text>{{ $t('Going to login...') }}</text>
  </view>
</template>
<script setup>
import theme from '@/config/theme.json'
const theme_style = { '--redirect-background': theme.colors.page.background, '--redirect-title': theme.colors.text.title, '--redirect-accent': theme.colors.button.primary }
</script>
<style scoped lang="scss">
.login-redirect-loading {
  position: fixed;
  z-index: 2000;
  inset: 0;
  display: flex;
  gap: 24rpx;
  align-items: center;
  justify-content: center;
  background: var(--redirect-background);
  color: var(--redirect-title);
  flex-direction: column;
  font-size: 26rpx;
  font-weight: 800;
}

.login-redirect-loading__spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid transparent;
  border-top-color: var(--redirect-accent);
  border-right-color: var(--redirect-accent);
  border-radius: 50%;
  animation: redirect-spin .72s linear infinite;
}

@keyframes redirect-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

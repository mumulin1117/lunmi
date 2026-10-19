<template>
  <view class="logout-loading" :style="loading_style">
    <view class="logout-loading__card">
      <view class="logout-loading__spinner" />
      <text class="logout-loading__title">{{ $t('Logging out...') }}</text>
      <text class="logout-loading__copy">{{ $t('Your session is being closed.') }}</text>
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const loading_style = {
  '--logout-loading-background': theme.colors.page.background,
  '--logout-loading-title': theme.colors.text.title,
  '--logout-loading-secondary': theme.colors.text.secondary,
  '--logout-loading-accent': theme.colors.button.primary,
  '--logout-loading-overlay': theme.colors.surface.scrim_soft,
  '--logout-loading-border': theme.colors.surface.highlight_border,
  '--logout-loading-track': theme.colors.surface.highlight,
  '--logout-loading-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.logout-loading {
  position: fixed;
  z-index: 1600;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--logout-loading-overlay);
  backdrop-filter: blur(8rpx);
}

.logout-loading__card {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  padding: 44rpx 36rpx;
  border: 1px solid var(--logout-loading-border);
  border-radius: 36rpx;
  background: var(--logout-loading-background);
  box-shadow: 0 28rpx 80rpx var(--logout-loading-shadow);
  flex-direction: column;
}

.logout-loading__spinner {
  width: 70rpx;
  height: 70rpx;
  border: 6px solid var(--logout-loading-track);
  border-top-color: var(--logout-loading-accent);
  border-right-color: var(--logout-loading-accent);
  border-radius: 50%;
  animation: logout-spin .72s linear infinite;
}

.logout-loading__title {
  display: block;
  margin-top: 28rpx;
  color: var(--logout-loading-title);
  font-size: 32rpx;
  font-weight: 800;
}

.logout-loading__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--logout-loading-secondary);
  font-size: 24rpx;
  text-align: center;
}

@keyframes logout-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

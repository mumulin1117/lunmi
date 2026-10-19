<template>
  <view class="blocking-loading" :style="loading_style">
    <view class="blocking-loading__card">
      <view class="blocking-loading__spinner" />
      <text class="blocking-loading__title">{{ $t('Blocking user...') }}</text>
      <text class="blocking-loading__copy">{{ $t('Updating your content filters.') }}</text>
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const loading_style = {
  '--blocking-loading-background': theme.colors.page.background,
  '--blocking-loading-title': theme.colors.text.title,
  '--blocking-loading-secondary': theme.colors.text.secondary,
  '--blocking-loading-accent': theme.colors.button.primary,
  '--blocking-loading-overlay': theme.colors.surface.scrim_soft,
  '--blocking-loading-border': theme.colors.surface.highlight_border,
  '--blocking-loading-track': theme.colors.surface.highlight,
  '--blocking-loading-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.blocking-loading {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--blocking-loading-overlay);
  backdrop-filter: blur(8rpx);
}

.blocking-loading__card {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  align-items: center;
  padding: 44rpx 36rpx;
  border: 1rpx solid var(--blocking-loading-border);
  border-radius: 36rpx;
  background: var(--blocking-loading-background);
  box-shadow: 0 28rpx 80rpx var(--blocking-loading-shadow);
  flex-direction: column;
}

.blocking-loading__spinner {
  width: 68rpx;
  height: 68rpx;
  border: 7rpx solid var(--blocking-loading-track);
  border-top-color: var(--blocking-loading-accent);
  border-right-color: var(--blocking-loading-accent);
  border-radius: 50%;
  animation: blocking-loading-spin .72s linear infinite;
}

.blocking-loading__title {
  margin-top: 26rpx;
  color: var(--blocking-loading-title);
  font-size: 31rpx;
  font-weight: 800 !important;
}

.blocking-loading__copy {
  margin-top: 12rpx;
  color: var(--blocking-loading-secondary);
  font-size: 23rpx;
  text-align: center;
}

@keyframes blocking-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

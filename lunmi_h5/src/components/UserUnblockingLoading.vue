<template>
  <view class="unblocking-loading" :style="loading_style">
    <view class="unblocking-loading__card">
      <view class="unblocking-loading__spinner" />
      <text class="unblocking-loading__title">{{ $t('Unblocking user...') }}</text>
      <text class="unblocking-loading__copy">{{ $t('Updating your content filters.') }}</text>
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const loading_style = {
  '--unblocking-loading-background': theme.colors.page.background,
  '--unblocking-loading-title': theme.colors.text.title,
  '--unblocking-loading-secondary': theme.colors.text.secondary,
  '--unblocking-loading-accent': theme.colors.button.primary,
  '--unblocking-loading-overlay': theme.colors.surface.scrim_soft,
  '--unblocking-loading-border': theme.colors.surface.highlight_border,
  '--unblocking-loading-track': theme.colors.surface.highlight,
  '--unblocking-loading-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.unblocking-loading {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--unblocking-loading-overlay);
  backdrop-filter: blur(8rpx);
}

.unblocking-loading__card {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  align-items: center;
  padding: 44rpx 36rpx;
  border: 1px solid var(--unblocking-loading-border);
  border-radius: 36rpx;
  background: var(--unblocking-loading-background);
  box-shadow: 0 28rpx 80rpx var(--unblocking-loading-shadow);
  flex-direction: column;
}

.unblocking-loading__spinner {
  width: 68rpx;
  height: 68rpx;
  border: 6px solid var(--unblocking-loading-track);
  border-top-color: var(--unblocking-loading-accent);
  border-right-color: var(--unblocking-loading-accent);
  border-radius: 50%;
  animation: unblocking-loading-spin .72s linear infinite;
}

.unblocking-loading__title {
  margin-top: 26rpx;
  color: var(--unblocking-loading-title);
  font-size: 31rpx;
  font-weight: 800;
}

.unblocking-loading__copy {
  margin-top: 12rpx;
  color: var(--unblocking-loading-secondary);
  font-size: 23rpx;
  text-align: center;
}

@keyframes unblocking-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <view class="lantern-release-loading" :style="theme_style">
    <view class="lantern-release-loading__card">
      <view class="lantern-release-loading__spinner" />
      <text class="lantern-release-loading__title">{{ $t('Releasing...') }}</text>
      <text class="lantern-release-loading__copy">{{ $t('Your lantern is heading into the night.') }}</text>
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const theme_style = {
  '--release-loading-background': theme.colors.page.background,
  '--release-loading-title': theme.colors.text.title,
  '--release-loading-secondary': theme.colors.text.secondary,
  '--release-loading-accent': theme.colors.button.primary,
  '--release-loading-overlay': theme.colors.surface.scrim_soft,
  '--release-loading-border': theme.colors.surface.highlight_border,
  '--release-loading-track': theme.colors.surface.highlight,
  '--release-loading-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.lantern-release-loading {
  position: fixed;
  z-index: 1400;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--release-loading-overlay);
  backdrop-filter: blur(8rpx);
}

.lantern-release-loading__card {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  padding: 44rpx 36rpx;
  border: 1px solid var(--release-loading-border);
  border-radius: 36rpx;
  background: var(--release-loading-background);
  box-shadow: 0 28rpx 80rpx var(--release-loading-shadow);
  flex-direction: column;
}

.lantern-release-loading__spinner {
  width: 70rpx;
  height: 70rpx;
  border: 7px solid var(--release-loading-track);
  border-top-color: var(--release-loading-accent);
  border-right-color: var(--release-loading-accent);
  border-radius: 50%;
  animation: lantern-release-spin .72s linear infinite;
}

.lantern-release-loading__title {
  display: block;
  margin-top: 28rpx;
  color: var(--release-loading-title);
  font-size: 32rpx;
  font-weight: 800;
}

.lantern-release-loading__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--release-loading-secondary);
  font-size: 24rpx;
  text-align: center;
}

@keyframes lantern-release-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <view class="post-publish-loading" :style="theme_style">
    <view class="post-publish-loading__card">
      <view class="post-publish-loading__spinner" />
      <text class="post-publish-loading__title">{{ $t('Publishing...') }}</text>
      <text class="post-publish-loading__copy">{{ $t('Sharing your moment with the community.') }}</text>
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const theme_style = {
  '--publish-loading-background': theme.colors.page.background,
  '--publish-loading-title': theme.colors.text.title,
  '--publish-loading-secondary': theme.colors.text.secondary,
  '--publish-loading-accent': theme.colors.button.primary,
  '--publish-loading-overlay': theme.colors.surface.scrim_soft,
  '--publish-loading-border': theme.colors.surface.highlight_border,
  '--publish-loading-track': theme.colors.surface.highlight,
  '--publish-loading-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.post-publish-loading {
  position: fixed;
  z-index: 1400;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--publish-loading-overlay);
  backdrop-filter: blur(8rpx);
}

.post-publish-loading__card {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  padding: 44rpx 36rpx;
  border: 1rpx solid var(--publish-loading-border);
  border-radius: 36rpx;
  background: var(--publish-loading-background);
  box-shadow: 0 28rpx 80rpx var(--publish-loading-shadow);
  flex-direction: column;
}

.post-publish-loading__spinner {
  width: 70rpx;
  height: 70rpx;
  border: 7rpx solid var(--publish-loading-track);
  border-top-color: var(--publish-loading-accent);
  border-right-color: var(--publish-loading-accent);
  border-radius: 50%;
  animation: post-publish-spin .72s linear infinite;
}

.post-publish-loading__title {
  display: block;
  margin-top: 28rpx;
  color: var(--publish-loading-title);
  font-size: 32rpx;
  font-weight: 800;
}

.post-publish-loading__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--publish-loading-secondary);
  font-size: 24rpx;
  text-align: center;
}

@keyframes post-publish-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

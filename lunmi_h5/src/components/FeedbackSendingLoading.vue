<template>
  <view class="feedback-sending-loading" :style="loading_style">
    <view class="feedback-sending-loading__card">
      <view class="feedback-sending-loading__spinner" />
      <text class="feedback-sending-loading__title">{{ $t('Sending feedback...') }}</text>
      <text class="feedback-sending-loading__copy">{{ $t('Thanks for helping us improve.') }}</text>
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const loading_style = {
  '--feedback-sending-background': theme.colors.page.background,
  '--feedback-sending-title': theme.colors.text.title,
  '--feedback-sending-secondary': theme.colors.text.secondary,
  '--feedback-sending-accent': theme.colors.button.primary,
  '--feedback-sending-overlay': theme.colors.surface.scrim_soft,
  '--feedback-sending-border': theme.colors.surface.highlight_border,
  '--feedback-sending-track': theme.colors.surface.highlight,
  '--feedback-sending-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.feedback-sending-loading {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--feedback-sending-overlay);
  backdrop-filter: blur(8rpx);
}

.feedback-sending-loading__card {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  align-items: center;
  padding: 44rpx 36rpx;
  border: 1px solid var(--feedback-sending-border);
  border-radius: 36rpx;
  background: var(--feedback-sending-background);
  box-shadow: 0 28rpx 80rpx var(--feedback-sending-shadow);
  flex-direction: column;
}

.feedback-sending-loading__spinner {
  width: 70rpx;
  height: 70rpx;
  border: 6px solid var(--feedback-sending-track);
  border-top-color: var(--feedback-sending-accent);
  border-right-color: var(--feedback-sending-accent);
  border-radius: 50%;
  animation: feedback-sending-spin .72s linear infinite;
}

.feedback-sending-loading__title {
  display: block;
  margin-top: 28rpx;
  color: var(--feedback-sending-title);
  font-size: 32rpx;
  font-weight: 800;
}

.feedback-sending-loading__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--feedback-sending-secondary);
  font-size: 24rpx;
  text-align: center;
}

@keyframes feedback-sending-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <view class="report-loading" :style="loading_style">
    <view class="report-loading__card">
      <view class="report-loading__spinner" />
      <text class="report-loading__title">{{ $t('Sending report...') }}</text>
      <text class="report-loading__copy">{{ $t('Please wait a moment.') }}</text>
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const loading_style = {
  '--report-loading-background': theme.colors.page.background,
  '--report-loading-title': theme.colors.text.title,
  '--report-loading-secondary': theme.colors.text.secondary,
  '--report-loading-accent': theme.colors.button.primary,
  '--report-loading-overlay': theme.colors.surface.scrim_soft,
  '--report-loading-border': theme.colors.surface.highlight_border,
  '--report-loading-track': theme.colors.surface.highlight,
  '--report-loading-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.report-loading {
  position: fixed;
  z-index: 1400;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--report-loading-overlay);
  backdrop-filter: blur(8rpx);
}

.report-loading__card {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  padding: 44rpx 36rpx;
  border: 1rpx solid var(--report-loading-border);
  border-radius: 36rpx;
  background: var(--report-loading-background);
  box-shadow: 0 28rpx 80rpx var(--report-loading-shadow);
  flex-direction: column;
}

.report-loading__spinner {
  width: 70rpx;
  height: 70rpx;
  border: 7rpx solid var(--report-loading-track);
  border-top-color: var(--report-loading-accent);
  border-right-color: var(--report-loading-accent);
  border-radius: 50%;
  animation: report-loading-spin .72s linear infinite;
}

.report-loading__title {
  display: block;
  margin-top: 28rpx;
  color: var(--report-loading-title);
  font-size: 32rpx;
  font-weight: 800;
}

.report-loading__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--report-loading-secondary);
  font-size: 24rpx;
  text-align: center;
}

@keyframes report-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

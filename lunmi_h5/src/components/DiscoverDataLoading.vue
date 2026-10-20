<template>
  <view class="discover-data-loading" :style="loading_style">
    <view class="discover-data-loading__spinner" />
    <text class="discover-data-loading__text">{{ $t('Loading data...') }}</text>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const loading_style = {
  '--discover-loading-surface': theme.colors.button_change.default.background,
  '--discover-loading-text': theme.colors.text.secondary,
  '--discover-loading-accent': theme.colors.button.primary,
  '--discover-loading-track': theme.colors.surface.highlight
}
</script>

<style scoped lang="scss">
.discover-data-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 172rpx;
  margin-top: 18rpx;
  border-radius: 28rpx;
  background: var(--discover-loading-surface);
  flex-direction: column;
}

.discover-data-loading__spinner {
  width: 46rpx;
  height: 46rpx;
  border: 5rpx solid var(--discover-loading-track);
  border-top-color: var(--discover-loading-accent);
  border-right-color: var(--discover-loading-accent);
  border-radius: 50%;
  animation: discover-data-spin .72s linear infinite;
}

.discover-data-loading__text {
  display: block;
  margin-top: 16rpx;
  color: var(--discover-loading-text);
  font-size: 22rpx;
}

@keyframes discover-data-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

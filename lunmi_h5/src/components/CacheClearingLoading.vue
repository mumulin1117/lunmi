<template>
  <view class="cache-loading" :style="theme_style">
    <view class="cache-loading__spinner" />
    <text>{{ $t('Clearing project cache...') }}</text>
  </view>
</template>
<script setup>
import theme from '@/config/theme.json'
const theme_style = { '--cache-loading-background': theme.colors.surface.scrim_soft, '--cache-loading-title': theme.colors.text.title, '--cache-loading-accent': theme.colors.button.primary }
</script>
<style scoped lang="scss">
.cache-loading {
  position: fixed;
  z-index: 1600;
  inset: 0;
  display: flex;
  gap: 24rpx;
  align-items: center;
  justify-content: center;
  background: var(--cache-loading-background);
  color: var(--cache-loading-title);
  flex-direction: column;
  font-size: 25rpx;
  font-weight: 800;
}

.cache-loading__spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid transparent;
  border-top-color: var(--cache-loading-accent);
  border-right-color: var(--cache-loading-accent);
  border-radius: 50%;
  animation: cache-spin .72s linear infinite;
}

@keyframes cache-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

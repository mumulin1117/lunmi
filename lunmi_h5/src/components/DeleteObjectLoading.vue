<template>
  <view class="delete-loading" :style="theme_style">
    <view class="delete-loading__spinner" />
    <text class="delete-loading__title">{{ $t(title) }}</text>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

defineProps({
  title: { type: String, default: 'Deleting...' }
})

const theme_style = {
  '--loading-background': theme.colors.surface.scrim_soft,
  '--loading-card': theme.colors.dialog.background,
  '--loading-title': theme.colors.text.title,
  '--loading-accent': theme.colors.status.danger
}
</script>

<style scoped lang="scss">
.delete-loading {
  position: fixed;
  z-index: 1400;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--loading-background);
}

.delete-loading::before {
  position: absolute;
  width: 260rpx;
  height: 180rpx;
  border-radius: 32rpx;
  background: var(--loading-card);
  content: '';
}

.delete-loading__spinner,
.delete-loading__title {
  position: relative;
  z-index: 1;
}

.delete-loading__spinner {
  width: 36rpx;
  height: 36rpx;
  border: 3px solid var(--loading-accent);
  border-right-color: transparent;
  border-radius: 50%;
  animation: delete-spin .8s linear infinite;
}

.delete-loading__title {
  margin-left: 16rpx;
  color: var(--loading-title);
  font-size: 28rpx;
  font-weight: 700;
}

@keyframes delete-spin {
  to { transform: rotate(360deg); }
}
</style>

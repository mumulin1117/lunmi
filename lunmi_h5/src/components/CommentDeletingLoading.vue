<template>
  <view class="comment-loading" :style="theme_style">
    <view class="comment-loading__spinner" />
    <text class="comment-loading__title">{{ $t('Deleting reply...') }}</text>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const theme_style = {
  '--loading-background': theme.colors.surface.scrim_soft,
  '--loading-card': theme.colors.dialog.background,
  '--loading-title': theme.colors.text.title,
  '--loading-accent': theme.colors.status.danger
}
</script>

<style scoped lang="scss">
.comment-loading {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--loading-background);
}

.comment-loading::before {
  position: absolute;
  width: 260rpx;
  height: 180rpx;
  border-radius: 32rpx;
  background: var(--loading-card);
  content: '';
}

.comment-loading__spinner,
.comment-loading__title {
  position: relative;
  z-index: 1;
}

.comment-loading__spinner {
  width: 58rpx;
  height: 58rpx;
  border: 6rpx solid transparent;
  border-top-color: var(--loading-accent);
  border-right-color: var(--loading-accent);
  border-radius: 50%;
  animation: comment-spin .72s linear infinite;
}

.comment-loading__title {
  position: absolute;
  margin-top: 106rpx;
  color: var(--loading-title);
  font-size: 24rpx;
  font-weight: 800;
}

@keyframes comment-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

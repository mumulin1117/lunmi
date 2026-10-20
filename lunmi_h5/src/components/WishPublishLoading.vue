<template>
  <view class="wish-loading" :style="theme_style">
    <view class="wish-loading__spinner" />
    <text class="wish-loading__title">{{ $t('Publishing wish...') }}</text>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const theme_style = {
  '--loading-background': theme.colors.surface.scrim_soft,
  '--loading-card': theme.colors.dialog.background,
  '--loading-title': theme.colors.text.title,
  '--loading-accent': theme.colors.button.primary
}
</script>

<style scoped lang="scss">
.wish-loading {
  position: fixed;
  z-index: 1350;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--loading-background);
}

.wish-loading::before {
  position: absolute;
  width: 280rpx;
  height: 180rpx;
  border-radius: 32rpx;
  background: var(--loading-card);
  content: '';
}

.wish-loading__spinner,
.wish-loading__title {
  position: relative;
  z-index: 1;
}

.wish-loading__spinner {
  width: 36rpx;
  height: 36rpx;
  border: 3px solid var(--loading-accent);
  border-right-color: transparent;
  border-radius: 50%;
  animation: wish-spin .8s linear infinite;
}

.wish-loading__title {
  margin-left: 16rpx;
  color: var(--loading-title);
  font-size: 28rpx;
  font-weight: 700;
}

@keyframes wish-spin {
  to { transform: rotate(360deg); }
}
</style>

<template>
  <view class="profile-saving-loading" :style="loading_style">
    <view class="profile-saving-loading__card">
      <view class="profile-saving-loading__spinner" />
      <text class="profile-saving-loading__title">{{ $t('Saving profile...') }}</text>
      <text class="profile-saving-loading__copy">{{ $t('Your updates are being applied.') }}</text>
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const loading_style = {
  '--profile-saving-background': theme.colors.page.background,
  '--profile-saving-title': theme.colors.text.title,
  '--profile-saving-secondary': theme.colors.text.secondary,
  '--profile-saving-accent': theme.colors.button.primary,
  '--profile-saving-overlay': theme.colors.surface.scrim_soft,
  '--profile-saving-border': theme.colors.surface.highlight_border,
  '--profile-saving-track': theme.colors.surface.highlight,
  '--profile-saving-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.profile-saving-loading {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--profile-saving-overlay);
  backdrop-filter: blur(8rpx);
}

.profile-saving-loading__card {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  padding: 44rpx 36rpx;
  border: 1rpx solid var(--profile-saving-border);
  border-radius: 36rpx;
  background: var(--profile-saving-background);
  box-shadow: 0 28rpx 80rpx var(--profile-saving-shadow);
  flex-direction: column;
}

.profile-saving-loading__spinner {
  width: 70rpx;
  height: 70rpx;
  border: 7rpx solid var(--profile-saving-track);
  border-top-color: var(--profile-saving-accent);
  border-right-color: var(--profile-saving-accent);
  border-radius: 50%;
  animation: profile-saving-spin .72s linear infinite;
}

.profile-saving-loading__title {
  display: block;
  margin-top: 28rpx;
  color: var(--profile-saving-title);
  font-size: 32rpx;
  font-weight: 800;
}

.profile-saving-loading__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--profile-saving-secondary);
  font-size: 24rpx;
  text-align: center;
}

@keyframes profile-saving-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

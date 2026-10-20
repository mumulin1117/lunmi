<template>
  <view class="welcome-brand-header">
    <text class="welcome-brand-header__title">{{ $t('Lunmi') }}</text>
  </view>
</template>

<style scoped lang="scss">
.welcome-brand-header {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 100%;
  padding: var(--page-safe-top) 52rpx 0;
  flex: none;
}

.welcome-brand-header__title {
  display: block;
  margin-top: 72rpx;
  color: var(--welcome-title-color);
  font-size: 84rpx;
  font-weight: 800;
  line-height: 96rpx;
  text-shadow: 0 8rpx 36rpx var(--welcome-copy-shadow);
}
</style>

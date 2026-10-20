<template>
  <view class="scooped-skeleton" aria-hidden="true">
    <view class="scooped-skeleton__row" />
    <view class="scooped-skeleton__row" />
    <view class="scooped-skeleton__row" />
  </view>
</template>

<style scoped lang="scss">
.scooped-skeleton__row {
  height: 148rpx;
  margin-top: 20rpx;
  border-radius: 32rpx;
  background: var(--scooped-skeleton);
}

.scooped-skeleton__row:first-child {
  margin-top: 0;
}
</style>

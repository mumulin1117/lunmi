<template>
  <view class="blocked-skeleton" aria-hidden="true">
    <view class="blocked-skeleton__row" />
    <view class="blocked-skeleton__row" />
  </view>
</template>

<style scoped lang="scss">
.blocked-skeleton__row {
  height: 148rpx;
  margin-top: 20rpx;
  border-radius: 32rpx;
  background: var(--blocked-skeleton);
}

.blocked-skeleton__row:first-child {
  margin-top: 0;
}
</style>

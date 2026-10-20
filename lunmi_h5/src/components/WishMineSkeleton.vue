<template>
  <view class="mine-skeleton" aria-hidden="true">
    <view class="mine-skeleton__card" />
    <view class="mine-skeleton__card" />
  </view>
</template>

<style scoped lang="scss">
.mine-skeleton__card {
  height: 360rpx;
  margin-top: 24rpx;
  border-radius: 36rpx;
  background: var(--mine-skeleton);
}

.mine-skeleton__card:first-child {
  margin-top: 0;
}
</style>

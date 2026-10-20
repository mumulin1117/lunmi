<template>
  <view class="sent-skeleton" aria-hidden="true">
    <view class="sent-skeleton__card" />
    <view class="sent-skeleton__card" />
  </view>
</template>

<style scoped lang="scss">
.sent-skeleton__card {
  height: 280rpx;
  margin-top: 24rpx;
  border-radius: 36rpx;
  background: var(--sent-skeleton);
}

.sent-skeleton__card:first-child {
  margin-top: 0;
}
</style>

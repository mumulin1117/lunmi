<template>
  <view class="detail-skeleton" aria-hidden="true">
    <view class="detail-skeleton__scene" />
    <view class="detail-skeleton__badge" />
    <view class="detail-skeleton__title" />
    <view class="detail-skeleton__copy" />
    <view class="detail-skeleton__row" />
    <view class="detail-skeleton__row" />
    <view class="detail-skeleton__notice" />
  </view>
</template>

<style scoped lang="scss">
.detail-skeleton {
  padding: 24rpx 36rpx 48rpx;
}

.detail-skeleton__scene {
  width: 100%;
  height: 480rpx;
  border-radius: 32rpx;
  background: var(--detail-skeleton);
}

.detail-skeleton__badge {
  width: 148rpx;
  height: 58rpx;
  margin-top: 28rpx;
  border-radius: 999rpx;
  background: var(--detail-skeleton);
}

.detail-skeleton__title {
  width: 72%;
  height: 48rpx;
  margin-top: 24rpx;
  border-radius: 12rpx;
  background: var(--detail-skeleton);
}

.detail-skeleton__copy {
  width: 100%;
  height: 180rpx;
  margin-top: 26rpx;
  border-radius: 46rpx;
  background: var(--detail-skeleton);
}

.detail-skeleton__row {
  width: 100%;
  height: 32rpx;
  margin-top: 28rpx;
  border-radius: 8rpx;
  background: var(--detail-skeleton);
}

.detail-skeleton__notice {
  width: 100%;
  height: 130rpx;
  margin-top: 32rpx;
  border-radius: 38rpx;
  background: var(--detail-skeleton);
}
</style>

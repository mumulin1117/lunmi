<template>
  <view class="detail-skeleton" aria-hidden="true">
    <view class="detail-skeleton__photo" />
    <view class="detail-skeleton__line" />
    <view class="detail-skeleton__line detail-skeleton__line--short" />
    <view class="detail-skeleton__reply" />
    <view class="detail-skeleton__reply" />
  </view>
</template>

<style scoped lang="scss">
.detail-skeleton__photo,
.detail-skeleton__line,
.detail-skeleton__reply {
  border-radius: 28rpx;
  background: var(--detail-skeleton);
}

.detail-skeleton__photo {
  height: 300rpx;
}

.detail-skeleton__line {
  height: 36rpx;
  margin-top: 24rpx;
}

.detail-skeleton__line--short {
  width: 56%;
}

.detail-skeleton__reply {
  height: 140rpx;
  margin-top: 20rpx;
}
</style>

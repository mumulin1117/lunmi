<template>
  <view class="account-skeleton" aria-hidden="true">
    <view class="account-skeleton__avatar" />
    <view class="account-skeleton__copy">
      <view class="account-skeleton__line" />
      <view class="account-skeleton__line account-skeleton__line--short" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.account-skeleton {
  display: flex;
  align-items: center;
}

.account-skeleton__avatar,
.account-skeleton__line {
  border-radius: 999rpx;
  background: var(--settings-skeleton);
}

.account-skeleton__avatar {
  width: 96rpx;
  height: 96rpx;
  flex: none;
  border-radius: 50%;
}

.account-skeleton__copy {
  min-width: 0;
  flex: 1;
  margin-left: 20rpx;
}

.account-skeleton__line {
  height: 28rpx;
}

.account-skeleton__line--short {
  width: 58%;
  margin-top: 14rpx;
}
</style>

<template>
  <view class="messages-skeleton" role="status" :aria-label="$t('Loading...')">
    <view class="messages-skeleton__notice" aria-hidden="true">
      <SkeletonBlock class="messages-skeleton__notice-icon" />
      <view class="messages-skeleton__copy">
        <SkeletonBlock class="messages-skeleton__title" />
        <SkeletonBlock class="messages-skeleton__preview" />
      </view>
      <SkeletonBlock class="messages-skeleton__arrow" />
    </view>
    <view class="messages-skeleton__filters" aria-hidden="true">
      <SkeletonBlock v-for="item in 4" :key="item" class="messages-skeleton__filter" />
    </view>
    <view v-for="item in 4" :key="item" class="messages-skeleton__row" aria-hidden="true">
      <SkeletonBlock class="messages-skeleton__avatar" />
      <view class="messages-skeleton__copy">
        <view class="messages-skeleton__headline">
          <SkeletonBlock class="messages-skeleton__name" />
          <SkeletonBlock class="messages-skeleton__time" />
        </view>
        <SkeletonBlock class="messages-skeleton__preview" />
        <SkeletonBlock class="messages-skeleton__status" />
      </view>
      <SkeletonBlock class="messages-skeleton__indicator" />
    </view>
  </view>
</template>

<script setup>
import SkeletonBlock from '@/components/SkeletonBlock.vue'
</script>

<style scoped lang="scss">
.messages-skeleton { pointer-events: none; }

.messages-skeleton__notice {
  display: flex;
  box-sizing: border-box;
  height: 150rpx;
  align-items: center;
  padding: 0 30rpx;
  border: 1px solid var(--messages-border);
  border-radius: 40rpx;
  background: var(--messages-card);
}

.messages-skeleton__notice-icon {
  width: 92rpx;
  height: 92rpx;
  border-radius: 28rpx;
}

.messages-skeleton__copy {
  min-width: 0;
  flex: 1;
  margin-left: 20rpx;
}

.messages-skeleton__title {
  width: 200rpx;
  height: 36rpx;
  border-radius: 10rpx;
}

.messages-skeleton__preview {
  width: 86%;
  height: 28rpx;
  margin-top: 8rpx;
  border-radius: 8rpx;
}

.messages-skeleton__arrow {
  width: 32rpx;
  height: 32rpx;
  margin-left: 8rpx;
  border-radius: 10rpx;
}

.messages-skeleton__filters {
  display: flex;
  margin: 24rpx 0 8rpx;
  overflow: hidden;
  gap: 16rpx;
}

.messages-skeleton__filter {
  width: 144rpx;
  height: 56rpx;
  border-radius: 999rpx;
}

.messages-skeleton__row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 24rpx;
  border: 1px solid var(--messages-border);
  border-radius: 44rpx;
  background: var(--messages-card);
}

.messages-skeleton__avatar {
  width: 116rpx;
  height: 116rpx;
  border-radius: 32rpx;
}

.messages-skeleton__headline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.messages-skeleton__name {
  width: 52%;
  height: 36rpx;
  border-radius: 10rpx;
}

.messages-skeleton__time {
  width: 72rpx;
  height: 26rpx;
  border-radius: 8rpx;
}

.messages-skeleton__status {
  width: 108rpx;
  height: 38rpx;
  margin-top: 16rpx;
  border-radius: 16rpx;
}

.messages-skeleton__indicator {
  width: 16rpx;
  height: 16rpx;
  margin-left: 16rpx;
  border-radius: 8rpx;
}
</style>

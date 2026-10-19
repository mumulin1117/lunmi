<template>
  <view class="profile-skeleton" role="status" :aria-label="$t('Loading...')">
    <view class="profile-skeleton__coin" aria-hidden="true">
      <SkeletonBlock class="profile-skeleton__coin-icon" />
      <view class="profile-skeleton__coin-copy">
        <SkeletonBlock class="profile-skeleton__amount" />
        <SkeletonBlock class="profile-skeleton__caption" />
      </view>
      <SkeletonBlock class="profile-skeleton__buy" />
    </view>
    <view class="profile-skeleton__grid" aria-hidden="true">
      <view v-for="item in 4" :key="item" class="profile-skeleton__tile">
        <SkeletonBlock class="profile-skeleton__icon" />
        <view class="profile-skeleton__tile-copy">
          <SkeletonBlock class="profile-skeleton__value" />
          <SkeletonBlock class="profile-skeleton__label" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import SkeletonBlock from '@/components/SkeletonBlock.vue'
</script>

<style scoped lang="scss">
.profile-skeleton { pointer-events: none; }

.profile-skeleton__coin {
  display: flex;
  box-sizing: border-box;
  height: 156rpx;
  align-items: center;
  padding: 0 28rpx 0 32rpx;
  border-radius: 44rpx;
  background: var(--profile-card);
  gap: 20rpx;
}

.profile-skeleton__coin-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
}

.profile-skeleton__coin-copy {
  min-width: 0;
  flex: 1;
}

.profile-skeleton__amount {
  width: 144rpx;
  height: 58rpx;
  border-radius: 12rpx;
}

.profile-skeleton__caption {
  width: 80%;
  height: 28rpx;
  margin-top: 4rpx;
  border-radius: 8rpx;
}

.profile-skeleton__buy {
  width: 148rpx;
  height: 64rpx;
  border-radius: 32rpx;
}

.profile-skeleton__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 24rpx;
}

.profile-skeleton__tile {
  display: flex;
  box-sizing: border-box;
  width: calc(50% - 10rpx);
  align-items: center;
  padding: 24rpx;
  border: 1px solid var(--profile-border);
  border-radius: 32rpx;
  background: var(--profile-card);
}

.profile-skeleton__icon {
  width: 56rpx;
  height: 56rpx;
  margin-right: 16rpx;
  border-radius: 16rpx;
}

.profile-skeleton__tile-copy {
  min-width: 0;
  flex: 1;
}

.profile-skeleton__value {
  width: 72rpx;
  height: 44rpx;
  border-radius: 10rpx;
}

.profile-skeleton__label {
  width: 100%;
  height: 28rpx;
  margin-top: 4rpx;
  border-radius: 8rpx;
}
</style>

<template>
  <view class="main-tab-skeleton" :class="`main-tab-skeleton--${type}`" :style="skeleton_style">
    <view v-if="type === 'home'" class="skeleton-home">
      <view class="skeleton-row skeleton-row--heading">
        <view class="skeleton skeleton-title" />
        <view class="skeleton skeleton-avatar" />
      </view>
      <view class="skeleton skeleton-subtitle" />
      <view class="skeleton skeleton-hero" />
      <view class="skeleton skeleton-section" />
      <view class="skeleton-row">
        <view v-for="item in 3" :key="item" class="skeleton skeleton-metric" />
      </view>
      <view class="skeleton skeleton-section" />
      <view v-for="item in 2" :key="`home-${item}`" class="skeleton skeleton-list-row" />
    </view>
    <view v-else-if="type === 'library'" class="skeleton-library">
      <view class="skeleton skeleton-title skeleton-title--large" />
      <view class="skeleton-row skeleton-filter-row">
        <view v-for="item in 4" :key="item" class="skeleton skeleton-filter" />
      </view>
      <view v-for="item in 4" :key="`library-${item}`" class="skeleton skeleton-library-card" />
    </view>
    <view v-else-if="type === 'wall' || type === 'videos'" class="skeleton-wall">
      <view class="skeleton-row skeleton-row--heading">
        <view class="skeleton skeleton-title skeleton-title--large" />
        <view class="skeleton skeleton-compose" />
      </view>
      <view class="skeleton-row skeleton-story-row">
        <view v-for="item in 4" :key="item" class="skeleton skeleton-story" />
      </view>
      <view v-for="item in 2" :key="`wall-${item}`" class="skeleton skeleton-post" />
    </view>
    <view v-else-if="type === 'messages'" class="skeleton-messages">
      <view class="skeleton skeleton-title skeleton-title--large" />
      <view v-for="item in 5" :key="`messages-${item}`" class="skeleton-row skeleton-message-row">
        <view class="skeleton skeleton-message-avatar" />
        <view class="skeleton-message-copy">
          <view class="skeleton skeleton-message-name" />
          <view class="skeleton skeleton-message-preview" />
        </view>
      </view>
    </view>
    <view v-else-if="type === 'discover'" class="skeleton-wall">
      <view class="skeleton-row skeleton-row--heading">
        <view class="skeleton skeleton-title skeleton-title--large" />
        <view class="skeleton skeleton-compose" />
      </view>
      <view v-for="item in 3" :key="`discover-${item}`" class="skeleton skeleton-post" />
    </view>
    <view v-else class="skeleton-profile">
      <view class="skeleton skeleton-label" />
      <view class="skeleton-row skeleton-profile-head">
        <view class="skeleton skeleton-profile-avatar" />
        <view>
          <view class="skeleton skeleton-name" />
          <view class="skeleton skeleton-subtitle" />
        </view>
      </view>
      <view class="skeleton skeleton-bio" />
      <view class="skeleton-row skeleton-stats">
        <view v-for="item in 3" :key="item" class="skeleton skeleton-stat" />
      </view>
      <view class="skeleton skeleton-button" />
      <view v-for="item in 3" :key="`profile-${item}`" class="skeleton skeleton-list-row" />
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

defineProps({ type: { type: String, default: 'home' } })

const skeleton_style = {
  '--skeleton-background': theme.colors.page.background,
  '--skeleton-fill': theme.colors.surface.card_soft,
  '--skeleton-shimmer': theme.colors.surface.border_soft,
  '--skeleton-border': theme.colors.surface.border_soft
}
</script>

<style scoped lang="scss">
.main-tab-skeleton {
  box-sizing: border-box;
  height: calc(100vh - var(--app-top-safe-area-height) - var(--app-main-tab-bar-height));
  overflow: hidden;
  padding: 28rpx 40rpx 150rpx;
  background: var(--skeleton-background);
}

.skeleton {
  position: relative;
  overflow: hidden;
  border-radius: 22rpx;
  background: var(--skeleton-fill);
}

.skeleton::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, var(--skeleton-shimmer), transparent);
  animation: skeleton-shimmer 1.05s linear infinite;
  content: '';
}

.skeleton-row {
  display: flex;
  gap: 16rpx;
}

.skeleton-row--heading {
  align-items: center;
  justify-content: space-between;
}

.skeleton-title {
  width: 348rpx;
  height: 54rpx;
}

.skeleton-title--large {
  width: 280rpx;
  height: 66rpx;
}

.skeleton-avatar,
.skeleton-compose {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
}

.skeleton-subtitle {
  width: 240rpx;
  height: 26rpx;
  margin-top: 18rpx;
}

.skeleton-hero {
  height: 310rpx;
  margin-top: 42rpx;
  border-radius: 36rpx;
}

.skeleton-section {
  width: 180rpx;
  height: 34rpx;
  margin-top: 46rpx;
}

.skeleton-metric {
  flex: 1;
  height: 132rpx;
  margin-top: 20rpx;
}

.skeleton-list-row {
  height: 118rpx;
  margin-top: 18rpx;
}

.skeleton-filter-row {
  margin: 42rpx 0 28rpx;
}

.skeleton-filter {
  width: 120rpx;
  height: 54rpx;
  flex: 0 0 120rpx;
  border-radius: 28rpx;
}

.skeleton-library-card {
  height: 144rpx;
  margin-top: 18rpx;
  border-radius: 30rpx;
}

.skeleton-message-row {
  align-items: center;
  margin-top: 34rpx;
  gap: 26rpx;
}

.skeleton-message-avatar {
  width: 104rpx;
  height: 104rpx;
  flex: 0 0 104rpx;
  border-radius: 52rpx;
}

.skeleton-message-copy {
  flex: 1;
}

.skeleton-message-name {
  width: 240rpx;
  height: 34rpx;
}

.skeleton-message-preview {
  width: 420rpx;
  height: 28rpx;
  margin-top: 16rpx;
}

.skeleton-story-row {
  margin: 42rpx 0 34rpx;
}

.skeleton-story {
  width: 88rpx;
  height: 88rpx;
  flex: 0 0 88rpx;
  border-radius: 44rpx;
}

.skeleton-post {
  height: 280rpx;
  margin-top: 20rpx;
  border-radius: 32rpx;
}

.skeleton-label {
  width: 144rpx;
  height: 24rpx;
}

.skeleton-profile-head {
  align-items: center;
  margin-top: 40rpx;
}

.skeleton-profile-avatar {
  width: 128rpx;
  height: 128rpx;
  flex: 0 0 128rpx;
  border-radius: 42rpx;
}

.skeleton-name {
  width: 210rpx;
  height: 46rpx;
}

.skeleton-bio {
  width: 100%;
  height: 70rpx;
  margin-top: 30rpx;
}

.skeleton-stats {
  margin-top: 36rpx;
  padding: 30rpx 16rpx;
  border-top: 1rpx solid var(--skeleton-border);
  border-bottom: 1rpx solid var(--skeleton-border);
}

.skeleton-stat {
  height: 58rpx;
  flex: 1;
}

.skeleton-button {
  height: 92rpx;
  margin-top: 28rpx;
  border-radius: 26rpx;
}

@keyframes skeleton-shimmer {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
</style>

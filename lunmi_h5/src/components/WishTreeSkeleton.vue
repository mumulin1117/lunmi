<template>
  <view class="wish-count-skeleton" role="status" :aria-label="$t('Loading...')">
    <SkeletonBlock :class="`wish-count-skeleton__${variant}`" />
  </view>
</template>

<script setup>
import SkeletonBlock from '@/components/SkeletonBlock.vue'

defineProps({ variant: { type: String, default: 'stat' } })
</script>

<style scoped lang="scss">
.wish-count-skeleton {
  display: inline-flex;
  flex: none;
}

.wish-count-skeleton__stat {
  width: 168rpx;
  height: 74rpx;
  border-radius: 16rpx;
}

.wish-count-skeleton__find {
  width: 96rpx;
  height: 40rpx;
  border-radius: 14rpx;
}
</style>

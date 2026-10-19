<template>
  <view class="scoop-count-skeleton" role="status" :aria-label="$t('Loading...')">
    <SkeletonBlock class="scoop-count-skeleton__block" />
  </view>
</template>

<script setup>
import SkeletonBlock from '@/components/SkeletonBlock.vue'
</script>

<style scoped lang="scss">
.scoop-count-skeleton {
  display: inline-flex;
  flex: none;
}

.scoop-count-skeleton__block {
  width: 96rpx;
  height: 40rpx;
  border-radius: 14rpx;
}
</style>

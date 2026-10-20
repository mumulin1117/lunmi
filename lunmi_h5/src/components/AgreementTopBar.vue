<template>
  <view class="agreement-top-bar">
    <image class="agreement-top-bar__back" role="button" :aria-label="$t('Go back')" @click="emit('back')" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
    <view v-if="title" class="agreement-top-bar__copy">
      <text class="agreement-top-bar__title">{{ $t(title) }}</text>
      <view class="agreement-top-bar__mark" />
    </view>
  </view>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['back'])
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.agreement-top-bar {
  position: relative;
  z-index: 1;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  align-items: flex-start;
  padding: var(--page-safe-top) 32rpx 12rpx;
  flex: none;
  gap: 20rpx;
}

.agreement-top-bar__back {
  @include page_back.button;
}

.agreement-top-bar__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  padding-top: 8rpx;
}

.agreement-top-bar__title {
  color: var(--agreement-title-color);
  font-size: 44rpx;
  font-weight: 800;
  line-height: 56rpx;
}

.agreement-top-bar__mark {
  width: 56rpx;
  height: 6rpx;
  margin-top: 8rpx;
  border-radius: 999rpx;
  background: var(--agreement-accent-color);
}
</style>

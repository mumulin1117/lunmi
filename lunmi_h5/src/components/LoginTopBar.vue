<template>
  <view class="login-top-bar">
    <image class="login-top-bar__back" role="button" :aria-label="$t('Go back')" @click="emit('back')" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
  </view>
</template>

<script setup>
const emit = defineEmits(['back'])
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.login-top-bar {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 100%;
  padding: var(--page-safe-top) 32rpx 0;
  flex: none;
}

.login-top-bar__back {
  @include page_back.button;
}
</style>

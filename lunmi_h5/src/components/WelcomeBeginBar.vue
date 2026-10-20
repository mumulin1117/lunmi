<template>
  <view class="welcome-begin-bar">
    <view class="welcome-begin-bar__button" role="button" @click="emit('begin')">
      <text class="welcome-begin-bar__label">{{ $t('Begin') }}</text>
    </view>
  </view>
</template>

<script setup>
const emit = defineEmits(['begin'])
</script>

<style scoped lang="scss">
.welcome-begin-bar {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 100%;
  padding: 24rpx 52rpx var(--page-safe-bottom);
  flex: none;
}

.welcome-begin-bar__button {
  display: flex;
  height: 112rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--welcome-button-background);
}

.welcome-begin-bar__label {
  color: var(--welcome-button-text);
  font-size: 34rpx;
  font-weight: 800;
  line-height: 40rpx;
}
</style>

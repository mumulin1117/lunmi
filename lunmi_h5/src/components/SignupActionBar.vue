<template>
  <view class="signup-action-bar">
    <view
      class="signup-action-bar__button"
      :class="{ 'signup-action-bar__button--disabled': disabled }"
      role="button"
      :aria-disabled="disabled"
      @click="emit('create')"
    >
      <text class="signup-action-bar__label">{{ $t('Create') }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['create'])
</script>

<style scoped lang="scss">
.signup-action-bar {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 100%;
  padding: 0 40rpx var(--page-safe-bottom);
  flex: none;
}

.signup-action-bar__button {
  display: flex;
  height: 112rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--signup-button-background);
}

.signup-action-bar__button--disabled {
  opacity: 0.68;
  pointer-events: none;
}

.signup-action-bar__label {
  color: var(--signup-button-text);
  font-size: 34rpx;
  font-weight: 800;
  line-height: 40rpx;
}
</style>

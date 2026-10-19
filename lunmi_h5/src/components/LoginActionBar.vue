<template>
  <view class="login-action-bar">
    <view
      class="login-action-bar__primary"
      :class="{ 'login-action-bar__primary--disabled': disabled }"
      role="button"
      :aria-disabled="disabled"
      @click="emit('sign-in')"
    >
      <text class="login-action-bar__primary-label">{{ $t('Sign in') }}</text>
    </view>
    <view class="login-action-bar__secondary" role="button" @click="emit('create-account')">
      <text class="login-action-bar__secondary-label">{{ $t('Create account') }}</text>
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

const emit = defineEmits(['sign-in', 'create-account'])
</script>

<style scoped lang="scss">
.login-action-bar {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 100%;
  padding: 0 40rpx var(--page-safe-bottom);
  flex: none;
}

.login-action-bar__primary,
.login-action-bar__secondary {
  display: flex;
  height: 112rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
}

.login-action-bar__primary {
  background: var(--login-button-background);
}

.login-action-bar__primary--disabled {
  opacity: 0.68;
  pointer-events: none;
}

.login-action-bar__primary-label {
  color: var(--login-button-text);
  font-size: 34rpx;
  font-weight: 800;
  line-height: 40rpx;
}

.login-action-bar__secondary {
  margin-top: 20rpx;
  border: 1px solid var(--login-ghost-border);
  background-color: #2F4162;
}

.login-action-bar__secondary-label {
  color: var(--login-ghost-text);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 40rpx;
}
</style>

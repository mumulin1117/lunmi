<template>
  <view class="setup-action-bar">
    <view
      class="setup-action-bar__skip"
      :class="{ 'setup-action-bar__skip--disabled': disabled }"
      role="button"
      :aria-disabled="disabled"
      @click="emit('skip')"
    >
      <text class="setup-action-bar__skip-label">{{ $t('Skip') }}</text>
    </view>
    <view
      class="setup-action-bar__save"
      :class="{ 'setup-action-bar__save--disabled': disabled }"
      role="button"
      :aria-disabled="disabled"
      @click="emit('save')"
    >
      <text class="setup-action-bar__save-label">{{ $t('Save') }}</text>
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

const emit = defineEmits(['skip', 'save'])
</script>

<style scoped lang="scss">
.setup-action-bar {
  position: relative;
  z-index: 1;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  align-items: center;
  padding: 12rpx 40rpx var(--page-safe-bottom);
  flex: none;
  gap: 20rpx;
}

.setup-action-bar__skip,
.setup-action-bar__save {
  display: flex;
  height: 112rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
}

.setup-action-bar__skip {
  width: 220rpx;
  border: 1px solid var(--setup-ghost-border);
  background: var(--setup-ghost-background);
  flex: none;
}

.setup-action-bar__skip--disabled,
.setup-action-bar__save--disabled {
  opacity: 0.68;
  pointer-events: none;
}

.setup-action-bar__skip-label {
  color: var(--setup-ghost-text);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 40rpx;
}

.setup-action-bar__save {
  min-width: 0;
  background: var(--setup-button-background);
  flex: 1;
}

.setup-action-bar__save-label {
  color: var(--setup-button-text);
  font-size: 34rpx;
  font-weight: 800;
  line-height: 40rpx;
}
</style>

<template>
  <transition name="dialog-pop">
    <view v-if="visible" class="dialog-layer" :style="dialog_style" @click="cancel">
      <view class="dialog-card" @click.stop>
        <text class="dialog-eyebrow">{{ $t('IRREVERSIBLE ACTION') }}</text>
        <text class="dialog-title">{{ $t('Delete account?') }}</text>
        <text class="dialog-copy">{{ $t('Your account will be marked as deleted and you will no longer be able to sign in with it.') }}</text>
        <text v-if="error" class="dialog-error" role="alert">{{ $t(error) }}</text>
        <view class="dialog-actions">
          <view class="dialog-button dialog-button--secondary" role="button" :aria-disabled="pending" @click="cancel">{{ $t('Keep account') }}</view>
          <view class="dialog-button dialog-button--danger" role="button" :aria-disabled="pending" @click="confirm">{{ $t(pending ? 'Deleting...' : 'Delete account') }}</view>
        </view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import theme from '@/config/theme.json'
const props = defineProps({
  visible: { type: Boolean, default: false },
  pending: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['cancel', 'confirm'])
const cancel = () => {
  if (!props.pending) emit('cancel')
}
const confirm = () => {
  if (!props.pending) emit('confirm')
}
const dialog_style = {
  '--dialog-background': theme.colors.dialog.background,
  '--dialog-border': theme.colors.dialog.border,
  '--dialog-title-color': theme.colors.text.title,
  '--dialog-secondary-color': theme.colors.text.secondary,
  '--dialog-danger-background': theme.colors.dialog.danger.background,
  '--dialog-danger-text': theme.colors.dialog.danger.text,
  '--dialog-cancel-background': theme.colors.dialog.cancel.background,
  '--dialog-cancel-border': theme.colors.dialog.cancel.border,
  '--dialog-cancel-text': theme.colors.dialog.cancel.text,
  '--dialog-scrim': theme.colors.surface.scrim,
  '--dialog-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.dialog-layer {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--dialog-scrim);
}

.dialog-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 620rpx;
  padding: 44rpx 36rpx 36rpx;
  border: 1px solid var(--dialog-border);
  border-radius: 36rpx;
  background: var(--dialog-background);
  box-shadow: 0 28rpx 80rpx var(--dialog-shadow);
  will-change: opacity, transform;
}

.dialog-eyebrow {
  color: var(--dialog-danger-background);
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.dialog-title {
  display: block;
  margin-top: 18rpx;
  color: var(--dialog-title-color);
  font-size: 44rpx;
  font-weight: 900;
}

.dialog-copy {
  display: block;
  margin-top: 20rpx;
  color: var(--dialog-secondary-color);
  font-size: 27rpx;
  line-height: 1.52;
}

.dialog-error {
  display: block;
  margin-top: 16rpx;
  color: var(--dialog-danger-background);
  font-size: 24rpx;
  line-height: 34rpx;
}

.dialog-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 38rpx;
}

.dialog-button {
  display: flex;
  height: 88rpx;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  flex: 1;
  font-size: 25rpx;
  font-weight: 800;
  line-height: 88rpx;
  text-align: center;
}

.dialog-button--secondary {
  border: 1px solid var(--dialog-cancel-border);
  background: var(--dialog-cancel-background);
  color: var(--dialog-cancel-text);
}

.dialog-button--danger {
  background: var(--dialog-danger-background);
  color: var(--dialog-danger-text);
}

.dialog-pop-enter-active {
  transition: opacity .28s ease-out;
}

.dialog-pop-enter-active .dialog-card {
  transition: transform .28s cubic-bezier(.34, 1.4, .64, 1);
}

.dialog-pop-leave-active {
  transition: opacity .2s ease-in;
}

.dialog-pop-leave-active .dialog-card {
  transition: transform .2s ease-in;
}

.dialog-pop-enter-from,
.dialog-pop-leave-to {
  opacity: 0;
}

.dialog-pop-enter-from .dialog-card {
  transform: scale(.92);
}

.dialog-pop-leave-to .dialog-card {
  transform: scale(.95);
}
</style>

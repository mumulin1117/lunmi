<template>
  <transition name="dialog-pop">
    <view v-if="visible" class="dialog-layer" :style="dialog_style" @click="cancel">
      <view class="dialog-card" @click.stop>
        <text class="dialog-eyebrow">{{ $t('ACCOUNT') }}</text>
        <text class="dialog-title">{{ $t('Log out?') }}</text>
        <text class="dialog-copy">{{ $t('Are you sure you want to log out of your account on this device?') }}</text>
        <text v-if="error" class="dialog-error" role="alert">{{ $t(error) }}</text>
        <view class="dialog-actions">
          <view
            class="dialog-button dialog-button--secondary"
            :class="{ 'dialog-button--disabled': pending }"
            role="button"
            :aria-disabled="pending"
            @click="cancel"
          >{{ $t('Stay signed in') }}</view>
          <view
            class="dialog-button dialog-button--primary"
            :class="{ 'dialog-button--disabled': pending }"
            role="button"
            :aria-disabled="pending"
            @click="confirm"
          >{{ $t('Log out') }}</view>
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
  if (props.pending) return
  emit('cancel')
}
const confirm = () => {
  if (props.pending) return
  emit('confirm')
}
const dialog_style = {
  '--dialog-background': theme.colors.dialog.background,
  '--dialog-border': theme.colors.dialog.border,
  '--dialog-title-color': theme.colors.text.title,
  '--dialog-secondary-color': theme.colors.text.secondary,
  '--dialog-error-color': theme.colors.status.danger,
  '--dialog-primary-color': theme.colors.dialog.confirm.background,
  '--dialog-primary-text-color': theme.colors.dialog.confirm.text,
  '--dialog-cancel-background': theme.colors.dialog.cancel.background,
  '--dialog-cancel-border': theme.colors.dialog.cancel.border,
  '--dialog-cancel-text': theme.colors.dialog.cancel.text,
  '--dialog-scrim': theme.colors.surface.scrim_soft,
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
  color: var(--dialog-primary-color);
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
  color: var(--dialog-error-color);
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

.dialog-button--primary {
  background: var(--dialog-primary-color);
  color: var(--dialog-primary-text-color);
}

.dialog-button--disabled {
  opacity: .5;
  pointer-events: none;
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

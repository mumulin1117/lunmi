<template>
  <transition name="dialog-pop">
    <view
      v-if="visible"
      class="dialog-layer"
      :style="dialog_style"
      @click="emit_cancel"
    >
      <view class="dialog-card" @click.stop>
        <view v-if="icon" class="dialog-icon">
          <image src="/static/icon/room_close.png" mode="aspectFit" />
        </view>
        <text v-if="eyebrow" class="dialog-eyebrow">{{ $t(eyebrow) }}</text>
        <text class="dialog-title">{{ $t(title) }}</text>
        <text v-if="copy" class="dialog-copy">{{ $t(copy) }}</text>
        <text v-if="error" class="dialog-error" role="alert">{{ $t(error) }}</text>
        <view class="dialog-actions">
          <view
            v-if="!hideCancel"
            class="dialog-button dialog-button--secondary"
            role="button"
            :aria-disabled="pending"
            @click="emit_cancel"
          >
            {{ $t(cancelLabel) }}
          </view>
          <view
            class="dialog-button"
            :class="confirmKind === 'danger' ? 'dialog-button--danger' : 'dialog-button--primary'"
            role="button"
            :aria-disabled="pending"
            @click="emit_confirm"
          >
            {{ $t(confirmLabel) }}
          </view>
        </view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import theme from '@/config/theme.json'

const props = defineProps({
  visible: { type: Boolean, default: false },
  eyebrow: { type: String, default: '' },
  title: { type: String, default: '' },
  copy: { type: String, default: '' },
  error: { type: String, default: '' },
  icon: { type: String, default: '' },
  confirmLabel: { type: String, default: 'OK' },
  cancelLabel: { type: String, default: 'Cancel' },
  confirmKind: { type: String, default: 'primary' },
  hideCancel: { type: Boolean, default: false },
  pending: { type: Boolean, default: false }
})
const emit = defineEmits(['cancel', 'confirm'])
const dialog_style = {
  '--dialog-background': theme.colors.dialog.background,
  '--dialog-border': theme.colors.dialog.border,
  '--dialog-title': theme.colors.text.title,
  '--dialog-secondary': theme.colors.text.secondary,
  '--dialog-primary-background': theme.colors.dialog.confirm.background,
  '--dialog-primary-text': theme.colors.dialog.confirm.text,
  '--dialog-danger': theme.colors.dialog.danger.background,
  '--dialog-danger-text': theme.colors.dialog.danger.text,
  '--dialog-cancel-border': theme.colors.dialog.cancel.border,
  '--dialog-cancel-text': theme.colors.dialog.cancel.text,
  '--dialog-scrim': theme.colors.surface.scrim,
  '--dialog-shadow': theme.colors.surface.shadow,
  '--dialog-error': theme.colors.status.danger
}

const emit_cancel = () => {
  if (props.pending) return
  emit('cancel')
}

const emit_confirm = () => {
  if (props.pending) return
  emit('confirm')
}
</script>

<style scoped lang="scss">
.dialog-layer {
  position: fixed;
  z-index: 1250;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 28rpx 48rpx;
  background: var(--dialog-scrim);
}

.dialog-card {
  box-sizing: border-box;
  width: 100%;
  padding: 48rpx 36rpx 36rpx;
  border: 1px solid var(--dialog-border);
  border-radius: 40rpx;
  background: var(--dialog-background);
  box-shadow: 0 24rpx 72rpx var(--dialog-shadow);
  text-align: center;
  will-change: opacity, transform;
}

.dialog-icon {
  display: flex;
  width: 120rpx;
  height: 120rpx;
  align-items: center;
  justify-content: center;
  margin: 0 auto 28rpx;
  // border: 1px solid var(--dialog-danger);
  // border-radius: 60rpx;
}

.dialog-icon image {
  width: 120rpx;
  height: 120rpx;
}

.dialog-eyebrow {
  color: var(--dialog-secondary);
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.dialog-title {
  display: block;
  color: var(--dialog-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 52rpx;
}

.dialog-copy {
  display: block;
  margin-top: 16rpx;
  color: var(--dialog-secondary);
  font-size: 26rpx;
  line-height: 38rpx;
}

.dialog-error {
  display: block;
  margin-top: 16rpx;
  color: var(--dialog-error);
  font-size: 24rpx;
  line-height: 34rpx;
}

.dialog-actions {
  display: flex;
  margin-top: 36rpx;
}

.dialog-button {
  display: flex;
  height: 88rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 88rpx;
}

.dialog-button--secondary {
  margin-right: 20rpx;
  border: 1px solid var(--dialog-cancel-border);
  background: transparent;
  color: var(--dialog-cancel-text);
}

.dialog-button--primary {
  background: var(--dialog-primary-background);
  color: var(--dialog-primary-text);
}

.dialog-button--danger {
  border: 1px solid var(--dialog-danger);
  background: transparent;
  color: var(--dialog-danger);
}

.dialog-pop-enter-active,
.dialog-pop-leave-active {
  transition: opacity .28s ease;
}

.dialog-pop-enter-active .dialog-card,
.dialog-pop-leave-active .dialog-card {
  transition: transform .28s cubic-bezier(.33, 1, .68, 1);
}

.dialog-pop-enter-from,
.dialog-pop-leave-to {
  opacity: 0;
}

.dialog-pop-enter-from .dialog-card,
.dialog-pop-leave-to .dialog-card {
  transform: translateY(48rpx);
}
</style>

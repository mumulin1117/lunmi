<template>
  <transition name="dialog-pop">
    <view v-if="visible" class="dialog-layer" :style="dialog_style" @click="emit('cancel')">
      <view class="dialog-card" @click.stop>
        <text class="dialog-eyebrow">{{ $t('SAFETY') }}</text>
        <text class="dialog-title">{{ $t('Unblock') }} {{ targetName || $t('this user') }}?</text>
        <text class="dialog-copy">{{ $t('Their posts, replies and conversations will be visible again.') }}</text>
        <view class="dialog-actions">
          <view class="dialog-button dialog-button--secondary" role="button" @click="emit('cancel')">{{ $t('Cancel') }}</view>
          <view class="dialog-button dialog-button--primary" role="button" @click="emit('confirm', targetUserId)">{{ $t('Unblock') }}</view>
        </view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import theme from '@/config/theme.json'

defineProps({
  visible: { type: Boolean, default: false },
  targetName: { type: String, default: '' },
  targetUserId: { type: [String, Number], default: '' }
})
const emit = defineEmits(['cancel', 'confirm'])
const dialog_style = {
  '--dialog-background': theme.colors.dialog.background,
  '--dialog-border': theme.colors.dialog.border,
  '--dialog-title-color': theme.colors.text.title,
  '--dialog-secondary-color': theme.colors.text.secondary,
  '--dialog-primary-color': theme.colors.dialog.confirm.background,
  '--dialog-primary-text-color': theme.colors.dialog.confirm.text,
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
  z-index: 1250;
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
  font-size: 42rpx;
  font-weight: 800;
}

.dialog-copy {
  display: block;
  margin-top: 20rpx;
  color: var(--dialog-secondary-color);
  font-size: 26rpx;
  line-height: 39rpx;
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

.dialog-pop-enter-active,
.dialog-pop-leave-active {
  transition: opacity .24s ease;
}

.dialog-pop-enter-active .dialog-card,
.dialog-pop-leave-active .dialog-card {
  transition: transform .24s ease;
}

.dialog-pop-enter-from,
.dialog-pop-leave-to {
  opacity: 0;
}

.dialog-pop-enter-from .dialog-card,
.dialog-pop-leave-to .dialog-card {
  transform: scale(.94);
}
</style>

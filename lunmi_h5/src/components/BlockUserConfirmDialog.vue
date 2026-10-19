<template>
  <transition name="block-dialog-pop">
    <view v-if="visible" class="block-dialog-layer" :style="dialog_style" @click="emit('cancel')">
      <view class="block-dialog-card" @click.stop>
        <text class="block-dialog-eyebrow">{{ $t('SAFETY') }}</text>
        <text class="block-dialog-title">{{ $t('Block') }} {{ targetName || $t('this user') }}?</text>
        <text class="block-dialog-copy">{{ $t('Their posts, replies and conversations will be hidden until you unblock them.') }}</text>
        <view class="block-dialog-actions">
          <view class="block-dialog-button block-dialog-button--secondary" role="button" @click="emit('cancel')">{{ $t('Cancel') }}</view>
          <view class="block-dialog-button block-dialog-button--danger" role="button" @click="emit('confirm', targetUserId)">{{ $t('Block') }}</view>
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
  '--block-dialog-surface': theme.colors.dialog.background,
  '--block-dialog-border': theme.colors.dialog.border,
  '--block-dialog-title': theme.colors.text.title,
  '--block-dialog-secondary': theme.colors.text.secondary,
  '--block-dialog-danger': theme.colors.dialog.danger.background,
  '--block-dialog-danger-text': theme.colors.dialog.danger.text,
  '--block-dialog-cancel': theme.colors.dialog.cancel.background,
  '--block-dialog-cancel-border': theme.colors.dialog.cancel.border,
  '--block-dialog-scrim': theme.colors.surface.scrim,
  '--block-dialog-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.block-dialog-layer {
  position: fixed;
  z-index: 1250;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--block-dialog-scrim);
}

.block-dialog-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 620rpx;
  padding: 44rpx 36rpx 36rpx;
  border: 1rpx solid var(--block-dialog-border);
  border-radius: 36rpx;
  background: var(--block-dialog-surface);
  box-shadow: 0 28rpx 80rpx var(--block-dialog-shadow);
}

.block-dialog-eyebrow {
  color: var(--block-dialog-danger);
  font-size: 20rpx;
  font-weight: 800 !important;
  letter-spacing: 2rpx;
}

.block-dialog-title {
  display: block;
  margin-top: 18rpx;
  color: var(--block-dialog-title);
  font-size: 42rpx;
  font-weight: 800 !important;
}

.block-dialog-copy {
  display: block;
  margin-top: 20rpx;
  color: var(--block-dialog-secondary);
  font-size: 26rpx;
  line-height: 39rpx;
}

.block-dialog-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 38rpx;
}

.block-dialog-button {
  display: flex;
  height: 88rpx;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  flex: 1;
  font-size: 25rpx;
  font-weight: 800 !important;
}

.block-dialog-button--secondary {
  border: 1rpx solid var(--block-dialog-cancel-border);
  background: var(--block-dialog-cancel);
  color: var(--block-dialog-title);
}

.block-dialog-button--danger {
  background: var(--block-dialog-danger);
  color: var(--block-dialog-danger-text);
}

.block-dialog-pop-enter-active,
.block-dialog-pop-leave-active { transition: opacity .24s ease; }

.block-dialog-pop-enter-active .block-dialog-card,
.block-dialog-pop-leave-active .block-dialog-card { transition: transform .24s ease; }

.block-dialog-pop-enter-from,
.block-dialog-pop-leave-to { opacity: 0; }

.block-dialog-pop-enter-from .block-dialog-card,
.block-dialog-pop-leave-to .block-dialog-card { transform: scale(.94); }
</style>

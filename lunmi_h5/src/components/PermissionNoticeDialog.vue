<template>
  <transition name="dialog-pop">
    <view v-if="visible" class="dialog-layer" :style="dialog_style" @click="emit('close')">
      <view class="dialog-card" role="alertdialog" :aria-label="$t(title)" @click.stop>
        <text class="dialog-title">{{ $t(title) }}</text>
        <text class="dialog-copy">{{ $t(message) }}</text>
        <view class="dialog-button" role="button" @click="emit('close')">{{ $t('OK') }}</view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import theme from '@/config/theme.json'

defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' }
})
const emit = defineEmits(['close'])
const dialog_style = {
  '--dialog-background': theme.colors.dialog.background,
  '--dialog-border': theme.colors.dialog.border,
  '--dialog-title-color': theme.colors.text.title,
  '--dialog-secondary-color': theme.colors.text.secondary,
  '--dialog-primary-color': theme.colors.dialog.confirm.background,
  '--dialog-primary-text-color': theme.colors.dialog.confirm.text,
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
}

.dialog-title {
  display: block;
  color: var(--dialog-title-color);
  font-size: 40rpx;
  font-weight: 900;
}

.dialog-copy {
  display: block;
  margin-top: 20rpx;
  color: var(--dialog-secondary-color);
  font-size: 27rpx;
  line-height: 40rpx;
}

.dialog-button {
  height: 88rpx;
  margin-top: 36rpx;
  border-radius: 24rpx;
  background: var(--dialog-primary-color);
  color: var(--dialog-primary-text-color);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 88rpx;
  text-align: center;
}

.dialog-pop-enter-active,
.dialog-pop-leave-active {
  transition: opacity .2s ease;
}

.dialog-pop-enter-from,
.dialog-pop-leave-to {
  opacity: 0;
}
</style>

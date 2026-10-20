<template>
  <transition name="dialog-pop">
    <view
      v-if="visible"
      class="dialog-layer"
      :style="dialog_style"
    >
      <view class="dialog-card">
        <text class="dialog-eyebrow">{{ $t('WISH TREE') }}</text>
        <text class="dialog-title">{{ $t(title) }}</text>
        <text class="dialog-copy">{{ $t(copy) }}</text>
        <view
          class="dialog-button dialog-button--primary"
          role="button"
          @click="dismiss"
        >
          <text>{{ $t('OK') }}</text>
        </view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import theme from '@/config/theme.json'
import {
  WISH_PUBLISHED_DIALOG_COPY,
  WISH_PUBLISHED_DIALOG_TITLE
} from '@/utils/wishSheetPresentation'

defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: WISH_PUBLISHED_DIALOG_TITLE },
  copy: { type: String, default: WISH_PUBLISHED_DIALOG_COPY }
})

const emit = defineEmits(['dismiss'])

const dialog_style = {
  '--dialog-background': theme.colors.dialog.background,
  '--dialog-border': theme.colors.dialog.border,
  '--dialog-title-color': theme.colors.text.title,
  '--dialog-secondary-color': theme.colors.text.secondary,
  '--dialog-eyebrow-color': theme.colors.status.coin,
  '--dialog-primary-color': theme.colors.dialog.confirm.background,
  '--dialog-primary-text-color': theme.colors.dialog.confirm.text,
  '--dialog-shadow': theme.colors.surface.shadow
}

const dismiss = () => {
  emit('dismiss')
}
</script>

<style scoped lang="scss">
.dialog-layer {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: transparent;
  pointer-events: none;
}

.dialog-card {
  box-sizing: border-box;
  width: 620rpx;
  max-width: 100%;
  padding: 44rpx 36rpx 36rpx;
  border: 1px solid var(--dialog-border);
  border-radius: 36rpx;
  background: var(--dialog-background);
  box-shadow: 0 28rpx 80rpx var(--dialog-shadow);
  pointer-events: auto;
  will-change: opacity, transform;
}

.dialog-eyebrow {
  color: var(--dialog-eyebrow-color);
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.dialog-title {
  display: block;
  margin-top: 18rpx;
  color: var(--dialog-title-color);
  font-size: 44rpx;
  font-weight: 800;
}

.dialog-copy {
  display: block;
  margin-top: 20rpx;
  color: var(--dialog-secondary-color);
  font-size: 26rpx;
  line-height: 40rpx;
}

.dialog-button {
  display: flex;
  height: 88rpx;
  margin-top: 38rpx;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  font-size: 28rpx;
  font-weight: 800;
}

.dialog-button--primary {
  background: var(--dialog-primary-color);
  color: var(--dialog-primary-text-color);
}

.dialog-pop-enter-active .dialog-card {
  transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.28s ease-out;
}

.dialog-pop-leave-active .dialog-card {
  transition: transform 0.2s ease-in, opacity 0.2s ease-in;
}

.dialog-pop-enter-from .dialog-card,
.dialog-pop-leave-to .dialog-card {
  opacity: 0;
  transform: scale(0.92);
}
</style>

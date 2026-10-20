<template>
  <transition name="dialog-pop">
    <view v-if="dialog.visible" class="dialog-layer" :style="theme_style" role="alertdialog" @click="close_api_error_dialog">
      <view class="dialog-card" @click.stop>
        <text class="dialog-eyebrow">{{ $t('Notice') }}</text>
        <text class="dialog-title">{{ $t(dialog.title) }}</text>
        <text class="dialog-copy">{{ $t(dialog.message) }}</text>
        <view class="dialog-actions">
          <view class="dialog-button dialog-button--primary" role="button" @click="close_api_error_dialog">{{ $t('OK') }}</view>
        </view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import theme from '@/config/theme.json'
import { api_error_dialog as dialog, close_api_error_dialog } from '@/utils/apiFeedback'

const theme_style = {
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
  z-index: 2100;
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
  border: 1rpx solid var(--dialog-border);
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

.dialog-button--primary {
  background: var(--dialog-primary-color);
  color: var(--dialog-primary-text-color);
}

.dialog-pop-enter-active {
  transition: opacity .2s ease;
}

.dialog-pop-leave-active {
  transition: opacity .45s ease;
}

.dialog-pop-enter-active .dialog-card,
.dialog-pop-leave-active .dialog-card {
  transition: transform .2s ease;
}

.dialog-pop-enter-from,
.dialog-pop-leave-to {
  opacity: 0;
}

.dialog-pop-enter-from .dialog-card,
.dialog-pop-leave-to .dialog-card {
  transform: scale(.95);
}
</style>

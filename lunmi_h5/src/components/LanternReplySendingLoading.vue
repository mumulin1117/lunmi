<template>
  <view v-if="visible" class="reply-sending" :style="loading_style">
    <view class="reply-sending__card">
      <view class="reply-sending__spinner" />
      <text class="reply-sending__title">{{ $t('Sending reply...') }}</text>
      <text class="reply-sending__copy">{{ $t('This note can be sent once.') }}</text>
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

defineProps({
  visible: { type: Boolean, default: false }
})

const loading_style = {
  '--reply-sending-background': theme.colors.page.background,
  '--reply-sending-title': theme.colors.text.title,
  '--reply-sending-secondary': theme.colors.text.secondary,
  '--reply-sending-accent': theme.colors.button.primary,
  '--reply-sending-overlay': theme.colors.surface.scrim_soft,
  '--reply-sending-border': theme.colors.surface.highlight_border,
  '--reply-sending-track': theme.colors.surface.highlight,
  '--reply-sending-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.reply-sending {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--reply-sending-overlay);
}

.reply-sending__card {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  padding: 44rpx 36rpx;
  border: 1px solid var(--reply-sending-border);
  border-radius: 36rpx;
  background: var(--reply-sending-background);
  box-shadow: 0 28rpx 80rpx var(--reply-sending-shadow);
  flex-direction: column;
}

.reply-sending__spinner {
  width: 70rpx;
  height: 70rpx;
  border: 4px solid var(--reply-sending-track);
  border-top-color: var(--reply-sending-accent);
  border-right-color: var(--reply-sending-accent);
  border-radius: 50%;
  animation: reply-sending-spin .72s linear infinite;
}

.reply-sending__title {
  display: block;
  margin-top: 28rpx;
  color: var(--reply-sending-title);
  font-size: 32rpx;
  font-weight: 800;
}

.reply-sending__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--reply-sending-secondary);
  font-size: 24rpx;
  text-align: center;
}

@keyframes reply-sending-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <transition name="feedback-success">
    <view v-if="visible" class="feedback-success" :style="theme_style" @click.self="emit('confirm')">
      <view class="feedback-success__card" role="dialog" aria-modal="true" :aria-label="$t('Feedback submitted successfully')">
        <text class="feedback-success__eyebrow">{{ $t('FEEDBACK') }}</text>
        <text class="feedback-success__title">{{ $t('Submitted successfully') }}</text>
        <text class="feedback-success__copy">{{ $t('Thanks for helping us improve.') }}</text>
        <view class="feedback-success__button" role="button" @click="emit('confirm')">{{ $t('Back to settings') }}</view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import theme from '@/config/theme.json'

defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['confirm'])
const theme_style = {
  '--success-scrim': theme.colors.surface.scrim,
  '--success-card': theme.colors.dialog.background,
  '--success-border': theme.colors.dialog.border,
  '--success-title': theme.colors.text.title,
  '--success-copy': theme.colors.text.secondary,
  '--success-accent': theme.colors.status.success,
  '--success-button': theme.colors.dialog.confirm.background,
  '--success-button-text': theme.colors.dialog.confirm.text
}
</script>

<style scoped lang="scss">
.feedback-success {
  position: fixed;
  z-index: 1400;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--success-scrim);
}

.feedback-success__card {
  box-sizing: border-box;
  width: 620rpx;
  max-width: 100%;
  padding: 40rpx 36rpx;
  border: 1px solid var(--success-border);
  border-radius: 36rpx;
  background: var(--success-card);
}

.feedback-success__eyebrow {
  color: var(--success-accent);
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.feedback-success__title {
  display: block;
  margin-top: 18rpx;
  color: var(--success-title);
  font-size: 36rpx;
  font-weight: 700;
  line-height: 48rpx;
}

.feedback-success__copy {
  display: block;
  margin-top: 16rpx;
  color: var(--success-copy);
  font-size: 26rpx;
  line-height: 38rpx;
}

.feedback-success__button {
  height: 88rpx;
  margin-top: 32rpx;
  border-radius: 44rpx;
  background: var(--success-button);
  color: var(--success-button-text);
  font-size: 28rpx;
  font-weight: 700;
  line-height: 88rpx;
  text-align: center;
}

.feedback-success-enter-active,
.feedback-success-leave-active { transition: opacity .2s ease; }

.feedback-success-enter-active .feedback-success__card,
.feedback-success-leave-active .feedback-success__card { transition: transform .2s ease; }

.feedback-success-enter-from,
.feedback-success-leave-to { opacity: 0; }

.feedback-success-enter-from .feedback-success__card,
.feedback-success-leave-to .feedback-success__card { transform: translateY(24rpx); }
</style>

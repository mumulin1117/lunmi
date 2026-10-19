<template>
  <transition name="dialog-pop">
    <view
      v-if="visible"
      class="dialog-anchor"
      :style="dialog_style"
    >
      <view class="dialog-card">
        <text class="dialog-eyebrow">{{ $t('WALLET') }}</text>
        <text class="dialog-title">{{ $t('Not enough coins') }}</text>
        <text class="dialog-copy">{{ $t(copy_text) }}</text>
        <view class="dialog-actions">
          <view
            class="dialog-button dialog-button--secondary"
            role="button"
            @click="cancel"
          >
            {{ $t('Cancel') }}
          </view>
          <view
            class="dialog-button dialog-button--primary"
            role="button"
            @click="buy"
          >
            {{ $t('Buy coins') }}
          </view>
        </view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import theme from '@/config/theme.json'
import { SCOOP_ATTEMPT_COIN_COST } from '@/utils/lanternHomePresentation'

const props = defineProps({
  visible: { type: Boolean, default: false },
  coinCost: { type: Number, default: SCOOP_ATTEMPT_COIN_COST },
  copy: { type: String, default: '' }
})

const emit = defineEmits(['cancel', 'buy'])

const coin_cost = computed(() => props.coinCost)
const copy_text = computed(() => props.copy || `You need ${coin_cost.value} coins for this. Your scoop count and balance stay as they are.`)

const dialog_style = {
  '--dialog-background': theme.colors.dialog.background,
  '--dialog-border': theme.colors.dialog.border,
  '--dialog-title-color': theme.colors.text.title,
  '--dialog-secondary-color': theme.colors.text.secondary,
  '--dialog-eyebrow-color': theme.colors.status.coin,
  '--dialog-primary-color': theme.colors.dialog.confirm.background,
  '--dialog-primary-text-color': theme.colors.dialog.confirm.text,
  '--dialog-cancel-background': theme.colors.dialog.cancel.background,
  '--dialog-cancel-border': theme.colors.dialog.cancel.border,
  '--dialog-cancel-text': theme.colors.dialog.cancel.text,
  '--dialog-shadow': theme.colors.surface.shadow
}

const cancel = () => emit('cancel')

const buy = () => emit('buy')
</script>

<style scoped lang="scss">
.dialog-anchor {
  position: fixed;
  z-index: 1400;
  top: 50%;
  left: 50%;
  box-sizing: border-box;
  width: calc(100% - 80rpx);
  max-width: 620rpx;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.dialog-card {
  box-sizing: border-box;
  width: 100%;
  padding: 44rpx 36rpx 36rpx;
  border: 1px solid var(--dialog-border);
  border-radius: 36rpx;
  background: var(--dialog-background);
  box-shadow: 0 28rpx 80rpx var(--dialog-shadow);
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

.dialog-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 38rpx;
}

.dialog-button {
  display: flex;
  height: 88rpx;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
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

.dialog-pop-enter-active {
  transition: opacity 0.28s ease-out;
}

.dialog-pop-enter-active .dialog-card {
  transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.dialog-pop-leave-active {
  transition: opacity 0.2s ease-in;
}

.dialog-pop-leave-active .dialog-card {
  transition: transform 0.2s ease-in;
}

.dialog-pop-enter-from,
.dialog-pop-leave-to {
  opacity: 0;
}

.dialog-pop-enter-from .dialog-card {
  transform: scale(0.92);
}

.dialog-pop-leave-to .dialog-card {
  transform: scale(0.95);
}
</style>

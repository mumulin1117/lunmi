<template>
  <view v-if="visible" class="scoop-purchase-loading" :style="loading_style">
    <view class="scoop-purchase-loading__card">
      <view class="scoop-purchase-loading__spinner" />
      <text class="scoop-purchase-loading__title">{{ $t(loading_title) }}</text>
      <text class="scoop-purchase-loading__copy">{{ $t(loading_copy) }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import theme from '@/config/theme.json'

const props = defineProps({
  visible: { type: Boolean, default: false },
  /** scoop | wish_find */
  variant: { type: String, default: 'scoop' }
})

const loading_title = computed(() => (
  props.variant === 'wish_find' ? 'Buying finds...' : 'Buying scoops...'
))

const loading_copy = computed(() => (
  props.variant === 'wish_find'
    ? 'Confirming coins and starting your first find.'
    : 'Confirming coins and starting your first scoop.'
))

const loading_style = {
  '--scoop-purchase-background': theme.colors.page.background,
  '--scoop-purchase-title': theme.colors.text.title,
  '--scoop-purchase-secondary': theme.colors.text.secondary,
  '--scoop-purchase-accent': theme.colors.button.primary,
  '--scoop-purchase-overlay': theme.colors.surface.scrim_soft,
  '--scoop-purchase-border': theme.colors.surface.highlight_border,
  '--scoop-purchase-track': theme.colors.surface.highlight,
  '--scoop-purchase-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.scoop-purchase-loading {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--scoop-purchase-overlay);
  backdrop-filter: blur(8rpx);
}

.scoop-purchase-loading__card {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 520rpx;
  padding: 44rpx 36rpx;
  border: 1px solid var(--scoop-purchase-border);
  border-radius: 36rpx;
  background: var(--scoop-purchase-background);
  box-shadow: 0 28rpx 80rpx var(--scoop-purchase-shadow);
  flex-direction: column;
}

.scoop-purchase-loading__spinner {
  width: 70rpx;
  height: 70rpx;
  border: 4px solid var(--scoop-purchase-track);
  border-top-color: var(--scoop-purchase-accent);
  border-right-color: var(--scoop-purchase-accent);
  border-radius: 50%;
  animation: scoop-purchase-spin .72s linear infinite;
}

.scoop-purchase-loading__title {
  display: block;
  margin-top: 28rpx;
  color: var(--scoop-purchase-title);
  font-size: 32rpx;
  font-weight: 800;
}

.scoop-purchase-loading__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--scoop-purchase-secondary);
  font-size: 24rpx;
  text-align: center;
}

@keyframes scoop-purchase-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

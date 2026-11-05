<template>
  <view class="request-actions" :class="{ 'request-actions--compact': compact }" :style="action_style">
    <button class="request-action request-action--decline" :disabled="disabled" :aria-label="$t('Decline request')" @click.stop="$emit('decline')">
      <text class="request-action__surface">{{ $t('Decline') }}</text>
    </button>
    <button class="request-action request-action--accept" :disabled="disabled" :aria-label="$t('Accept request')" @click.stop="$emit('accept')">
      <text class="request-action__surface">{{ $t('Accept') }}</text>
    </button>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

defineProps({ compact: { type: Boolean, default: false }, disabled: { type: Boolean, default: false } })
defineEmits(['accept', 'decline'])
const action_style = {
  '--request-text': theme.colors.text.title,
  '--request-border': theme.colors.surface.border,
  '--request-accent': theme.colors.status.coin,
  '--request-accent-text': theme.colors.messages.segment_active_text
}
</script>

<style scoped lang="scss">
.request-actions { display: flex; width: 100%; gap: 20rpx; }
.request-action {
  display: flex;
  min-width: 44px;
  min-height: 48px;
  flex: 1;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  line-height: 1.3;
  transition: transform 160ms ease;
}
.request-action::after { border: none; }
.request-action__surface {
  display: inline-flex;
  box-sizing: border-box;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 20rpx 28rpx;
  border: 1px solid var(--request-border);
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255, 183, 213, 0.13), rgba(182, 148, 238, 0.1));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: var(--request-text);
  font-size: 28rpx;
  font-weight: 700;
}
.request-action--accept .request-action__surface {
  border-color: var(--request-accent);
  background: var(--request-accent);
  color: var(--request-accent-text);
}
.request-action:active { transform: scale(0.96); }
.request-action:focus-visible { outline: 2px solid #e7b5ed; outline-offset: 3px; }
.request-action[disabled] { opacity: 0.45; }

// Match the Your turn label visually, while retaining 44px touch targets.
.request-actions--compact { width: auto; flex: none; gap: 4rpx; }
.request-actions--compact .request-action { min-height: 44px; border-radius: 16rpx; }
.request-actions--compact .request-action__surface {
  width: auto;
  min-height: 0;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  font-size: 18rpx;
  font-weight: 400;
  line-height: normal;
  letter-spacing: 1rpx;
}
@media (prefers-reduced-motion: reduce) { .request-action { transition: none; } }
</style>

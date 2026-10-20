<template>
  <view class="live-badge" :style="theme_style">
    <view class="live-badge__dot" aria-hidden="true" />
    <text>{{ $t(label) }}</text>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

defineProps({
  label: { type: String, default: 'LIVE' }
})

const theme_style = {
  '--live-badge-background': theme.colors.status.success,
  '--live-badge-foreground': theme.colors.voice_room.live_badge_foreground,
  '--live-badge-border': theme.colors.voice_room.live_badge_border
}
</script>

<style scoped lang="scss">
.live-badge {
  display: flex;
  box-sizing: border-box;
  height: 52rpx;
  flex: none;
  align-items: center;
  padding: 0 16rpx;
  border: 1px solid var(--live-badge-border);
  border-radius: 999rpx;
  background: var(--live-badge-background);
  color: var(--live-badge-foreground);
  font-size: 20rpx;
  font-weight: 700;
  animation: live-badge-breathe 2s ease-in-out infinite;
}

.live-badge__dot {
  position: relative;
  width: 12rpx;
  height: 12rpx;
  flex-shrink: 0;
  margin-right: 8rpx;
  border-radius: 50%;
  background: var(--live-badge-foreground);
  animation: live-dot-blink 1.5s ease-in-out infinite;
}

.live-badge__dot::after {
  position: absolute;
  inset: 0;
  content: '';
  border: 1px solid var(--live-badge-foreground);
  border-radius: 50%;
  animation: live-dot-ripple 1.5s ease-out infinite;
}

@keyframes live-dot-blink {
  0%,
  100% { opacity: 1; }
  50% { opacity: 0.55; }
}

@keyframes live-dot-ripple {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

@keyframes live-badge-breathe {
  0%,
  100% { border-color: var(--live-badge-border); }
  50% { border-color: var(--live-badge-foreground); }
}

@media (prefers-reduced-motion: reduce) {
  .live-badge,
  .live-badge__dot,
  .live-badge__dot::after { animation: none; }
}
</style>

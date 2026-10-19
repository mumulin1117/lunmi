<template>
  <view
    class="wish-lantern-art"
    :class="{ 'wish-lantern-art--active': is_active, 'wish-lantern-art--reduced': is_reduced }"
    aria-hidden="true"
  >
    <view class="wish-lantern-attachment" />
    <view class="wish-lantern-lift">
      <view class="wish-lantern-pendulum">
        <image class="wish-lantern-image" src="/static/icon/wish_tree_lantern_inner.png" mode="aspectFit" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { use_ambient_activity } from '@/utils/useAmbientActivity'

const { is_active, is_reduced } = use_ambient_activity()
</script>

<style scoped>
.wish-lantern-art {
  pointer-events: none;
}

.wish-lantern-lift,
.wish-lantern-pendulum,
.wish-lantern-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: 50% 0;
}

.wish-lantern-lift {
  animation: wish-lantern-hang 11.6s ease-in-out infinite;
}

.wish-lantern-pendulum {
  animation: wish-lantern-wind 11.6s ease-in-out infinite;
}

.wish-lantern-attachment {
  position: absolute;
  top: -3rpx;
  left: 50%;
  width: 13rpx;
  height: 8rpx;
  box-sizing: border-box;
  border: 1px solid rgba(248, 218, 170, 0.65);
  border-top: 0;
  border-radius: 0 0 50% 50%;
  box-shadow: 0 2rpx 7rpx rgba(255, 195, 114, 0.35);
  transform: translateX(-50%);
  animation: wish-lantern-attach 11.6s ease-in-out infinite;
}

.wish-lantern-art .wish-lantern-lift,
.wish-lantern-art .wish-lantern-pendulum,
.wish-lantern-art .wish-lantern-attachment {
  animation-play-state: paused;
}

.wish-lantern-art--active .wish-lantern-lift,
.wish-lantern-art--active .wish-lantern-pendulum,
.wish-lantern-art--active .wish-lantern-attachment {
  animation-play-state: running;
}

.wish-lantern-art--reduced .wish-lantern-lift,
.wish-lantern-art--reduced .wish-lantern-pendulum {
  animation: none;
  transform: none;
  opacity: 1;
}

.wish-lantern-art--reduced .wish-lantern-attachment {
  display: none;
}

/* Reach the hanging point first, then leave time for several gentle swings. */
@keyframes wish-lantern-hang {
  0%, 100% { opacity: 0; transform: translate(-10rpx, 58rpx) rotate(-8deg) scale(0.96); }
  10% { opacity: 1; }
  26% { opacity: 1; transform: translate(0, -3rpx) rotate(1deg) scale(1); }
  32%, 88% { opacity: 1; transform: translate(0, 0) rotate(0) scale(1); }
  94%, 97% { opacity: 0; transform: translate(0, 0) rotate(0) scale(1); }
}

@keyframes wish-lantern-wind {
  0%, 28%, 100% { transform: rotate(0); }
  35% { transform: rotate(4.5deg); }
  45% { transform: rotate(-5deg); }
  56% { transform: rotate(4deg); }
  67% { transform: rotate(-3.5deg); }
  78% { transform: rotate(3deg); }
  89% { transform: rotate(-2.5deg); }
  97% { transform: rotate(2deg); }
}

@keyframes wish-lantern-attach {
  0%, 22%, 96%, 100% { opacity: 0; }
  29% { opacity: 1; }
  38%, 88% { opacity: 0.55; }
}
</style>

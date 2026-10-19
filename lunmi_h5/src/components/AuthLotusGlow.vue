<template>
  <view
    class="auth-lotus"
    :class="{ 'auth-lotus--active': is_active, 'auth-lotus--reduced': is_reduced }"
    aria-hidden="true"
  >
    <view class="auth-lotus__breath" />
    <view class="auth-lotus__heartbeat" />
    <view class="auth-lotus__ring auth-lotus__ring--outer" />
    <view class="auth-lotus__ring auth-lotus__ring--inner" />
    <image class="auth-lotus__image" :src="source" mode="aspectFit" />
  </view>
</template>

<script setup>
import { use_ambient_activity } from '@/utils/useAmbientActivity'

defineProps({ source: { type: String, required: true } })
const { is_active, is_reduced } = use_ambient_activity()
</script>

<style scoped>
.auth-lotus {
  position: relative;
  isolation: isolate;
  overflow: visible;
  pointer-events: none;
}

.auth-lotus__breath,
.auth-lotus__heartbeat,
.auth-lotus__ring {
  position: absolute;
  left: 50%;
  top: 51%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.auth-lotus__breath {
  width: 170%;
  height: 160%;
  background: radial-gradient(ellipse, rgba(255, 222, 149, 0.30), rgba(255, 173, 199, 0.20) 24%, rgba(183, 133, 255, 0.09) 44%, transparent 68%);
  opacity: 0.42;
  animation: auth-lotus-breathe 7.9s ease-in-out infinite;
}

.auth-lotus__heartbeat {
  width: 128%;
  height: 122%;
  background: radial-gradient(ellipse, rgba(255, 233, 163, 0.36), rgba(255, 182, 220, 0.18) 32%, transparent 67%);
  opacity: 0.24;
  animation: auth-lotus-heartbeat 6.7s ease-in-out infinite;
}

.auth-lotus__ring {
  box-sizing: border-box;
  width: 108%;
  height: 108%;
  border: 1px solid rgba(255, 218, 166, 0.50);
  box-shadow: 0 0 14rpx rgba(255, 175, 218, 0.24), inset 0 0 12rpx rgba(189, 146, 255, 0.15);
  opacity: 0;
  animation: auth-lotus-halo 9.3s ease-in-out infinite;
}

.auth-lotus__ring--inner {
  width: 92%;
  height: 92%;
  border-color: rgba(213, 174, 255, 0.38);
  animation-duration: 7.1s;
  animation-delay: -2.4s;
}

.auth-lotus__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: 50% 62%;
  animation: auth-lotus-artwork 6.7s ease-in-out infinite;
}

.auth-lotus .auth-lotus__breath,
.auth-lotus .auth-lotus__heartbeat,
.auth-lotus .auth-lotus__ring,
.auth-lotus .auth-lotus__image {
  animation-play-state: paused;
}

.auth-lotus--active .auth-lotus__breath,
.auth-lotus--active .auth-lotus__heartbeat,
.auth-lotus--active .auth-lotus__ring,
.auth-lotus--active .auth-lotus__image {
  animation-play-state: running;
}

.auth-lotus--reduced .auth-lotus__breath,
.auth-lotus--reduced .auth-lotus__heartbeat,
.auth-lotus--reduced .auth-lotus__image {
  animation: none;
}

.auth-lotus--reduced .auth-lotus__ring {
  display: none;
}

/* Uneven double beats and independent halo periods keep the loop organic. */
@keyframes auth-lotus-breathe {
  0%, 100% { opacity: 0.42; transform: translate(-50%, -50%) scale(0.89); }
  18% { opacity: 0.80; transform: translate(-50%, -50%) scale(1.08); }
  35% { opacity: 0.49; transform: translate(-50%, -50%) scale(0.94); }
  62% { opacity: 0.94; transform: translate(-50%, -50%) scale(1.13); }
  81% { opacity: 0.56; transform: translate(-50%, -50%) scale(0.98); }
}

@keyframes auth-lotus-heartbeat {
  0%, 26%, 63%, 100% { opacity: 0.24; transform: translate(-50%, -50%) scale(0.92); }
  9%, 44%, 79% { opacity: 0.65; transform: translate(-50%, -50%) scale(1.03); }
  13%, 48%, 83% { opacity: 0.36; transform: translate(-50%, -50%) scale(0.97); }
  18%, 54%, 88% { opacity: 0.88; transform: translate(-50%, -50%) scale(1.12); }
}

@keyframes auth-lotus-artwork {
  0%, 26%, 63%, 100% { transform: scale(1); }
  9%, 44%, 79% { transform: scale(1.015); }
  13%, 48%, 83% { transform: scale(1.004); }
  18%, 54%, 88% { transform: scale(1.028); }
}

@keyframes auth-lotus-halo {
  0%, 42%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.66); }
  9%, 55% { opacity: 0.28; }
  23% { opacity: 0.13; transform: translate(-50%, -50%) scale(1.16); }
  36% { opacity: 0; transform: translate(-50%, -50%) scale(1.35); }
  77% { opacity: 0.10; transform: translate(-50%, -50%) scale(1.23); }
  94% { opacity: 0; transform: translate(-50%, -50%) scale(1.40); }
}
</style>

<template>
  <view
    class="home-feature-art"
    :class="{ 'home-feature-art--active': is_active, 'home-feature-art--reduced': is_reduced }"
    :data-feature-motion="kind"
    aria-hidden="true"
  >
    <template v-if="kind === 'release'">
      <image class="feature-illustration lotus-flower" src="/static/icon/lantern_home_release_card.png" mode="aspectFit" />
      <image class="feature-illustration lotus-reflection" src="/static/icon/lantern_home_release_card.png" mode="aspectFit" />
      <view class="lotus-ripples">
        <view v-for="ring in 3" :key="ring" class="lotus-ripple" :style="{ animationDelay: `${(1 - ring) * 1.8}s` }" />
      </view>
    </template>
    <template v-else>
      <view class="scoop-water" />
      <view class="scoop-ripple" />
      <image class="feature-illustration scoop-net" src="/static/icon/lantern_home_scoop_card.png" mode="aspectFit" />
      <view v-for="drop in 3" :key="drop" class="scoop-drop" :class="`scoop-drop--${drop}`" />
    </template>
  </view>
</template>

<script setup>
import { use_ambient_activity } from '@/utils/useAmbientActivity'

defineProps({ kind: { type: String, default: 'release' } })
const { is_active, is_reduced } = use_ambient_activity()
</script>

<style scoped>
.home-feature-art {
  pointer-events: none;
}

.feature-illustration {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.lotus-flower {
  clip-path: inset(0 0 23% 0);
}

.lotus-reflection {
  clip-path: inset(77% 0 0 0);
  transform-origin: 50% 77%;
  animation: lotus-reflection-drift 5.4s ease-in-out infinite;
}

.lotus-ripples {
  position: absolute;
  inset: 0 -8%;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, transparent 68%, #000 76%, #000 94%, transparent);
  mask-image: linear-gradient(to bottom, transparent 68%, #000 76%, #000 94%, transparent);
}

.lotus-ripple {
  position: absolute;
  top: 80%;
  left: 50%;
  width: 93%;
  height: 20%;
  box-sizing: border-box;
  border: 1px solid rgba(255, 220, 160, 0.72);
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(184, 106, 255, 0.55), inset 0 -1px 3px rgba(255, 178, 241, 0.36);
  opacity: 0;
  animation: lotus-ripple-spread 5.4s linear infinite;
}

.scoop-net {
  transform-origin: 88% 12%;
  animation: scoop-lift 8.6s ease-in-out infinite;
}

.scoop-water,
.scoop-ripple {
  position: absolute;
  top: 91%;
  left: 39%;
  width: 78%;
  height: 14%;
  box-sizing: border-box;
  border: 1px solid rgba(199, 172, 255, 0.60);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.scoop-water {
  background: radial-gradient(ellipse, rgba(143, 94, 255, 0.14), transparent 68%);
  box-shadow: 0 1px 6px rgba(154, 117, 255, 0.25);
  animation: scoop-water-shimmer 8.6s ease-in-out infinite;
}

.scoop-ripple {
  opacity: 0;
  animation: scoop-water-ripple 8.6s linear infinite;
}

.scoop-drop {
  position: absolute;
  top: 80%;
  left: 30%;
  width: 3rpx;
  height: 8rpx;
  border-radius: 50%;
  background: rgba(255, 221, 171, 0.9);
  box-shadow: 0 0 5rpx rgba(193, 171, 255, 0.7);
  opacity: 0;
  animation: scoop-water-drop 8.6s ease-in infinite;
}

.scoop-drop--2 { left: 42%; top: 76%; animation-delay: 0.13s; }
.scoop-drop--3 { left: 52%; top: 78%; animation-delay: 0.26s; }

.home-feature-art .lotus-reflection,
.home-feature-art .lotus-ripple,
.home-feature-art .scoop-net,
.home-feature-art .scoop-water,
.home-feature-art .scoop-ripple,
.home-feature-art .scoop-drop {
  animation-play-state: paused;
}

.home-feature-art--active .lotus-reflection,
.home-feature-art--active .lotus-ripple,
.home-feature-art--active .scoop-net,
.home-feature-art--active .scoop-water,
.home-feature-art--active .scoop-ripple,
.home-feature-art--active .scoop-drop {
  animation-play-state: running;
}

.home-feature-art--reduced .lotus-reflection,
.home-feature-art--reduced .scoop-net {
  animation: none;
  transform: none;
}

.home-feature-art--reduced .lotus-ripples,
.home-feature-art--reduced .scoop-water,
.home-feature-art--reduced .scoop-ripple,
.home-feature-art--reduced .scoop-drop {
  display: none;
}

@keyframes lotus-reflection-drift {
  0%, 100% { transform: translateX(-0.7%) scaleX(0.98); opacity: 0.92; }
  50% { transform: translateX(0.7%) scaleX(1.04); opacity: 1; }
}

@keyframes lotus-ripple-spread {
  0% { transform: translate(-50%, -50%) scale(0.28, 0.44); opacity: 0; }
  12% { opacity: 0.72; }
  65% { opacity: 0.35; }
  100% { transform: translate(-50%, -40%) scale(1.12, 1.48); opacity: 0; }
}

@keyframes scoop-lift {
  0%, 100% { transform: translate(2%, 1%) rotate(-4deg); }
  20% { transform: translate(0, 7%) rotate(-11deg); }
  37% { transform: translate(-4%, 9%) rotate(-15deg); }
  64% { transform: translate(-1%, -6%) rotate(5deg); }
  80% { transform: translate(2%, -7%) rotate(7deg); }
}

@keyframes scoop-water-shimmer {
  0%, 100% { opacity: 0.18; transform: translate(-50%, -50%) scaleX(0.88); }
  25%, 40% { opacity: 0.62; transform: translate(-50%, -50%) scaleX(1.04); }
  65%, 80% { opacity: 0.12; transform: translate(-50%, -50%) scaleX(1.1); }
}

@keyframes scoop-water-ripple {
  0%, 35% { opacity: 0; transform: translate(-50%, -50%) scale(0.35); }
  43% { opacity: 0.65; }
  72%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.28, 1.5); }
}

@keyframes scoop-water-drop {
  0%, 52% { opacity: 0; transform: translateY(-6rpx); }
  57% { opacity: 0.75; }
  72%, 100% { opacity: 0; transform: translateY(28rpx); }
}
</style>

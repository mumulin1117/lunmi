<template>
  <view class="skeleton-block" :style="skeleton_style" aria-hidden="true">
    <view class="skeleton-block__shine" />
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'

const skeleton_style = {
  '--skeleton-surface': theme.colors.home.skeleton,
  '--skeleton-shine': theme.colors.surface.media_shimmer_shine
}
</script>

<style scoped lang="scss">
.skeleton-block {
  position: relative;
  flex: none;
  overflow: hidden;
  pointer-events: none;
  background: var(--skeleton-surface);
}

.skeleton-block__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent, var(--skeleton-shine), transparent);
  transform: translateX(-100%);
  animation: skeleton-shimmer 1.3s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  to { transform: translateX(100%); }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-block__shine { animation: none; }
}
</style>

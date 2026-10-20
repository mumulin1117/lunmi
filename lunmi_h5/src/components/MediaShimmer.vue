<template>
  <view class="media-shimmer" role="status" :aria-label="$t(label)">
    <view class="media-shimmer__track" />
  </view>
</template>

<script setup>
defineProps({
  label: { type: String, default: 'Loading media' }
})
</script>

<style scoped lang="scss">
.media-shimmer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  background: var(--media-loading-surface);
}

.media-shimmer__track {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    100deg,
    var(--media-loading-surface) 0%,
    var(--media-loading-shine) 50%,
    var(--media-loading-surface) 100%
  );
  transform: translateX(-100%);
  animation: media-shimmer 1.3s ease-in-out infinite;
}

@keyframes media-shimmer {
  to {
    transform: translateX(100%);
  }
}
</style>

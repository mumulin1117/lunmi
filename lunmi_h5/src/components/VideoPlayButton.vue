<template>
  <transition name="video-play-button-fade">
    <view
      v-if="visible"
      class="video-play-button"
      :class="{ 'video-play-button--disabled': disabled }"
      :style="theme_style"
      role="button"
      :aria-label="$t('Play video')"
      :aria-disabled="disabled"
      @click.stop="handle_click"
    >
      <image class="video-play-button__icon" src="/static/icons/play-fill.svg" mode="aspectFit" />
    </view>
  </transition>
</template>

<script setup>
import theme from '@/config/theme.json'

const props = defineProps({
  visible: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['play'])

const theme_style = {
  '--play-button-background': theme.colors.surface.scrim,
  '--play-button-border': theme.colors.surface.border_soft
}

const handle_click = () => {
  if (props.disabled) return
  emit('play')
}
</script>

<style scoped lang="scss">
.video-play-button {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: 50%;
  display: flex;
  box-sizing: border-box;
  width: 112rpx;
  height: 112rpx;
  align-items: center;
  justify-content: center;
  border: 2rpx solid var(--play-button-border);
  border-radius: 50%;
  background: var(--play-button-background);
  transform: translate3d(-50%, -50%, 0) scale(1);
  will-change: opacity, transform;
}

.video-play-button__icon {
  width: 52rpx;
  height: 52rpx;
  margin-left: 6rpx;
}

.video-play-button--disabled {
  opacity: .45;
  pointer-events: none;
}

.video-play-button-fade-enter-active,
.video-play-button-fade-leave-active {
  transition: opacity .22s ease, transform .22s cubic-bezier(.32, .72, 0, 1);
}

.video-play-button-fade-enter-from,
.video-play-button-fade-leave-to {
  opacity: 0;
  transform: translate3d(-50%, -50%, 0) scale(.84);
}
</style>

<template>
  <transition name="content-action-slide">
    <view
      v-show="visible"
      class="content-action-sheet"
      :class="{ 'content-action-sheet--above-tabbar': aboveTabbar }"
      :style="sheet_style"
      @touchmove.stop
    >
      <view class="content-action-sheet__scrim" role="button" :aria-label="$t('Close content actions')" @click="emit('close')" />
      <view class="content-action-sheet__panel" :aria-label="$t('Content actions')">
        <view class="content-action-sheet__button" role="button" @click="emit('report')">{{ $t('Report') }}</view>
        <view class="content-action-sheet__button" role="button" @click="emit('block')">{{ $t('Block') }}</view>
        <view class="content-action-sheet__button content-action-sheet__button--cancel" role="button" @click="emit('close')">{{ $t('Cancel') }}</view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import theme from '@/config/theme.json'

defineProps({
  visible: { type: Boolean, default: false },
  aboveTabbar: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'report', 'block'])
const sheet_style = {
  '--action-sheet-surface': theme.colors.surface.card,
  '--action-sheet-text': theme.colors.text.title,
  '--action-sheet-accent': theme.colors.button.primary,
  '--action-sheet-scrim': theme.colors.surface.scrim,
  '--action-sheet-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.content-action-sheet {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: flex;
  align-items: flex-end;
}

.content-action-sheet__scrim {
  position: absolute;
  inset: 0;
  background: var(--action-sheet-scrim);
}

.content-action-sheet__panel {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  padding: 24rpx 30rpx calc(30rpx + var(--page-safe-bottom));
}

.content-action-sheet--above-tabbar .content-action-sheet__panel {
  padding-bottom: calc(var(--app-main-tab-bar-height) + 28rpx);
}

.content-action-sheet__button {
  display: flex;
  height: 108rpx;
  align-items: center;
  justify-content: center;
  margin-top: 24rpx;
  border-radius: 54rpx;
  background: var(--action-sheet-surface);
  box-shadow: 0 12rpx 38rpx var(--action-sheet-shadow);
  color: var(--action-sheet-text);
  font-size: 34rpx;
  font-weight: 700 !important;
}

.content-action-sheet__button--cancel {
  background: var(--action-sheet-accent);
}

.content-action-slide-enter-active,
.content-action-slide-leave-active {
  transition: opacity .24s ease;
}

.content-action-slide-enter-active .content-action-sheet__panel,
.content-action-slide-leave-active .content-action-sheet__panel {
  transition: transform .3s cubic-bezier(.22, .8, .25, 1);
}

.content-action-slide-enter-from,
.content-action-slide-leave-to { opacity: 0; }

.content-action-slide-enter-from .content-action-sheet__panel,
.content-action-slide-leave-to .content-action-sheet__panel {
  transform: translateY(100%);
}
</style>

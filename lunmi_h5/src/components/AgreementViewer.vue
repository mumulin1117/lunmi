<template>
  <view
    v-show="is_bottom_rendered && presentation === 'bottom'"
    class="agreement-overlay"
    :style="overlay_style"
    @click="close"
  >
    <view
      class="agreement-panel agreement-panel--bottom"
      :class="{ 'agreement-panel--visible': is_bottom_visible }"
      :style="panel_style"
      @click.stop
    >
      <view class="agreement-header">
        <view class="header-placeholder" />
        <text class="agreement-title">{{ $t(agreement.title) }}</text>
        <view class="header-action" role="button" :aria-label="$t('Close agreement')" @click="close">
          <Close class="header-icon" />
        </view>
      </view>
      <scroll-view class="agreement-content" scroll-y :show-scrollbar="false">
        <view v-for="section in agreement.sections" :key="section.title" class="agreement-section">
          <text class="section-title">{{ $t(section.title) }}</text>
          <text class="section-content">{{ $t(section.content) }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
  <transition name="page-agreement">
    <view
      v-show="modelValue && presentation === 'page'"
      class="agreement-page"
      :style="page_style"
    >
      <TopSafeArea />
      <view class="page-content">
        <SecondaryPageHeader :title="$t(agreement.title)" :back-action="back" />
        <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
          <view class="agreement-page-content content-scroll__inner">
            <view v-for="section in agreement.sections" :key="section.title" class="agreement-section">
              <text class="section-title">{{ $t(section.title) }}</text>
              <text class="section-content">{{ $t(section.content) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
      <BottomSafeArea />
    </view>
  </transition>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { AGREEMENTS } from '@/config/agreements'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import SecondaryPageHeader from '@/components/SecondaryPageHeader.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'user',
    validator: (value) => ['user', 'privacy', 'eula'].includes(value)
  },
  presentation: {
    type: String,
    default: 'bottom',
    validator: (value) => ['bottom', 'page'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'close', 'back'])

const BOTTOM_ANIMATION_DURATION = 320
const is_bottom_rendered = ref(false)
const is_bottom_visible = ref(false)
let bottom_animation_frame = null
let bottom_leave_timer = null

const agreements = AGREEMENTS

const theme_variables = {
  '--agreement-background': theme.colors.page.background,
  '--agreement-title': theme.colors.text.title,
  '--agreement-secondary': theme.colors.text.secondary,
  '--agreement-border': theme.colors.surface.border_soft
}

const overlay_style = theme_variables

const page_style = {
  ...theme_variables,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const panel_style = {
  background: theme.colors.page.background
}

const agreement = computed(() => agreements[props.type])

const cancel_bottom_animation = () => {
  if (bottom_animation_frame !== null) {
    const cancel_frame = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout
    cancel_frame(bottom_animation_frame)
    bottom_animation_frame = null
  }

  if (bottom_leave_timer !== null) {
    clearTimeout(bottom_leave_timer)
    bottom_leave_timer = null
  }
}

const show_bottom_panel = async () => {
  cancel_bottom_animation()
  is_bottom_rendered.value = true
  is_bottom_visible.value = false
  await nextTick()

  const request_frame = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (callback) => setTimeout(callback, 16)

  bottom_animation_frame = request_frame(() => {
    is_bottom_visible.value = true
    bottom_animation_frame = null
  })
}

const hide_bottom_panel = () => {
  cancel_bottom_animation()
  is_bottom_visible.value = false

  if (!is_bottom_rendered.value) return

  bottom_leave_timer = setTimeout(() => {
    is_bottom_rendered.value = false
    bottom_leave_timer = null
  }, BOTTOM_ANIMATION_DURATION)
}

watch(
  () => [props.modelValue, props.presentation],
  ([is_visible, presentation]) => {
    if (is_visible && presentation === 'bottom') {
      show_bottom_panel()
      return
    }

    hide_bottom_panel()
  },
  { immediate: true }
)

onUnmounted(cancel_bottom_animation)

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const back = () => {
  emit('back')
  close()
}
</script>

<style scoped lang="scss">
.agreement-overlay {
  position: absolute;
  z-index: 1000;
  inset: 0;
  color: var(--agreement-title);
  background: transparent;
}

.agreement-overlay {
  display: flex;
  align-items: flex-end;
}

.agreement-page {
  position: fixed;
  z-index: 1000;
  inset: 0;
  color: var(--agreement-title);
  background: var(--agreement-background);
}

.agreement-panel {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-height: calc(100vh - var(--page-safe-top) - 320rpx);
  padding-bottom: var(--page-safe-bottom);
  background: var(--agreement-background);
  border-radius: 32rpx 32rpx 0 0;
}

.agreement-page {
  display: flex;
  box-sizing: border-box;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.agreement-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 24rpx;
}

.agreement-title {
  color: var(--agreement-title);
  font-size: 32rpx;
  font-weight: 600;
}

.header-action,
.header-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
}

.header-icon {
  width: 40rpx;
  height: 40rpx;
  color: var(--agreement-title);
}

.agreement-content {
  flex: 1;
  box-sizing: border-box;
  padding: 0 40rpx 40rpx;
}

.agreement-page-content {
  padding: 0 40rpx 40rpx;
}

.agreement-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 32rpx 0;
  border-bottom: 1rpx solid var(--agreement-border);
}

.section-title {
  color: var(--agreement-title);
  font-size: 28rpx;
  font-weight: 600;
}

.section-content {
  color: var(--agreement-secondary);
  font-size: 26rpx;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.agreement-panel--bottom {
  opacity: 0;
  transform: translate3d(0, 100%, 0);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease;
  will-change: transform, opacity;
}

.agreement-panel--bottom.agreement-panel--visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.page-agreement-enter-active,
.page-agreement-leave-active {
  transition: opacity 0.2s ease;
}

.page-agreement-enter-from,
.page-agreement-leave-to {
  opacity: 0;
}
</style>

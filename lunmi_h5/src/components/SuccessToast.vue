<template>
  <view v-if="visible_message" class="success-toast" :style="toast_style" role="status" aria-live="polite">
    <text>{{ $t(visible_message) }}</text>
  </view>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { SUCCESS_TOAST_MS } from '@/utils/successToast'

const props = defineProps({
  message: { type: String, default: '' }
})
const emit = defineEmits(['dismiss'])
const visible_message = ref('')
let hide_timer = null

const clear_timer = () => {
  if (!hide_timer) return
  clearTimeout(hide_timer)
  hide_timer = null
}

watch(() => props.message, (message) => {
  clear_timer()
  visible_message.value = `${message || ''}`.trim()
  if (!visible_message.value) return
  hide_timer = setTimeout(() => {
    hide_timer = null
    visible_message.value = ''
    emit('dismiss')
  }, SUCCESS_TOAST_MS)
})

onBeforeUnmount(clear_timer)

const toast_style = {
  '--toast-background': theme.colors.surface.card,
  '--toast-border': theme.colors.surface.border,
  '--toast-title': theme.colors.text.title,
  '--toast-accent': theme.colors.status.success,
  '--toast-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
.success-toast {
  position: fixed;
  z-index: 1400;
  top: calc(var(--page-safe-top, 0px) + 24rpx);
  left: 32rpx;
  right: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22rpx 28rpx;
  border: 1px solid var(--toast-border);
  border-left: 6px solid var(--toast-accent);
  border-radius: 24rpx;
  background: var(--toast-background);
  box-shadow: 0 16rpx 40rpx var(--toast-shadow);
  color: var(--toast-title);
  font-size: 28rpx;
  font-weight: 800;
  pointer-events: none;
  text-align: center;
}
</style>

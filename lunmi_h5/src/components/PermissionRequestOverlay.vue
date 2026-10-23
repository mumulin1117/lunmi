<template>
  <view v-if="visible" class="permission-overlay" :style="overlay_style">
    <view class="permission-stage">
      <view class="permission-card" role="dialog" aria-modal="true" :aria-label="$t(card_title)">
        <view class="permission-halo" aria-hidden="true" />
        <view class="permission-emblem" aria-hidden="true">
          <view class="permission-emblem__ring" />
          <svg class="permission-emblem__art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <template v-if="permissionKey === 'location'">
              <path d="M32 10c-9.2 0-16 6.9-16 15.6C16 37.3 32 53 32 53s16-15.7 16-27.4C48 16.9 41.2 10 32 10Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
              <circle cx="32" cy="26" r="5.8" stroke="currentColor" stroke-width="1.8" />
              <path d="M19 49c-6 1.1-10 3-10 5.2 0 3.4 10.3 6.1 23 6.1s23-2.7 23-6.1c0-2.2-4-4.1-10-5.2" stroke="currentColor" stroke-width="1.2" opacity=".55" stroke-linecap="round" />
            </template>
            <template v-else>
              <circle cx="32" cy="32" r="16" stroke="currentColor" stroke-width="1.6" />
              <path d="M32 19v26M19 32h26" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <circle cx="32" cy="32" r="25" stroke="currentColor" stroke-width=".8" stroke-dasharray="2 6" opacity=".55" />
            </template>
          </svg>
        </view>
        <view class="permission-copy">
          <text class="permission-title">{{ $t(card_title) }}</text>
          <text class="permission-description">{{ $t(card_description) }}</text>
          <text v-if="!is_settings_mode && current_permission.prompt_note && !feedback_message" class="permission-note">{{ $t(current_permission.prompt_note) }}</text>
        </view>
        <text v-if="feedback_message" class="permission-feedback" role="status">{{ $t(feedback_message) }}</text>
        <view class="permission-actions">
          <view
            v-if="is_settings_mode && !feedback_message"
            class="permission-action permission-action--secondary"
            :class="{ 'permission-action--disabled': is_requesting }"
            role="button"
            tabindex="0"
            :aria-disabled="is_requesting"
            @click="cancel_settings"
            @keydown.enter.prevent="cancel_settings"
            @keydown.space.prevent="cancel_settings"
          ><text>{{ $t('Cancel') }}</text></view>
          <view
            class="permission-action permission-action--primary"
            :class="{ 'permission-action--disabled': is_requesting }"
            role="button"
            tabindex="0"
            :aria-disabled="is_requesting"
            :aria-busy="is_requesting"
            @click="continue_permission"
            @keydown.enter.prevent="continue_permission"
            @keydown.space.prevent="continue_permission"
          >
            <text>{{ $t(feedback_message ? 'OK' : is_settings_mode ? 'Open Settings' : 'Continue') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { read_permission_request_definition } from '@/utils/permissionRequestPresentation'
import { ensure_ios_permission, request_ios_location_permission } from '@/utils/iosPermissionBridge'

const props = defineProps({
  visible: { type: Boolean, default: false },
  permissionKey: { type: String, default: '' },
  mode: { type: String, default: 'explanation' }
})

const emit = defineEmits(['update:visible', 'granted', 'denied', 'cancelled', 'settings-opened'])

const is_requesting = ref(false)
const feedback_message = ref('')
const is_active = ref(true)
let request_generation = 0

const current_permission = computed(() => read_permission_request_definition(props.permissionKey))
const is_settings_mode = computed(() => props.mode === 'settings')
const card_title = computed(() => (
  is_settings_mode.value ? current_permission.value.settings_title || current_permission.value.title : current_permission.value.title
))
const card_description = computed(() => (
  is_settings_mode.value ? current_permission.value.settings_description || current_permission.value.description : current_permission.value.description
))
const overlay_style = {
  '--permission-card': theme.colors.permission.card,
  '--permission-divider': theme.colors.permission.divider,
  '--permission-action': theme.colors.permission.action,
  '--permission-copy': theme.colors.permission.copy,
  '--permission-title': theme.colors.text.on_media,
  '--permission-scrim': theme.colors.surface.scrim,
  '--permission-error': theme.colors.status.danger
}

const close_overlay = (event_name) => {
  if (!props.visible) return
  request_generation += 1
  is_requesting.value = false
  feedback_message.value = ''
  emit('update:visible', false)
  emit(event_name)
}

const cancel_settings = () => {
  if (!is_active.value || !props.visible || !is_settings_mode.value || is_requesting.value) return
  close_overlay('cancelled')
}

const open_location_settings = () => {
  if (props.permissionKey !== 'location') {
    feedback_message.value = 'This permission is unavailable on this device.'
    return
  }
  is_requesting.value = true
  try {
    if (request_ios_location_permission({ open_settings: true })) {
      close_overlay('settings-opened')
    } else {
      feedback_message.value = 'This permission is unavailable on this device.'
    }
  } catch {
    feedback_message.value = 'This permission is unavailable on this device.'
  } finally {
    is_requesting.value = false
  }
}

const continue_permission = async () => {
  if (!is_active.value || !props.visible || is_requesting.value) return
  if (feedback_message.value) {
    close_overlay('denied')
    return
  }
  if (is_settings_mode.value) {
    open_location_settings()
    return
  }
  const bridge_permission = current_permission.value.bridge_permission
  if (!bridge_permission) {
    feedback_message.value = 'This permission is unavailable on this device.'
    return
  }
  const generation = ++request_generation
  const permission_key = props.permissionKey
  const permission_mode = props.mode
  const is_current_request = () => (
    is_active.value && props.visible && generation === request_generation
      && props.permissionKey === permission_key && props.mode === permission_mode
  )
  is_requesting.value = true
  feedback_message.value = ''
  try {
    const result = await ensure_ios_permission(bridge_permission, {
      reason: current_permission.value.reason,
      force_refresh: true
    })
    if (!is_current_request()) return
    if (result?.success === true && result.granted === true && result.permission_status === 'granted') {
      close_overlay('granted')
      return
    }
    if (result?.permission_status === 'denied' || result?.cancelled) {
      close_overlay('denied')
      return
    }
    feedback_message.value = 'This permission is unavailable on this device.'
  } catch {
    if (is_current_request()) {
      feedback_message.value = 'This permission is unavailable on this device.'
    }
  } finally {
    if (is_current_request()) is_requesting.value = false
  }
}

watch(() => [props.visible, props.permissionKey, props.mode], () => {
  request_generation += 1
  feedback_message.value = ''
  is_requesting.value = false
})

onBeforeUnmount(() => {
  is_active.value = false
  request_generation += 1
})
</script>

<style scoped lang="scss">
.permission-overlay {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: rgba(12, 9, 27, .72);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  animation: permission-veil .24s ease both;
}

.permission-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
}

.permission-card {
  position: relative;
  isolation: isolate;
  width: 630rpx;
  max-width: 100%;
  max-height: calc(100vh - 80rpx);
  padding: 44rpx 38rpx 38rpx;
  overflow: hidden;
  overflow-y: auto;
  border: 1px solid rgba(192, 165, 240, .28);
  border-radius: 44rpx;
  background: linear-gradient(155deg, #302246 0%, #21192f 58%, #261a39 100%);
  box-shadow: 0 24rpx 88rpx rgba(7, 3, 18, .5), inset 0 1px 0 rgba(239, 217, 255, .08);
  animation: permission-rise .32s cubic-bezier(.2, .75, .3, 1) both;
}

.permission-halo {
  position: absolute;
  z-index: -1;
  top: -160rpx;
  left: 50%;
  width: 530rpx;
  height: 440rpx;
  transform: translateX(-50%);
  background: radial-gradient(ellipse, rgba(174, 120, 233, .23), transparent 68%);
  pointer-events: none;
}

.permission-emblem {
  position: relative;
  display: flex;
  width: 176rpx;
  height: 176rpx;
  margin: 0 auto 30rpx;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(203, 172, 247, .32);
  border-radius: 50%;
  background: radial-gradient(circle at 40% 30%, rgba(220, 179, 247, .14), rgba(137, 94, 189, .06) 70%);
  color: #e3c2f8;
  box-shadow: 0 0 54rpx rgba(169, 115, 224, .15), inset 0 0 34rpx rgba(191, 153, 231, .05);
}

.permission-emblem__ring {
  position: absolute;
  inset: 12rpx;
  border: 1px solid rgba(212, 180, 250, .12);
  border-radius: 50%;
}

.permission-emblem__art {
  width: 100rpx;
  height: 100rpx;
}

.permission-copy {
  position: relative;
  text-align: center;
}

.permission-title {
  display: block;
  color: #f6edff;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -.4rpx;
}

.permission-description {
  display: block;
  margin-top: 20rpx;
  color: #c7bbd5;
  font-size: 27rpx;
  font-weight: 400;
  line-height: 1.65;
}

.permission-note {
  display: block;
  margin: 22rpx 0 0;
  color: #a99bbf;
  font-size: 23rpx;
  line-height: 1.6;
}

.permission-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 34rpx;
}

.permission-action {
  display: flex;
  min-height: 98rpx;
  min-width: 0;
  padding: 18rpx 16rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 26rpx;
  font-size: 29rpx;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  transition: opacity .18s ease, transform .18s ease;
}

.permission-action--primary {
  background: linear-gradient(105deg, #ffcfb7 0%, #f0b5e2 53%, #d7a2f7 100%);
  color: #381c40;
  box-shadow: 0 7rpx 24rpx rgba(209, 137, 217, .14);
}

.permission-action--secondary {
  border: 1px solid rgba(190, 170, 222, .26);
  background: rgba(181, 153, 221, .07);
  color: #d9cee8;
}

.permission-action:active {
  transform: scale(.98);
}

.permission-action:focus-visible {
  outline: 2px solid #e3c2f8;
  outline-offset: 4px;
}

.permission-action--disabled {
  opacity: .5;
  pointer-events: none;
}

.permission-feedback {
  display: block;
  margin-top: 22rpx;
  color: #f0c0dc;
  font-size: 24rpx;
  line-height: 1.6;
  text-align: center;
}

@keyframes permission-veil {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes permission-rise {
  from { opacity: 0; transform: translateY(14rpx) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .permission-overlay, .permission-card { animation: none; }
  .permission-action { transition: none; }
  .permission-action:active { transform: none; }
}
</style>

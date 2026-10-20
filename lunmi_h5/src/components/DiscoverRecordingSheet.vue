<template>
  <transition name="recording-sheet-fade">
    <view v-if="visible" class="recording-sheet" :style="theme_style" role="dialog" aria-modal="true" :aria-label="$t('Record voice')">
      <view class="recording-orb" :class="{ 'recording-orb--error': recorder_error }">
        <view class="recording-orb__inner">
          <image class="recording-wave" src="/static/icons/record_wave.svg" mode="aspectFit" />
        </view>
      </view>
      <text v-if="recorder_error" class="recording-error" role="alert">{{ $t(recorder_error) }}</text>
      <text v-else class="recording-time">{{ $t(formatted_time) }}/0:60</text>
      <view v-if="recorder_error" class="retry-button" role="button" @click="start_recording">
        <text>{{ $t('Try again') }}</text>
      </view>
      <view class="recording-actions">
        <view class="recording-action recording-action--cancel" role="button" :aria-label="$t('Cancel recording')" @click="cancel_recording">
          <image class="recording-action__icon" src="/static/icons/record_cancel.svg" mode="aspectFit" />
        </view>
        <view
          class="recording-action recording-action--confirm"
          :class="{ 'recording-action--disabled': !is_recording || is_processing }"
          role="button"
          :aria-label="$t('Confirm recording')"
          :aria-disabled="!is_recording || is_processing"
          @click="confirm_recording"
        >
          <image class="recording-action__icon" src="/static/icons/record_confirm.svg" mode="aspectFit" />
        </view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { start_local_voice_recording } from '@/utils/localVoiceRecorder'

const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'recorded'])

const elapsed_seconds = ref(0)
const is_recording = ref(false)
const is_processing = ref(false)
const recorder_error = ref('')
let recorder_controller = null
let recording_timer = null
let request_id = 0

const formatted_time = computed(() => `0:${String(elapsed_seconds.value).padStart(2, '0')}`)
const theme_style = {
  '--recording-scrim': theme.colors.surface.scrim_soft,
  '--recording-surface': theme.colors.surface.card_strong,
  '--recording-ring': theme.colors.surface.border,
  '--recording-title': theme.colors.text.title,
  '--recording-inverse': theme.colors.text.inverse,
  '--recording-danger': theme.colors.status.danger,
  '--recording-success': theme.colors.status.success,
  '--recording-accent': theme.colors.button.primary
}

const clear_recording_timer = () => {
  clearInterval(recording_timer)
  recording_timer = null
}

const release_recorder = async () => {
  request_id += 1
  clear_recording_timer()
  const active_controller = recorder_controller
  recorder_controller = null
  is_recording.value = false
  if (active_controller) await active_controller.cancel().catch(() => null)
}

const start_recording = async () => {
  await release_recorder()
  const current_request_id = request_id
  elapsed_seconds.value = 0
  recorder_error.value = ''
  is_processing.value = true
  try {
    const controller = await start_local_voice_recording()
    if (!props.visible || current_request_id !== request_id) {
      await controller.cancel().catch(() => null)
      return
    }
    recorder_controller = controller
    is_recording.value = true
    recording_timer = setInterval(() => {
      elapsed_seconds.value = Math.min(60, elapsed_seconds.value + 1)
      if (elapsed_seconds.value >= 60) void confirm_recording()
    }, 1000)
  } catch (error) {
    recorder_error.value = error?.message || 'Unable to start recording.'
  } finally {
    if (current_request_id === request_id) is_processing.value = false
  }
}

const cancel_recording = async () => {
  await release_recorder()
  emit('close')
}

const confirm_recording = async () => {
  if (!recorder_controller || !is_recording.value || is_processing.value) return
  is_processing.value = true
  clear_recording_timer()
  const controller = recorder_controller
  recorder_controller = null
  is_recording.value = false
  try {
    const blob = await controller.stop()
    if (!blob) throw new Error('The recording is empty.')
    emit('recorded', {
      blob,
      duration_seconds: Math.max(1, Math.min(60, elapsed_seconds.value))
    })
    emit('close')
  } catch (error) {
    recorder_error.value = error?.message || 'Unable to save this recording.'
  } finally {
    is_processing.value = false
  }
}

watch(() => props.visible, (visible) => {
  if (visible) void start_recording()
  else void release_recorder()
})

onBeforeUnmount(() => { void release_recorder() })
</script>

<style scoped lang="scss">
.recording-sheet {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  box-sizing: border-box;
  padding: calc(var(--page-safe-top) + 440rpx) 80rpx calc(var(--page-safe-bottom) + 190rpx);
  align-items: center;
  background: var(--recording-scrim);
  flex-direction: column;
}

.recording-orb {
  display: flex;
  box-sizing: border-box;
  width: 280rpx;
  height: 280rpx;
  padding: 34rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--recording-ring);
}

.recording-orb__inner {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--recording-surface);
}

.recording-orb--error {
  opacity: 0.72;
}

.recording-wave {
  width: 62rpx;
  height: 62rpx;
}

.recording-time,
.recording-error {
  margin-top: 24rpx;
  color: var(--recording-inverse);
  font-size: 34rpx;
  font-weight: 700;
  line-height: 44rpx;
  text-align: center;
}

.recording-error {
  max-width: 520rpx;
  font-size: 26rpx;
  line-height: 38rpx;
}

.retry-button {
  display: flex;
  min-width: 170rpx;
  height: 62rpx;
  margin-top: 22rpx;
  padding: 0 24rpx;
  align-items: center;
  justify-content: center;
  border-radius: 32rpx;
  background: var(--recording-accent);
  color: var(--recording-title);
  font-size: 25rpx;
  font-weight: 700;
}

.recording-actions {
  display: flex;
  width: 100%;
  max-width: 490rpx;
  margin-top: 64rpx;
  align-items: center;
  justify-content: space-between;
}

.recording-action {
  display: flex;
  width: 144rpx;
  height: 144rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.recording-action--cancel {
  background: var(--recording-danger);
}

.recording-action--confirm {
  background: var(--recording-success);
}

.recording-action--disabled {
  opacity: 0.45;
}

.recording-action__icon {
  width: 72rpx;
  height: 72rpx;
}

.recording-sheet-fade-enter-active,
.recording-sheet-fade-leave-active {
  transition: opacity 180ms ease;
}

.recording-sheet-fade-enter-from,
.recording-sheet-fade-leave-to {
  opacity: 0;
}
</style>

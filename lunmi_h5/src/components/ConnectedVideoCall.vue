<template>
  <view class="connected-call-view" :style="theme_style">
    <video
      v-if="CALL_CONNECTION_ENABLED"
      class="connected-remote-video"
      :src="VIDEO_CALL_MEDIA_URL"
      autoplay
      loop
      playsinline
      webkit-playsinline
      object-fit="cover"
      :controls="false"
      :muted="false"
      :show-center-play-btn="false"
      :show-play-btn="false"
      :enable-progress-gesture="false"
      @error="remote_video_error = true"
    />
    <view class="connected-shade" />
    <view v-if="CALL_CONNECTION_ENABLED" class="self-preview">
      <view :id="preview_host_id" class="self-preview__camera" />
      <view v-if="camera_busy" class="self-preview__status">{{ $t('Opening camera...') }}</view>
      <view v-else-if="camera_error" class="self-preview__status">{{ $t(camera_error) }}</view>
    </view>
    <view v-if="!CALL_CONNECTION_ENABLED || remote_video_error || errorMessage" class="connected-error" role="alert">
      {{ $t(!CALL_CONNECTION_ENABLED ? 'This call is unavailable.' : errorMessage || 'Video unavailable') }}
    </view>
    <view class="connected-controls">
      <view
        class="connected-control"
        role="button"
        :aria-label="$t('Switch camera')"
        :aria-disabled="camera_busy || busy"
        @click="switch_camera"
      >
        <image src="/static/icons/call/arrow-repeat-on-media.svg" mode="aspectFit" />
      </view>
      <view
        class="connected-control"
        :class="{ 'connected-control--off': microphone_muted }"
        role="button"
        :aria-label="$t(microphone_muted ? 'Unmute microphone' : 'Mute microphone')"
        :aria-pressed="microphone_muted"
        :aria-disabled="busy"
        @click="toggle_microphone"
      >
        <image
          :src="microphone_muted ? '/static/icons/call/mic-off-on-media.svg' : '/static/icons/call/mic-on-media.svg'"
          mode="aspectFit"
        />
      </view>
      <view
        class="connected-control connected-control--hangup"
        role="button"
        :aria-label="$t('End video call')"
        :aria-disabled="busy"
        @click="request_hang_up"
      >
        <image src="/static/icons/call/x-primary.svg" mode="aspectFit" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { CALL_CONNECTION_ENABLED, VIDEO_CALL_MEDIA_URL } from '@/config/callMedia'
import theme from '@/config/theme.json'
import { create_call_camera_preview } from '@/utils/callCameraPreview'

const props = defineProps({
  busy: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' }
})
const emit = defineEmits(['hangup'])

const microphone_muted = ref(false)
const camera_facing = ref('front')
const camera_busy = ref(false)
const camera_error = ref('')
const remote_video_error = ref(false)
const preview_host_id = `connected-call-self-camera-${getCurrentInstance()?.uid || 'active'}`
const camera_preview = create_call_camera_preview({ host_id: preview_host_id })
let mounted = false

const open_camera = async () => {
  if (!CALL_CONNECTION_ENABLED || !mounted || camera_busy.value || props.busy) return
  camera_busy.value = true
  camera_error.value = ''
  try {
    const result = await camera_preview.open(camera_facing.value)
    if (mounted && result?.success) camera_facing.value = result.facing
  } catch (error) {
    if (mounted && error?.name !== 'AbortError') {
      camera_error.value = ['NotAllowedError', 'PermissionDeniedError'].includes(error?.name)
        ? 'Camera access required'
        : (error?.message || 'Camera unavailable')
    }
  } finally {
    if (mounted) camera_busy.value = false
  }
}

const start_camera = () => nextTick(open_camera)

const stop_camera = () => {
  camera_preview.stop()
  camera_busy.value = false
}

const switch_camera = async () => {
  if (!CALL_CONNECTION_ENABLED || !mounted || camera_busy.value || props.busy) return
  camera_busy.value = true
  camera_error.value = ''
  try {
    const result = await camera_preview.switch_camera()
    if (mounted && result?.success) camera_facing.value = result.facing
  } catch (error) {
    if (mounted && error?.name !== 'AbortError') {
      camera_error.value = error?.message || 'Unable to switch camera'
    }
  } finally {
    if (mounted) camera_busy.value = false
  }
}

const toggle_microphone = () => {
  if (CALL_CONNECTION_ENABLED && !props.busy) microphone_muted.value = !microphone_muted.value
}

const request_hang_up = () => {
  if (props.busy) return
  stop_camera()
  emit('hangup')
}

onMounted(() => {
  mounted = true
  start_camera()
})

onBeforeUnmount(() => {
  mounted = false
  stop_camera()
})

defineExpose({ start_camera, stop_camera })

const theme_style = {
  '--connected-background': theme.colors.call.background,
  '--connected-shade': theme.colors.video_detail.shade,
  '--connected-control': theme.colors.call_control.enabled.background,
  '--connected-control-text': theme.colors.call_control.enabled.text,
  '--connected-control-off': theme.colors.call_control.off.background,
  '--connected-control-off-text': theme.colors.call_control.off.text,
  '--connected-danger': theme.colors.status.danger,
  '--connected-outline': theme.colors.surface.outline,
  '--connected-scrim': theme.colors.surface.scrim_soft,
  '--connected-text': theme.colors.text.on_media,
  '--connected-error': theme.colors.status.error,
  '--connected-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
@use '../styles/connected-call';
</style>

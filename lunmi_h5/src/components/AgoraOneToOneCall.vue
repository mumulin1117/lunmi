<template>
  <view class="agora-call" :style="theme_style">
    <view class="call-stage">
      <view :id="remote_player_id" class="remote-player" />
      <view v-show="!has_remote_video" class="remote-placeholder">
        <text class="remote-placeholder__title">{{ $t(remote_placeholder_title) }}</text>
        <text class="remote-placeholder__copy">{{ $t(remote_placeholder_copy) }}</text>
      </view>
      <view class="local-preview">
        <view :id="local_player_id" class="local-player" />
        <view v-show="!is_camera_enabled" class="local-camera-off">
          <text>{{ $t('Camera off') }}</text>
        </view>
        <text class="local-label">{{ $t('You') }}</text>
      </view>
    </view>
    <view class="call-status">
      <view class="status-dot" :class="`status-dot--${call_state}`" />
      <text>{{ $t(status_text) }}</text>
    </view>
    <text v-show="error_message" class="call-error">{{ $t(error_message) }}</text>
    <view
      v-show="needs_media_resume"
      class="resume-action"
      role="button"
      @click="resume_remote_media"
    >
      {{ $t('Tap to resume audio and video') }}
    </view>
    <view class="call-controls">
      <view
        v-if="!is_call_active"
        class="primary-action"
        :class="{ 'control--disabled': is_busy }"
        role="button"
        :aria-disabled="is_busy"
        @click="start_call"
      >
        {{ $t(is_busy ? 'Connecting...' : 'Start call') }}
      </view>
      <template v-else>
        <view
          v-if="call_state === CALL_STATE.CONNECTED"
          class="secondary-action"
          :class="{ 'control--disabled': is_audio_pending }"
          role="button"
          :aria-disabled="is_audio_pending"
          @click="toggle_microphone"
        >
          {{ $t(is_microphone_enabled ? 'Mute' : 'Unmute') }}
        </view>
        <view
          v-if="call_state === CALL_STATE.CONNECTED"
          class="secondary-action"
          :class="{ 'control--disabled': is_video_pending }"
          role="button"
          :aria-disabled="is_video_pending"
          @click="toggle_camera"
        >
          {{ $t(is_camera_enabled ? 'Camera off' : 'Camera on') }}
        </view>
        <view
          class="end-action"
          :class="{ 'control--disabled': call_state === CALL_STATE.LEAVING }"
          role="button"
          :aria-disabled="call_state === CALL_STATE.LEAVING"
          @click="leave_call"
        >
          {{ $t(call_state === CALL_STATE.LEAVING ? 'Ending...' : 'End call') }}
        </view>
      </template>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AgoraRTC from 'agora-rtc-sdk-ng'
import theme from '@/config/theme.json'
import { CALL_CONNECTION_ENABLED } from '@/config/callMedia'
import { ensure_ios_permissions } from '@/utils/iosPermissionBridge'

// Fill these values with the matching Agora project credentials before use.
// For a secured project, token, channel, and uid must match the server-generated token.
const AGORA_CONFIG = Object.freeze({
  app_id: '7e80915463174a68a8b7c623c20cdc46',
  channel: 'test_a',
  token: '007eJxTYLjbvEvUXGTdTAX2W3tuOMcxTsq32/Zn7U+9g/ldty5cMz6mwGCeamFgaWhqYmZsaG6SaGaRaJFknmxmZJxsZJCckmxixq8xL6shkJGBd9FxZkYGCATx2RhKUotL4hMZGACssCBL',
  uid: 9527
})

const CALL_STATE = Object.freeze({
  IDLE: 'idle',
  JOINING: 'joining',
  CONNECTED: 'connected',
  LEAVING: 'leaving',
  ERROR: 'error'
})

const emit = defineEmits(['joined', 'left', 'error'])
const component_id = Math.random().toString(36).slice(2, 10)
const local_player_id = `agora-local-player-${component_id}`
const remote_player_id = `agora-remote-player-${component_id}`
const call_state = ref(CALL_STATE.IDLE)
const error_message = ref('')
const has_remote_user = ref(false)
const has_remote_video = ref(false)
const needs_media_resume = ref(false)
const is_microphone_enabled = ref(true)
const is_camera_enabled = ref(true)
const is_audio_pending = ref(false)
const is_video_pending = ref(false)
let rtc_client = null
let local_audio_track = null
let local_video_track = null
let remote_user = null
let call_generation = 0
let is_unmounted = false

const theme_style = {
  '--call-background': theme.colors.page.background,
  '--call-surface': theme.colors.surface.card,
  '--call-surface-deep': theme.colors.surface.deep,
  '--call-border': theme.colors.surface.border,
  '--call-title': theme.colors.text.title,
  '--call-secondary': theme.colors.text.secondary,
  '--call-primary': theme.colors.button.primary,
  '--call-primary-text': theme.colors.button.text,
  '--call-ghost-border': theme.colors.button.ghost.border,
  '--call-ghost-text': theme.colors.button.ghost.text,
  '--call-danger': theme.colors.dialog.danger.background,
  '--call-danger-text': theme.colors.dialog.danger.text,
  '--call-success': theme.colors.status.success
}

const is_busy = computed(() => (
  call_state.value === CALL_STATE.JOINING
  || call_state.value === CALL_STATE.LEAVING
))
const is_call_active = computed(() => (
  call_state.value === CALL_STATE.JOINING
  || call_state.value === CALL_STATE.CONNECTED
  || call_state.value === CALL_STATE.LEAVING
))
const status_text = computed(() => {
  if (call_state.value === CALL_STATE.JOINING) return 'Connecting...'
  if (call_state.value === CALL_STATE.LEAVING) return 'Ending call...'
  if (call_state.value === CALL_STATE.ERROR) return 'Call unavailable'
  if (call_state.value === CALL_STATE.CONNECTED && has_remote_user.value) return 'Connected'
  if (call_state.value === CALL_STATE.CONNECTED) return 'Waiting for the other person...'
  return 'Ready to call'
})
const remote_placeholder_title = computed(() => (
  call_state.value === CALL_STATE.CONNECTED
    ? 'Waiting for the other person'
    : 'One-to-one video call'
))
const remote_placeholder_copy = computed(() => (
  call_state.value === CALL_STATE.CONNECTED
    ? 'Ask them to join the same channel.'
    : 'Start the call to use your camera and microphone.'
))

const normalize_token = () => AGORA_CONFIG.token.trim() || null
const normalize_uid = () => {
  if (typeof AGORA_CONFIG.uid === 'number') return AGORA_CONFIG.uid
  const uid = `${AGORA_CONFIG.uid || ''}`.trim()
  return uid || null
}

const validate_configuration = () => {
  if (!AGORA_CONFIG.app_id.trim() || !AGORA_CONFIG.channel.trim()) {
    throw new Error('Fill in app_id and channel in AGORA_CONFIG before starting a call.')
  }
}

const normalize_call_error = (error) => {
  const error_name = `${error?.name || error?.code || ''}`
  if (/NotAllowed|PERMISSION_DENIED/i.test(error_name)) {
    return 'Camera and microphone access is required to start the call.'
  }
  if (/NotFound|DEVICE_NOT_FOUND/i.test(error_name)) {
    return 'No available camera or microphone was found.'
  }
  if (/NotSupported|WEB_SECURITY_RESTRICT/i.test(error_name)) {
    return 'Real-time calls require HTTPS or localhost.'
  }
  return error?.message || 'Unable to start the call. Please try again.'
}

const stop_remote_tracks = () => {
  remote_user?.videoTrack?.stop()
  remote_user?.audioTrack?.stop()
  remote_user = null
  has_remote_user.value = false
  has_remote_video.value = false
  needs_media_resume.value = false
}

const close_local_tracks = () => {
  local_video_track?.stop()
  local_video_track?.close()
  local_audio_track?.stop()
  local_audio_track?.close()
  local_video_track = null
  local_audio_track = null
  is_microphone_enabled.value = true
  is_camera_enabled.value = true
}

const detach_client_events = (client) => {
  if (!client) return
  client.off('user-published', handle_user_published)
  client.off('user-unpublished', handle_user_unpublished)
  client.off('user-left', handle_user_left)
}

const reset_call_resources = async ({ update_state = true } = {}) => {
  call_generation += 1
  const client = rtc_client
  rtc_client = null
  detach_client_events(client)
  stop_remote_tracks()
  close_local_tracks()
  if (client) {
    try {
      await client.leave()
    } catch {
      // The SDK may already be disconnected while the page is being removed.
    }
  }
  if (update_state && !is_unmounted) call_state.value = CALL_STATE.IDLE
}

async function handle_user_published(user, media_type) {
  const client = rtc_client
  if (!client) return
  if (remote_user && `${remote_user.uid}` !== `${user.uid}`) return

  try {
    await client.subscribe(user, media_type)
    if (client !== rtc_client || is_unmounted) return
    remote_user = user
    has_remote_user.value = true
    if (media_type === 'video') {
      has_remote_video.value = true
      user.videoTrack?.play(remote_player_id, { fit: 'cover' })
    }
    if (media_type === 'audio') user.audioTrack?.play()
  } catch (error) {
    if (is_unmounted) return
    error_message.value = normalize_call_error(error)
    emit('error', error)
  }
}

function handle_user_unpublished(user, media_type) {
  if (!remote_user || `${remote_user.uid}` !== `${user.uid}`) return
  if (media_type === 'video') {
    user.videoTrack?.stop()
    has_remote_video.value = false
  }
  if (media_type === 'audio') user.audioTrack?.stop()
}

function handle_user_left(user) {
  if (!remote_user || `${remote_user.uid}` !== `${user.uid}`) return
  stop_remote_tracks()
}

const handle_autoplay_failed = () => {
  if (!is_unmounted && is_call_active.value) needs_media_resume.value = true
}

const start_call = async () => {
  if (!CALL_CONNECTION_ENABLED) {
    error_message.value = 'This call is unavailable.'
    call_state.value = CALL_STATE.ERROR
    return
  }
  if (is_busy.value || call_state.value === CALL_STATE.CONNECTED) return
  error_message.value = ''
  let generation = 0

  try {
    validate_configuration()
    if (!AgoraRTC.checkSystemRequirements()) {
      throw new Error('This browser does not support the required real-time media features.')
    }

    const permissions = await ensure_ios_permissions(['camera', 'microphone'], {
      reason: 'Allow this app to use the camera and microphone for video calls.'
    })
    if (!permissions.granted && !permissions.unavailable) {
      const permission_error = new Error('Camera and microphone access is required to start the call.')
      permission_error.name = 'NotAllowedError'
      throw permission_error
    }

    generation = ++call_generation
    call_state.value = CALL_STATE.JOINING
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
    rtc_client = client
    client.on('user-published', handle_user_published)
    client.on('user-unpublished', handle_user_unpublished)
    client.on('user-left', handle_user_left)

    const assigned_uid = await client.join(
      AGORA_CONFIG.app_id.trim(),
      AGORA_CONFIG.channel.trim(),
      normalize_token(),
      normalize_uid()
    )
    if (generation !== call_generation || is_unmounted) {
      await reset_call_resources({ update_state: false })
      return
    }

    const tracks = await AgoraRTC.createMicrophoneAndCameraTracks()
    if (generation !== call_generation || is_unmounted) {
      tracks.forEach((track) => track.close())
      await reset_call_resources({ update_state: false })
      return
    }

    local_audio_track = tracks[0]
    local_video_track = tracks[1]
    local_video_track.play(local_player_id, { fit: 'cover', mirror: true })
    await client.publish(tracks)
    if (generation !== call_generation || is_unmounted) return
    call_state.value = CALL_STATE.CONNECTED
    emit('joined', { uid: assigned_uid, channel: AGORA_CONFIG.channel.trim() })
  } catch (error) {
    if (is_unmounted) return
    if (generation && generation !== call_generation) return
    await reset_call_resources({ update_state: false })
    call_state.value = CALL_STATE.ERROR
    error_message.value = normalize_call_error(error)
    emit('error', error)
  }
}

const leave_call = async () => {
  if (!is_call_active.value || call_state.value === CALL_STATE.LEAVING) return
  call_state.value = CALL_STATE.LEAVING
  error_message.value = ''
  await reset_call_resources({ update_state: true })
  if (!is_unmounted) emit('left')
}

const toggle_microphone = async () => {
  if (!local_audio_track || is_audio_pending.value) return
  is_audio_pending.value = true
  try {
    const next_enabled = !is_microphone_enabled.value
    await local_audio_track.setEnabled(next_enabled)
    is_microphone_enabled.value = next_enabled
  } catch (error) {
    error_message.value = normalize_call_error(error)
    emit('error', error)
  } finally {
    is_audio_pending.value = false
  }
}

const toggle_camera = async () => {
  if (!local_video_track || is_video_pending.value) return
  is_video_pending.value = true
  try {
    const next_enabled = !is_camera_enabled.value
    await local_video_track.setEnabled(next_enabled)
    is_camera_enabled.value = next_enabled
  } catch (error) {
    error_message.value = normalize_call_error(error)
    emit('error', error)
  } finally {
    is_video_pending.value = false
  }
}

const resume_remote_media = async () => {
  try {
    await AgoraRTC.resumeAudioContext()
    remote_user?.audioTrack?.play()
    if (remote_user?.videoTrack && has_remote_video.value) {
      remote_user.videoTrack.play(remote_player_id, { fit: 'cover' })
    }
    needs_media_resume.value = false
  } catch (error) {
    error_message.value = normalize_call_error(error)
    emit('error', error)
  }
}

onMounted(() => {
  AgoraRTC.on('autoplay-failed', handle_autoplay_failed)
})

onBeforeUnmount(() => {
  is_unmounted = true
  AgoraRTC.off('autoplay-failed', handle_autoplay_failed)
  void reset_call_resources({ update_state: false })
})
</script>

<style scoped lang="scss">
.agora-call {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  padding: 28rpx;
  border: 1px solid var(--call-border);
  border-radius: 32rpx;
  background: var(--call-background);
  color: var(--call-title);
  flex-direction: column;
}

.call-stage {
  position: relative;
  width: 100%;
  height: 720rpx;
  overflow: hidden;
  border-radius: 28rpx;
  background: var(--call-surface-deep);
}

.remote-player {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
}

.remote-placeholder {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  text-align: center;
  flex-direction: column;
  pointer-events: none;
}

.remote-placeholder__title { font-size: 32rpx; }

.remote-placeholder__copy {
  margin-top: 14rpx;
  color: var(--call-secondary);
  font-size: 23rpx;
  line-height: 34rpx;
}

.local-preview {
  position: absolute;
  z-index: 3;
  top: 24rpx;
  right: 24rpx;
  width: 190rpx;
  height: 260rpx;
  overflow: hidden;
  border: 2px solid var(--call-border);
  border-radius: 22rpx;
  background: var(--call-surface);
}

.local-player {
  width: 100%;
  height: 100%;
}

.local-camera-off {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--call-surface);
  color: var(--call-secondary);
  font-size: 20rpx;
}

.local-label {
  position: absolute;
  z-index: 3;
  bottom: 10rpx;
  left: 12rpx;
  padding: 6rpx 10rpx;
  border-radius: 10rpx;
  background: var(--call-surface-deep);
  color: var(--call-title);
  font-size: 18rpx;
}

.call-status {
  display: flex;
  min-height: 64rpx;
  align-items: center;
  color: var(--call-secondary);
  font-size: 23rpx;
}

.status-dot {
  width: 14rpx;
  height: 14rpx;
  margin-right: 12rpx;
  border-radius: 50%;
  background: var(--call-secondary);
}

.status-dot--connected { background: var(--call-success); }

.status-dot--error { background: var(--call-danger); }

.call-error {
  padding: 16rpx 18rpx;
  border-radius: 18rpx;
  background: var(--call-surface);
  color: var(--call-danger);
  font-size: 21rpx;
  line-height: 32rpx;
}

.resume-action {
  height: 76rpx;
  margin-top: 16rpx;
  border: 1px solid var(--call-primary);
  border-radius: 22rpx;
  color: var(--call-primary);
  font-size: 22rpx;
  line-height: 76rpx;
  text-align: center;
}

.call-controls {
  display: flex;
  gap: 14rpx;
  margin-top: 20rpx;
}

.primary-action,
.secondary-action,
.end-action {
  height: 82rpx;
  border-radius: 22rpx;
  font-size: 22rpx;
  line-height: 82rpx;
  text-align: center;
  flex: 1;
}

.primary-action {
  background: var(--call-primary);
  color: var(--call-primary-text);
}

.secondary-action {
  border: 1px solid var(--call-ghost-border);
  color: var(--call-ghost-text);
}

.end-action {
  background: var(--call-danger);
  color: var(--call-danger-text);
}

.control--disabled {
  opacity: .58;
  pointer-events: none;
}

.remote-player :deep(video),
.local-player :deep(video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}
</style>

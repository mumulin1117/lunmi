<template>
  <PageTransition ref="page_transition" class="active-call-page" :style="theme_style">
    <ConnectedVideoCall
      v-if="CALL_CONNECTION_ENABLED && is_connected"
      ref="connected_video"
      :busy="is_navigating_back"
      @hangup="end_call"
    />
    <view v-else class="call-page">
      <PostMedia
        v-if="avatar_url"
        class="call-page__backdrop"
        :media-url="avatar_url"
        content-type="image"
        fit="cover"
        aria-hidden="true"
      />
      <view class="call-page__scrim" aria-hidden="true" />
      <view class="call-stage">
        <view class="call-portrait">
          <view class="call-ripple" aria-hidden="true" />
          <view class="call-ripple call-ripple--delay-1" aria-hidden="true" />
          <view class="call-ripple call-ripple--delay-2" aria-hidden="true" />
          <UserAvatar class="call-portrait__avatar" :source="avatar_url" />
        </view>
        <text class="call-name">{{ display_name }}</text>
        <text class="call-status">{{ $t(waiting_copy) }}</text>
      </view>
      <view class="call-footer">
        <view
          class="hangup-button"
          role="button"
          :aria-label="$t('Hang up')"
          :aria-disabled="is_navigating_back"
          :class="{ 'hangup-button--disabled': is_navigating_back }"
          @click="end_call"
        >
          <image class="hangup-button__icon" src="/static/icons/call/x-primary.svg" mode="aspectFit" />
        </view>
      </view>
    </view>
  </PageTransition>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { onHide, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { CALL_CONNECTION_ENABLED } from '@/config/callMedia'
import ConnectedVideoCall from '@/components/ConnectedVideoCall.vue'
import PageTransition from '@/components/PageTransition.vue'
import PostMedia from '@/components/PostMedia.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { create_call_sound_controller } from '@/utils/callSounds'

const page_transition = ref(null)
const connected_video = ref(null)
const user_name = ref('')
const avatar_url = ref('')
const waiting_dot_count = ref(0)
const default_can_connect = CALL_CONNECTION_ENABLED
const is_connected = ref(false)
const can_connect = ref(default_can_connect)
const is_navigating_back = ref(false)
const call_sounds = create_call_sound_controller()
let waiting_timer = null
let auto_end_timer = null
let connect_timer = null
let visible = false
const display_name = computed(() => user_name.value || 'Community member')
const waiting_copy = computed(() => `Waiting for connection${'.'.repeat(waiting_dot_count.value)}`)
const theme_style = {
  '--page-background': theme.colors.call.background,
  '--call-scrim': theme.colors.surface.scrim_soft,
  '--call-name-color': theme.colors.text.on_media,
  '--call-status-color': theme.colors.text.inverse_soft,
  '--call-ripple-color': theme.colors.text.on_media,
  '--hangup-background': theme.colors.status.danger
}

const decode_query_value = (value) => {
  const text = `${value || ''}`
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

const parse_boolean_parameter = (value, fallback) => {
  const normalized = String(Array.isArray(value) ? value[0] : value ?? '').trim().toLowerCase()
  if (['true', '1'].includes(normalized)) return true
  if (['false', '0'].includes(normalized)) return false
  return fallback
}

const clear_call_timers = () => {
  clearInterval(waiting_timer)
  waiting_timer = null
  clearTimeout(auto_end_timer)
  auto_end_timer = null
  clearTimeout(connect_timer)
  connect_timer = null
  call_sounds.stop_waiting()
}

const connect_video_call = () => {
  connect_timer = null
  if (!CALL_CONNECTION_ENABLED || !visible || is_navigating_back.value || !can_connect.value) return
  clearTimeout(auto_end_timer)
  auto_end_timer = null
  call_sounds.stop_waiting()
  is_connected.value = true
  nextTick(() => connected_video.value?.start_camera())
}

const end_call = () => {
  if (is_navigating_back.value) return
  is_navigating_back.value = true
  connected_video.value?.stop_camera()
  clear_call_timers()
  call_sounds.play_ended()
  page_transition.value?.navigate_back({
    fail: () => {
      is_navigating_back.value = false
    }
  })
}

const start_waiting = () => {
  clear_call_timers()
  if (!visible || is_navigating_back.value) return
  if (is_connected.value) {
    nextTick(() => connected_video.value?.start_camera())
    return
  }
  call_sounds.start_waiting('video')
  waiting_timer = setInterval(() => {
    waiting_dot_count.value = (waiting_dot_count.value + 1) % 4
  }, 450)
  auto_end_timer = setTimeout(end_call, 8000 + Math.floor(Math.random() * 4001))
  if (can_connect.value) {
    connect_timer = setTimeout(connect_video_call, 3000 + Math.floor(Math.random() * 3001))
  }
}

onLoad((query = {}) => {
  user_name.value = decode_query_value(query.user_name)
  avatar_url.value = decode_query_value(query.avatar_url)
  can_connect.value = CALL_CONNECTION_ENABLED && parse_boolean_parameter(query.can_connect, default_can_connect)
})

onShow(() => {
  visible = true
  is_navigating_back.value = false
  start_waiting()
})

const cleanup = () => {
  visible = false
  connected_video.value?.stop_camera()
  clear_call_timers()
  call_sounds.stop_all()
}

onHide(cleanup)
onBeforeUnmount(cleanup)
</script>

<style scoped lang="scss">
.active-call-page {
  position: relative;
  background: var(--page-background);
}

.call-page {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.call-page__backdrop {
  position: absolute;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
}

.call-page__scrim {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: var(--call-scrim);
}

.call-stage {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 0;
  align-items: center;
  justify-content: center;
  flex: 1;
  flex-direction: column;
}

.call-portrait {
  position: relative;
  display: flex;
  width: 280rpx;
  height: 280rpx;
  align-items: center;
  justify-content: center;
}

.call-ripple {
  position: absolute;
  z-index: 0;
  width: 200rpx;
  height: 200rpx;
  border: 2px solid var(--call-ripple-color);
  border-radius: 50%;
  opacity: .45;
  animation: call-ripple 2.4s cubic-bezier(.22, .61, .36, 1) infinite;
  pointer-events: none;
  will-change: opacity, transform;
}

.call-ripple--delay-1 {
  animation-delay: .8s;
}

.call-ripple--delay-2 {
  animation-delay: 1.6s;
}

.call-portrait__avatar {
  position: relative;
  z-index: 1;
  width: 168rpx;
  height: 168rpx;
  overflow: hidden;
  border-radius: 48rpx;
}

.call-name {
  position: relative;
  z-index: 2;
  margin-top: 36rpx;
  color: var(--call-name-color);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 56rpx;
  text-align: center;
}

.call-status {
  margin-top: 12rpx;
  color: var(--call-status-color);
  font-size: 28rpx;
  line-height: 40rpx;
  text-align: center;
}

.call-footer {
  position: relative;
  z-index: 2;
  display: flex;
  padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 64rpx);
  align-items: center;
  justify-content: center;
  flex: none;
}

.hangup-button {
  display: flex;
  width: 128rpx;
  height: 128rpx;
  align-items: center;
  justify-content: center;
  border-radius: 64rpx;
  background: var(--hangup-background);
}

.hangup-button--disabled {
  opacity: .7;
  pointer-events: none;
}

.hangup-button__icon {
  width: 52rpx;
  height: 52rpx;
}

@keyframes call-ripple {
  0% {
    opacity: .5;
    transform: scale(1);
  }

  100% {
    opacity: 0;
    transform: scale(2.35);
  }
}
</style>

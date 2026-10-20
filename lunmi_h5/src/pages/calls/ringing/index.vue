<template>
  <PageTransition ref="page_transition" class="ringing-call-page" :style="theme_style">
    <view class="call-page">
      <PostMedia
        v-if="callee_avatar_url"
        class="call-page__backdrop"
        :media-url="callee_avatar_url"
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
          <UserAvatar class="call-portrait__avatar" :source="callee_avatar_url" />
        </view>
        <text class="call-name">{{ callee_name === 'Community member' ? $t(callee_name) : callee_name }}</text>
        <text class="call-status">{{ $t(status_copy) }}</text>
      </view>
      <view class="call-footer">
        <view
          class="hangup-button"
          role="button"
          :aria-label="$t('Cancel call')"
          :aria-disabled="is_leaving"
          :class="{ 'hangup-button--disabled': is_leaving }"
          @click="cancel_call"
        >
          <image class="hangup-button__icon" src="/static/icons/call/x-primary.svg" mode="aspectFit" />
        </view>
      </view>
    </view>
  </PageTransition>
</template>

<script setup>
import { t } from '@/utils/i18n'

import { computed, onBeforeUnmount, ref } from 'vue'
import { onHide, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { CALL_CONNECTION_ENABLED } from '@/config/callMedia'
import PageTransition from '@/components/PageTransition.vue'
import PostMedia from '@/components/PostMedia.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import {
  build_connected_url,
  normalize_call_return_url,
  plan_ringing_schedule,
  read_call_route_context,
  ringing_end_toast,
  ringing_status_label,
  RINGING_END_REASON
} from '@/utils/callPresentation'
import { create_call_sound_controller } from '@/utils/callSounds'

const page_transition = ref(null)
const call_id = ref('')
const caller_id = ref('')
const callee_id = ref('')
const callee_name = ref('Community member')
const callee_avatar_url = ref('')
const return_url = ref('/pages/messages/index')
const waiting_dot_count = ref(0)
const is_leaving = ref(false)
const call_sounds = create_call_sound_controller()
let waiting_timer = null
let connect_timer = null
let timeout_timer = null
let visible = false

const status_copy = computed(() => ringing_status_label(waiting_dot_count.value))

const theme_style = {
  '--page-background': theme.colors.call.background,
  '--call-scrim': theme.colors.surface.scrim_soft,
  '--call-name-color': theme.colors.text.on_media,
  '--call-status-color': theme.colors.text.inverse_soft,
  '--call-ripple-color': theme.colors.text.on_media,
  '--hangup-background': theme.colors.status.danger
}

const clear_timers = () => {
  clearInterval(waiting_timer)
  waiting_timer = null
  clearTimeout(connect_timer)
  connect_timer = null
  clearTimeout(timeout_timer)
  timeout_timer = null
  call_sounds.stop_waiting()
}

const show_toast = (title) => {
  if (!title || typeof uni === 'undefined' || !uni.showToast) return
  uni.showToast({ title: t(title), icon: 'none' })
}

const leave_ringing = (reason) => {
  if (is_leaving.value) return
  is_leaving.value = true
  clear_timers()
  const toast = ringing_end_toast(reason)
  if (toast) show_toast(toast)
  if (reason === RINGING_END_REASON.cancel) call_sounds.play_ended()
  else call_sounds.stop_all()
  const fail = () => {
    is_leaving.value = false
  }
  if (getCurrentPages().length > 1) {
    page_transition.value?.navigate_back({ fail })
    return
  }
  page_transition.value?.navigate_relaunch({ url: return_url.value, fail })
}

const open_connected = () => {
  if (!CALL_CONNECTION_ENABLED || !visible || is_leaving.value || !call_id.value) return
  clear_timers()
  is_leaving.value = true
  call_sounds.stop_waiting()
  const url = build_connected_url({
    call_id: call_id.value,
    caller_id: caller_id.value,
    callee_id: callee_id.value,
    callee_name: callee_name.value,
    callee_avatar_url: callee_avatar_url.value,
    source_page: return_url.value
  })
  const fail = () => {
    is_leaving.value = false
    show_toast('Unable to connect this call.')
    start_ringing()
  }
  const started = page_transition.value?.navigate_replace({ url, fail })
  if (!page_transition.value || started === false) fail()
}

const handle_connect_attempt = (outcome_at_connect) => {
  connect_timer = null
  clearTimeout(timeout_timer)
  timeout_timer = null
  if (!visible || is_leaving.value) return
  if (outcome_at_connect === RINGING_END_REASON.rejected) {
    leave_ringing(RINGING_END_REASON.rejected)
    return
  }
  if (outcome_at_connect === RINGING_END_REASON.network_error) {
    leave_ringing(RINGING_END_REASON.network_error)
    return
  }
  open_connected()
}

const start_ringing = () => {
  clear_timers()
  if (!visible || is_leaving.value || !callee_id.value) return
  is_leaving.value = false
  call_sounds.start_waiting('video')
  waiting_timer = setInterval(() => {
    waiting_dot_count.value = (waiting_dot_count.value + 1) % 4
  }, 450)
  const schedule = plan_ringing_schedule()
  if (CALL_CONNECTION_ENABLED && schedule.connect_ms !== null) {
    connect_timer = setTimeout(
      () => handle_connect_attempt(schedule.outcome_at_connect),
      schedule.connect_ms
    )
  }
  timeout_timer = setTimeout(
    () => leave_ringing(CALL_CONNECTION_ENABLED ? RINGING_END_REASON.timeout : RINGING_END_REASON.unavailable),
    schedule.timeout_ms
  )
}

const cancel_call = () => {
  if (is_leaving.value) return
  leave_ringing(RINGING_END_REASON.cancel)
}

onLoad((query = {}) => {
  const context = read_call_route_context(query)
  call_id.value = context.call_id
  caller_id.value = context.caller_id
  callee_id.value = context.callee_id
  callee_name.value = context.callee_name
  callee_avatar_url.value = context.callee_avatar_url
  return_url.value = normalize_call_return_url(context.source_page)
  if (!callee_id.value) {
    show_toast('This call is unavailable.')
    is_leaving.value = true
  }
})

onShow(() => {
  visible = true
  if (!callee_id.value) {
    page_transition.value?.navigate_back()
    return
  }
  start_ringing()
})

const cleanup = () => {
  visible = false
  clear_timers()
  call_sounds.stop_all()
}

onHide(cleanup)
onBeforeUnmount(cleanup)
</script>

<style scoped lang="scss">
.ringing-call-page {
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

<template>
  <PageTransition ref="page_transition" class="ringing-call-page" :style="theme_style">
    <TopSafeArea />
    <view class="call-header">
      <button class="call-back" :aria-label="$t('Go back')" :disabled="is_leaving" @click="cancel_call">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <view class="call-heading">
        <text class="call-heading__title">{{ $t('Video call') }}</text>
        <view class="call-heading__line" aria-hidden="true" />
      </view>
      <button class="call-more" :aria-label="$t('Report or block')" :disabled="is_leaving" @click="open_report">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
      </button>
    </view>
    <view class="call-stage">
      <PostMedia class="call-backdrop" :media-url="callee_avatar_url || DEFAULT_AVATAR_URL" content-type="image" fit="cover" aria-hidden="true" />
      <view class="call-scrim" aria-hidden="true" />
      <view class="call-identity">
        <text class="call-name">{{ callee_name === 'Community member' ? $t(callee_name) : callee_name }}</text>
        <text class="call-status" role="status">
          {{ $t(status_copy) }}<text v-if="permissions_ready" class="call-status__dots" aria-hidden="true">{{ '.'.repeat(waiting_dot_count) }}</text>
        </text>
      </view>
      <view v-if="permission_problem" class="call-permission" role="alert">
        <text>{{ $t(permission_problem) }}</text>
        <button v-if="can_open_settings" class="call-permission__settings" @click="open_permission_settings">{{ $t('Open Settings') }}</button>
      </view>
      <view class="call-footer">
        <view class="call-reassurance">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2.5" stroke="currentColor" stroke-width="1.7" /><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.7" /></svg>
          <text>{{ $t('You can end the call at any time.') }}</text>
        </view>
        <view class="call-controls">
          <button class="call-control" :aria-label="$t('Microphone control')" :disabled="is_leaving" @click="waiting_control_toast">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="12" y="4" width="8" height="16" rx="4" stroke="currentColor" stroke-width="2.4" /><path d="M7 15v2a9 9 0 0 0 18 0v-2M16 26v4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
          </button>
          <button class="call-control" :aria-label="$t('Camera control')" :disabled="is_leaving" @click="waiting_control_toast">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 8h17v16H4zM21 13l8-5v16l-8-5" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" /></svg>
          </button>
          <button class="call-control call-control--hangup" :aria-label="$t('Cancel call')" :disabled="is_leaving" @click="cancel_call">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 18c6.3-6.3 17.7-6.3 24 0M6 17v5M26 17v5" stroke="currentColor" stroke-width="4" stroke-linecap="round" /></svg>
          </button>
        </view>
      </view>
    </view>
    <BottomSafeArea />
    <ReportUserSheet :visible="is_report_visible" :target-name="callee_name" :target-user-id="callee_id" bottom-offset="0px" @update:visible="is_report_visible = $event" @submitted="on_report_submitted" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBackPress, onHide, onLoad, onShow } from '@dcloudio/uni-app'
import { selectUserBaseInfo } from '@/api/common'
import theme from '@/config/theme.json'
import { CALL_CONNECTION_ENABLED } from '@/config/callMedia'
import { DEFAULT_AVATAR_URL } from '@/config/user'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import PostMedia from '@/components/PostMedia.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { t } from '@/utils/i18n'
import { ensure_ios_permission, request_ios_permission } from '@/utils/iosPermissionBridge'
import { build_connected_url, normalize_call_return_url, plan_ringing_schedule, read_call_route_context, ringing_end_toast, RINGING_END_REASON } from '@/utils/callPresentation'
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
const is_report_visible = ref(false)
const permissions_ready = ref(false)
const is_checking_permissions = ref(false)
const permission_problem = ref('')
const can_open_settings = ref(false)
const call_sounds = create_call_sound_controller()
let waiting_timer = null
let connect_timer = null
let timeout_timer = null
let visible = false
let mounted = true
let allow_route_back = false
let permission_generation = 0
let permission_task = null
let denied_permission = 'camera'
let profile_context = null

const status_copy = computed(() => permissions_ready.value ? 'Waiting for them to answer' : is_checking_permissions.value ? 'Preparing video call' : 'Video call')
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--call-name-color': theme.colors.text.title,
  '--call-status-color': theme.colors.text.inverse_soft,
  '--call-border': theme.colors.surface.border,
  '--call-accent': theme.colors.status.coin,
  '--call-control': theme.colors.button.ghost.background,
  '--call-hangup': theme.colors.status.danger
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
const show_toast = title => {
  if (title && typeof uni !== 'undefined') uni.showToast?.({ title: t(title), icon: 'none' })
}
const waiting_control_toast = () => {
  if (!is_leaving.value) show_toast('Available after the call connects.')
}

const leave_ringing = reason => {
  if (is_leaving.value) return
  is_leaving.value = true
  permission_generation += 1
  is_report_visible.value = false
  clear_timers()
  const toast = ringing_end_toast(reason)
  if (toast) show_toast(toast)
  if (reason === RINGING_END_REASON.cancel) call_sounds.play_ended()
  else call_sounds.stop_all()
  const fail = () => { allow_route_back = false; is_leaving.value = false }
  if (typeof getCurrentPages === 'function' && getCurrentPages().length > 1) {
    allow_route_back = true
    page_transition.value?.navigate_back({ fail, complete: () => { allow_route_back = false } })
  } else page_transition.value?.navigate_relaunch({ url: return_url.value, fail })
}
const cancel_call = () => leave_ringing(RINGING_END_REASON.cancel)

const open_connected = () => {
  if (!CALL_CONNECTION_ENABLED || !visible || is_leaving.value || !call_id.value || !permissions_ready.value) return
  clear_timers()
  is_leaving.value = true
  const url = build_connected_url({ call_id: call_id.value, caller_id: caller_id.value, callee_id: callee_id.value,
    callee_name: callee_name.value, callee_avatar_url: callee_avatar_url.value, source_page: return_url.value })
  const fail = () => { is_leaving.value = false; show_toast('Unable to connect this call.'); start_ringing() }
  const started = page_transition.value?.navigate_replace({ url, fail })
  if (!page_transition.value || started === false) fail()
}
const handle_connect_attempt = outcome => {
  connect_timer = null
  clearTimeout(timeout_timer)
  timeout_timer = null
  if (!visible || is_leaving.value) return
  if ([RINGING_END_REASON.rejected, RINGING_END_REASON.network_error].includes(outcome)) leave_ringing(outcome)
  else open_connected()
}
const start_ringing = () => {
  clear_timers()
  if (!visible || is_leaving.value || is_report_visible.value || !callee_id.value || !permissions_ready.value) return
  call_sounds.start_waiting('video')
  waiting_timer = setInterval(() => { waiting_dot_count.value = (waiting_dot_count.value + 1) % 4 }, 450)
  const schedule = plan_ringing_schedule()
  if (CALL_CONNECTION_ENABLED && schedule.connect_ms !== null) {
    connect_timer = setTimeout(() => handle_connect_attempt(schedule.outcome_at_connect), schedule.connect_ms)
  }
  timeout_timer = setTimeout(() => leave_ringing(CALL_CONNECTION_ENABLED ? RINGING_END_REASON.timeout : RINGING_END_REASON.unavailable), schedule.timeout_ms)
}

// Ask the native system sequentially, without trusting a saved permission flag.
// No camera capture or microphone transmission starts on this waiting screen.
const check_call_permissions = () => {
  if (!mounted || !visible || is_leaving.value || is_report_visible.value || !callee_id.value || permission_task) return permission_task
  if (permissions_ready.value) return Promise.resolve()
  const generation = ++permission_generation
  const is_current = () => mounted && visible && !is_leaving.value && !is_report_visible.value && generation === permission_generation
  is_checking_permissions.value = true
  permissions_ready.value = false
  permission_problem.value = ''
  can_open_settings.value = false
  permission_task = (async () => {
    let all_granted = true, first_denied = '', unavailable = false
    for (const permission of ['camera', 'microphone']) {
      let result
      try {
        result = await ensure_ios_permission(permission, {
          force_refresh: true,
          reason: permission === 'camera' ? 'Use your camera for this video call.' : 'Use your microphone for this video call.'
        })
      } catch { result = { permission_status: 'unavailable' } }
      if (!is_current()) return
      const granted = result?.success === true && result.granted === true && result.permission_status === 'granted'
      if (!granted) {
        all_granted = false
        if (!first_denied) first_denied = permission
        if (result?.permission_status !== 'denied') unavailable = true
      }
    }
    if (!is_current()) return
    permissions_ready.value = all_granted
    if (all_granted) start_ringing()
    else {
      denied_permission = first_denied || 'camera'
      can_open_settings.value = !unavailable
      permission_problem.value = unavailable ? 'Camera or microphone access is unavailable on this device.' : 'Camera and microphone access is needed for a video call. You can change permissions in Settings.'
    }
  })().finally(() => {
    permission_task = null
    if (generation === permission_generation) is_checking_permissions.value = false
    else if (mounted && visible && !is_leaving.value && !is_report_visible.value) void check_call_permissions()
  })
  return permission_task
}
const open_permission_settings = () => {
  if (!can_open_settings.value || is_leaving.value) return
  if (!request_ios_permission(denied_permission, { open_settings: true })) show_toast('This permission is unavailable on this device.')
}
const load_peer_profile = async () => {
  if (callee_avatar_url.value && callee_name.value !== 'Community member') return
  profile_context?.cancel?.()
  const context = {}, peer_id = callee_id.value
  profile_context = context
  try {
    const result = await selectUserBaseInfo({ userId: peer_id }, context)
    if (!mounted || !visible || is_leaving.value || profile_context !== context || callee_id.value !== peer_id || !result?.success) return
    if (`${result.data?.userId || ''}` !== peer_id) return
    if (!callee_avatar_url.value) callee_avatar_url.value = `${result.data.userImgUrl || ''}`
    if (callee_name.value === 'Community member') callee_name.value = `${result.data.userName || 'Community member'}`
  } catch {}
}
const open_report = () => {
  if (!visible || is_leaving.value || !callee_id.value) return
  permission_generation += 1
  clear_timers()
  is_report_visible.value = true
}
const on_report_submitted = result => {
  if (result?.blocked) cancel_call()
}
watch(is_report_visible, shown => {
  if (!shown && mounted && visible && !is_leaving.value) {
    if (permissions_ready.value) start_ringing()
    else void check_call_permissions()
  }
})

onLoad((query = {}) => {
  const context = read_call_route_context(query)
  call_id.value = context.call_id
  caller_id.value = context.caller_id
  callee_id.value = context.callee_id
  callee_name.value = context.callee_name
  callee_avatar_url.value = context.callee_avatar_url
  return_url.value = normalize_call_return_url(context.source_page)
  if (!callee_id.value) { show_toast('This call is unavailable.'); is_leaving.value = true }
})
onShow(() => {
  visible = true
  if (!callee_id.value) { page_transition.value?.navigate_back(); return }
  void load_peer_profile()
  void check_call_permissions()
})
onBackPress(() => {
  if (allow_route_back) return false
  if (is_report_visible.value) is_report_visible.value = false
  else cancel_call()
  return true
})
const cleanup = () => {
  visible = false
  permission_generation += 1
  permissions_ready.value = false
  is_checking_permissions.value = false
  profile_context?.cancel?.()
  profile_context = null
  clear_timers()
  call_sounds.stop_all()
}
onHide(cleanup)
onBeforeUnmount(() => { mounted = false; cleanup() })
</script>

<style scoped lang="scss">
.ringing-call-page { position: relative; background: var(--page-background); }
.call-header { display: flex; flex: none; align-items: center; gap: 24rpx; min-height: 120rpx; padding: 12rpx 36rpx 24rpx; }
.call-back, .call-more { display: flex; flex: none; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; margin: 0; padding: 0; background: transparent; color: var(--call-name-color); }
.call-back { width: 80rpx; height: 80rpx; border: 1px solid var(--call-border); border-radius: 50%; }
.call-more { width: 72rpx; height: 80rpx; border: none; }
.call-back::after, .call-more::after, .call-control::after, .call-permission__settings::after { border: none; }
.call-back svg { width: 36rpx; height: 36rpx; }
.call-more svg { width: 32rpx; height: 40rpx; }
.call-heading { min-width: 0; flex: 1; }
.call-heading__title { display: block; color: var(--call-name-color); font-size: 44rpx; font-weight: 800; line-height: 1.2; }
.call-heading__line { width: 76rpx; height: 4rpx; margin-top: 18rpx; border-radius: 8rpx; background: linear-gradient(90deg, var(--call-accent), transparent); box-shadow: 0 0 16rpx rgba(244, 198, 98, .2); }
.call-stage { position: relative; display: flex; overflow: hidden; min-height: 0; flex: 1; flex-direction: column; margin: 0 36rpx 16rpx; }
.call-backdrop { position: absolute; z-index: 0; inset: -28rpx; width: calc(100% + 56rpx); height: calc(100% + 56rpx); filter: blur(16px); transform: scale(1.04); }
.call-scrim { position: absolute; z-index: 1; inset: 0; background: linear-gradient(180deg, rgba(16, 11, 32, .84), rgba(16, 11, 32, .48) 32%, rgba(16, 11, 32, .6) 62%, rgba(22, 9, 32, .9)); }
.call-identity { position: relative; z-index: 2; flex: none; padding: 4rpx 24rpx 28rpx; text-align: center; }
.call-name { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; color: var(--call-name-color); font-size: 44rpx; font-weight: 800; line-height: 1.2; text-shadow: 0 2px 12px rgba(0, 0, 0, .4); }
.call-status { display: block; margin-top: 16rpx; color: var(--call-status-color); font-size: 25rpx; line-height: 1.5; }
.call-status__dots { display: inline-block; min-width: 22rpx; text-align: left; }
.call-permission { position: relative; z-index: 2; max-height: 40%; overflow-y: auto; flex: none; margin: 20rpx; padding: 24rpx; border: 1px solid var(--call-border); border-radius: 28rpx; background: rgba(26, 18, 48, .8); color: var(--call-status-color); font-size: 25rpx; line-height: 1.6; }
.call-permission__settings { min-height: 44px; margin-top: 16rpx; border: 1px solid var(--call-border); border-radius: 999px; background: var(--call-control); color: var(--call-name-color); font-size: 26rpx; }
.call-footer { position: relative; z-index: 2; flex: none; margin-top: auto; padding: 20rpx 0; }
.call-reassurance { display: flex; align-items: center; gap: 20rpx; min-height: 80rpx; padding: 18rpx 28rpx; border: 1px solid var(--call-border); border-radius: 34rpx; background: rgba(28, 19, 49, .78); color: var(--call-status-color); font-size: 23rpx; line-height: 1.5; }
.call-reassurance svg { width: 28rpx; height: 32rpx; flex: none; }
.call-controls { display: flex; align-items: center; justify-content: center; gap: 28rpx; margin-top: 32rpx; }
.call-control { display: flex; width: 116rpx; height: 116rpx; min-width: 44px; min-height: 44px; flex: none; align-items: center; justify-content: center; margin: 0; padding: 0; border: 1px solid var(--call-border); border-radius: 50%; background: rgba(43, 31, 73, .84); color: var(--call-name-color); transition: transform .16s ease; }
.call-control svg { width: 42rpx; height: 42rpx; }
.call-control--hangup { width: 132rpx; height: 132rpx; border: none; background: linear-gradient(140deg, #ff6089, #cc477d); color: white; box-shadow: 0 8rpx 36rpx rgba(227, 70, 124, .2); }
.call-control--hangup svg { width: 52rpx; height: 52rpx; }
.call-control:active { transform: scale(.95); }
.call-control:focus-visible, .call-back:focus-visible, .call-more:focus-visible { outline: 2px solid #e7b5ed; outline-offset: 3px; }
.call-control[disabled], .call-back[disabled], .call-more[disabled] { opacity: .5; }
@media (prefers-reduced-motion: reduce) { .call-control { transition: none; } }
</style>

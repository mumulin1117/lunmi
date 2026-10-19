<template>
  <PageTransition ref="page_transition" class="room-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="room-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="request_leave" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Voice Room') }}</text>
          <view class="header-line" />
        </view>
        <view
          v-if="room_ready"
          class="more-button"
          role="button"
          :aria-label="$t(is_host ? 'Close room' : 'More actions')"
          @click="open_more"
        >
          <image src="/static/icon/vertical_more.png" mode="aspectFit" />
        </view>
      </view>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content-scroll__inner">
          <view v-if="is_loading && !room_ready" class="room-skeleton" aria-hidden="true">
            <view class="room-skeleton__hero" />
            <view class="room-skeleton__seats">
              <view v-for="slot in skeleton_slots" :key="slot" class="room-skeleton__seat" />
            </view>
          </view>
          <view v-else-if="load_error && !room_ready" class="state-card" role="alert">
            <text class="state-card__copy">{{ $t(load_error) }}</text>
            <view class="state-card__retry" role="button" :aria-label="$t('Try again')" @click="load_room">
              {{ $t('Try again') }}
            </view>
          </view>
          <template v-else-if="room_ready">
            <view class="hero">
              <image class="hero__cover" :src="room_cover" mode="aspectFill" />
              <view class="hero__shade" />
              <LiveStatusBadge class="hero__live-badge" />
              <view class="hero__count">
                <image src="/static/icon/voice_room_microphone.png" mode="aspectFit" />
                <text>{{ $t(listener_count) }}</text>
              </view>
              <text class="hero__title">{{ room_title }}</text>
              <view class="hero__host">
                <UserAvatar class="hero__avatar" :source="host_avatar" />
                <text>{{ $t('Hosted by') }} {{ host_name }}</text>
              </view>
            </view>
            <view class="seat-row" :aria-label="$t('Room seats')">
              <view v-for="seat in seats" :key="seat.seat_index" class="seat">
                <view v-if="seat.member" class="seat__face">
                  <UserAvatar class="seat__avatar" :source="seat.member.avatar_url" />
                  <view
                    class="seat__mic"
                    :class="{ 'seat__mic--off': !seat.member.is_host || (seat.member.user_id === current_user_id && !is_mic_on) }"
                    role="img"
                    :aria-label="$t(!seat.member.is_host || (seat.member.user_id === current_user_id && !is_mic_on) ? 'Muted' : 'Microphone')"
                  >
                    <image
                      :src="!seat.member.is_host || (seat.member.user_id === current_user_id && !is_mic_on) ? '/static/icon/voice_room_microphone_off.png' : '/static/icon/voice_room_microphone.png'"
                      mode="aspectFit"
                      aria-hidden="true"
                    />
                  </view>
                </view>
                <view v-else class="seat__empty" />
                <text class="seat__name">{{ seat.member?.user_name ? (seat.member.user_name_is_placeholder ? $t(seat.member.user_name) : seat.member.user_name) : $t('Open') }}</text>
              </view>
            </view>
            <view class="room-notice">
              <image src="/static/icon/reply_comment.png" mode="aspectFit" />
              <text>{{ $t(room_notice) }}</text>
            </view>
            <view class="room-actions-divider" aria-hidden="true" />
            <view class="room-actions">
              <view
                class="room-action room-action--mute"
                :class="{ 'room-action--speaking': is_mic_on, 'room-action--pending': is_permission_pending }"
                role="button"
                :aria-label="$t(is_mic_on ? 'Mute microphone' : 'Unmute microphone')"
                :aria-pressed="is_mic_on"
                :aria-busy="is_permission_pending"
                :aria-disabled="is_permission_pending || is_confirming || is_leaving || !has_joined"
                @click="toggle_microphone"
              >
                <view class="room-action__mic">
                  <view class="room-action__mic-icon" aria-hidden="true" />
                </view>
                <text>{{ $t(is_mic_on ? 'Saying' : 'Mute') }}</text>
              </view>
              <view class="room-action room-action--leave" role="button" :aria-label="$t('Leave room')" @click="request_leave">
                <image src="/static/icon/voice_room_leave.png" mode="aspectFit" />
                <text>{{ $t('Leave') }}</text>
              </view>
            </view>
            <!-- <text v-if="is_audio_loading" class="inline-error" role="status">Loading room audio...</text> -->
            <!-- <view v-if="audio_error" class="inline-error" role="alert">
              <text>{{ audio_error }}</text>
            </view>
            <view v-if="load_error" class="inline-error" role="alert">
              <text>{{ load_error }}</text>
              <view class="state-card__retry" role="button" @click="load_room">Try again</view>
            </view> -->
          </template>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <LiveRoomConfirmDialog
      :visible="is_confirm_visible"
      :title="$t(confirm_copy.title)"
      :copy="$t(confirm_copy.copy)"
      :error="confirm_error"
      :pending="is_confirming"
      icon="/static/icon/voice_room_del.png"
      :confirm-label="$t(is_confirming ? confirm_copy.pending_label : confirm_copy.confirm_label)"
      :cancel-label="$t('Keep')"
      :confirm-kind="confirm_copy.confirm_kind"
      @cancel="close_confirm"
      @confirm="confirm_leave"
    />
    <ReportUserSheet
      :visible="is_report_visible"
      :target-name="host_name"
      :target-user-id="host_id"
      bottom-offset="0rpx"
      @update:visible="is_report_visible = $event"
    />
    <LiveRoomConfirmDialog
      :visible="is_microphone_notice_visible"
      :title="$t(microphone_notice_unavailable ? 'Microphone access is unavailable.' : 'Microphone access is needed')"
      :copy="$t(microphone_notice_unavailable ? 'This permission is unavailable on this device.' : 'Microphone access is off. Open Settings and allow microphone access for Lunmi, then tap Mute to speak.')"
      :confirm-label="$t(microphone_notice_unavailable ? 'OK' : 'Open Settings')"
      :cancel-label="$t('Cancel')"
      :hide-cancel="microphone_notice_unavailable"
      @cancel="is_microphone_notice_visible = false"
      @confirm="open_microphone_settings"
    />
    <ApiErrorDialog />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { t } from '@/utils/i18n'
import { addQuitLive, finishLive, selectLiveInfo, selectRoomUsers } from '@/api/live'
import ApiErrorDialog from '@/components/ApiErrorDialog.vue'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import LiveRoomConfirmDialog from '@/components/LiveRoomConfirmDialog.vue'
import LiveStatusBadge from '@/components/LiveStatusBadge.vue'
import PageTransition from '@/components/PageTransition.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import { activate_media, clear_media } from '@/utils/mediaPlayback'
import { ensure_ios_permission, request_ios_microphone_permission } from '@/utils/iosPermissionBridge'
import {
  ROOM_NOTICE,
  VOICE_ROOM_LIST_PATH,
  build_close_room_params,
  build_join_room_params,
  build_leave_room_params,
  build_select_live_info_params,
  build_select_room_users_params,
  build_voice_seats,
  read_room_host_id,
  read_room_cover,
  read_room_listener_count,
  read_room_members,
  read_voice_room_id,
  read_voice_room_password,
  read_voice_room_source,
  room_is_active,
  voice_room_confirm_copy
} from '@/utils/voiceRoomDetailPresentation.js'

const account_store = storeGlobal()
const page_transition = ref(null)
const room_id = ref('')
const room_password = ref('')
const source_page = ref(VOICE_ROOM_LIST_PATH)
const room = ref(null)
const members = ref([])
const is_loading = ref(true)
const load_error = ref('')
const audio_error = ref('')
const is_audio_loading = ref(false)
const confirm_error = ref('')
const is_confirm_visible = ref(false)
const is_confirming = ref(false)
const is_report_visible = ref(false)
const is_mic_on = ref(false)
const is_permission_pending = ref(false)
const is_microphone_notice_visible = ref(false)
const microphone_notice_unavailable = ref(false)
const has_joined = ref(false)
const is_page_active = ref(true)
const is_leaving = ref(false)
const skeleton_slots = [1, 2, 3, 4]
const room_cover = computed(() => read_room_cover(room.value || {}))
const room_notice = ROOM_NOTICE
let load_context = { cancel() {} }
let action_context = { cancel() {} }
let room_audio = null
let audio_media_id = ''
let audio_play_attempt = 0
let audio_retry_timer = null
let audio_retry_count = 0
const audio_retry_delays = [500, 1000, 2000, 4000, 8000]
let is_page_visible = true
let allow_route_back = false
let microphone_request_generation = 0
let entry_permission_requested = false

const theme_style = {
  '--page-background': theme.colors.voice_room.detail_background,
  '--room-title': theme.colors.voice_room.detail_text,
  '--room-meta': theme.colors.voice_room.detail_text_muted,
  '--room-surface': theme.colors.voice_room.detail_surface,
  '--room-border': theme.colors.voice_room.detail_border,
  '--room-live': theme.colors.status.success,
  '--room-live-text': theme.colors.text.inverse,
  '--room-count': theme.colors.surface.scrim_soft,
  '--room-shade': theme.colors.home.feature_shade,
  '--room-header-surface': theme.colors.lantern_detail.header_surface,
  '--room-line': theme.colors.lantern_detail.title_line,
  '--room-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--room-skeleton': theme.colors.lantern_detail.skeleton,
  '--room-button': theme.colors.button.primary,
  '--room-button-text': theme.colors.button.text,
  '--room-notice': theme.colors.voice_room.detail_text_soft,
  '--room-actions-divider': theme.colors.voice_room.detail_actions_divider,
  '--room-mic-background': theme.colors.voice_room.detail_mic_background,
  '--room-mic-active-background': theme.colors.voice_room.detail_mic_active_background,
  '--room-mic-default-icon': theme.colors.text.inverse,
  background: theme.colors.voice_room.detail_background,
  color: theme.colors.voice_room.detail_text
}

const room_ready = computed(() => Boolean(room.value))
const current_user_id = computed(() => `${account_store.userId || ''}`)
const host_id = computed(() => read_room_host_id(room.value || {}))
const is_host = computed(() => Boolean(host_id.value) && host_id.value === `${account_store.userId || ''}`)
const host_name = computed(() => `${room.value?.userName || ''}`.trim() || 'Host')
const host_avatar = computed(() => `${room.value?.userImgUrl || ''}`.trim())
const room_title = computed(() => `${room.value?.liveTitle || ''}`.trim() || t('Voice room'))
const listener_count = computed(() => read_room_listener_count(room.value || {}, members.value.length))
const seats = computed(() => build_voice_seats(room.value || {}, members.value))
const confirm_copy = computed(() => voice_room_confirm_copy(is_host.value))

const begin_load = () => {
  load_context.cancel?.()
  load_context = { cancel() {} }
  return load_context
}

const pause_room_audio = () => {
  clearTimeout(audio_retry_timer)
  audio_retry_timer = null
  audio_play_attempt += 1
  is_audio_loading.value = false
  clear_media(audio_media_id)
  room_audio?.pause()
}

const release_room_audio = () => {
  pause_room_audio()
  const audio = room_audio
  room_audio = null
  if (!audio) return
  audio.onloadedmetadata = null
  audio.onplaying = null
  audio.onwaiting = null
  audio.onerror = null
  audio.onpause = null
  audio.removeAttribute('src')
  audio.load()
}

// feedback_mode: control_pending — follow actual media loading and play rejection.
const schedule_audio_retry = ({ reload = false } = {}) => {
  if (audio_retry_timer !== null || !is_page_active.value || !is_page_visible || is_leaving.value || !has_joined.value) return
  if (audio_retry_count >= audio_retry_delays.length) {
    audio_error.value = 'Room audio is currently unavailable.'
    return
  }
  const delay = audio_retry_delays[audio_retry_count++]
  audio_error.value = 'Reconnecting room audio...'
  audio_retry_timer = setTimeout(() => {
    audio_retry_timer = null
    if (!is_page_active.value || !is_page_visible || is_leaving.value || !has_joined.value) return
    if (!reload && room_audio && !room_audio.error && room_audio.readyState >= 1) void play_room_audio()
    else start_room_audio({ reset_retry: false })
  }, delay)
}

const play_room_audio = async () => {
  const audio = room_audio
  if (!audio || !is_page_active.value || !is_page_visible || is_leaving.value || !has_joined.value) return
  const attempt = ++audio_play_attempt
  is_audio_loading.value = true
  audio_error.value = ''
  activate_media({ id: audio_media_id, pause: pause_room_audio, get_element: () => audio })
  try {
    // Native Audio exposes the rejected play Promise; uni H5's inner context drops it.
    await audio.play()
  } catch (error) {
    if (audio !== room_audio || attempt !== audio_play_attempt || !is_page_active.value || !is_page_visible) return
    clear_media(audio_media_id)
    is_audio_loading.value = false
    schedule_audio_retry({ reload: error?.name !== 'NotAllowedError' })
  }
}

const start_room_audio = ({ reset_retry = true } = {}) => {
  release_room_audio()
  if (reset_retry) audio_retry_count = 0
  audio_error.value = ''
  const audio_url = `${room.value?.videoUrl || ''}`.trim()
  const duration_seconds = Number(room.value?.videoTimes)
  if (!audio_url || !Number.isFinite(duration_seconds) || duration_seconds <= 0) {
    audio_error.value = 'Room audio or its duration is unavailable.'
    return
  }
  if (typeof Audio !== 'function') {
    audio_error.value = 'Audio playback is unavailable.'
    return
  }
  const audio = new Audio()
  room_audio = audio
  audio_media_id = `voice-room:${room_id.value}`
  is_audio_loading.value = is_page_visible
  audio.preload = 'auto'
  audio.loop = true
  const is_current_audio = () => audio === room_audio && is_page_active.value
  audio.onloadedmetadata = () => {
    if (!is_current_audio()) return
    const available_seconds = Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.min(duration_seconds, audio.duration)
      : duration_seconds
    try {
      audio.currentTime = Math.random() * available_seconds
      void play_room_audio()
    } catch {
      is_audio_loading.value = false
      schedule_audio_retry({ reload: true })
    }
  }
  audio.onplaying = () => {
    if (!is_current_audio()) return
    is_audio_loading.value = false
    audio_error.value = ''
    audio_retry_count = 0
    clearTimeout(audio_retry_timer)
    audio_retry_timer = null
  }
  audio.onwaiting = () => {
    if (is_current_audio() && is_page_visible) is_audio_loading.value = true
  }
  audio.onpause = () => {
    if (!is_current_audio()) return
    is_audio_loading.value = false
    clear_media(audio_media_id)
  }
  audio.onerror = () => {
    if (!is_current_audio()) return
    is_audio_loading.value = false
    clear_media(audio_media_id)
    schedule_audio_retry()
  }
  audio.src = audio_url
  audio.load()
}

const load_room = async () => {
  if (!is_page_active.value || is_leaving.value || is_confirming.value) return
  if (!room_id.value) {
    room.value = null
    load_error.value = 'This room is unavailable.'
    is_loading.value = false
    return
  }
  is_loading.value = true
  load_error.value = ''
  const context = begin_load()
  release_room_audio()
  const requested_room_id = room_id.value
  const is_current_request = () => (
    is_page_active.value && !is_leaving.value && context === load_context
      && requested_room_id === room_id.value
  )
  try {
    const info_result = await selectLiveInfo(build_select_live_info_params({
      room_id: room_id.value,
      live_password: room_password.value
    }), context)
    if (!is_current_request()) return
    if (!info_result?.success || !info_result.data || read_voice_room_id(info_result.data) !== requested_room_id) {
      if (info_result?.error !== 'Request cancelled.') {
        load_error.value = info_result?.error || 'Unable to load this room.'
      }
      return
    }
    if (!room_is_active(info_result.data)) {
      room.value = null
      reset_microphone()
      load_error.value = 'This room has ended.'
      return
    }
    room.value = info_result.data
    if (!has_joined.value) {
      is_mic_on.value = false
      const joined = await addQuitLive(build_join_room_params(room_id.value), context)
      if (!is_current_request()) return
      if (!joined?.success) {
        if (joined?.error !== 'Request cancelled.') {
          load_error.value = joined?.error || 'Unable to join this room.'
        }
        return
      }
      has_joined.value = true
      void request_entry_microphone_permission()
    }
    start_room_audio()
    const users_result = await selectRoomUsers(build_select_room_users_params(room_id.value), context)
    if (!is_current_request()) return
    if (users_result?.success) members.value = read_room_members(users_result.data)
    else if (users_result?.error !== 'Request cancelled.') {
      load_error.value = users_result?.error || 'Unable to load the room participants.'
    }
  } catch (error) {
    if (is_current_request()) load_error.value = error?.message || 'Unable to load this room.'
  } finally {
    if (is_current_request()) is_loading.value = false
  }
}

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const return_to_source = () => {
  const fallback = source_page.value || VOICE_ROOM_LIST_PATH
  if (page_stack_length() > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        is_leaving.value = false
        page_transition.value?.navigate_relaunch({ url: fallback })
      }
    })
    if (!started) {
      allow_route_back = false
      is_leaving.value = false
      page_transition.value?.navigate_relaunch({ url: fallback })
    }
    return
  }
  page_transition.value?.navigate_relaunch({ url: fallback })
}

const request_leave = () => {
  if (!is_page_active.value || is_leaving.value || is_confirming.value) return
  if (is_report_visible.value) {
    is_report_visible.value = false
    return
  }
  if (!room_ready.value) {
    is_leaving.value = true
    load_context.cancel?.()
    return_to_source()
    return
  }
  confirm_error.value = ''
  is_confirm_visible.value = true
}

const close_confirm = () => {
  if (is_confirming.value) return
  is_confirm_visible.value = false
  confirm_error.value = ''
}

const confirm_leave = async () => {
  if (is_confirming.value || is_leaving.value) return
  is_confirming.value = true
  confirm_error.value = ''
  action_context.cancel?.()
  action_context = { cancel() {} }
  const result = is_host.value
    ? await finishLive(build_close_room_params(room_id.value), action_context)
    : await addQuitLive(build_leave_room_params(room_id.value), action_context)
  if (!is_page_active.value) return
  if (!result?.success) {
    confirm_error.value = result?.error || (is_host.value ? 'Unable to close this room.' : 'Unable to leave this room.')
    is_confirming.value = false
    return
  }
  has_joined.value = false
  release_room_audio()
  is_mic_on.value = false
  reset_microphone()
  is_leaving.value = true
  is_confirm_visible.value = false
  is_confirming.value = false
  return_to_source()
}

const open_more = () => {
  if (!room_ready.value) return
  if (is_host.value) {
    request_leave()
    return
  }
  if (!host_id.value) return
  is_report_visible.value = true
}

const reset_microphone = () => {
  microphone_request_generation += 1
  is_mic_on.value = false
  is_microphone_notice_visible.value = false
}

const request_entry_microphone_permission = async () => {
  if (entry_permission_requested || !is_page_active.value || !is_page_visible || is_leaving.value) return
  entry_permission_requested = true
  is_permission_pending.value = true
  try {
    // Request the system permission on entry; granting it never unmutes the room.
    await ensure_ios_permission('microphone', {
      force_refresh: true,
      reason: 'Speak in voice rooms. You join muted, and nothing is recorded.'
    })
  } catch {
    // Listening stays available; the mic button can explain an unavailable bridge.
  } finally {
    is_permission_pending.value = false
  }
}

const toggle_microphone = async () => {
  if (!is_page_active.value || !is_page_visible || !room_ready.value || !has_joined.value
    || is_permission_pending.value || is_confirming.value || is_leaving.value) return
  if (is_mic_on.value) {
    reset_microphone()
    return
  }
  is_permission_pending.value = true
  const generation = ++microphone_request_generation
  const user_id = current_user_id.value
  let result = null
  try {
    // Always query iOS: a saved grant can be revoked in Settings at any time.
    result = await ensure_ios_permission('microphone', { check_only: true })
  } catch {
    result = null
  } finally {
    is_permission_pending.value = false
  }
  if (!is_page_active.value || !is_page_visible || document.hidden || is_leaving.value
    || !room_ready.value || !has_joined.value || is_confirming.value || is_confirm_visible.value
    || generation !== microphone_request_generation || user_id !== current_user_id.value) return
  if (result?.granted === true && result.permission_status === 'granted') {
    is_mic_on.value = true
    return
  }
  is_mic_on.value = false
  microphone_notice_unavailable.value = !result || Boolean(result.unavailable && !result.cancelled)
  is_microphone_notice_visible.value = true
}

const open_microphone_settings = () => {
  if (microphone_notice_unavailable.value) {
    is_microphone_notice_visible.value = false
    return
  }
  if (request_ios_microphone_permission({ open_settings: true })) {
    is_microphone_notice_visible.value = false
  } else {
    microphone_notice_unavailable.value = true
  }
}

const on_document_visibility_change = () => {
  if (document.hidden) reset_microphone()
}

onLoad((query) => {
  is_mic_on.value = false
  reset_microphone()
  document.addEventListener('visibilitychange', on_document_visibility_change)
  room_id.value = read_voice_room_id(query)
  room_password.value = read_voice_room_password(query)
  source_page.value = read_voice_room_source(query?.sourcePage)
  void load_room()
})

onBackPress(() => {
  if (allow_route_back) return false
  if (is_microphone_notice_visible.value) {
    is_microphone_notice_visible.value = false
    return true
  }
  if (is_confirming.value) return true
  if (is_confirm_visible.value) {
    close_confirm()
    return true
  }
  request_leave()
  return true
})

onHide(() => {
  is_page_visible = false
  pause_room_audio()
  reset_microphone()
})

onShow(() => {
  is_page_visible = true
  audio_retry_count = 0
  if (room_audio?.readyState >= 1 && !room_audio.error) void play_room_audio()
  else if (room_audio && !room_audio.error) is_audio_loading.value = true
  else if (room_audio?.error && has_joined.value) start_room_audio()
})

const dispose_room = () => {
  if (!is_page_active.value) return
  is_page_active.value = false
  reset_microphone()
  document.removeEventListener('visibilitychange', on_document_visibility_change)
  load_context.cancel?.()
  action_context.cancel?.()
  release_room_audio()
  if (has_joined.value && room_id.value && !is_host.value) {
    void addQuitLive(build_leave_room_params(room_id.value), {})
  }
}
onUnload(dispose_room)
onBeforeUnmount(dispose_room)
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.room-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.room-header {
  display: flex;
  height: 80rpx;
  flex: none;
  align-items: center;
  padding: 0 36rpx;
}

.back-button {
  @include page_back.button;
}

.more-button {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
}
.more-button image {
  width: 52rpx;
height: 60rpx;
}

.header-copy {
  margin-left: 24rpx;
}

.more-button {
  margin-left: auto;
}

.header-title {
  display: block;
  color: var(--room-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--room-line);
  box-shadow: 0 0 18rpx var(--room-line-shadow);
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  min-height: 100%;
  padding: 20rpx 36rpx 24rpx;
}

.hero {
  position: relative;
  overflow: hidden;
  height: 600rpx;
  border-radius: 32rpx;
}

.hero__cover,
.hero__shade {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.hero__shade {
  background: var(--room-shade);
}

.hero__count,
.hero__title,
.hero__host {
  position: absolute;
  z-index: 1;
}

.hero__count {
  display: flex;
  top: 20rpx;
  height: 48rpx;
  align-items: center;
  padding: 0 14rpx;
  border-radius: 20rpx;
}

.hero__live-badge {
  position: absolute;
  z-index: 1;
  top: 20rpx;
  left: 20rpx;
}

.hero__count {
  right: 20rpx;
  background: var(--room-count);
  color: var(--room-live-text);
}

.hero__count text {
  font-size: 18rpx;
  font-weight: 700;
}

.hero__count image {
  width: 20rpx;
  height: 20rpx;
  margin-right: 6rpx;
}

.hero__title {
  right: 24rpx;
  bottom: 72rpx;
  left: 24rpx;
  color: var(--room-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 50rpx;
}

.hero__host {
  right: 24rpx;
  bottom: 24rpx;
  left: 24rpx;
  display: flex;
  align-items: center;
}

.hero__avatar {
  width: 40rpx;
  height: 40rpx;
  flex: none;
  border-radius: 20rpx;
}

.hero__host text {
  margin-left: 12rpx;
  overflow: hidden;
  color: var(--room-title);
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seat-row {
  display: flex;
  justify-content: space-between;
  margin-top: 32rpx;
}

.seat {
  display: flex;
  width: 148rpx;
  align-items: center;
  flex-direction: column;
}

.seat__face {
  position: relative;
  width: 112rpx;
  height: 112rpx;
}

.seat__avatar,
.seat__empty {
  width: 112rpx;
  height: 112rpx;
  border-radius: 56rpx;
}

.seat__empty {
  border: 1px solid var(--room-border);
  background: var(--room-surface);
}

.seat__mic {
  position: absolute;
  z-index: 1;
  right: 0;
  bottom: 0;
  display: flex;
  width: 36rpx;
  height: 36rpx;
  align-items: center;
  justify-content: center;
  overflow: visible;
  border-radius: 18rpx;
  background: var(--room-live);
}

.seat__mic image {
  position: relative;
  z-index: 1;
  width: 20rpx;
  height: 20rpx;
}

.seat__mic:not(.seat__mic--off)::before,
.seat__mic:not(.seat__mic--off)::after {
  position: absolute;
  z-index: 0;
  inset: 0;
  box-sizing: border-box;
  content: '';
  border: 1px solid var(--room-live);
  border-radius: 50%;
  pointer-events: none;
  animation: seat-mic-ripple 1.8s ease-out infinite;
}

.seat__mic:not(.seat__mic--off)::after { animation-delay: -0.9s; }

.seat__mic--off {
  background: var(--room-surface);
}

.seat__name {
  width: 100%;
  margin-top: 12rpx;
  overflow: hidden;
  color: var(--room-meta);
  font-size: 20rpx;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-notice {
  display: flex;
  margin-top: 32rpx;
  padding: 22rpx 24rpx;
  align-items: center;
  border: 1px solid var(--room-border);
  border-radius: 28rpx;
  background: var(--room-surface);
}

.room-notice image {
  width: 36rpx;
  height: 36rpx;
  flex: none;
  margin-right: 16rpx;
}

.room-notice text {
  color: var(--room-notice);
  font-size: 24rpx;
  line-height: 34rpx;
}

.room-actions-divider {
  width: 100%;
  height: 2rpx;
  margin-top: 26rpx;
  background: var(--room-actions-divider);
}

.room-actions {
  display: flex;
  flex: none;
  margin-top: 26rpx;
}

.room-action {
  display: flex;
  height: 96rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
}

.room-action--mute {
  position: relative;
  margin-right: 20rpx;
  border: 1px solid var(--room-border);
  background: var(--room-mic-background);
}

.room-action--speaking {
  border-color: var(--room-live);
  background: var(--room-mic-active-background);
}

.room-action--pending { opacity: 0.6; }

.room-action__mic {
  position: relative;
  display: flex;
  width: 32rpx;
  height: 32rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  margin-right: 10rpx;
}

.room-action--speaking .room-action__mic::before,
.room-action--speaking .room-action__mic::after {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  content: '';
  border: 1px solid var(--room-live);
  border-radius: 50%;
  pointer-events: none;
  animation: room-action-speaking-ripple 1.6s ease-out infinite;
}

.room-action--speaking .room-action__mic::after { animation-delay: -0.8s; }

.room-action--leave {
  background: var(--room-button);
}

.room-action image {
  width: 32rpx;
  height: 32rpx;
  margin-right: 10rpx;
}

.room-action .room-action__mic-icon {
  position: relative;
  z-index: 1;
  width: 32rpx;
  height: 32rpx;
  background: var(--room-mic-default-icon);
  -webkit-mask: url('/static/icon/voice_room_microphone_off.png') center / contain no-repeat;
  mask: url('/static/icon/voice_room_microphone_off.png') center / contain no-repeat;
}

.room-action--speaking .room-action__mic-icon {
  background: var(--room-live);
  -webkit-mask-image: url('/static/icon/voice_room_microphone.png');
  mask-image: url('/static/icon/voice_room_microphone.png');
}

.room-action--mute text {
  color: var(--room-title);
  font-size: 30rpx;
  font-weight: 700;
}

.room-action--speaking text { color: var(--room-live); }

.room-action--leave text {
  color: var(--room-button-text);
  font-size: 30rpx;
  font-weight: 700;
}

.room-skeleton__hero,
.room-skeleton__seat {
  background: var(--room-skeleton);
  animation: room-pulse 1.2s ease-in-out infinite;
}

.room-skeleton__hero {
  height: 360rpx;
  border-radius: 32rpx;
}

.room-skeleton__seats {
  display: flex;
  justify-content: space-between;
  margin-top: 32rpx;
}

.room-skeleton__seat {
  width: 112rpx;
  height: 112rpx;
  border-radius: 56rpx;
}

.state-card {
  display: flex;
  min-height: 420rpx;
  align-items: center;
  justify-content: center;
  padding: 48rpx 24rpx;
  text-align: center;
  flex-direction: column;
}

.state-card__copy,
.inline-error {
  color: var(--room-meta);
  font-size: 26rpx;
  line-height: 38rpx;
}

.state-card__retry {
  height: 70rpx;
  margin-top: 24rpx;
  padding: 0 30rpx;
  border-radius: 35rpx;
  background: var(--room-button);
  color: var(--room-button-text);
  font-size: 25rpx;
  font-weight: 700;
  line-height: 70rpx;
}

.inline-error {
  display: block;
  margin-top: 18rpx;
}

@keyframes room-pulse {
  0%,
  100% { opacity: 0.45; }
  50% { opacity: 1; }
}

@keyframes seat-mic-ripple {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

@keyframes room-action-speaking-ripple {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .seat__mic:not(.seat__mic--off)::before,
  .seat__mic:not(.seat__mic--off)::after {
    content: none;
    animation: none;
  }
  .room-action--speaking .room-action__mic::before,
  .room-action--speaking .room-action__mic::after {
    content: none;
    animation: none;
  }
}
</style>

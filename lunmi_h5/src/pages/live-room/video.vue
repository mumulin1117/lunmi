<template>
  <PageTransition
    ref="page_transition"
    transition-variant="ios-stack"
    :style="theme_style"
  >
    <view
      class="live-shell"
      @touchstart="handle_chrome_touch_start"
      @touchend="handle_chrome_touch_end"
    >
      <view id="live-video-stage" class="video-stage" aria-hidden="true" />
      <view class="live-ui">
        <TopSafeArea />
        <view class="live-header">
          <view class="room-owner">
            <UserAvatar class="room-owner__avatar" :source="host_avatar" />
            <view class="room-owner__copy">
              <text class="room-owner__name">{{ host_name }}</text>
              <view class="room-owner__audience">
                <View class="room-owner__audience-icon" aria-hidden="true" />
                <text>{{ $t(watch_count) }}</text>
              </view>
            </view>
          </view>
          <view class="header-audience" role="button" @click="open_invites">
            <view class="audience-avatars" aria-hidden="true">
              <image
                v-for="avatar in audience_avatars"
                :key="avatar"
                class="audience-avatar"
                :src="avatar"
                mode="aspectFill"
              />
            </view>
            <view class="audience-count">{{ $t(online_count) }}</view>
            <view class="close-button" role="button" :aria-label="$t('Close live room')" @click.stop="close_room">
              <image src="/static/icons/live/live_close.png" mode="aspectFit" />
            </view>
          </view>
        </view>
        <view class="live-chrome" :class="{ 'live-chrome--hidden': is_chrome_hidden }">
          <scroll-view
            class="chat-list"
            scroll-y
            :scroll-top="chat_scroll_top"
            :scroll-with-animation="false"
            :show-scrollbar="false"
          >
            <view class="chat-list__inner">
              <view v-for="message in messages" :key="message.id" class="chat-message">
                <text class="chat-message__name">{{ message.name }}:</text>
                <text class="chat-message__copy">{{ $t(message.copy) }}</text>
              </view>
            </view>
          </scroll-view>
          <view class="live-footer">
            <input
              v-model="message_input"
              class="message-composer"
              :disabled="is_muted"
              maxlength="200"
              :placeholder="$t('Say hi~')"
              @confirm="send_chat"
            />
            <image class="footer-action footer-action--chat" src="/static/icons/live/send.png" mode="aspectFit" @click="send_chat" style="width: 72rpx;height: 72rpx;"/>
            <view class="footer-action footer-action--gift" role="button" :aria-label="$t('Send a gift')" @click="open_gifts">
              <image src="/static/icons/live/live_gift.png" mode="aspectFit" style="width: 72rpx;height: 72rpx;"/>
            </view>
            <view
              v-if="!is_host"
              class="footer-action"
              role="button"
              :aria-label="$t('Report host')"
              @click="open_report_sheet"
            >
              <image src="/static/icons/live/bnt_more.png" mode="aspectFit" style="width: 72rpx;height: 72rpx;"/>
            </view>
          </view>
        </view>
        <BottomSafeArea />
      </view>
      <LiveMicManageSheet
        :visible="show_mic_sheet"
        :active-tab="mic_sheet_tab"
        :applicants="applicants"
        :invite-users="inviteable_users"
        :search-keyword="invite_search"
        :invite-all-seconds="invite_all_seconds"
        :user-cooldown-seconds="invite_user_cooldown_seconds"
        :is-users-loading="is_invite_users_loading"
        :users-error="invite_users_error"
        @update:visible="show_mic_sheet = $event"
        @update:active-tab="change_mic_sheet_tab"
        @update:search-keyword="invite_search = $event"
        @search="search_invite_users"
        @allow="(user) => respond_to_application(user, true)"
        @deny="(user) => respond_to_application(user, false)"
        @invite="invite_user"
        @invite-all="invite_all_users"
      />
      <LiveMuteUserConfirmDialog
        :visible="show_mute_dialog"
        :target-name="mute_target?.userName || mute_target?.name || ''"
        @cancel="close_mute_dialog"
        @confirm="confirm_mute_user"
      />
      <LiveRemoveMicConfirmDialog
        :visible="show_remove_mic_dialog"
        :target-name="remove_mic_target?.userName || remove_mic_target?.name || ''"
        @cancel="close_remove_mic_dialog"
        @confirm="confirm_remove_mic_user"
      />
      <LiveRoomConfirmDialog
        :visible="Boolean(pending_invitation)"
        :title="$t('The host invited you to the mic')"
        :copy="$t('Accept to take a seat and start speaking in this room.')"
        :confirm-label="$t('Accept')"
        :cancel-label="$t('Not now')"
        @confirm="accept_invitation"
        @cancel="decline_invitation"
      />
      <LiveRoomConfirmDialog
        :visible="live_notice.visible"
        :title="$t(live_notice.title)"
        :copy="$t(live_notice.copy)"
        :confirm-label="$t(live_notice.confirmLabel)"
        hide-cancel
        @confirm="close_live_notice"
        @cancel="close_live_notice"
      />
      <LiveGiftEffect ref="gift_effect" />
      <LiveGiftSheet
        :visible="show_gift_sheet"
        :gifts="gifts"
        :users="gift_recipients"
        :balance="account_store.balance"
        :is-loading="is_gifts_loading"
        :load-error="gifts_error"
        :is-sending="is_gift_sending"
        @update:visible="show_gift_sheet = $event"
        @retry="load_gifts"
        @send="send_gift"
        @recharge="open_recharge"
      />
      <LiveRoomConfirmDialog
        :visible="show_recharge_dialog"
        :title="$t('Your balance is not enough')"
        :copy="$t('Recharge coins to send this gift.')"
        :confirm-label="$t('Recharge')"
        :cancel-label="$t('Cancel')"
        @confirm="open_recharge"
        @cancel="show_recharge_dialog = false"
      />
    </view>
    <ReportUserSheet
      :visible="is_report_visible"
      :target-name="host_name"
      :target-user-id="report_host_id"
      @update:visible="is_report_visible = $event"
      @submitted="handle_report_submitted"
    />
  </PageTransition>
</template>

<script setup>
import { is_insufficient_gift_balance, read_legacy_live_room_id } from '@/utils/legacyPagePresentation'
import { t } from '@/utils/i18n'

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AgoraRTC from 'agora-rtc-sdk-ng'
import { View } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import { AGORA_APP_ID } from '@/config/api'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import LiveGiftEffect from '@/components/LiveGiftEffect.vue'
import LiveGiftSheet from '@/components/LiveGiftSheet.vue'
import LiveMicManageSheet from '@/components/LiveMicManageSheet.vue'
import LiveMuteUserConfirmDialog from '@/components/LiveMuteUserConfirmDialog.vue'
import LiveRemoveMicConfirmDialog from '@/components/LiveRemoveMicConfirmDialog.vue'
import LiveRoomConfirmDialog from '@/components/LiveRoomConfirmDialog.vue'
import PageTransition from '@/components/PageTransition.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import { selectUserBalance } from '@/api/common'
import { addQuitLive, finishLive, getLiveToken, selectGiftList, selectLiveInfo, selectRoomMessages, selectRoomUsers, sendGift } from '@/api/live'
import { create_live_socket, send_live_socket_message } from '@/utils/liveWebSocket'
import { as_audience_user, remove_audience_list, seed_watch_count, upsert_audience_list } from '@/utils/liveAudience'
import { gift_display_name, gift_price_value, gift_thumb_url, merge_gift_payload } from '@/utils/giftEffect'
import { is_video_live_room, live_room_page_url } from '@/utils/liveRoomRoute'

const page_transition = ref(null)
const account_store = storeGlobal()
const room_id = ref('')
const room_password = ref('')
const room = ref({})
const audience = ref([])
const watch_count = ref(0)
const microphone_users = ref([])
const messages = ref([])
const chat_scroll_top = ref(0)
let chat_scroll_timer = null
let is_unmounted = false
const applicants = ref([])
const has_applied = ref(false)
const gifts = ref([])
const gifts_error = ref('')
const is_gifts_loading = ref(false)
const is_gift_sending = ref(false)
const show_gift_sheet = ref(false)
const show_recharge_dialog = ref(false)
const is_report_visible = ref(false)
const gifts_request_context = {}
const gift_send_request_context = {}
const gift_balance_request_context = {}
const gift_effect = ref(null)
let gifts_request_id = 0
let gift_balance_request_id = 0
const show_mic_sheet = ref(false)
const mic_sheet_tab = ref('apply')
const invite_candidates = ref([])
const invite_search = ref('')
const is_invite_users_loading = ref(false)
const invite_users_error = ref('')
const invite_cooldowns = ref({})
const invite_all_until = ref(0)
const cooldown_now = ref(Date.now())
const pending_invitation = ref(null)
const live_notice = ref({
  visible: false,
  title: '',
  copy: '',
  confirmLabel: 'OK'
})
const show_mute_dialog = ref(false)
const mute_target = ref(null)
const show_remove_mic_dialog = ref(false)
const remove_mic_target = ref(null)
const invite_users_request_context = {}
const INVITE_COOLDOWN_MS = 60000
let invite_cooldown_timer = null
let invite_users_request_id = 0
const message_input = ref('')
const is_muted = ref(false)
const is_chrome_hidden = ref(false)
const host_mic_on = ref(true)
const host_elapsed_seconds = ref(0)
const host_elapsed_synced = ref(false)
const socket = ref(null)
const audio_client = ref(null)
const local_audio_track = ref(null)
const local_video_track = ref(null)
const audio_is_published = ref(false)
const audio_publish_pending = ref(false)
const reconnect_timer = ref(null)
const heartbeat_timer = ref(null)
const intentional_disconnect = ref(false)
const HEARTBEAT_INTERVAL_MS = 10000
const LIVE_STATUS_ACTIVE = 1
const live_info_request_context = {}
let room_end_timer = null
let left_mic_locally = false
let host_elapsed_timer = null
let host_elapsed_origin_ms = 0
const host_name = computed(() => room.value.userName || 'Live host')
const host_avatar = computed(() => room.value.userImgUrl || '/static/assets/img/img_10.png')
const report_host_id = computed(() => `${room.value.userId || room.value.liveUserId || room.value.createUserId || ''}`)
const audience_avatars = computed(() => audience.value.slice(0, 3).map((item) => item.userImgUrl).filter(Boolean))
const is_host = computed(() => `${room.value.userId || room.value.liveUserId || room.value.createUserId || ''}` === `${account_store.userId || ''}`)
const online_count = computed(() => audience.value.length)
const on_mic_user_ids = computed(() => new Set([
  `${room.value.userId || ''}`,
  ...microphone_users.value.map((user) => `${user.userId || ''}`)
]))
const remaining_cooldown_seconds = (until) => Math.max(0, Math.ceil((Number(until || 0) - cooldown_now.value) / 1000))
const invite_all_seconds = computed(() => remaining_cooldown_seconds(invite_all_until.value))
const invite_user_cooldown_seconds = computed(() => {
  const map = {}
  Object.keys(invite_cooldowns.value).forEach((user_id) => {
    const seconds = remaining_cooldown_seconds(invite_cooldowns.value[user_id])
    if (seconds > 0) map[user_id] = seconds
  })
  return map
})
const inviteable_users = computed(() => {
  const keyword = invite_search.value.trim().toLowerCase()
  return invite_candidates.value.filter((user) => {
    const user_id = `${user.userId || ''}`
    if (!user_id || on_mic_user_ids.value.has(user_id)) return false
    if (!keyword) return true
    const name = `${user.userName || ''}`.toLowerCase()
    return name.includes(keyword) || user_id.toLowerCase().includes(keyword)
  })
})
const gift_recipients = computed(() => {
  const list = []
  const seen = new Set()
  const push_user = (user) => {
    const user_id = `${user?.userId || ''}`
    if (!user_id || seen.has(user_id) || user_id === `${account_store.userId || ''}`) return
    seen.add(user_id)
    list.push({
      userId: user.userId,
      userName: user.userName || 'Guest',
      userImgUrl: user.userImgUrl
    })
  }
  push_user({
    userId: room.value.userId || room.value.liveUserId || room.value.createUserId,
    userName: host_name.value,
    userImgUrl: host_avatar.value
  })
  microphone_users.value.forEach(push_user)
  return list
})
const is_mic_on = (status) => {
  const value = Number(status)
  return value !== 0 && value !== 2
}
const theme_style = {
  '--page-background': theme.colors.voice_room.page_background,
  '--live-background-deep': theme.colors.voice_room.page_background_deep,
  '--live-header-surface': theme.colors.voice_room.header_surface,
  '--live-seat-surface': theme.colors.voice_room.seat_surface,
  '--live-seat-surface-light': theme.colors.voice_room.seat_surface_light,
  '--live-seat-overlay': theme.colors.voice_room.seat_overlay,
  '--live-grid-color': theme.colors.voice_room.grid_color,
  '--live-text': theme.colors.voice_room.text,
  '--live-text-muted': theme.colors.voice_room.text_muted,
  '--live-text-soft': theme.colors.voice_room.text_soft,
  '--live-pink': theme.colors.voice_room.pink,
  '--live-purple': theme.colors.voice_room.purple,
  '--live-yellow': theme.colors.voice_room.yellow,
  '--live-button-surface': theme.colors.voice_room.button_surface,
  '--live-message-surface': theme.colors.voice_room.message_surface
}

const scroll_to_latest = () => {
  chat_scroll_top.value = 0
  nextTick(() => {
    if (is_unmounted) return
    chat_scroll_top.value = 99999
    clearTimeout(chat_scroll_timer)
    chat_scroll_timer = setTimeout(() => {
      chat_scroll_top.value = 0
      nextTick(() => {
        if (is_unmounted) return
        chat_scroll_top.value = 99999
        chat_scroll_timer = null
      })
    }, 16)
  })
}

const map_message = (item, index) => ({
  id: item.talkRoomId || item.messageId || `${Date.now()}-${index}`,
  name: item.userName || item.sendUserName || 'System',
  copy: item.content || item.message || ''
})
const CONTROL_CHAT_MESSAGES = new Set([
  'apply',
  'mute',
  'unmute',
  'invite',
  'allow',
  'deny',
  'remove',
  'accept',
  'enter',
  'leave'
])
const is_control_chat_payload = (payload) => (
  CONTROL_CHAT_MESSAGES.has(`${payload?.content || payload?.message || ''}`.trim().toLowerCase())
)
const show_notice = (message) => {
  if (typeof uni !== 'undefined' && uni.showToast) uni.showToast({ title: t(message), icon: 'none' })
}
const has_blocking_overlay = computed(() => (
  is_report_visible.value
  || show_mic_sheet.value
  || show_mute_dialog.value
  || show_remove_mic_dialog.value
  || Boolean(pending_invitation.value)
  || live_notice.value.visible
  || show_recharge_dialog.value
))
let chrome_touch_x = 0
let chrome_touch_y = 0
const handle_chrome_touch_start = (event) => {
  const touch = event.changedTouches?.[0] || event.touches?.[0]
  if (!touch) return
  chrome_touch_x = touch.clientX
  chrome_touch_y = touch.clientY
}
const handle_chrome_touch_end = (event) => {
  if (has_blocking_overlay.value) return
  const touch = event.changedTouches?.[0]
  if (!touch) return
  const delta_x = touch.clientX - chrome_touch_x
  const delta_y = touch.clientY - chrome_touch_y
  if (Math.abs(delta_x) < 56 || Math.abs(delta_x) <= Math.abs(delta_y)) return
  if (delta_x < 0) {
    is_chrome_hidden.value = true
    show_gift_sheet.value = false
    return
  }
  is_chrome_hidden.value = false
}
const show_live_notice = (title, copy = '') => {
  live_notice.value = {
    visible: true,
    title,
    copy,
    confirmLabel: 'OK'
  }
}
const close_live_notice = () => {
  live_notice.value = {
    ...live_notice.value,
    visible: false
  }
}
const host_user_id = () => room.value.userId || room.value.liveUserId || room.value.createUserId
const current_micro_user = (userType = 2) => ({
  userType,
  userId: account_store.userId,
  userName: account_store.userInfo?.userName,
  userImgUrl: account_store.userInfo?.userImgUrl
})
const applicant_from_payload = (payload) => {
  if (payload?.microUser?.userId) return payload.microUser
  if (payload?.userId) {
    return {
      userType: 2,
      userId: payload.userId,
      userName: payload.userName,
      userImgUrl: payload.userImgUrl
    }
  }
  return null
}
const upsert_applicant = (user) => {
  if (!user?.userId) return
  const applicant_id = `${user.userId}`
  if (applicants.value.some((item) => `${item.userId}` === applicant_id)) return
  applicants.value = [...applicants.value, user]
}
const read_socket_user_list = (envelope, payload) => {
  if (Array.isArray(payload)) return payload.filter(Boolean)
  if (Array.isArray(envelope?.data)) return envelope.data.filter(Boolean)
  if (typeof envelope?.data === 'string') {
    try {
      const parsed = JSON.parse(envelope.data)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {
      return null
    }
  }
  return null
}
const parse_json_value = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}
const read_live_time_value = (source) => {
  if (!source || typeof source !== 'object') return null
  if (Array.isArray(source)) {
    const host_id = `${room.value.userId || ''}`
    const host_user = source.find((item) => `${item?.userId || ''}` === host_id)
    return host_user ? read_live_time_value(host_user) : null
  }
  return source.liveTime ?? null
}
const elapsed_seconds_from_live_time = (value) => {
  if (value === undefined || value === null || value === '') return null
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    if (numeric > 1e12) return Math.max(0, Math.floor((Date.now() - numeric) / 1000))
    if (numeric > 1e9) return Math.max(0, Math.floor((Date.now() - numeric * 1000) / 1000))
    return Math.max(0, Math.floor(numeric))
  }
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  return Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
}
const start_host_elapsed_timer = () => {
  if (host_elapsed_timer) return
  host_elapsed_timer = setInterval(() => {
    host_elapsed_seconds.value = Math.max(0, Math.floor((Date.now() - host_elapsed_origin_ms) / 1000))
  }, 1000)
}
const stop_host_elapsed_timer = () => {
  if (!host_elapsed_timer) return
  clearInterval(host_elapsed_timer)
  host_elapsed_timer = null
}
const apply_host_elapsed_seconds = (seconds) => {
  const value = Math.max(0, Math.floor(Number(seconds) || 0))
  host_elapsed_origin_ms = Date.now() - value * 1000
  host_elapsed_seconds.value = value
  host_elapsed_synced.value = true
  start_host_elapsed_timer()
}
const apply_host_elapsed_from_source = (source) => {
  const elapsed = elapsed_seconds_from_live_time(read_live_time_value(source))
  if (elapsed === null) return false
  apply_host_elapsed_seconds(elapsed)
  return true
}
const apply_host_elapsed_from_message = (envelope, payload) => {
  if (apply_host_elapsed_from_source(payload)) return
  if (apply_host_elapsed_from_source(envelope)) return
  if (apply_host_elapsed_from_source(room.value)) return
  if (!host_elapsed_synced.value && is_host.value) apply_host_elapsed_seconds(0)
}
const parse_socket_payload = (event) => {
  try {
    const envelope = parse_json_value(event?.data, {})
    const envelope_object = envelope && typeof envelope === 'object' ? envelope : {}
    const payload = parse_json_value(envelope_object.data, envelope_object.data ?? envelope_object)
    return { envelope: envelope_object, payload: payload ?? {} }
  } catch {
    return { envelope: {}, payload: {} }
  }
}
const send_socket = (payload) => send_live_socket_message(socket.value, {
  channelId: room_id.value,
  ...payload
})
const current_presence_user = () => as_audience_user({
  userId: account_store.userId,
  userName: account_store.userInfo?.userName,
  userImgUrl: account_store.userInfo?.userImgUrl
})
const apply_audience_enter = (payload = {}) => {
  const result = upsert_audience_list(audience.value, payload)
  audience.value = result.list
  if (result.added) watch_count.value += 1
}
const apply_audience_leave = (payload = {}) => {
  const result = remove_audience_list(
    audience.value,
    payload.userId || payload.microUser?.userId
  )
  audience.value = result.list
}
let audience_leave_sent = false
const sync_audience_enter = () => {
  audience_leave_sent = false
  const user = current_presence_user()
  apply_audience_enter(user)
  send_socket({
    messageType: 14,
    message: 'enter',
    ...user
  })
}
const sync_audience_leave = () => {
  if (audience_leave_sent) return
  audience_leave_sent = true
  const user = current_presence_user()
  apply_audience_leave(user)
  send_socket({
    messageType: 15,
    message: 'leave',
    ...user
  })
}
const stop_heartbeat = () => {
  if (heartbeat_timer.value) clearInterval(heartbeat_timer.value)
  heartbeat_timer.value = null
}
const send_heartbeat = () => send_socket({
  message: 'ping',
  messageType: 0,
  userId: account_store.userId,
  userName: account_store.userInfo?.userName,
  userImgUrl: account_store.userInfo?.userImgUrl
})
const start_heartbeat = () => {
  stop_heartbeat()
  send_heartbeat()
  heartbeat_timer.value = setInterval(send_heartbeat, HEARTBEAT_INTERVAL_MS)
}
const room_is_active = (info) => {
  if (!info || typeof info !== 'object') return false
  if (info.liveStatus === undefined || info.liveStatus === null || info.liveStatus === '') {
    return Boolean(info.liveId || info.userId)
  }
  return Number(info.liveStatus) === LIVE_STATUS_ACTIVE
}
const leave_ended_room = (notice, delay_ms = 0) => {
  if (is_unmounted) return
  intentional_disconnect.value = true
  stop_heartbeat()
  if (reconnect_timer.value) {
    clearTimeout(reconnect_timer.value)
    reconnect_timer.value = null
  }
  live_info_request_context.cancel?.()
  show_notice(notice)
  const leave = () => {
    if (is_unmounted) return
    page_transition.value?.navigate_back()
  }
  if (room_end_timer) clearTimeout(room_end_timer)
  if (delay_ms > 0) {
    room_end_timer = setTimeout(() => {
      room_end_timer = null
      leave()
    }, delay_ms)
    return
  }
  leave()
}
const reconnect_socket = async () => {
  if (is_unmounted || intentional_disconnect.value || !room_id.value) return
  live_info_request_context.cancel?.()
  const result = await selectLiveInfo({
    liveId: room_id.value,
    livePassword: room_password.value || undefined
  }, live_info_request_context)
  if (is_unmounted || intentional_disconnect.value) return
  if (result?.success && !room_is_active(result.data)) {
    leave_ended_room('This room has ended.')
    return
  }
  connect_socket()
}
const handle_visibility = () => {
  if (typeof document === 'undefined' || document.hidden) return
  if (socket.value?.readyState === WebSocket.OPEN) send_heartbeat()
}
const handle_socket_message = (event) => {
  const { envelope, payload } = parse_socket_payload(event)
  if (envelope.code && Number(envelope.code) !== 200000 && !envelope.messageType) {
    show_notice(envelope.message || 'Live connection was rejected.')
    return
  }
  const type = Number(envelope.messageType || envelope.type || payload.messageType)
  if (type === 1) {
    if (is_mic_signal(payload)) apply_remote_mic_state(payload)
    else if (is_apply_signal(payload)) upsert_applicant(applicant_from_payload(payload))
    else if (!is_control_chat_payload(payload)) {
      messages.value = [...messages.value, map_message(payload, messages.value.length)].slice(-20)
      scroll_to_latest()
    }
  } else if (type === 2) {
    if (`${payload.userId || ''}` === `${account_store.userId || ''}`) return
    play_gift_effect(payload)
  } else if ([4, 12].includes(type)) {
    if (type === 12) {
      const list = read_socket_user_list(envelope, payload)
      if (list) applicants.value = list
    } else {
      const applicant = applicant_from_payload(payload)
      if (applicant) upsert_applicant(applicant)
      if (is_host.value) send_socket({ messageType: 12, message: 'list' })
    }
  } else if ([5, 7, 9].includes(type)) {
    if (Array.isArray(payload)) microphone_users.value = payload
    const target_id = `${payload.microUser?.userId || payload.userId || ''}`
    if (type === 9 && target_id) {
      microphone_users.value = microphone_users.value.filter((user) => `${user.userId}` !== target_id)
    } else if ([5, 7].includes(type) && payload.microUser?.userId) {
      const joined = payload.microUser
      if (!microphone_users.value.some((user) => `${user.userId}` === `${joined.userId}`)) {
        microphone_users.value = [...microphone_users.value, joined]
      }
      applicants.value = applicants.value.filter((item) => `${item.userId}` !== `${joined.userId}`)
    }
    if ([5, 7].includes(type) && target_id === `${account_store.userId || ''}`) {
      const should_notice_accept = type === 5 && has_applied.value
      has_applied.value = false
      void publish_local_audio()
      if (should_notice_accept) {
        show_live_notice(
          'The host accepted your application.',
          'You are now on the mic and can start speaking.'
        )
      }
    }
    if (type === 9 && target_id === `${account_store.userId || ''}` && !is_host.value) {
      void unpublish_local_audio()
      if (left_mic_locally) {
        left_mic_locally = false
      } else if (/remove/i.test(`${payload.message || ''}`)) {
        show_live_notice(
          'The host moved you off the mic.',
          'You can apply again if a seat is still available.'
        )
      } else {
        show_live_notice(
          'You were moved off the mic.',
          'The connection was lost. Apply again if a seat is still available.'
        )
      }
    }
  } else if (type === 11) {
    if (Array.isArray(payload)) microphone_users.value = payload
    apply_host_elapsed_from_message(envelope, payload)
  } else if (type === 14) {
    apply_audience_enter(payload)
  } else if (type === 15) {
    apply_audience_leave(payload)
  } else if (type === 6) {
    pending_invitation.value = payload.inviteUserList?.find((item) => `${item.userId}` === `${account_store.userId}`) || payload
  } else if (type === 3) {
    apply_remote_mic_state(payload)
  } else if (type === 8) {
    apply_audience_leave(payload)
    const kicked_id = `${payload.microUser?.userId || payload.userId || ''}`
    if (kicked_id && kicked_id !== `${account_store.userId || ''}`) return
    intentional_disconnect.value = true
    show_notice('You have been removed from the room.')
    page_transition.value?.navigate_back()
  } else if (type === 98) {
    intentional_disconnect.value = true
    show_notice('This account is already connected on another device.')
    page_transition.value?.navigate_back()
  } else if (type === 10) {
    const rejected_id = `${payload.microUser?.userId || payload.userId || ''}`
    if (rejected_id) {
      applicants.value = applicants.value.filter((item) => `${item.userId}` !== rejected_id)
    }
    const self_id = `${account_store.userId || ''}`
    const is_self_reject = !is_host.value && (!rejected_id || rejected_id === self_id)
    if (is_self_reject && has_applied.value) {
      has_applied.value = false
      show_live_notice(
        'The host rejected your application.',
        'You can apply again later if a seat is still available.'
      )
    } else if (is_self_reject) {
      has_applied.value = false
    }
  } else if (type === 99) {
    const notice = /close/i.test(`${payload.message || envelope.message || ''}`)
      ? 'The host has closed the room.'
      : 'This room has ended.'
    leave_ended_room(notice, 800)
  }
}
const connect_socket = () => {
  if (!room_id.value || !account_store.token) return
  if (reconnect_timer.value) {
    clearTimeout(reconnect_timer.value)
    reconnect_timer.value = null
  }
  try {
    intentional_disconnect.value = false
    socket.value = create_live_socket({
      room_id: room_id.value,
      token: account_store.token,
      on_open: () => {
        send_socket({ message: 'snapshot', messageType: 11 })
        send_socket({ messageType: 12, message: 'list' })
        sync_audience_enter()
        start_heartbeat()
      },
      on_message: handle_socket_message,
      on_close: () => {
        stop_heartbeat()
        socket.value = null
        if (!intentional_disconnect.value && room_id.value) {
          reconnect_timer.value = setTimeout(() => {
            reconnect_timer.value = null
            void reconnect_socket()
          }, 3000)
        }
      }
    })
  } catch (error) {
    show_notice(error?.message || 'Live connection is unavailable.')
  }
}
const audio_uid = () => {
  const raw_id = `${account_store.userId || ''}`
  return raw_id.length > 9 ? raw_id.substring(6, 15) : raw_id
}
const publish_local_audio = async () => {
  if (!audio_client.value || audio_is_published.value || audio_publish_pending.value) return
  audio_publish_pending.value = true
  try {
    if (!local_audio_track.value) local_audio_track.value = await AgoraRTC.createMicrophoneAudioTrack()
    if (!is_host.value) await audio_client.value.setClientRole('host')
    await audio_client.value.publish(local_audio_track.value)
    audio_is_published.value = true
  } catch (error) {
    show_notice(error?.message || 'Microphone access is unavailable.')
  } finally {
    audio_publish_pending.value = false
  }
}
const unpublish_local_audio = async () => {
  if (!audio_client.value || !local_audio_track.value || !audio_is_published.value) return
  try {
    await audio_client.value.unpublish(local_audio_track.value)
    audio_is_published.value = false
    if (!is_host.value) await audio_client.value.setClientRole('audience')
  } catch (error) {
    console.warn('Unable to leave the mic.', error)
  }
}
const resolve_video_stage = () => {
  if (typeof document === 'undefined') return null
  const stage = document.getElementById('live-video-stage')
  if (!stage) return null
  let host = stage.querySelector('.video-stage__host')
  if (!host) {
    host = document.createElement('div')
    host.className = 'video-stage__host'
    host.style.position = 'absolute'
    host.style.inset = '0'
    host.style.width = '100%'
    host.style.height = '100%'
    stage.appendChild(host)
  }
  return host
}
const play_video_track = (track) => {
  const stage = resolve_video_stage()
  if (!stage || !track?.play) return
  track.play(stage, { fit: 'cover' })
}
const close_local_video_track = async () => {
  if (audio_client.value && local_video_track.value) {
    try {
      await audio_client.value.unpublish(local_video_track.value)
    } catch (error) {
      console.warn('Unable to unpublish video.', error)
    }
  }
  local_video_track.value?.stop?.()
  local_video_track.value?.close?.()
  local_video_track.value = null
}
const join_audio_room = async () => {
  if (!AGORA_APP_ID || !room_id.value || !account_store.userId) return
  const token_result = await getLiveToken({ roomId: room_id.value, userId: audio_uid() })
  if (!token_result?.success || !token_result.data) return
  try {
    const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })
    audio_client.value = client
    client.on('user-published', async (remote_user, media_type) => {
      await client.subscribe(remote_user, media_type)
      if (media_type === 'audio') remote_user.audioTrack?.play()
      if (media_type === 'video') play_video_track(remote_user.videoTrack)
    })
    client.on('user-unpublished', (_remote_user, media_type) => {
      if (media_type === 'video' && !is_host.value) {
        const stage = resolve_video_stage()
        if (stage) stage.innerHTML = ''
      }
    })
    await client.setClientRole(is_host.value ? 'host' : 'audience')
    await client.join(AGORA_APP_ID, room_id.value, token_result.data, audio_uid())
    if (is_host.value) {
      local_audio_track.value = await AgoraRTC.createMicrophoneAudioTrack()
      local_video_track.value = await AgoraRTC.createCameraVideoTrack()
      play_video_track(local_video_track.value)
      await client.publish([local_audio_track.value, local_video_track.value])
      audio_is_published.value = true
    }
  } catch (error) {
    show_notice(error?.message || 'Video connection is unavailable.')
  }
}
const load_room = async () => {
  const [info_result, users_result, message_result] = await Promise.all([
    selectLiveInfo({ liveId: room_id.value, livePassword: room_password.value || undefined }),
    selectRoomUsers({ liveId: room_id.value }),
    selectRoomMessages({ activityId: room_id.value, current: 1, size: 20 })
  ])
  if (info_result?.success) {
    room.value = info_result.data || {}
    if (is_host.value && !apply_host_elapsed_from_source(room.value)) apply_host_elapsed_seconds(0)
  }
  if (users_result?.success) {
    audience.value = Array.isArray(users_result.data) ? users_result.data : []
  }
  watch_count.value = seed_watch_count(room.value.liveUserNum, audience.value.length)
  if (message_result?.success) {
    const records = message_result.data?.records || message_result.data || []
    messages.value = Array.isArray(records)
      ? records.filter((item) => !is_control_chat_payload(item)).slice(-20).map(map_message)
      : []
    if (messages.value.length) scroll_to_latest()
  }
}
const apply_for_mic = () => {
  if (is_host.value) {
    open_host_mic_sheet('apply')
    return
  }
  if (is_muted.value) return show_notice('You are muted and cannot apply for a mic.')
  if (has_applied.value) {
    send_socket({ messageType: 13, userId: account_store.userId })
    has_applied.value = false
    return
  }
  const host_id = host_user_id()
  const applicant = current_micro_user(2)
  const apply_payload = {
    messageType: 4,
    message: 'apply',
    userId: applicant.userId,
    userName: applicant.userName,
    userImgUrl: applicant.userImgUrl,
    receiveUserIds: host_id ? [`${host_id}`] : [],
    microUser: applicant
  }
  send_socket(apply_payload)
  has_applied.value = true
  show_notice('Your application was sent to the host.')
}
const stop_invite_cooldown_timer = () => {
  if (!invite_cooldown_timer) return
  clearInterval(invite_cooldown_timer)
  invite_cooldown_timer = null
}
const start_invite_cooldown_timer = () => {
  if (invite_cooldown_timer) return
  invite_cooldown_timer = setInterval(() => {
    cooldown_now.value = Date.now()
    const has_active = invite_all_until.value > cooldown_now.value
      || Object.values(invite_cooldowns.value).some((until) => until > cooldown_now.value)
    if (!has_active) stop_invite_cooldown_timer()
  }, 1000)
}
const mark_invite_cooldown = (users) => {
  const until = Date.now() + INVITE_COOLDOWN_MS
  cooldown_now.value = Date.now()
  const next = { ...invite_cooldowns.value }
  users.forEach((user) => {
    if (user?.userId) next[`${user.userId}`] = until
  })
  invite_cooldowns.value = next
  start_invite_cooldown_timer()
  return until
}
const load_invite_users = async () => {
  if (!room_id.value) return
  invite_users_request_id += 1
  const request_id = invite_users_request_id
  is_invite_users_loading.value = true
  invite_users_error.value = ''
  invite_users_request_context.cancel?.()
  const keyword = invite_search.value.trim()
  const params = { liveId: room_id.value }
  if (keyword && !/^\d+$/.test(keyword)) params.selectContent = keyword
  try {
    const result = await selectRoomUsers(params, invite_users_request_context)
    if (request_id !== invite_users_request_id) return
    if (result?.success) invite_candidates.value = Array.isArray(result.data) ? result.data : []
    else if (result?.error !== 'Request cancelled.') invite_users_error.value = result?.error || 'Unable to load users.'
  } finally {
    if (request_id === invite_users_request_id) is_invite_users_loading.value = false
  }
}
const open_host_mic_sheet = (tab = 'apply') => {
  mic_sheet_tab.value = tab
  show_mic_sheet.value = true
  send_socket({ messageType: 12, message: 'list' })
  void load_invite_users()
}
const change_mic_sheet_tab = (tab) => {
  if (mic_sheet_tab.value === tab) return
  mic_sheet_tab.value = tab
  if (tab === 'seat') void load_invite_users()
}
const search_invite_users = () => {
  void load_invite_users()
}
const open_invites = () => {
  if (is_host.value) open_host_mic_sheet('seat')
}
const invite_user = (user) => {
  if (!user?.userId || invite_user_cooldown_seconds.value[`${user.userId}`]) return
  send_socket({
    messageType: 6,
    message: 'invite',
    inviteUserList: [{
      userType: 2,
      userId: user.userId,
      userName: user.userName,
      userImgUrl: user.userImgUrl
    }]
  })
  mark_invite_cooldown([user])
  show_notice('Invitation sent.')
}
const invite_all_users = () => {
  if (invite_all_seconds.value > 0) return
  const users = inviteable_users.value.filter((user) => !invite_user_cooldown_seconds.value[`${user.userId}`])
  if (!users.length) return
  send_socket({
    messageType: 6,
    message: 'invite',
    inviteUserList: users.map((user) => ({
      userType: 2,
      userId: user.userId,
      userName: user.userName,
      userImgUrl: user.userImgUrl
    }))
  })
  invite_all_until.value = mark_invite_cooldown(users)
  show_notice('Invitation sent.')
}
const accept_invitation = () => {
  send_socket({
    messageType: 7,
    message: 'accept',
    microUser: current_micro_user(2)
  })
  pending_invitation.value = null
  void publish_local_audio()
}
const decline_invitation = () => {
  pending_invitation.value = null
}
const send_chat = () => {
  const content = message_input.value.trim()
  if (!content || is_muted.value) return
  send_socket({ messageType: 1, message: content, userName: account_store.userInfo?.userName, userImgUrl: account_store.userInfo?.userImgUrl })
  message_input.value = ''
  scroll_to_latest()
}
const room_user_ids = () => [...new Set([
  room.value.userId,
  account_store.userId,
  ...audience.value.map((item) => item.userId),
  ...microphone_users.value.map((item) => item.userId)
].filter(Boolean).map(String))]
const is_mic_signal = (payload) => Boolean(
  payload?.microUser && /^(mute|unmute)$/i.test(`${payload.message || ''}`)
)
const is_apply_signal = (payload) => (
  /^(apply)$/i.test(`${payload?.message || ''}`) && Boolean(payload?.microUser || payload?.userId)
)
const mic_on_from_payload = (payload) => {
  if (/unmute/i.test(payload?.message || '')) return true
  if (/mute/i.test(payload?.message || '')) return false
  return is_mic_on(payload?.microUser?.talkStatus)
}
const apply_mic_display = (user_id, mic_on) => {
  const target_id = `${user_id || ''}`
  if (!target_id) return
  if (`${room.value.userId || ''}` === target_id) host_mic_on.value = mic_on
  const exists = microphone_users.value.some((user) => `${user.userId}` === target_id)
  if (exists) {
    microphone_users.value = microphone_users.value.map((user) => (
      `${user.userId}` === target_id
        ? { ...user, talkStatus: mic_on ? 1 : 2 }
        : user
    ))
  }
}
const apply_local_audio_enabled = (enabled) => {
  if (local_audio_track.value) void local_audio_track.value.setEnabled(enabled)
}
const apply_remote_mic_state = (payload) => {
  const target_id = `${payload.microUser?.userId || payload.userId || ''}`
  const actor_id = `${payload.userId || ''}`
  const mic_on = mic_on_from_payload(payload)
  const self_id = `${account_store.userId || ''}`
  apply_mic_display(target_id, mic_on)
  if (target_id !== self_id) return
  apply_local_audio_enabled(mic_on)
  if (is_host.value) return
  if (actor_id && actor_id !== self_id) {
    const next_muted = !mic_on
    const should_notice = is_muted.value !== next_muted
    is_muted.value = next_muted
    if (should_notice) {
      show_live_notice(
        mic_on ? 'The host unmuted your mic.' : 'The host muted your mic.',
        mic_on ? 'You can speak in this room again.' : 'You will not be able to speak until the host unmutes you.'
      )
    }
  } else if (!mic_on) is_muted.value = false
}
const push_mic_state = (user, mic_on) => {
  const user_id = user?.userId
  if (!user_id) return
  apply_mic_display(user_id, mic_on)
  if (`${user_id}` === `${account_store.userId || ''}`) apply_local_audio_enabled(mic_on)
  const payload = {
    messageType: 3,
    message: mic_on ? 'unmute' : 'mute',
    userId: account_store.userId,
    userName: account_store.userInfo?.userName,
    userImgUrl: account_store.userInfo?.userImgUrl,
    receiveUserIds: room_user_ids(),
    microUser: {
      userType: `${user_id}` === `${room.value.userId || ''}` ? 1 : 2,
      userId: user_id,
      userName: user.userName || user.name,
      userImgUrl: user.userImgUrl || user.avatar,
      talkStatus: mic_on ? 1 : 2
    }
  }
  send_socket(payload)
}
const toggle_own_mic = () => {
  const self_id = account_store.userId
  if (!self_id) return
  if (is_host.value) {
    push_mic_state({
      userId: self_id,
      userName: account_store.userInfo?.userName || host_name.value,
      userImgUrl: account_store.userInfo?.userImgUrl || host_avatar.value
    }, !host_mic_on.value)
    return
  }
  const self_seat = microphone_users.value.find((item) => `${item.userId}` === `${self_id}`)
  if (!self_seat) return
  const next_enabled = !is_mic_on(self_seat.talkStatus)
  if (is_muted.value && next_enabled) return
  push_mic_state(self_seat, next_enabled)
}
const close_mute_dialog = () => {
  show_mute_dialog.value = false
  mute_target.value = null
}
const confirm_mute_user = () => {
  const target = mute_target.value
  close_mute_dialog()
  if (!target?.userId) return
  push_mic_state(target, false)
}
const close_remove_mic_dialog = () => {
  show_remove_mic_dialog.value = false
  remove_mic_target.value = null
}
const open_remove_mic_dialog = (seat) => {
  if (!is_host.value || !seat?.userId || seat.is_host) return
  remove_mic_target.value = seat
  show_remove_mic_dialog.value = true
}
const remove_user_from_mic = (user) => {
  const user_id = user?.userId
  if (!user_id) return
  send_socket({
    messageType: 9,
    message: 'remove',
    userId: user_id,
    userName: user.userName || user.name,
    userImgUrl: user.userImgUrl || user.avatar,
    microUser: {
      userType: 2,
      userId: user_id,
      userName: user.userName || user.name,
      userImgUrl: user.userImgUrl || user.avatar
    }
  })
  microphone_users.value = microphone_users.value.filter((item) => `${item.userId}` !== `${user_id}`)
}
const confirm_remove_mic_user = () => {
  const target = remove_mic_target.value
  close_remove_mic_dialog()
  if (!target?.userId) return
  remove_user_from_mic(target)
}
const handle_seat_mic_click = (seat) => {
  if (!seat?.userId) return
  const self_id = `${account_store.userId || ''}`
  if (`${seat.userId}` === self_id) {
    toggle_own_mic()
    return
  }
  if (!is_host.value) return
  if (seat.mic_on) {
    mute_target.value = seat
    show_mute_dialog.value = true
    return
  }
  push_mic_state(seat, true)
}
const toggle_mic = () => {
  if (!is_host.value) {
    left_mic_locally = true
    send_socket({ messageType: 9, userId: account_store.userId })
    void unpublish_local_audio()
    show_notice('You left the mic.')
    return
  }
  toggle_own_mic()
}
const open_gifts = () => {
  show_gift_sheet.value = true
  void load_gifts()
}
const open_report_sheet = () => {
  if (is_host.value || !report_host_id.value) return
  is_report_visible.value = true
}
const handle_report_submitted = ({ blocked = false } = {}) => {
  show_notice(blocked ? 'Report sent and user blocked.' : 'Report sent.')
  if (blocked && !is_host.value) void close_room()
}
const load_gifts = async () => {
  gifts_request_id += 1
  const request_id = gifts_request_id
  is_gifts_loading.value = true
  gifts_error.value = ''
  gifts_request_context.cancel?.()
  try {
    const result = await selectGiftList({}, gifts_request_context)
    if (request_id !== gifts_request_id) return
    if (result?.success) {
      gifts.value = Array.isArray(result.data) ? result.data : (result.data?.records || [])
      return
    }
    if (result?.error !== 'Request cancelled.') {
      gifts_error.value = result?.error || 'Unable to load gifts.'
    }
  } finally {
    if (request_id === gifts_request_id) is_gifts_loading.value = false
  }
}
const persist_cached_balance = (value) => {
  const balance = Number(value)
  if (!Number.isFinite(balance)) return
  account_store.setBalance(Math.max(0, balance))
  account_store.updateUserInfo({ userBalance: Number(account_store.balance || 0) })
}
const sync_cached_balance = async () => {
  if (!account_store.userInfo?.userId) return
  gift_balance_request_id += 1
  const request_id = gift_balance_request_id
  gift_balance_request_context.cancel?.()
  const result = await selectUserBalance({}, gift_balance_request_context)
  if (is_unmounted || request_id !== gift_balance_request_id || !result?.success) return
  persist_cached_balance(result.data)
}
const play_gift_effect = (payload = {}) => {
  gift_effect.value?.enqueue(merge_gift_payload(payload, gifts.value))
}
const open_recharge = () => {
  show_recharge_dialog.value = false
  show_gift_sheet.value = false
  page_transition.value?.navigate_forward({ url: '/pages/coins/index' })
}
const send_gift = async (payload = {}) => {
  if (is_gift_sending.value) return
  const gift = payload.gift
  const gift_name = gift_display_name(gift)
  const gift_image = gift_thumb_url(gift)
  const gift_num = Number(payload.giftNum || 1) || 1
  const unit_price = gift_price_value(gift)
  const receiver_ids = [...new Set((payload.receivers || []).map((user) => `${user?.userId || ''}`).filter(Boolean))]
  if (!gift || !receiver_ids.length) {
    show_notice('Choose a host to send a gift.')
    return
  }
  const cost = unit_price * gift_num * receiver_ids.length
  if (Number(account_store.balance || 0) < cost) {
    show_recharge_dialog.value = true
    return
  }
  is_gift_sending.value = true
  gift_send_request_context.cancel?.()
  gift_balance_request_context.cancel?.()
  try {
    const result = await sendGift({
      giftConfigId: gift.giftConfigId,
      giftImgUrl: gift_image,
      giftNum: gift_num,
      giftName: gift_name,
      giftPrice: unit_price,
      liveId: room_id.value,
      receiveUserIds: receiver_ids
    }, gift_send_request_context)
    if (!result?.success) {
      if (is_insufficient_gift_balance(result)) show_recharge_dialog.value = true
      return
    }
    persist_cached_balance(Number(account_store.balance || 0) - cost)
    void sync_cached_balance()
    send_socket({
      messageType: 2,
      userId: account_store.userId,
      giftConfigId: gift.giftConfigId,
      giftImgUrl: gift_image,
      giftNum: gift_num,
      giftName: gift_name,
      receiveUserIds: receiver_ids,
      userName: account_store.userInfo?.userName,
      userImgUrl: account_store.userInfo?.userImgUrl,
      amberIcon: gift.amberIcon,
      relicThumbnail: gift.relicThumbnail,
      tributeKind: gift.tributeKind,
      hatchRelease: gift.hatchRelease,
      gitfName: gift.gitfName,
      gitfImgUrl: gift.gitfImgUrl,
      gitfVal: gift.gitfVal
    })
    show_gift_sheet.value = false
    play_gift_effect({
      ...gift,
      giftNum: gift_num,
      userName: account_store.userInfo?.userName,
      userImgUrl: account_store.userInfo?.userImgUrl
    })
  } finally {
    is_gift_sending.value = false
  }
}
const respond_to_application = (applicant, accepted) => {
  if (!applicant?.userId) return
  send_socket({
    messageType: accepted ? 5 : 10,
    message: accepted ? 'allow' : 'deny',
    receiveUserIds: [`${applicant.userId}`],
    microUser: applicant
  })
  applicants.value = applicants.value.filter((item) => `${item.userId}` !== `${applicant.userId}`)
  if (accepted && !microphone_users.value.some((user) => `${user.userId}` === `${applicant.userId}`)) {
    microphone_users.value = [...microphone_users.value, applicant]
  }
}
const close_room = async () => {
  intentional_disconnect.value = true
  if (reconnect_timer.value) clearTimeout(reconnect_timer.value)
  stop_heartbeat()
  sync_audience_leave()
  if (is_host.value) {
    send_socket({ messageType: 99, message: 'close' })
    await finishLive({ liveId: room_id.value })
  } else {
    await addQuitLive({ liveId: room_id.value, addType: 2 })
  }
  socket.value?.close()
  page_transition.value?.navigate_back()
}

onLoad(async (options = {}) => {
  room_id.value = read_legacy_live_room_id(options)
  room_password.value = `${options.live_password || options.livePassword || ''}`
  if (!room_id.value) {
    page_transition.value?.navigate_replace({ url: '/pages/live-room/create' })
    return
  }
  await load_room()
  if (is_unmounted) return
  if (!is_video_live_room(room.value)) {
    page_transition.value?.navigate_replace({
      url: live_room_page_url({
        live_id: room_id.value,
        live_password: room_password.value,
        live_classify: room.value.liveClassify
      })
    })
    return
  }
  void load_gifts()
  if (account_store.token) await addQuitLive({ liveId: room_id.value, addType: 1 })
  await join_audio_room()
  connect_socket()
})
onMounted(() => {
  if (typeof document === 'undefined') return
  document.addEventListener('visibilitychange', handle_visibility)
})
onBeforeUnmount(() => {
  is_unmounted = true
  clearTimeout(chat_scroll_timer)
  if (room_end_timer) clearTimeout(room_end_timer)
  live_info_request_context.cancel?.()
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handle_visibility)
  }
  intentional_disconnect.value = true
  stop_heartbeat()
  stop_host_elapsed_timer()
  stop_invite_cooldown_timer()
  invite_users_request_context.cancel?.()
  gifts_request_context.cancel?.()
  gift_send_request_context.cancel?.()
  gift_balance_request_context.cancel?.()
  if (reconnect_timer.value) clearTimeout(reconnect_timer.value)
  sync_audience_leave()
  socket.value?.close()
  void unpublish_local_audio()
  local_audio_track.value?.close()
  void close_local_video_track()
  void audio_client.value?.leave()
  if (room_id.value && !is_host.value) void addQuitLive({ liveId: room_id.value, addType: 2 })
})
</script>

<style scoped lang="scss">
.live-shell {
  position: relative;
  display: flex;
  min-height: 0;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
  background: var(--page-background);
  color: var(--live-text);
}

.video-stage {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  background: var(--page-background);
}

.video-stage :deep(.video-stage__host) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.video-stage :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.live-ui {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.live-chrome {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  background: transparent;
  backface-visibility: hidden;
  will-change: transform;
  transition: transform var(--route-transition-stack-duration) cubic-bezier(.32, .72, 0, 1);
}

.live-chrome--hidden {
  transform: translate3d(-100%, 0, 0);
  pointer-events: none;
}

.live-header,
.chat-list,
.live-footer {
  position: relative;
  z-index: 1;
}

.live-header {
  display: flex;
  min-height: 122rpx;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 22rpx 16rpx 28rpx;
  flex: none;
}

.room-owner,
.header-audience,
.room-owner__audience,
.audience-avatars,
.seat__topline,
.seat__name,
.seat__status,
.live-footer {
  display: flex;
  align-items: center;
}

.room-owner {
  min-width: 0;
  padding: 8rpx 26rpx 8rpx 8rpx;
  border-radius: 999rpx;
  background: var(--live-header-surface);
}

.room-owner__avatar {
  width: 78rpx;
  height: 78rpx;
  border: 2px solid var(--live-text);
  border-radius: 50%;
  flex: none;
}

.room-owner__copy {
  min-width: 0;
  margin-left: 16rpx;
}

.room-owner__name {
  display: block;
  max-width: 230rpx;
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 800;
  line-height: 36rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-owner__audience {
  margin-top: 4rpx;
  color: var(--live-text-muted);
  font-size: 20rpx;
  gap: 8rpx;
}

.room-owner__audience-icon {
  width: 22rpx;
  height: 22rpx;
  color: var(--live-text);
}

.header-audience {
  min-width: 0;
  gap: 12rpx;
}

.audience-avatars {
  max-width: 208rpx;
  overflow: hidden;
}

.audience-avatar {
  width: 56rpx;
  height: 56rpx;
  margin-left: -8rpx;
  border: 2px solid var(--live-text);
  border-radius: 50%;
  flex: none;
}

.audience-avatar:first-child {
  margin-left: 0;
}

.audience-count {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--live-header-surface);
  font-size: 21rpx;
  font-weight: 700;
}

.close-button {
  display: flex;
  width: 66rpx;
  height: 66rpx;
  align-items: center;
  justify-content: center;
}
.close-button image {
  width: 66rpx;
  height: 66rpx;
}

.seat-grid {
  display: grid;
  min-height: 0;
  height: 588rpx;
  background: var(--live-seat-surface);
  flex: none;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, 1fr);
}

.seat {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-right: 1px solid var(--live-seat-surface-light);
  border-bottom: 1px solid var(--live-seat-surface-light);
  background: var(--live-seat-surface);
}

.seat:nth-child(3n) { border-right: none; }

.seat:nth-child(n + 4) { border-bottom: none; }

.seat__avatar,
.seat__shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.seat__avatar {
  object-fit: cover;
}

.seat__shade {
  background: var(--live-seat-overlay);
}

.seat__topline {
  position: absolute;
  top: 14rpx;
  right: 12rpx;
  left: 12rpx;
  justify-content: space-between;
  gap: 6rpx;
}

.seat__name {
  min-width: 0;
  max-width: 194rpx;
  padding: 7rpx 12rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
  gap: 5rpx;
}

.seat__name text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seat__name--owner {
  background: var(--live-pink);
}

.seat__name--guest {
  background: var(--live-header-surface);
}

.seat__owner-icon {
  width: 108rpx;
  height: 36rpx;
  flex: none;
}

.seat__mic {
  display: flex;
  width: 52rpx;
  height: 52rpx;
  align-items: center;
  justify-content: center;
  flex: none;
}

.seat__mic-icon {
  width: 36rpx;
  height: 36rpx;
}

.seat__status {
  position: absolute;
  right: 16rpx;
  bottom: 14rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  font-size: 21rpx;
  gap: 8rpx;
}

.seat__status--owner {
  background: var(--live-header-surface);
}

.seat__status--guest {
  background: var(--live-purple);
}

.seat__status--manage {
  left: 16rpx;
  right: 16rpx;
  min-width: 0;
  padding: 0;
  background: transparent;
  justify-content: space-between;
}

.seat__status-icon,
.seat__status-laba-icon {
  width: 28rpx;
  height: 28rpx;
  flex: none;
}

.seat__status-laba {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.seat__status--manage .seat__status-laba {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: var(--live-purple);
}

.seat__status-move {
  display: flex;
  width: 44rpx;
  height: 44rpx;
  align-items: center;
  justify-content: center;
  background: transparent;
  flex: none;
}

.seat__status-move-icon {
  width: 36rpx;
  height: 36rpx;
}

.seat__number {
  color: var(--live-text-muted);
  font-size: 92rpx;
  font-weight: 900;
  line-height: 1;
}

.seat__waiting {
  position: absolute;
  bottom: 42rpx;
  color: var(--live-text-soft);
  font-size: 22rpx;
  font-weight: 700;
}

.live-announcement {
  margin: 22rpx 24rpx 0;
  padding: 18rpx 24rpx;
  border-radius: 26rpx;
  background: var(--live-message-surface);
  font-size: 25rpx;
  font-weight: 800;
  line-height: 38rpx;
  flex: none;
}

.chat-list {
  height: calc(100vh * 0.6);
  min-height: 0;
  margin: 18rpx 24rpx 0;
  background: transparent;
  flex: none;
}

.chat-list :deep(.uni-scroll-view),
.chat-list :deep(.uni-scroll-view-content) {
  background: transparent;
}

.chat-list__inner {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  justify-content: flex-end;
  background: transparent;
}

.chat-message {
  display: block;
  width: fit-content;
  max-width: 92%;
  margin-top: 14rpx;
  padding: 14rpx 24rpx;
  border-radius: 26rpx;
  background: transparent;
  font-size: 23rpx;
  line-height: 34rpx;
}

.chat-message:first-child {
  margin-top: 0;
}

.chat-message__name {
  font-weight: 800;
}

.chat-message__copy {
  margin-left: 6rpx;
}

.apply-join {
  position: absolute;
  right: 0;
  bottom: 132rpx;
  z-index: 2;
  display: flex;
  // width: 216rpx;
  min-height: 92rpx;
  align-items: flex-start;
  justify-content: center;
  padding: 16rpx 24rpx 14rpx 30rpx;
  border-radius: 52rpx 0 0 52rpx;
  background: var(--live-pink);
  box-sizing: border-box;
  flex-direction: column;
  margin-bottom: 40rpx;
}

.apply-join--host {
  flex-direction: row;
  align-items: center;
  padding: 18rpx 28rpx 18rpx 24rpx;
  gap: 12rpx;
}

.apply-join__seat-icon {
  width: 44rpx;
  height: 44rpx;
  filter: brightness(0) invert(1);
  flex: none;
}

.apply-join__title {
  font-size: 27rpx;
  font-weight: 800;
  line-height: 34rpx;
}

.apply-join__meta {
  display: flex;
  align-items: center;
  color: var(--live-text-muted);
  font-size: 20rpx;
  gap: 8rpx;
}

.apply-join__icon {
  width: 22rpx;
  height: 22rpx;
}

.applicant-panel,
.invite-panel {
  position: absolute;
  right: 24rpx;
  bottom: 238rpx;
  z-index: 4;
  width: 620rpx;
  padding: 22rpx;
  border: 1px solid var(--live-seat-surface-light);
  border-radius: 24rpx;
  background: var(--live-header-surface);
  box-sizing: border-box;
}

.invite-panel { bottom: 220rpx; }

.applicant-panel__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 25rpx;
  font-weight: 800;
}

.applicant-row {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
  gap: 12rpx;
}

.applicant-row__avatar { width: 52rpx; height: 52rpx; flex: none; }
.applicant-row__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; font-size: 22rpx; }
.applicant-row__button { padding: 10rpx 16rpx; border-radius: 999rpx; background: var(--live-message-surface); font-size: 19rpx; }
.applicant-row__button--accept { background: var(--live-pink); }

.live-footer {
  min-height: 112rpx;
  padding: 18rpx 24rpx 20rpx;
  gap: 16rpx;
  flex: none;
}

.message-composer {
  display: flex;
  height: 78rpx;
  align-items: center;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--live-message-surface);
  color: var(--live-text-muted);
  font-size: 25rpx;
  flex: 1;
}

.footer-action {
  position: relative;
  display: flex;
  width: 78rpx;
  height: 78rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--live-header-surface);
  color: var(--live-text);
  flex: none;
}

.footer-action--gift {
  background: var(--live-button-surface);
  color: var(--live-yellow);
}

.footer-action--chat {
  background: linear-gradient(145deg, var(--live-yellow), var(--live-pink));
  color: var(--live-text);
}

.footer-action__icon {
  width: 36rpx;
  height: 36rpx;
}

.footer-action__badge {
  position: absolute;
  top: -8rpx;
  right: -4rpx;
  display: flex;
  width: 34rpx;
  height: 34rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--live-pink);
  font-size: 17rpx;
  font-weight: 800;
}
</style>

<template>
  <PageTransition ref="page_transition" class="chat-page" :class="{ 'chat-page--locked': is_locked_layout }" :style="theme_style">
    <image
      class="chat-scene"
      src="/static/icon/msg_bg.png"
      mode="aspectFill"
      aria-hidden="true"
    />
    <view class="chat-shade" aria-hidden="true" />
    <TopSafeArea />
    <view class="page-content">
      <view class="chat-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view
          class="peer-entry"
          role="button"
          :aria-label="$t(`Open ${display_name} profile`)"
          @click="open_peer_profile"
        >
          <UserAvatar class="peer-avatar" :source="peer_avatar_url" />
          <view class="peer-copy">
            <text class="peer-name">{{ display_name }}</text>
            <view v-if="status_label" class="peer-status-line">
              <view v-if="is_locked_layout" class="peer-status-dot" aria-hidden="true" />
              <text class="peer-status">{{ $t(status_label) }}</text>
            </view>
          </view>
        </view>
        <view
          v-if="video_visible"
          class="header-action"
          role="button"
          :aria-label="$t('Start video call')"
          @click="open_video_call"
        >
          <image src="/static/icon/private_message_video_call.png" mode="aspectFit" />
        </view>
        <view
          class="header-action"
          role="button"
          :aria-label="$t('More actions')"
          @click="open_report"
        >
          <image src="/static/icon/private_message_more.png" mode="aspectFit" />
        </view>
      </view>
      <scroll-view class="content-scroll" scroll-y :scroll-top="scroll_top" :show-scrollbar="false">
        <view class="content-scroll__inner" :class="{ 'content-scroll__inner--locked': is_locked_layout }">
          <view v-if="is_loading && !has_thread" class="chat-skeleton" aria-hidden="true">
            <view class="chat-skeleton__bubble" />
            <view class="chat-skeleton__bubble chat-skeleton__bubble--mine" />
          </view>
          <view v-else-if="load_error && !has_thread" class="state-card" role="alert">
            <text class="state-card__copy">{{ $t(load_error) }}</text>
            <view class="state-card__retry" role="button" @click="load_chat">{{ $t('Try again') }}</view>
          </view>
          <view v-else-if="is_locked_layout" class="locked-thread">
            <view v-if="lantern_quote" class="lantern-card">
              <text class="lantern-kicker">{{ $t('THEIR LANTERN') }}</text>
              <text class="lantern-copy">{{ $t(lantern_quote) }}</text>
            </view>
            <view v-if="one_reply_text" class="one-reply">
              <text class="one-reply__kicker">{{ $t('YOUR ONE REPLY') }}</text>
              <text class="one-reply__copy">{{ one_reply_text }}</text>
              <text v-if="one_reply_clock" class="chat-time">{{ $t(one_reply_clock) }}</text>
            </view>
            <view class="waiting-block">
              <image src="/static/icon/private_message_waiting_reply.png" mode="aspectFit" />
              <text class="waiting-title">{{ $t('Waiting for their reply') }}</text>
              <text class="waiting-copy">{{ $t(one_reply_notice) }}</text>
            </view>
          </view>
          <view v-else class="bubble-thread">
            <view v-if="day_label" class="day-chip">
              <text>{{ $t(day_label) }}</text>
            </view>
            <view
              v-for="message in thread_messages"
              :key="message.message_id"
              class="chat-row"
              :class="{ 'chat-row--mine': message.is_mine }"
            >
              <UserAvatar
                v-if="!message.is_mine"
                class="chat-avatar"
                :source="message.sender_avatar_url || peer_avatar_url"
              />
              <view class="chat-bubble" :class="message.is_mine ? 'chat-bubble--out' : 'chat-bubble--in'">
                <text class="chat-copy">{{ message.preview || message.content }}</text>
                <text v-if="message.clock_label" class="chat-time">{{ $t(message.clock_label) }}</text>
              </view>
            </view>
          </view>
          <text v-if="load_error && has_thread" class="inline-error" role="alert">{{ $t(load_error) }}</text>
        </view>
      </scroll-view>
      <view v-if="composer_visible || show_turn_notice" class="chat-footer">
        <view v-if="show_turn_notice" class="turn-notice">
          <image src="/static/icon/private_message_warn.png" mode="aspectFit" />
          <text>{{ $t(your_turn_notice) }}</text>
        </view>
        <view
          v-if="composer_visible"
          class="composer"
          :class="{ 'composer--after-turn': show_turn_notice }"
        >
          <text v-if="send_error" class="send-error" role="alert">{{ $t(send_error) }}</text>
          <view class="composer-row">
            <input
              v-model="draft"
              class="composer-input"
              :disabled="is_sending"
              maxlength="500"
              confirm-type="send"
              :placeholder="$t('Message')"
              placeholder-class="composer-placeholder"
              @confirm="send_text"
            />
            <view
              class="send-button"
              :class="{ 'send-button--disabled': !can_send }"
              role="button"
              :aria-label="$t('Send message')"
              :aria-disabled="!can_send"
              @click="send_text"
            >
              <image src="/static/icon/private_message_sedn.png" mode="aspectFit" />
            </view>
          </view>
        </view>
      </view>
    </view>
    <BottomSafeArea />
    <ReportUserSheet
      :visible="is_report_visible"
      :target-name="display_name"
      :target-user-id="peer_user_id"
      bottom-offset="0rpx"
      @update:visible="is_report_visible = $event"
    />
    <PermissionRequestOverlay
      :visible="is_permission_request_visible"
      :permission-key="permission_request_key"
      @update:visible="is_permission_request_visible = $event"
      @granted="on_permission_granted"
      @denied="on_permission_denied"
    />
  </PageTransition>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { CALL_CONNECTION_ENABLED } from '@/config/callMedia'
import { selectUserBaseInfo } from '@/api/common'
import { selectLmLanternPage } from '@/api/lantern'
import { selectTargetUserMessageList, sendMessage, updateMsgRead } from '@/api/message'
import { selectLmLanternReplyPage, selectLmLanternScoopPage } from '@/api/scoop'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import PermissionRequestOverlay from '@/components/PermissionRequestOverlay.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import {
  LOCKED_ONE_REPLY,
  WAITING_OTHER,
  ONE_REPLY_NOTICE,
  OPEN_CHAT,
  YOUR_TURN,
  YOUR_TURN_NOTICE,
  build_chat_page_url,
  build_chat_send_params,
  build_ringing_url,
  can_compose_chat,
  chat_day_label,
  chat_status_label,
  decorate_chat_messages,
  format_chat_clock,
  next_mode_after_send,
  read_chat_peer_profile,
  read_missing_send_message_fields,
  read_receive_user_id,
  read_requested_chat_mode,
  resolve_chat_mode,
  shows_video_call
} from '@/utils/chatPresentation'
import {
  build_select_reply_params,
  map_lantern_record,
  map_reply_record,
  map_scoop_record,
  read_page_records
} from '@/utils/lanternDetailPresentation'
import { map_chat_messages } from '@/utils/messagePresentation'
import { map_user_base_profile } from '@/utils/profilePresentation'
import { normalize_lantern_source_page, read_lantern_records } from '@/utils/releaseLanternPresentation'

const MESSAGES_PAGE_PATH = '/pages/messages/index'
const page_transition = ref(null)
const peer_user_id = ref('')
const peer_name = ref('')
const peer_avatar_url = ref('')
const source_page = ref(MESSAGES_PAGE_PATH)
const requested_mode = ref('')
const chat_mode = ref(YOUR_TURN)
const messages = ref([])
const lantern_quote = ref('')
const reply_text = ref('')
const reply_sent_at = ref('')
const draft = ref('')
const is_loading = ref(true)
const is_sending = ref(false)
const load_error = ref('')
const send_error = ref('')
const is_report_visible = ref(false)
const is_permission_request_visible = ref(false)
const permission_request_key = ref('')
const scroll_top = ref(0)
const is_page_active = ref(true)
const is_leaving = ref(false)
let load_context = { cancel() {} }
let send_context = { cancel() {} }
let allow_route_back = false
let message_revision = 0
let temporary_message_sequence = 0
let resume_video_call_after_permission = false
let should_refresh_chat_on_show = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--chat-shade': theme.colors.home.scene_shade,
  '--chat-title': theme.colors.text.title,
  '--chat-secondary': theme.colors.text.secondary,
  '--chat-muted': theme.colors.messages.empty_text,
  '--chat-status': theme.colors.status.coin,
  '--chat-surface': theme.colors.messages.incoming_background,
  '--chat-incoming-text': theme.colors.messages.incoming_text,
  '--chat-outgoing': theme.colors.messages.outgoing_background,
  '--chat-outgoing-text': theme.colors.messages.outgoing_text,
  '--chat-border': theme.colors.surface.border,
  '--chat-header': theme.colors.lantern_detail.header_surface,
  '--chat-composer': theme.colors.messages.composer_background,
  '--chat-input': theme.colors.messages.input_background,
  '--chat-chip': theme.colors.messages.segment_background,
  '--chat-error': theme.colors.status.danger,
  '--chat-skeleton': theme.colors.home.skeleton,
  '--chat-turn': theme.colors.status.info,
  '--chat-locked-status': theme.colors.messages.locked_status_text,
  '--chat-quote-border': theme.colors.messages.locked_quote_border,
  '--chat-quote-surface': theme.colors.messages.locked_quote_background,
  '--chat-reply-kicker': theme.colors.messages.locked_reply_kicker
}

const one_reply_notice = ONE_REPLY_NOTICE
const your_turn_notice = YOUR_TURN_NOTICE
const display_name = computed(() => peer_name.value || 'Chat')
const latest_message = computed(() => messages.value[messages.value.length - 1])
const is_locked_layout = computed(() => (
  chat_mode.value !== OPEN_CHAT
  && (
    chat_mode.value === LOCKED_ONE_REPLY
    || chat_mode.value === WAITING_OTHER
    || (Number(latest_message.value?.message_classify) === 1 && latest_message.value?.is_mine)
  )
))
const status_label = computed(() => chat_status_label(is_locked_layout.value ? LOCKED_ONE_REPLY : chat_mode.value))
const is_your_turn = computed(() => chat_mode.value === YOUR_TURN)
const has_open_dialogue = computed(() => {
  if (chat_mode.value === OPEN_CHAT || requested_mode.value === OPEN_CHAT) return true
  const history = messages.value.filter((message) => !`${message.message_id}`.startsWith('pending-message-'))
  return history.some((message) => message.is_mine)
    && history.some((message) => !message.is_mine)
})
const show_turn_notice = computed(() => (
  !is_loading.value && is_your_turn.value && !has_open_dialogue.value && !is_locked_layout.value
))
const composer_visible = computed(() => !is_locked_layout.value && can_compose_chat(chat_mode.value))
const video_visible = computed(() => !is_locked_layout.value && shows_video_call(chat_mode.value))
const has_thread = computed(() => (
  messages.value.length > 0 || Boolean(lantern_quote.value) || Boolean(reply_text.value)
))
const one_reply_message = computed(() => [...messages.value].reverse().find((message) => message.is_mine))
const one_reply_text = computed(() => one_reply_message.value?.content || one_reply_message.value?.preview || reply_text.value)
const one_reply_clock = computed(() => {
  const message = one_reply_message.value
  return format_chat_clock(message?.created_at)
    || (one_reply_text.value === reply_text.value ? format_chat_clock(reply_sent_at.value) : '')
    || message?.created_label
    || ''
})
const thread_messages = computed(() => messages.value.map((message) => ({
  ...message,
  clock_label: format_chat_clock(message.created_at) || message.created_label
})))
const day_label = computed(() => chat_day_label(messages.value[0]?.created_at))
const can_send = computed(() => composer_visible.value && Boolean(draft.value.trim()) && !is_sending.value)

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const chat_url = () => build_chat_page_url({
  user_id: peer_user_id.value,
  user_name: peer_name.value,
  user_avatar_url: peer_avatar_url.value,
  chat_mode: requested_mode.value,
  source_page: source_page.value
})

const go_back = () => {
  if (!is_page_active.value || is_leaving.value || is_sending.value) return
  is_leaving.value = true
  load_context.cancel?.()
  if (page_stack_length() > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        is_leaving.value = false
        page_transition.value?.navigate_relaunch({ url: source_page.value || MESSAGES_PAGE_PATH })
      }
    })
    if (!started) {
      allow_route_back = false
      is_leaving.value = false
      page_transition.value?.navigate_relaunch({ url: source_page.value || MESSAGES_PAGE_PATH })
    }
    return
  }
  page_transition.value?.navigate_relaunch({ url: source_page.value || MESSAGES_PAGE_PATH })
}

const open_peer_profile = () => {
  if (!peer_user_id.value) return
  page_transition.value?.navigate_forward({
    url: `/pages/community/user/index?targetUserId=${encodeURIComponent(peer_user_id.value)}&sourcePage=${encodeURIComponent(chat_url())}`
  })
}

const open_report = () => {
  is_report_visible.value = true
}

const scroll_to_latest = () => {
  scroll_top.value = 0
  nextTick(() => {
    if (!is_page_active.value) return
    scroll_top.value = 99999
  })
}

const apply_mode = (next_messages) => {
  const resolved = resolve_chat_mode({
    requested_mode: requested_mode.value,
    messages: next_messages
  })
  if (chat_mode.value === OPEN_CHAT && resolved !== LOCKED_ONE_REPLY) {
    chat_mode.value = OPEN_CHAT
    return
  }
  chat_mode.value = resolved
}

const load_lantern_context = async (track_request) => {
  const account_store = storeGlobal()
  if (!account_store.userId || !peer_user_id.value) return
  const [scoop_result, lantern_result] = await Promise.all([
    selectLmLanternScoopPage({
      current: 1,
      size: 20,
      scooperUserId: account_store.userId
    }, track_request()),
    selectLmLanternPage({
      current: 1,
      size: 20,
      ownerUserId: peer_user_id.value
    }, track_request())
  ])
  if (!is_page_active.value) return
  if (!scoop_result?.success || !lantern_result?.success) return
  const scoops = read_page_records(scoop_result.data)
    .map((record) => map_scoop_record(record))
    .filter(Boolean)
  const lanterns = read_lantern_records(lantern_result.data)
    .map((record) => map_lantern_record(record))
    .filter((lantern) => lantern && !lantern.deleted)
  const match = lanterns.find((lantern) => (
    scoops.some((scoop) => `${scoop.lantern_id}` === `${lantern.lantern_id}`)
  ))
  if (!match) return
  lantern_quote.value = match.content
  const scoop = scoops.find((item) => `${item.lantern_id}` === `${match.lantern_id}`)
  if (!scoop?.lantern_scoop_id) return
  const reply_result = await selectLmLanternReplyPage(
    build_select_reply_params({ lantern_scoop_id: scoop.lantern_scoop_id }),
    track_request()
  )
  if (!is_page_active.value || !reply_result?.success) return
  const reply_record = map_reply_record(read_page_records(reply_result.data)[0])
  reply_text.value = reply_record?.content || ''
  reply_sent_at.value = reply_record?.sent_at || ''
}

// feedback_mode: region_loading — header stays while the thread loads.
const load_chat = async () => {
  if (!is_page_active.value) return
  const receiveUserId = read_receive_user_id(peer_user_id.value)
  if (receiveUserId === null) {
    load_error.value = 'This conversation is not available.'
    is_loading.value = false
    return
  }
  is_loading.value = !has_thread.value
  load_error.value = ''
  load_context.cancel?.()
  const contexts = []
  load_context = {
    cancel: () => contexts.forEach((context) => context.cancel?.())
  }
  const track_request = () => {
    const context = {}
    contexts.push(context)
    return context
  }
  const revision = message_revision
  try {
    const needs_peer_profile = !peer_name.value || !peer_avatar_url.value
    const [result, profile_result] = await Promise.all([
      selectTargetUserMessageList({ receiveUserId }, track_request()),
      needs_peer_profile
        ? selectUserBaseInfo({ userId: receiveUserId }, track_request())
        : Promise.resolve(null)
    ])
    if (!is_page_active.value || revision !== message_revision) return
    if (needs_peer_profile) {
      const profile = profile_result?.success && profile_result.data
        ? map_user_base_profile(profile_result.data)
        : null
      if (profile && profile.user_id === peer_user_id.value) {
        if (!peer_name.value) peer_name.value = profile.username
        if (!peer_avatar_url.value) peer_avatar_url.value = profile.avatar_url
        send_error.value = peer_name.value && peer_avatar_url.value
          ? ''
          : 'The recipient name or profile photo is unavailable.'
      } else {
        send_error.value = profile_result?.error || 'Unable to load the recipient profile. Please try again.'
      }
    }
    if (!result?.success) {
      load_error.value = result?.error || 'Unable to load this conversation.'
      return
    }
    const mapped = map_chat_messages(result.data, { peer_user_id: peer_user_id.value })
    const decorated = decorate_chat_messages(mapped.messages, storeGlobal().userId)
    messages.value = decorated
    apply_mode(decorated)
    if (chat_mode.value === LOCKED_ONE_REPLY || requested_mode.value === 'one_reply') {
      await load_lantern_context(track_request)
    }
    updateMsgRead({ targetUserId: receiveUserId }, track_request()).catch(() => {})
    scroll_to_latest()
  } catch (error) {
    if (!is_page_active.value || revision !== message_revision) return
    load_error.value = error?.message || 'Unable to load this conversation.'
  } finally {
    if (is_page_active.value && revision === message_revision) is_loading.value = false
  }
}

// feedback_mode: control_pending — the outgoing bubble appears before the request finishes.
const send_text = async () => {
  const content = draft.value.trim()
  if (!can_send.value || !is_page_active.value) return
  const account_store = storeGlobal()
  const receiveUserId = read_receive_user_id(peer_user_id.value)
  if (!account_store.userId) {
    send_error.value = 'Please sign in before sending.'
    return
  }
  if (receiveUserId === null) {
    send_error.value = 'This conversation is not available.'
    return
  }
  const send_params = build_chat_send_params({
    content,
    message_classify: messages.value[messages.value.length - 1]?.message_classify,
    receive_user_id: receiveUserId,
    receive_user_name: peer_name.value,
    receive_user_img: peer_avatar_url.value,
    send_user_id: `${account_store.userId}`,
    send_user_name: account_store.userInfo?.userName,
    send_user_img_url: account_store.userInfo?.userImgUrl
  })
  const missing_fields = read_missing_send_message_fields(send_params)
  if (missing_fields.length) {
    send_error.value = 'Unable to send: conversation or profile details are incomplete.'
    return
  }
  send_error.value = ''
  is_sending.value = true
  message_revision += 1
  const temporary_id = `pending-message-${temporary_message_sequence + 1}`
  temporary_message_sequence += 1
  const pending_message = {
    message_id: temporary_id,
    is_mine: true,
    message_type: 1,
    message_classify: send_params.messageClassify,
    content,
    preview: content,
    created_at: new Date().toISOString(),
    created_label: '',
    sender_id: `${account_store.userId}`,
    sender_avatar_url: ''
  }
  messages.value = [...messages.value, pending_message]
  draft.value = ''
  scroll_to_latest()
  send_context.cancel?.()
  send_context = {}
  const rollback = () => {
    messages.value = messages.value.filter((message) => message.message_id !== temporary_id)
    if (!draft.value) draft.value = content
  }
  try {
    const result = await sendMessage(send_params, send_context)
    if (!is_page_active.value) return
    if (!result?.success) {
      rollback()
      send_error.value = result?.error || 'Unable to send this message.'
      return
    }
    const server_id = result.data?.messageId
    if (server_id != null && server_id !== '') {
      messages.value = messages.value.map((message) => (
        message.message_id === temporary_id
          ? { ...message, message_id: `${server_id}` }
          : message
      ))
    }
    chat_mode.value = next_mode_after_send(chat_mode.value)
    if (chat_mode.value === OPEN_CHAT) requested_mode.value = OPEN_CHAT
  } catch (error) {
    if (!is_page_active.value) return
    rollback()
    send_error.value = error?.message || 'Unable to send this message.'
  } finally {
    if (is_page_active.value) is_sending.value = false
  }
}

const request_call_permission = (permission_key) => {
  permission_request_key.value = permission_key
  resume_video_call_after_permission = true
  is_permission_request_visible.value = true
}

const on_permission_granted = () => {
  is_permission_request_visible.value = false
  if (resume_video_call_after_permission) {
    resume_video_call_after_permission = false
    open_video_call()
  }
}

const on_permission_denied = () => {
  is_permission_request_visible.value = false
  resume_video_call_after_permission = false
}

const open_video_call = () => {
  if (!peer_user_id.value || !video_visible.value) return
  const account_store = storeGlobal()
  if (CALL_CONNECTION_ENABLED && !account_store.getAuthRecord('camera')) {
    request_call_permission('camera')
    return
  }
  if (CALL_CONNECTION_ENABLED && !account_store.getAuthRecord('microphone')) {
    request_call_permission('microphone')
    return
  }
  resume_video_call_after_permission = false
  const account = account_store
  const started = page_transition.value?.navigate_forward({
    url: build_ringing_url({
      callee_id: peer_user_id.value,
      callee_name: peer_name.value,
      callee_avatar_url: peer_avatar_url.value,
      caller_id: account.userId,
      source_page: chat_url()
    }),
    fail: () => {
      send_error.value = 'Video calls are not available yet.'
    }
  })
  if (!started) send_error.value = 'Video calls are not available yet.'
}

onLoad((query = {}) => {
  const peer = read_chat_peer_profile(query)
  peer_user_id.value = peer.user_id
  peer_name.value = peer.user_name
  peer_avatar_url.value = peer.user_avatar_url
  requested_mode.value = read_requested_chat_mode(query)
  source_page.value = normalize_lantern_source_page(query.sourcePage, MESSAGES_PAGE_PATH)
  if (!peer_user_id.value) {
    load_error.value = 'This conversation is not available.'
    is_loading.value = false
    return
  }
  void load_chat()
})

onShow(() => {
  if (peer_user_id.value && should_refresh_chat_on_show) {
    void load_chat()
  }
  should_refresh_chat_on_show = true
})

onBackPress(() => {
  if (allow_route_back) return false
  if (is_sending.value) return true
  if (is_report_visible.value) {
    is_report_visible.value = false
    return true
  }
  if (is_permission_request_visible.value) {
    return true
  }
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  load_context.cancel?.()
  send_context.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.chat-page {
  position: relative;
  background: var(--page-background);
}

.chat-scene {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.chat-shade {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--chat-shade);
}

.chat-page--locked .chat-shade {
  background: none;
}

.page-content {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.chat-header {
  display: flex;
  height: 112rpx;
  flex: none;
  align-items: center;
  padding: 0 24rpx;
}

.header-action {
  display: flex;
  width: 80rpx;
  height: 80rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--chat-border);
  border-radius: 50%;
  background: var(--chat-header);
}

.back-button {
  @include page_back.button;
}

.header-action image {
  width: 80rpx;
  height: 80rpx;
}

.peer-entry {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  margin: 0 16rpx;
}

.peer-avatar {
  width: 72rpx;
  height: 72rpx;
  flex: none;
  overflow: hidden;
  border-radius: 50%;
}

.peer-copy {
  min-width: 0;
  margin-left: 16rpx;
}

.peer-name {
  display: block;
  overflow: hidden;
  color: var(--chat-title);
  font-size: 32rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.peer-status {
  display: block;
  color: var(--chat-status);
  font-size: 22rpx;
}

.peer-status-line {
  display: flex;
  margin-top: 4rpx;
  align-items: center;
  gap: 10rpx;
}

.peer-status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--chat-muted);
  flex: none;
}

.chat-page--locked .chat-header {
  padding: 0 32rpx;
}

.chat-page--locked .peer-avatar {
  width: 84rpx;
  height: 84rpx;
}

.chat-page--locked .peer-name {
  font-size: 34rpx;
}

.chat-page--locked .peer-status {
  color: var(--chat-locked-status);
}

.header-action {
  margin-left: 12rpx;
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  box-sizing: border-box;
  min-height: calc(100% + 2rpx);
  padding: 12rpx 28rpx 28rpx;
}

.content-scroll__inner--locked {
  display: flex;
  padding: 72rpx 52rpx 28rpx;
  flex-direction: column;
  justify-content: center;
}

.locked-thread {
  width: 100%;
  flex: none;
}

.locked-thread,
.bubble-thread {
  display: flex;
  flex-direction: column;
}

.turn-notice {
  border: 1px solid var(--chat-border);
}

.lantern-card {
  box-sizing: border-box;
  min-height: 192rpx;
  padding: 32rpx 36rpx;
  border-left: 2px solid var(--chat-quote-border);
  border-radius: 44rpx;
  background: var(--chat-quote-surface);
}

.lantern-kicker,
.one-reply__kicker {
  display: block;
  font-size: 20rpx;
  line-height: 26rpx;
  letter-spacing: 3rpx;
}

.lantern-kicker {
  color: var(--chat-status);
  font-weight: 500;
}

.lantern-copy {
  display: block;
  margin-top: 16rpx;
  color: var(--chat-incoming-text);
  font-size: 26rpx;
  font-style: italic;
  line-height: 44rpx;
}

.one-reply {
  box-sizing: border-box;
  width: 100%;
  margin-top: 24rpx;
  padding: 26rpx 32rpx;
  border-radius: 40rpx 40rpx 12rpx 40rpx;
  background: var(--chat-outgoing);
}

.one-reply__kicker {
  color: var(--chat-reply-kicker);
  font-weight: 800;
  letter-spacing: 1rpx;
}

.one-reply__copy {
  display: block;
  margin-top: 14rpx;
  color: var(--chat-outgoing-text);
  font-size: 28rpx;
  font-weight: 600;
  line-height: 40rpx;
}

.waiting-block {
  display: flex;
  margin-top: 52rpx;
  padding: 0 36rpx;
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.waiting-block image {
  width: 108rpx;
  height: 108rpx;
}

.waiting-title {
  display: block;
  margin-top: 34rpx;
  color: var(--chat-title);
  font-size: 32rpx;
  font-weight: 800;
  line-height: 40rpx;
}

.waiting-copy {
  display: block;
  max-width: 520rpx;
  margin-top: 20rpx;
  color: var(--chat-muted);
  font-size: 24rpx;
  line-height: 42rpx;
}

.day-chip {
  align-self: center;
  margin: 12rpx 0 20rpx;
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: var(--chat-chip);
  color: var(--chat-secondary);
  font-size: 22rpx;
}

.chat-row {
  display: flex;
  max-width: 100%;
  margin-top: 22rpx;
  align-items: flex-end;
}

.chat-row--mine {
  justify-content: flex-end;
}

.chat-avatar {
  width: 56rpx;
  height: 56rpx;
  margin-right: 12rpx;
  overflow: hidden;
  border-radius: 50%;
  flex: none;
}

.chat-bubble {
  display: flex;
  max-width: 520rpx;
  padding: 22rpx 24rpx;
  border: 1px solid var(--chat-border);
  border-radius: 28rpx;
  flex-direction: column;
}

.chat-bubble--in {
  background: var(--chat-surface);
  color: var(--chat-incoming-text);
}

.chat-bubble--out {
  background: var(--chat-outgoing);
  color: var(--chat-outgoing-text);
}

.chat-copy {
  font-size: 28rpx;
  line-height: 40rpx;
}

.chat-time {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  line-height: 28rpx;
  opacity: 0.72;
  text-align: right;
}

.one-reply .chat-time {
  color: var(--chat-outgoing-text);
}

.chat-footer {
  flex: none;
}

.turn-notice {
  display: flex;
  margin: 0 28rpx 24rpx;
  padding: 22rpx 24rpx;
  align-items: center;
  border-radius: 28rpx;
  background: var(--chat-surface);
}

.turn-notice image {
  width: 56rpx;
  height: 56rpx;
  margin-right: 16rpx;
  flex: none;
}

.turn-notice text {
  color: var(--chat-secondary);
  font-size: 24rpx;
  line-height: 36rpx;
}

.composer {
  flex: none;
  padding: 8rpx 28rpx 20rpx;
}

.composer--after-turn {
  padding-top: 0;
}

.composer-row {
  display: flex;
  align-items: center;
}

.composer-input {
  height: 88rpx;
  min-width: 0;
  flex: 1;
  padding: 0 28rpx;
  border: 1px solid var(--chat-border);
  border-radius: 999rpx;
  background: var(--chat-input);
  color: var(--chat-title);
  font-size: 28rpx;
}

.send-button {
  display: flex;
  width: 108rpx;
  height: 108rpx;
  margin-left: 16rpx;
  flex: none;
  align-items: center;
  justify-content: center;
}

.send-button image {
  width: 108rpx;
  height: 108rpx;
  transform: scale(1.18);
  transform-origin: center;
}

.send-button--disabled {
  opacity: 0.45;
  pointer-events: none;
}

.send-error,
.inline-error {
  display: block;
  margin-bottom: 12rpx;
  color: var(--chat-error);
  font-size: 22rpx;
  line-height: 32rpx;
}

.inline-error {
  margin-top: 20rpx;
  margin-bottom: 0;
}

.state-card {
  display: flex;
  margin-top: 80rpx;
  padding: 32rpx;
  align-items: center;
  justify-content: space-between;
  border-radius: 28rpx;
  background: var(--chat-composer);
}

.state-card__copy {
  min-width: 0;
  flex: 1;
  color: var(--chat-title);
  font-size: 26rpx;
  line-height: 36rpx;
}

.state-card__retry {
  margin-left: 20rpx;
  color: var(--chat-turn);
  font-size: 26rpx;
  font-weight: 700;
}

.chat-skeleton__bubble {
  width: 70%;
  height: 140rpx;
  margin-top: 28rpx;
  border-radius: 28rpx;
  background: var(--chat-skeleton);
}

.chat-skeleton__bubble--mine {
  margin-left: auto;
}
</style>

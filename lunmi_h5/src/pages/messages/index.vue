<template>
  <PageTransition ref="page_transition" class="messages-page" :style="theme_style">
    <TopSafeArea />
    <view class="messages-header">
      <view class="messages-title-wrap">
        <text class="messages-title">{{ $t('Messages') }}</text>
        <view class="messages-title-line-wrap" aria-hidden="true">
          <view class="messages-title-line" />
          <view class="messages-title-line__dot" />
        </view>
      </view>
      <!-- <view class="messages-more" aria-hidden="true">
        <image src="/static/icon/message_more.png" mode="aspectFit" />
      </view> -->
    </view>
    <scroll-view class="messages-scroll" scroll-y :show-scrollbar="false">
      <view class="messages-scroll__inner">
        <MessagesListSkeleton v-if="is_loading" />
        <template v-else>
          <view class="notice-card" role="button" :aria-label="$t('Open notifications')" @click="open_notifications">
            <view class="notice-card__icon-wrap">
              <image class="notice-card__icon" src="/static/icon/message_notice.png" mode="aspectFit" />
            </view>
            <view class="notice-card__copy">
              <text class="notice-card__title">{{ $t('Notifications') }}</text>
              <text class="notice-card__preview">{{ $t(notice_preview) }}</text>
            </view>
            <text v-if="unread_notice_count > 0" class="notice-card__count">{{ $t(unread_notice_count) }}</text>
            <image class="notice-card__arrow" src="/static/icon/notiication_right.png" mode="aspectFit" />
          </view>
          <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
            <view class="filter-row">
              <view
                v-for="item in filter_items"
                :key="item.key"
                class="filter-pill"
                :class="{ 'filter-pill--active': filter_type === item.key }"
                role="button"
                :aria-pressed="filter_type === item.key"
                @click="filter_type = item.key"
              >
                <text class="filter-pill__label">{{ $t(item.label) }}</text>
                <view class="filter-pill__count">
                  <text>{{ $t(item.count) }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
          <view v-if="load_error && !conversations.length" class="messages-error" role="alert">
            <text class="messages-error__title">{{ $t('Unable to load messages') }}</text>
            <text class="messages-error__copy">{{ $t(load_error) }}</text>
            <view class="messages-error__retry" role="button" @click="load_page">{{ $t('Try again') }}</view>
          </view>
          <view v-else-if="!visible_conversations.length" class="messages-empty">
            <text class="messages-empty__title">{{ $t('No messages yet') }}</text>
            <text class="messages-empty__copy">{{ $t('Your conversations will show up here.') }}</text>
          </view>
          <view v-else class="conversation-list">
            <view
              v-for="conversation in visible_conversations"
              :key="conversation.user_id"
              class="conversation-card"
            >
              <view
                class="conversation-avatar"
                role="button"
                :aria-label="$t(`Open profile for ${conversation.user_name}`)"
                @click.stop="open_profile(conversation)"
              >
                <UserAvatar class="conversation-avatar__image" :source="conversation.user_avatar_url" />
              </view>
              <view
                class="conversation-body"
                role="button"
                :aria-label="$t(`Open chat with ${conversation.user_name}`)"
                @click="open_chat(conversation)"
              >
                <view class="conversation-headline">
                  <text class="conversation-name">{{ conversation.user_name_is_placeholder ? $t(conversation.user_name) : conversation.user_name }}</text>
                  <text class="conversation-time">{{ $t(conversation.updated_label) }}</text>
                </view>
                <text class="conversation-preview">{{ conversation.preview_is_system ? $t(conversation.preview) : conversation.preview }}</text>
                <text
                class="conversation-status"
                :class="`conversation-status--${conversation.chat_status}`"
              >
                {{ $t(status_label(conversation.chat_status)) }}
              </text>
              </view>
              <view
                class="conversation-indicator"
                :class="`conversation-indicator--${conversation.chat_status}`"
                :aria-label="$t(conversation.has_unread ? 'Unread messages' : undefined)"
              />
            </view>
          </view>
        </template>
      </view>
    </scroll-view>
    <view class="main-tabbar-spacer" aria-hidden="true" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectMessageList, selectNoticeMessageList, updateMsgRead } from '@/api/message'
import MessagesListSkeleton from '@/components/MessagesListSkeleton.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import { OPEN_CHAT, build_chat_page_url } from '@/utils/chatPresentation'
import { map_message_conversations, map_notice_messages } from '@/utils/messagePresentation'
import { MAIN_TAB_UNREAD_EVENT } from '@/utils/mainTabNavigation'

const MESSAGES_PAGE_PATH = '/pages/messages/index'
const page_transition = ref(null)
const conversations = ref([])
const notices = ref([])
const filter_type = ref('all')
const is_loading = ref(false)
const load_error = ref('')
const is_page_active = ref(true)
let request_contexts = []

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--messages-title': theme.colors.text.title,
  '--messages-card': theme.colors.messages.card_background,
  '--messages-text': theme.colors.messages.card_text,
  '--messages-preview': theme.colors.messages.card_preview,
  '--messages-secondary': theme.colors.messages.card_secondary,
  '--messages-border': theme.colors.surface.border,
  '--messages-accent': theme.colors.status.coin,
  '--messages-accent-text': theme.colors.messages.segment_active_text,
  '--messages-pill': theme.colors.messages.segment_background,
  '--messages-pill-text': theme.colors.messages.segment_inactive_text,
  '--messages-unread': theme.colors.messages.unread_background,
  '--messages-unread-text': theme.colors.messages.unread_text,
  '--messages-open': theme.colors.status.success,
  '--messages-waiting': theme.colors.status.info,
  '--messages-error': theme.colors.status.danger,
  '--messages-skeleton': theme.colors.home.skeleton,
  '--messages-line': theme.colors.lantern_detail.title_line,
  '--messages-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--messages-line-dot': theme.colors.status.info,
  '--messages-indicator-turn': theme.colors.messages.call_background,
  '--messages-indicator-open': theme.colors.status.info
}

const unread_notice_count = computed(() => notices.value.filter((item) => item.has_unread).length)
const unread_chat_count = computed(() => conversations.value.filter((item) => item.has_unread).length)
const notice_preview = computed(() => {
  if (unread_notice_count.value > 0) {
    return `You have ${unread_notice_count.value} new notification${unread_notice_count.value === 1 ? '' : 's'}`
  }
  return 'Updates and replies from the community'
})
const status_counts = computed(() => ({
  all: conversations.value.length,
  your_turn: conversations.value.filter((item) => item.chat_status === 'your_turn').length,
  waiting: conversations.value.filter((item) => item.chat_status === 'waiting').length,
  open: conversations.value.filter((item) => item.chat_status === 'open').length
}))
const filter_items = computed(() => [
  { key: 'all', label: 'All', count: status_counts.value.all },
  { key: 'your_turn', label: 'Your turn', count: status_counts.value.your_turn },
  { key: 'waiting', label: 'Waiting', count: status_counts.value.waiting },
  { key: 'open', label: 'Open', count: status_counts.value.open }
])
const visible_conversations = computed(() => {
  if (filter_type.value === 'all') return conversations.value
  return conversations.value.filter((item) => item.chat_status === filter_type.value)
})

const status_label = (status) => {
  if (status === 'your_turn') return 'your turn'
  if (status === 'waiting') return 'waiting'
  return 'OPEN'
}

const load_page = async () => {
  if (!is_page_active.value) return
  const user_id = storeGlobal().userId
  request_contexts.forEach((item) => item.cancel?.())
  const contexts = [{}, {}]
  request_contexts = contexts
  is_loading.value = true
  load_error.value = ''
  try {
    const [message_result, notice_result] = await Promise.all([
      selectMessageList({}, contexts[0]),
      selectNoticeMessageList({}, contexts[1])
    ])
    if (!is_page_active.value || request_contexts !== contexts || storeGlobal().userId !== user_id) return
    if (!message_result.success) {
      load_error.value = message_result.error || 'Unable to load messages.'
      return
    }
    conversations.value = map_message_conversations(message_result.data, {
      current_user_id: user_id
    })
    uni.$emit(MAIN_TAB_UNREAD_EVENT, {
      page_path: MESSAGES_PAGE_PATH,
      user_id,
      unread_count: unread_chat_count.value
    })
    if (notice_result.success) notices.value = map_notice_messages(notice_result.data)
  } catch (error) {
    if (is_page_active.value && request_contexts === contexts) {
      load_error.value = error?.message || 'Unable to load messages.'
    }
  } finally {
    if (is_page_active.value && request_contexts === contexts) is_loading.value = false
  }
}

const open_notifications = () => {
  page_transition.value?.navigate_forward({
    url: `/pages/messages/notice?sourcePage=${encodeURIComponent(MESSAGES_PAGE_PATH)}`
  })
}

const open_profile = (conversation) => {
  page_transition.value?.navigate_forward({
    url: `/pages/community/user/index?targetUserId=${encodeURIComponent(conversation.user_id)}&sourcePage=${encodeURIComponent(MESSAGES_PAGE_PATH)}`
  })
}

const open_chat = (conversation) => {
  const target_user_id = Number(conversation.user_id)
  if (Number.isFinite(target_user_id) && target_user_id > 0) {
    updateMsgRead({ targetUserId: target_user_id }, {})
  }
  page_transition.value?.navigate_forward({
    url: build_chat_page_url({
      user_id: conversation.user_id,
      user_name: conversation.user_name,
      user_avatar_url: conversation.user_avatar_url,
      chat_mode: conversation.open_chat_flag === 1 ? OPEN_CHAT : '',
      source_page: MESSAGES_PAGE_PATH
    })
  })
}

onShow(load_page)

onBeforeUnmount(() => {
  is_page_active.value = false
  request_contexts.forEach((item) => item.cancel?.())
})
</script>

<style scoped lang="scss">
.messages-page {
  background: var(--page-background);
}

.messages-header {
  display: flex;
  flex: none;
  align-items: flex-end;
  justify-content: space-between;
  padding: 8rpx 36rpx 16rpx;
}

.messages-title {
  color: var(--messages-title);
  font-size: 56rpx;
  font-weight: 800;
  line-height: 64rpx;
}

.messages-title-line-wrap {
  position: relative;
  width: 72rpx;
  margin-top: 12rpx;
}

.messages-title-line {
  width: 100%;
  height: 4rpx;
  border-radius: 999rpx;
  background: var(--messages-line);
  box-shadow: 0 0 18rpx var(--messages-line-shadow);
}

.messages-title-line__dot {
  position: absolute;
  top: 50%;
  right: -2rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: var(--messages-line-dot);
  transform: translateY(-50%);
}

.messages-more {
  display: flex;
  width: 80rpx;
  height: 80rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--messages-border);
  border-radius: 40rpx;
  background: var(--messages-pill);
}

.messages-more image {
  width: 40rpx;
  height: 40rpx;
}

.messages-scroll {
  height: 0;
  min-height: 0;
  flex: 1;
}

.messages-scroll__inner {
  min-height: calc(100% + 2rpx);
  box-sizing: border-box;
  padding: 8rpx 36rpx 24rpx;
}

.notice-card {
  display: flex;
  align-items: center;
  padding: 0 30rpx;
  width: 618rpx;
  height: 148rpx;
  background-image: url('/static/icon/msg_top_bg.png');
  background-size: cover;
  border-radius: 40rpx 40rpx 40rpx 40rpx;
  border: 1px solid #444164;
  // border: 1px solid rgba(198,178,255,0.22);
}

.notice-card__icon-wrap {
  display: flex;
  width: 92rpx;
  height: 92rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
}

.notice-card__icon {
width: 92rpx;
height: 92rpx;
}

.notice-card__copy {
  min-width: 0;
  flex: 1;
  margin-left: 20rpx;
}

.notice-card__title {
  display: block;
  color: var(--messages-text);
  font-size: 30rpx;
  font-weight: 700;
}

.notice-card__preview {
  display: block;
  margin-top: 6rpx;
  overflow: hidden;
  color: var(--messages-preview);
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-card__count {
  display: flex;
  width: 44rpx;
  height: 44rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  margin-left: 12rpx;
  border-radius: 22rpx;
  background: var(--messages-unread);
  color: var(--messages-unread-text);
  font-size: 20rpx;
  font-weight: 700;
}

.notice-card__arrow {
  width: 32rpx;
  height: 32rpx;
  margin-left: 8rpx;
  flex: none;
}

.filter-scroll {
  width: 100%;
  margin: 24rpx 0 8rpx;
}

.filter-row {
  display: flex;
  width: max-content;
  min-width: 100%;
  flex-wrap: nowrap;
  padding-right: 8rpx;
}

.filter-pill {
  display: flex;
  box-sizing: border-box;
  flex: none;
  flex-direction: row;
  align-items: center;
  min-height: 56rpx;
  margin-right: 16rpx;
  padding: 10rpx 20rpx;
  border: 1px solid transparent;
  border-radius: 999rpx;
  background: var(--messages-pill);
  color: var(--messages-text);
  font-size: 22rpx;
  font-weight: 700;
}

.filter-pill--active {
  border-color: var(--messages-accent);
  color: var(--messages-text);
}

.filter-pill__label {
  flex: none;
  white-space: nowrap;
}

.filter-pill__count {
  display: flex;
  min-width: 36rpx;
  height: 36rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  margin-left: 12rpx;
  padding: 0 10rpx;
  border-radius: 18rpx;
  background: var(--messages-border);
  color: var(--messages-pill-text);
  font-size: 20rpx;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.filter-pill--active .filter-pill__count {
  background: var(--messages-accent);
  color: var(--messages-accent-text);
}

.conversation-card {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 24rpx;
  border: 1px solid var(--messages-border);
  border-radius: 44rpx;
  background: var(--messages-card);
  backdrop-filter: blur(10px);
}

.conversation-avatar,
.conversation-avatar__image {
  width: 116rpx;
  height: 116rpx;
  flex: none;
  border-radius: 32rpx;
  overflow: hidden;
}

.conversation-body {
  min-width: 0;
  flex: 1;
  margin-left: 20rpx;
}

.conversation-headline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.conversation-name {
  min-width: 0;
  overflow: hidden;
  color: var(--messages-text);
  font-size: 30rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  margin-left: 16rpx;
  color: var(--messages-secondary);
  font-size: 22rpx;
  font-weight: 500;
}

.conversation-preview {
  display: block;
  margin-top: 8rpx;
  overflow: hidden;
  color: var(--messages-preview);
  font-size: 24rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-status {
  display: inline-flex;
  margin-top: 16rpx;
  padding: 8rpx 16rpx;
  border: 1px solid var(--messages-accent);
  border-radius: 16rpx;
  color: var(--messages-accent);
  font-size: 18rpx;
  font-weight: 400;
  letter-spacing: 1rpx;
}

.conversation-status--your_turn {
  border-color: var(--messages-accent);
  color: var(--messages-accent);
}

.conversation-status--open {
  border-color: var(--messages-open);
  color: var(--messages-open);
}

.conversation-status--waiting {
  border-color: var(--messages-secondary);
  color: var(--messages-secondary);
}

.conversation-indicator {
  width: 16rpx;
  height: 16rpx;
  flex: none;
  margin-left: 16rpx;
  border-radius: 8rpx;
}

.conversation-indicator--your_turn {
  background: var(--messages-indicator-turn);
  box-shadow: 0rpx 0rpx 20rpx 0rpx rgba(196,169,242,0.85);
}

.conversation-indicator--open,
.conversation-indicator--waiting {
  // background: var(--messages-indicator-open);
  background: #4A5B80;
}

.messages-error,
.messages-empty {
  padding: 48rpx 24rpx;
  text-align: center;
}

.messages-error__title,
.messages-empty__title {
  display: block;
  color: var(--messages-text);
  font-size: 30rpx;
  font-weight: 700;
}

.messages-error__copy,
.messages-empty__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--messages-preview);
  font-size: 24rpx;
  line-height: 34rpx;
}

.messages-error__retry {
  margin-top: 24rpx;
  color: var(--messages-waiting);
  font-size: 28rpx;
  font-weight: 700;
}

</style>

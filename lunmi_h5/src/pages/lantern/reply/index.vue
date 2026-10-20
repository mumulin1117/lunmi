<template>
  <PageTransition ref="page_transition" class="reply-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="reply-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Your one reply') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content-scroll__inner">
          <view v-if="is_loading && !lantern" class="reply-skeleton" aria-hidden="true">
            <view class="reply-skeleton__name" />
            <view class="reply-skeleton__card" />
            <view class="reply-skeleton__card reply-skeleton__card--short" />
          </view>
          <view v-else-if="load_error && !lantern" class="state-card" role="alert">
            <text class="state-card__copy">{{ $t(load_error) }}</text>
            <view class="state-card__retry" role="button" @click="load_reply_page">{{ $t('Try again') }}</view>
          </view>
          <template v-else-if="lantern">
            <view class="source-row">
              <UserAvatar
                v-if="avatar_url"
                class="source-avatar"
                :source="avatar_url"
              />
              <view v-else class="source-avatar source-avatar--fallback">
                <image src="/static/icon/lantern_release_avatar.png" mode="aspectFit" />
              </view>
              <view class="source-copy">
                <text class="source-name">{{ $t(owner_label) }}</text>
                <text class="source-meta">{{ $t(source_meta) }}</text>
              </view>
            </view>
            <view class="quote-card">
              <text>{{ $t(quote_text) }}</text>
            </view>
            <view class="notice-card">
              <image src="/static/icon/reply_comment.png" mode="aspectFit" />
              <text>{{ $t(reply_notice) }}</text>
            </view>
            <view v-if="reply" class="sent-card">
              <text class="sent-kicker">{{ $t('YOUR REPLY') }}</text>
              <text class="sent-copy">{{ reply.content }}</text>
            </view>
            <view v-else class="composer">
              <textarea
                v-model="draft"
                maxlength="500"
                :placeholder="$t(reply_placeholder)"
                placeholder-class="composer-placeholder"
                :disabled="is_sending"
              />
              <image
                class="composer-flower"
                src="/static/icon/lantern_release_flower.png"
                mode="aspectFit"
                aria-hidden="true"
              />
            </view>
            <text v-if="action_error" class="inline-error" role="alert">{{ $t(action_error) }}</text>
          </template>
        </view>
      </scroll-view>
      <view
        v-if="lantern && reply"
        class="send-button"
        role="button"
        :aria-label="$t('Open chat')"
        @click="open_chat"
      >
        <text>{{ $t('Open chat') }}</text>
      </view>
      <view
        v-else-if="lantern"
        class="send-button"
        :class="{ 'send-button--disabled': !can_send }"
        role="button"
        :aria-label="$t('Send reply')"
        :aria-disabled="!can_send"
        @click="send_reply"
      >
        <text>{{ $t('Send reply') }}</text>
      </view>
    </view>
    <BottomSafeArea />
    <LanternReplySendingLoading :visible="is_sending" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectUserInfo } from '@/api/common'
import { selectLmLanternPage } from '@/api/lantern'
import { addLmLanternReply, selectLmLanternReplyPage, selectLmLanternScoopPage } from '@/api/scoop'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import LanternReplySendingLoading from '@/components/LanternReplySendingLoading.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import {
  HOME_PAGE_PATH,
  build_select_reply_params,
  build_select_scoop_params,
  lantern_owner_label,
  map_lantern_record,
  map_reply_record,
  map_scoop_record,
  read_lantern_records,
  read_page_records,
  read_route_lantern_id
} from '@/utils/lanternDetailPresentation'
import {
  REPLY_NOTICE,
  REPLY_PLACEHOLDER,
  build_add_reply_params,
  build_one_reply_chat_url,
  quote_lantern_content,
  reply_source_meta
} from '@/utils/lanternReplyPresentation'
import { map_public_user_profile } from '@/utils/profilePresentation'
import { build_select_lantern_params, normalize_lantern_source_page } from '@/utils/releaseLanternPresentation'

const page_transition = ref(null)
const lantern_id = ref('')
const target_user_id = ref('')
const source_page = ref(HOME_PAGE_PATH)
const lantern = ref(null)
const scoop = ref(null)
const reply = ref(null)
const avatar_url = ref('')
const owner_name = ref('')
const draft = ref('')
const is_loading = ref(true)
const is_sending = ref(false)
const load_error = ref('')
const action_error = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let load_context = { cancel() {} }
let send_context = { cancel() {} }
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--reply-title': theme.colors.text.title,
  '--reply-secondary': theme.colors.text.secondary,
  '--reply-muted': theme.colors.lantern_detail.timeline_muted,
  '--reply-surface': theme.colors.surface.card,
  '--reply-border': theme.colors.surface.border,
  '--reply-header-surface': theme.colors.lantern_detail.header_surface,
  '--reply-line': theme.colors.lantern_detail.title_line,
  '--reply-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--reply-skeleton': theme.colors.lantern_detail.skeleton,
  '--reply-error': theme.colors.status.info,
  '--reply-error-background': theme.colors.surface.scrim_soft,
  '--reply-button': theme.colors.button.primary,
  '--reply-button-text': theme.colors.button.text,
  '--reply-inset': theme.colors.release_sheet.button_inset,
  '--reply-placeholder': theme.colors.text.tertiary
}

const reply_notice = REPLY_NOTICE
const reply_placeholder = REPLY_PLACEHOLDER
const owner_label = computed(() => owner_name.value || lantern_owner_label(lantern.value))
const source_meta = computed(() => reply_source_meta(
  lantern.value?.release_city_name,
  lantern.value?.released_at || lantern.value?.created_date
))
const quote_text = computed(() => quote_lantern_content(lantern.value?.content))
const can_send = computed(() => Boolean(draft.value.trim()) && !is_sending.value && !reply.value)

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  if (is_sending.value) return
  is_leaving.value = true
  load_context.cancel?.()
  const home_url = source_page.value || HOME_PAGE_PATH
  if (page_stack_length() > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        is_leaving.value = false
        page_transition.value?.navigate_relaunch({ url: home_url })
      }
    })
    if (!started) {
      allow_route_back = false
      is_leaving.value = false
      page_transition.value?.navigate_relaunch({ url: home_url })
    }
    return
  }
  page_transition.value?.navigate_relaunch({ url: home_url })
}

const chat_user_id = () => {
  if (target_user_id.value !== '' && target_user_id.value != null) return target_user_id.value
  return lantern.value?.owner_user_id || ''
}

const open_chat = () => {
  const user_id = chat_user_id()
  if (user_id === '' || user_id == null) {
    action_error.value = 'Chat is not available yet.'
    return
  }
  is_leaving.value = true
  const started = page_transition.value?.navigate_forward({
    url: build_one_reply_chat_url({
      user_id,
      user_name: owner_name.value,
      user_avatar_url: avatar_url.value,
      source_page: source_page.value || HOME_PAGE_PATH
    }),
    fail: () => {
      is_leaving.value = false
      action_error.value = 'Chat is not available yet.'
    }
  })
  if (!started) {
    is_leaving.value = false
    action_error.value = 'Chat is not available yet.'
  }
}

// feedback_mode: region_loading — header stays while the reply body loads.
const load_reply_page = async () => {
  if (!is_page_active.value || is_sending.value) return
  if (!lantern_id.value) {
    lantern.value = null
    load_error.value = 'Lantern ID is missing.'
    is_loading.value = false
    return
  }
  const account_store = storeGlobal()
  if (!account_store.userId) {
    load_error.value = 'Please sign in before replying.'
    is_loading.value = false
    return
  }
  is_loading.value = true
  load_error.value = ''
  load_context.cancel?.()
  load_context = {}
  try {
    const lantern_result = await selectLmLanternPage(
      build_select_lantern_params({ lantern_id: lantern_id.value }),
      load_context
    )
    if (!is_page_active.value) return
    if (!lantern_result?.success) {
      load_error.value = lantern_result?.error || 'Unable to load this lantern.'
      return
    }
    const mapped = map_lantern_record(read_lantern_records(lantern_result.data)[0])
    if (!mapped || mapped.deleted) {
      lantern.value = null
      load_error.value = 'This lantern is no longer available.'
      return
    }
    lantern.value = mapped
    const scoop_result = await selectLmLanternScoopPage(
      build_select_scoop_params({
        lantern_id: mapped.lantern_id,
        scooper_user_id: account_store.userId
      }),
      load_context
    )
    if (!is_page_active.value) return
    if (!scoop_result?.success) {
      load_error.value = scoop_result?.error || 'Unable to load this catch.'
      return
    }
    scoop.value = map_scoop_record(read_page_records(scoop_result.data)[0])
    if (!scoop.value?.lantern_scoop_id) {
      load_error.value = 'Catch this lantern before replying.'
      lantern.value = null
      return
    }
    const reply_result = await selectLmLanternReplyPage(
      build_select_reply_params({ lantern_scoop_id: scoop.value.lantern_scoop_id }),
      load_context
    )
    if (!is_page_active.value) return
    if (!reply_result?.success) {
      load_error.value = reply_result?.error || 'Unable to load this reply.'
      return
    }
    reply.value = map_reply_record(read_page_records(reply_result.data)[0])
    if (!mapped.anonymous_display && mapped.owner_user_id !== '') {
      const profile_result = await selectUserInfo({ userId: mapped.owner_user_id }, load_context)
      if (!is_page_active.value) return
      if (profile_result?.success) {
        const profile = map_public_user_profile(profile_result.data)
        owner_name.value = profile.username
        avatar_url.value = profile.avatar_url
      }
    }
  } catch (error) {
    if (!is_page_active.value) return
    load_error.value = error?.message || 'Unable to load this lantern.'
  } finally {
    if (is_page_active.value) is_loading.value = false
  }
}

// feedback_mode: page_action_loading
const send_reply = async () => {
  if (!can_send.value || !is_page_active.value || is_leaving.value) return
  const account_store = storeGlobal()
  if (!account_store.userId || !scoop.value?.lantern_scoop_id) {
    action_error.value = 'Please sign in before replying.'
    return
  }
  const content = draft.value.trim()
  if (!content) {
    action_error.value = 'Write one reply before sending.'
    return
  }
  is_sending.value = true
  action_error.value = ''
  send_context.cancel?.()
  send_context = {}
  try {
    const result = await addLmLanternReply(build_add_reply_params({
      content,
      lantern_id: lantern.value.lantern_id,
      lantern_scoop_id: scoop.value.lantern_scoop_id,
      sender_user_id: account_store.userId,
      sent_at: new Date().toISOString()
    }), send_context)
    if (!is_page_active.value || is_leaving.value) return
    if (!result?.success) {
      action_error.value = result?.error || 'Unable to send this reply.'
      return
    }
    reply.value = {
      lantern_reply_id: result.data?.lanternReplyId || '',
      lantern_id: lantern.value.lantern_id,
      lantern_scoop_id: scoop.value.lantern_scoop_id,
      content,
      sender_user_id: account_store.userId,
      sent_at: '',
      moderation_status: ''
    }
    draft.value = ''
    open_chat()
  } catch (error) {
    if (!is_page_active.value || is_leaving.value) return
    action_error.value = error?.message || 'Unable to send this reply.'
  } finally {
    if (is_page_active.value) is_sending.value = false
  }
}

onLoad((options = {}) => {
  lantern_id.value = read_route_lantern_id(options)
  target_user_id.value = options?.targetUserId ?? ''
  if (target_user_id.value === 'undefined') target_user_id.value = ''
  source_page.value = normalize_lantern_source_page(options?.sourcePage)
  load_reply_page()
})

onShow(() => {
  is_leaving.value = false
})

onBackPress(() => {
  if (allow_route_back) return false
  if (is_sending.value) return true
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

.reply-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.reply-header {
  display: flex;
  height: 80rpx;
  flex: none;
  align-items: center;
  padding: 0 36rpx;
}

.back-button {
  @include page_back.button;
}

.header-copy {
  margin-left: 24rpx;
}

.header-title {
  display: block;
  color: var(--reply-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--reply-line);
  box-shadow: 0 0 18rpx var(--reply-line-shadow);
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  min-height: 100%;
  padding: 28rpx 36rpx 32rpx;
}

.source-row {
  display: flex;
  align-items: center;
}

.source-avatar {
  width: 84rpx;
  height: 84rpx;
  flex: none;
  border-radius: 50%;
}

.source-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--reply-border);
  background: var(--reply-surface);
}

.source-avatar--fallback image {
  width: 36rpx;
  height: 36rpx;
}

.source-copy {
  min-width: 0;
  margin-left: 18rpx;
}

.source-name {
  display: block;
  overflow: hidden;
  color: var(--reply-title);
  font-size: 32rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-meta {
  display: block;
  margin-top: 8rpx;
  color: var(--reply-secondary);
  font-size: 22rpx;
}

.quote-card {
  margin-top: 28rpx;
  padding: 32rpx 28rpx;
  border: 1px solid var(--reply-border);
  border-radius: 32rpx;
  background: var(--reply-surface);
}

.quote-card text {
  color: var(--reply-title);
  font-size: 28rpx;
  line-height: 44rpx;
}

.notice-card {
  display: flex;
  margin-top: 22rpx;
  padding: 22rpx 24rpx;
  align-items: center;
  border: 1px solid var(--reply-border);
  border-radius: 28rpx;
  background: var(--reply-surface);
}

.notice-card image {
  width: 36rpx;
  height: 36rpx;
  margin-right: 16rpx;
  flex: none;
}

.notice-card text {
  color: var(--reply-muted);
  font-size: 22rpx;
  line-height: 34rpx;
}

.composer {
  position: relative;
  margin-top: 22rpx;
  padding: 28rpx 28rpx 72rpx;
  border: 1px solid var(--reply-border);
  border-radius: 32rpx;
  background: var(--reply-surface);
}

.composer textarea {
  width: 100%;
  height: 220rpx;
  color: var(--reply-title);
  font-size: 28rpx;
  line-height: 42rpx;
}

.composer-placeholder {
  color: var(--reply-placeholder);
}

.composer-flower {
  position: absolute;
  right: 24rpx;
  bottom: 16rpx;
  width: 72rpx;
  height: 52rpx;
  opacity: 0.7;
}

.sent-card {
  margin-top: 22rpx;
  padding: 28rpx;
  border: 1px solid var(--reply-border);
  border-radius: 32rpx;
  background: var(--reply-surface);
}

.sent-kicker {
  display: block;
  color: var(--reply-muted);
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.sent-copy {
  display: block;
  margin-top: 14rpx;
  color: var(--reply-title);
  font-size: 28rpx;
  line-height: 42rpx;
}

.inline-error {
  display: block;
  margin-top: 18rpx;
  color: var(--reply-error);
  font-size: 24rpx;
  line-height: 34rpx;
}

.state-card {
  display: flex;
  margin-top: 48rpx;
  padding: 32rpx;
  align-items: center;
  justify-content: space-between;
  border-radius: 28rpx;
  background: var(--reply-error-background);
}

.state-card__copy {
  min-width: 0;
  flex: 1;
  color: var(--reply-title);
  font-size: 26rpx;
  line-height: 36rpx;
}

.state-card__retry {
  margin-left: 24rpx;
  color: var(--reply-error);
  font-size: 26rpx;
  font-weight: 700;
}

.reply-skeleton__name {
  width: 46%;
  height: 36rpx;
  border-radius: 18rpx;
  background: var(--reply-skeleton);
}

.reply-skeleton__card {
  height: 180rpx;
  margin-top: 24rpx;
  border-radius: 32rpx;
  background: var(--reply-skeleton);
}

.reply-skeleton__card--short {
  height: 120rpx;
}

.send-button {
  display: flex;
  height: 112rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 12rpx 36rpx 24rpx;
  border-radius: 999rpx;
  background: var(--reply-button);
  box-shadow: inset 0 1px 0 var(--reply-inset);
  color: var(--reply-button-text);
  font-size: 32rpx;
  font-weight: 800;
}

.send-button--disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>

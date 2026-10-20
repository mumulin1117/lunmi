<template>
  <PageTransition ref="page_transition" class="detail-page" :class="{ 'detail-page--wish': is_wish }" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="detail-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t(page_title) }}</text>
          <view class="header-line" />
        </view>
        <!-- <view
          v-if="shows_more"
          class="more-button"
          role="button"
          aria-label="More actions"
          @click="open_report"
        >
          <image src="/static/icon/private_message_more.png" mode="aspectFit" />
        </view> -->
      </view>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content-scroll__inner">
          <view v-if="is_loading && !notice" class="detail-skeleton" aria-hidden="true">
            <view class="detail-skeleton__hero" />
            <view class="detail-skeleton__title" />
            <view class="detail-skeleton__card" />
          </view>
          <view v-else-if="load_error && !notice" class="state-card" role="alert">
            <text class="state-card__copy">{{ $t(load_error) }}</text>
            <view class="state-card__retry" role="button" :aria-label="$t('Try again')" @click="load_notice">
              {{ $t('Try again') }}
            </view>
          </view>
          <template v-else-if="notice">
            <text v-if="load_error" class="inline-error" role="alert">{{ $t(load_error) }}</text>
            <template v-if="is_announcement">
              <image
                class="hero-image"
                src="/static/icon/notice_details_public_bg.png"
                mode="aspectFill"
              />
              <image class="bell-icon" src="/static/icon/message_notice.png" mode="aspectFit" />
            </template>
            <template v-else-if="is_wish">
              <view class="hero-frame">
                <image
                  class="hero-image"
                  src="/static/icon/notice_details_cametrue_bg.png"
                  mode="aspectFill"
                />
              </view>
              <text class="wish-chip">{{ $t(wish_chip) }}</text>
            </template>
            <view v-else class="notice-heading">
              <view class="notice-heading__copy">
                <text class="community-chip">{{ $t(community_label) }}</text>
                <text class="detail-title">{{ detail_kind === NOTICE_KIND.ANNOUNCEMENT ? headline : $t(headline) }}</text>
                <image
                  class="detail-wave"
                  src="/static/icon/notiication_details_wave.png"
                  mode="aspectFit"
                />
              </view>
              <image
                class="detail-lotus"
                src="/static/icon/notiication_lantern.png"
                mode="aspectFit"
              />
            </view>
            <text v-if="!is_notice" class="detail-title detail-title--block">{{ detail_kind === NOTICE_KIND.ANNOUNCEMENT ? headline : $t(headline) }}</text>
            <image
              v-if="is_announcement"
              class="detail-wave"
              src="/static/icon/notiication_details_wave.png"
              mode="aspectFit"
            />
            <text v-if="time_label && !is_wish" class="detail-time">{{ $t(time_label) }}</text>
            <view v-if="body_text" class="copy-card">
              <text>{{ detail_kind === NOTICE_KIND.ANNOUNCEMENT ? body_text : $t(body_text) }}</text>
            </view>
            <view
              v-if="is_notice && can_open_sender"
              class="person-card"
              role="button"
              :aria-label="$t(`Open profile for ${sender_name}`)"
              @click="open_sender"
            >
              <UserAvatar class="person-avatar" :source="sender_avatar" />
              <text class="person-name">{{ sender_name }}</text>
              <image class="person-arrow" src="/static/icon/notiication_right.png" mode="aspectFit" />
            </view>
            <view v-if="is_wish && (quote_text || can_open_sender)" class="quote-card">
              <UserAvatar v-if="sender_avatar || can_open_sender" class="person-avatar" :source="sender_avatar" />
              <view class="quote-copy">
                <text v-if="sender_name" class="person-name">{{ sender_name }}</text>
                <text v-if="quote_text" class="quote-text">{{ $t(quote_text) }}</text>
              </view>
            </view>
            <view v-if="is_wish && viewer_label" class="waiting-card">
              <image src="/static/icon/wish_became_true_star.png" mode="aspectFit" />
              <text>{{ $t(viewer_label) }}</text>
            </view>
            <view
              v-if="is_wish"
              class="wish-button"
              role="button"
              :aria-label="$t('See the wish')"
              :aria-disabled="!notice.wish_id"
              :class="{ 'wish-button--disabled': !notice.wish_id }"
              @click="open_wish"
            >
              <text>{{ $t(see_wish_label) }}</text>
            </view>
            <text v-if="wish_error" class="inline-error" role="alert">{{ $t(wish_error) }}</text>
          </template>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <ReportUserSheet
      :visible="is_report_visible"
      :target-name="sender_name"
      :target-user-id="sender_id"
      bottom-offset="0rpx"
      @update:visible="is_report_visible = $event"
    />
    <ApiErrorDialog />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectNoticeMessageList, updateMsgRead } from '@/api/message'
import ApiErrorDialog from '@/components/ApiErrorDialog.vue'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { find_notice_message } from '@/utils/messagePresentation'
import {
  COMMUNITY_NOTICE_LABEL,
  NOTICE_DETAIL_PATH,
  NOTICE_DETAIL_TITLE,
  NOTICE_KIND,
  NOTICE_PAGE_PATH,
  SEE_WISH_LABEL,
  WISH_FULFILLED_CHIP,
  can_open_notice_sender,
  format_notice_detail_time,
  notice_detail_body,
  notice_detail_quote,
  notice_headline,
  notice_viewer_label,
  read_notice_detail_id,
  read_notice_detail_source,
  read_notice_message_id,
  resolve_notice_detail_kind
} from '@/utils/noticeListPresentation.js'
import { WISH_DETAIL_PATH } from '@/utils/foundWishPresentation'

const page_transition = ref(null)
const message_id = ref('')
const detail_type = ref('')
const source_page = ref(NOTICE_PAGE_PATH)
const is_loading = ref(true)
const load_error = ref('')
const wish_error = ref('')
const notice = ref(null)
const is_report_visible = ref(false)
const is_page_active = ref(true)
const is_leaving = ref(false)
let load_context = { cancel() {} }
let read_context = { cancel() {} }
let allow_route_back = false

const community_label = COMMUNITY_NOTICE_LABEL
const wish_chip = WISH_FULFILLED_CHIP
const see_wish_label = SEE_WISH_LABEL
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--detail-title': theme.colors.text.title,
  '--detail-meta': theme.colors.messages.card_secondary,
  '--detail-body': theme.colors.text.secondary,
  '--detail-surface': theme.colors.messages.card_background,
  '--detail-border': theme.colors.surface.border,
  '--detail-coin': theme.colors.status.coin,
  '--detail-success': theme.colors.status.success,
  '--detail-header-surface': theme.colors.lantern_detail.header_surface,
  '--detail-line': theme.colors.lantern_detail.title_line,
  '--detail-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--detail-skeleton': theme.colors.lantern_detail.skeleton,
  '--detail-button': theme.colors.button.primary,
  '--detail-button-text': theme.colors.button.text,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const detail_kind = computed(() => resolve_notice_detail_kind(notice.value, detail_type.value))
const is_announcement = computed(() => (
  detail_kind.value === NOTICE_KIND.ANNOUNCEMENT || detail_kind.value === NOTICE_KIND.WISH_VIEWED
))
const is_wish = computed(() => detail_kind.value === NOTICE_KIND.WISH_FULFILLED)
const is_notice = computed(() => detail_kind.value === NOTICE_KIND.LANTERN_SCOOPED)
const page_title = computed(() => NOTICE_DETAIL_TITLE[detail_kind.value] || 'Notification')
const headline = computed(() => notice_headline(notice.value))
const body_text = computed(() => notice_detail_body(notice.value, detail_kind.value))
const quote_text = computed(() => notice_detail_quote(notice.value, detail_kind.value))
const time_label = computed(() => format_notice_detail_time(notice.value?.created_at))
const viewer_label = computed(() => notice_viewer_label(notice.value))
const can_open_sender = computed(() => can_open_notice_sender(notice.value))
const shows_more = computed(() => is_notice.value && can_open_sender.value)
const sender_name = computed(() => {
  const name = `${notice.value?.user_name || ''}`.trim()
  if (!name || name === 'Unknown') return ''
  return name
})
const sender_avatar = computed(() => notice.value?.user_avatar_url || '')
const sender_id = computed(() => notice.value?.user_id || '')

const begin_load = () => {
  load_context.cancel?.()
  load_context = { cancel() {} }
  return load_context
}

const mark_notice_read = async (item) => {
  const notice_id = read_notice_message_id(item)
  if (!item?.has_unread || !notice_id) return
  read_context.cancel?.()
  read_context = { cancel() {} }
  const result = await updateMsgRead({ messageId: notice_id }, read_context)
  if (!is_page_active.value) return
  if (result?.success && result.data === true && notice.value?.notice_id === item.notice_id) {
    notice.value = {
      ...notice.value,
      has_unread: false
    }
  }
}

const load_notice = async ({ show_loading = true } = {}) => {
  if (!is_page_active.value) return
  if (show_loading) is_loading.value = true
  load_error.value = ''
  if (!message_id.value) {
    notice.value = null
    load_error.value = 'This notification is unavailable.'
    is_loading.value = false
    return
  }
  const context = begin_load()
  const result = await selectNoticeMessageList({}, context)
  if (!is_page_active.value || context !== load_context) return
  if (!result?.success) {
    if (result?.error !== 'Request cancelled.') {
      load_error.value = result?.error || 'Unable to load notification.'
    }
    is_loading.value = false
    return
  }
  const mapped = find_notice_message(result.data, message_id.value)
  notice.value = mapped
  if (!mapped) load_error.value = 'This notification is unavailable.'
  if (mapped) void mark_notice_read(mapped)
  is_loading.value = false
}

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  if (is_report_visible.value) {
    is_report_visible.value = false
    return
  }
  is_leaving.value = true
  load_context.cancel?.()
  read_context.cancel?.()
  const fallback = source_page.value || NOTICE_PAGE_PATH
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

const detail_url = () => {
  const params = [`message_id=${encodeURIComponent(message_id.value)}`]
  if (detail_type.value) params.push(`type=${encodeURIComponent(detail_type.value)}`)
  if (source_page.value) params.push(`sourcePage=${encodeURIComponent(source_page.value)}`)
  return `${NOTICE_DETAIL_PATH}?${params.join('&')}`
}

const open_sender = () => {
  if (!can_open_sender.value || is_leaving.value) return
  page_transition.value?.navigate_forward({
    url: `/pages/community/user/index?user_id=${encodeURIComponent(sender_id.value)}&targetUserId=${encodeURIComponent(sender_id.value)}&sourcePage=${encodeURIComponent(detail_url())}`
  })
}

const open_report = () => {
  if (!shows_more.value) return
  is_report_visible.value = true
}

const open_wish = () => {
  if (!notice.value?.wish_id || is_leaving.value) return
  wish_error.value = ''
  const started = page_transition.value?.navigate_forward({
    url: `${WISH_DETAIL_PATH}?wishId=${encodeURIComponent(notice.value.wish_id)}&sourcePage=${encodeURIComponent(detail_url())}`,
    fail: () => { wish_error.value = 'Unable to open this wish.' }
  })
  if (!started) wish_error.value = 'Unable to open this wish.'
}

onLoad((query) => {
  message_id.value = read_notice_detail_id(query)
  detail_type.value = `${query?.type || ''}`.trim()
  source_page.value = read_notice_detail_source(query?.sourcePage)
})

onShow(() => {
  void load_notice({ show_loading: !notice.value })
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  load_context.cancel?.()
  read_context.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.detail-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.detail-header {
  display: flex;
  height: 80rpx;
  flex: none;
  align-items: center;
  padding: 0 36rpx;
}

.more-button {
  display: flex;
  width: 80rpx;
  height: 80rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--detail-border);
  border-radius: 40rpx;
  background: var(--detail-header-surface);
}

.back-button {
  @include page_back.button;
}

.more-button image {
  width: 36rpx;
  height: 36rpx;
}

.header-copy {
  margin-left: 24rpx;
}

.more-button {
  margin-left: auto;
}

.header-title {
  display: block;
  color: var(--detail-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--detail-line);
  box-shadow: 0 0 18rpx var(--detail-line-shadow);
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  min-height: 100%;
  padding: 28rpx 36rpx 48rpx;
}

.hero-frame {
  position: relative;
}

.hero-image {
  display: block;
  width: 100%;
  height: 450rpx;
  border-radius: 32rpx;
}

.detail-page--wish .hero-image {
  height: 460rpx;
}

.detail-page--wish .detail-title {
  font-size: 38rpx;
  line-height: 56rpx;
}

.bell-icon {
  display: block;
  width: 96rpx;
  height: 96rpx;
  margin-top: 28rpx;
}

.wish-chip,
.community-chip {
  display: inline-block;
  padding: 8rpx 18rpx;
  border: 1px solid var(--detail-coin);
  border-radius: 999rpx;
  color: var(--detail-coin);
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.wish-chip {
  margin-top: 28rpx;
  border-color: var(--detail-success);
  color: var(--detail-success);
  padding: 16rpx 22rpx;
  border-radius: 14rpx;
  font-weight: 500;
  letter-spacing: 3rpx;
}

.notice-heading {
  display: flex;
  align-items: flex-start;
}

.notice-heading__copy {
  min-width: 0;
  flex: 1;
}

.notice-heading .detail-title {
  font-size: 58rpx;
  line-height: 72rpx;
}

.detail-lotus {
  width: 192rpx;
  height: 192rpx;
  flex: none;
  margin: 90rpx 0 0 12rpx;
}

.detail-wave {
  display: block;
  width: 120rpx;
  height: 24rpx;
  margin-top: 16rpx;
}

.detail-title {
  display: block;
  margin-top: 22rpx;
  color: var(--detail-title);
  font-size: 48rpx;
  font-weight: 700;
  line-height: 60rpx;
}

.detail-title--block {
  margin-top: 28rpx;
  width: 650rpx;
  white-space: normal;
  overflow-wrap: break-word;

}

.detail-time {
  display: block;
  margin-top: 18rpx;
  color: var(--detail-meta);
  font-size: 24rpx;
}

.copy-card,
.person-card,
.quote-card {
  margin-top: 28rpx;
  padding: 28rpx;
  border: 1px solid var(--detail-border);
  border-radius: 32rpx;
  background: var(--detail-surface);
}

.copy-card text,
.quote-text {
  color: var(--detail-body);
  font-size: 28rpx;
  line-height: 42rpx;
}

.person-card,
.quote-card {
  display: flex;
  align-items: center;
}

.person-avatar {
  width: 96rpx;
  height: 96rpx;
  flex: none;
  border-radius: 28rpx;
}

.person-name {
  min-width: 0;
  flex: 1;
  margin-left: 20rpx;
  overflow: hidden;
  color: var(--detail-title);
  font-size: 30rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quote-copy {
  min-width: 0;
  flex: 1;
  margin-left: 20rpx;
}

.quote-copy .person-name {
  margin-left: 0;
}

.quote-text {
  display: block;
  margin-top: 8rpx;
}

.person-arrow {
  width: 28rpx;
  height: 28rpx;
  flex: none;
}

.wish-button {
  height: 120rpx;
  margin-top: 24rpx;
  border-radius: 60rpx;
  background: var(--detail-button);
  text-align: center;
}

.wish-button text {
  color: var(--detail-button-text);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 120rpx;
}

.wish-button--disabled {
  opacity: 0.5;
}

.waiting-card {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 28rpx;
  border: 1px solid var(--detail-success);
  border-radius: 32rpx;
  background: var(--detail-surface);
}

.waiting-card image {
  width: 36rpx;
  height: 36rpx;
  margin-right: 20rpx;
  flex: none;
}

.waiting-card text {
  color: var(--detail-success);
  font-size: 24rpx;
  line-height: 34rpx;
}

.detail-skeleton__hero,
.detail-skeleton__title,
.detail-skeleton__card {
  border-radius: 32rpx;
  background: var(--detail-skeleton);
  animation: detail-pulse 1.2s ease-in-out infinite;
}

.detail-skeleton__hero {
  height: 220rpx;
}

.detail-skeleton__title {
  height: 72rpx;
  margin-top: 28rpx;
}

.detail-skeleton__card {
  height: 180rpx;
  margin-top: 28rpx;
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
  color: var(--detail-meta);
  font-size: 26rpx;
  line-height: 38rpx;
}

.state-card__retry {
  height: 70rpx;
  margin-top: 24rpx;
  padding: 0 30rpx;
  border-radius: 35rpx;
  background: var(--detail-button);
  color: var(--detail-button-text);
  font-size: 25rpx;
  font-weight: 700;
  line-height: 70rpx;
}

.inline-error {
  display: block;
  margin-top: 18rpx;
}

@keyframes detail-pulse {
  0%,
  100% { opacity: 0.45; }
  50% { opacity: 1; }
}
</style>

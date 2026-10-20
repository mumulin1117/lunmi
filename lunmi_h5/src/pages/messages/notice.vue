<template>
  <PageTransition ref="page_transition" class="notice-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="notice-header">
        <image class="back-button" @click="go_back" role="button" :aria-label="$t('Go back')" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Notifications') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content-scroll__inner">
          <view v-if="is_loading && !notices.length" class="notice-skeleton" aria-hidden="true">
            <view v-for="slot in skeleton_slots" :key="slot" class="notice-skeleton__card" />
          </view>
          <view v-else-if="load_error && !notices.length" class="state-card" role="alert">
            <text class="state-card__copy">{{ $t(load_error) }}</text>
            <view class="state-card__retry" role="button" :aria-label="$t('Try again')" @click="load_notices">
              {{ $t('Try again') }}
            </view>
          </view>
          <view v-else-if="!notices.length" class="state-card">
            <image class="state-card__icon" src="/static/icon/message_notice.png" mode="aspectFit" />
            <text class="state-card__title">{{ $t('No notifications yet') }}</text>
            <text class="state-card__copy">{{ $t('Announcements and notices will show up here.') }}</text>
          </view>
          <template v-else>
            <view v-if="load_error" class="inline-error" role="alert">
              <text>{{ $t(load_error) }}</text>
              <view role="button" :aria-label="$t('Try again')" @click="load_notices">{{ $t('Try again') }}</view>
            </view>
            <view
              v-for="notice in notices"
              :key="notice.notice_id"
              class="notice-card"
              :class="[`notice-card--${notice.kind}`, { 'notice-card--illustrated': Boolean(notice.card_asset) }]"
              role="button"
              :aria-label="$t(`Open ${notice.headline || 'notification'}`)"
              @click="open_notice(notice)"
            >
              <image v-if="notice.card_asset" class="notice-card__art" :src="notice.card_asset" mode="scaleToFill" />
              <image
                v-else
                class="notice-card__scene"
                src="/static/icon/lantern_detail_scene.png"
                mode="aspectFill"
              />
              <view class="notice-card__shade" />
              <image v-if="!notice.card_asset" class="notice-card__icon" :src="notice.icon_src" mode="aspectFit" />
              <view class="notice-card__copy">
                <text class="notice-card__title">{{ notice.kind === 'announcement' ? notice.headline : $t(notice.headline) }}</text>
                <text v-if="notice.meta_label" class="notice-card__time">{{ $t(notice.meta_label) }}</text>
              </view>
              <image v-if="!notice.card_asset" class="notice-card__arrow" src="/static/icon/notiication_right.png" mode="aspectFit" />
            </view>
          </template>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <ApiErrorDialog />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectNoticeMessageList, updateMsgRead } from '@/api/message'
import ApiErrorDialog from '@/components/ApiErrorDialog.vue'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { map_notice_messages } from '@/utils/messagePresentation'
import { normalize_lantern_source_page } from '@/utils/releaseLanternPresentation.js'
import {
  MESSAGES_PAGE_PATH,
  build_notice_detail_url,
  build_notice_page_url,
  decorate_notice_list,
  read_notice_message_id
} from '@/utils/noticeListPresentation.js'

const page_transition = ref(null)
const source_page = ref(MESSAGES_PAGE_PATH)
const is_loading = ref(true)
const load_error = ref('')
const notices = ref([])
const is_page_active = ref(true)
const is_leaving = ref(false)
const skeleton_slots = [1, 2, 3]
let load_context = { cancel() {} }
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--notice-title': theme.colors.text.title,
  '--notice-meta': theme.colors.messages.card_secondary,
  '--notice-surface': theme.colors.messages.card_background,
  '--notice-border': theme.colors.surface.border,
  '--notice-wish-border': theme.colors.status.success,
  '--notice-lantern-border': theme.colors.status.coin,
  '--notice-release-border': theme.colors.status.locked,
  '--notice-header-surface': theme.colors.lantern_detail.header_surface,
  '--notice-line': theme.colors.lantern_detail.title_line,
  '--notice-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--notice-shade': theme.colors.messages.card_background,
  '--notice-skeleton': theme.colors.lantern_detail.skeleton,
  '--notice-button': theme.colors.button.primary,
  '--notice-button-text': theme.colors.button.text,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const begin_load = () => {
  load_context.cancel?.()
  load_context = { cancel() {} }
  return load_context
}

const load_notices = async ({ show_loading = true } = {}) => {
  if (!is_page_active.value) return
  if (show_loading) is_loading.value = true
  load_error.value = ''
  const context = begin_load()
  const result = await selectNoticeMessageList({}, context)
  if (!is_page_active.value || context !== load_context) return
  if (!result?.success) {
    if (result?.error !== 'Request cancelled.') {
      load_error.value = result?.error || 'Unable to load notifications.'
    }
  } else {
    notices.value = decorate_notice_list(map_notice_messages(result.data))
  }
  is_loading.value = false
}

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  is_leaving.value = true
  load_context.cancel?.()
  const fallback = source_page.value || MESSAGES_PAGE_PATH
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

const open_notice = (notice) => {
  if (!notice?.notice_id || is_leaving.value) return
  const message_id = read_notice_message_id(notice)
  if (message_id && notice.has_unread) void updateMsgRead({ messageId: message_id }, {})
  page_transition.value?.navigate_forward({
    url: build_notice_detail_url(notice, build_notice_page_url(source_page.value))
  })
}

onLoad((query) => {
  source_page.value = normalize_lantern_source_page(query?.sourcePage, MESSAGES_PAGE_PATH)
})

onShow(() => {
  void load_notices({ show_loading: !notices.value.length })
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  load_context.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.notice-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.notice-header {
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
  color: var(--notice-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--notice-line);
  box-shadow: 0 0 18rpx var(--notice-line-shadow);
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

.notice-card {
  position: relative;
  display: flex;
  overflow: hidden;
  min-height: 148rpx;
  align-items: center;
  margin-bottom: 22rpx;
  padding: 24rpx 22rpx;
  border: 1px solid var(--notice-border);
  border-radius: 32rpx;
  background: var(--notice-surface);
}

.notice-card--wish_fulfilled {
  border-color: var(--notice-wish-border);
}

.notice-card--lantern_scooped {
  border-color: var(--notice-lantern-border);
}

.notice-card--wish_viewed {
  border-color: var(--notice-release-border);
}

.notice-card--illustrated {
  box-sizing: border-box;
  min-height: 164rpx;
  padding: 24rpx 62rpx 24rpx 138rpx;
  border: 0px solid var(--notice-border);
}

.notice-card--illustrated .notice-card__copy {
  margin: 0 16rpx;
}

.notice-card__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.notice-card__scene {
  position: absolute;
  top: 0;
  right: 0;
  width: 46%;
  height: 100%;
}

.notice-card__shade {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  // background: var(--notice-shade);
}

.notice-card__icon,
.notice-card__copy,
.notice-card__arrow {
  position: relative;
  z-index: 1;
}

.notice-card__icon {
  width: 88rpx;
  height: 88rpx;
  flex: none;
  border-radius: 44rpx;
}

.notice-card__copy {
  min-width: 0;
  flex: 1;
  margin: 0 16rpx;
}

.notice-card__title {
  display: -webkit-box;
   white-space: normal;       /* 允许正常换行 */
  overflow-wrap: break-word; /* 长单词/长串必要时断开换行 */
  width: 432rpx;
  color: var(--notice-title);
  font-size: 30rpx;
  font-weight: 700;
  line-height: 40rpx;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;     /* 最多显示 2 行 */
  overflow: hidden;
}

.notice-card__time {
  display: block;
  margin-top: 8rpx;
  overflow: hidden;
  color: var(--notice-meta);
  font-size: 22rpx;
  line-height: 30rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-card__arrow {
  width: 28rpx;
  height: 28rpx;
  flex: none;
}

.notice-skeleton__card {
  height: 148rpx;
  margin-bottom: 22rpx;
  border-radius: 32rpx;
  background: var(--notice-skeleton);
  animation: notice-pulse 1.2s ease-in-out infinite;
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

.state-card__icon {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 20rpx;
}

.state-card__title {
  color: var(--notice-title);
  font-size: 32rpx;
  font-weight: 700;
}

.state-card__copy {
  margin-top: 12rpx;
  color: var(--notice-meta);
  font-size: 26rpx;
  line-height: 38rpx;
}

.state-card__retry,
.inline-error view {
  height: 70rpx;
  margin-top: 24rpx;
  padding: 0 30rpx;
  border-radius: 35rpx;
  background: var(--notice-button);
  color: var(--notice-button-text);
  font-size: 25rpx;
  font-weight: 700;
  line-height: 70rpx;
}

.inline-error {
  margin-bottom: 22rpx;
  color: var(--notice-meta);
  font-size: 24rpx;
}

@keyframes notice-pulse {
  0%,
  100% { opacity: 0.45; }
  50% { opacity: 1; }
}
</style>

<template>
  <PageTransition ref="page_transition" class="sent-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="sent-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Released') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <view v-if="is_loading && lanterns.length === 0" class="sent-state">
        <SentLanternSkeleton />
      </view>
      <view v-else-if="load_error && lanterns.length === 0" class="sent-state sent-state--error" role="alert">
        <text class="sent-error__copy">{{ $t(load_error) }}</text>
        <view class="sent-error__retry" role="button" @click="load_lanterns">{{ $t('Try again') }}</view>
      </view>
      <view v-else-if="lanterns.length === 0" class="sent-empty">
        <image class="sent-empty__mark" :src="EMPTY_MARK" mode="aspectFit" />
        <text class="sent-empty__title">{{ $t(EMPTY_TITLE) }}</text>
        <text class="sent-empty__copy">{{ $t(EMPTY_COPY) }}</text>
        <view class="sent-empty__button" role="button" :aria-label="$t('Release one')" @click="release_one">
          <text>{{ $t('Release one') }}</text>
        </view>
      </view>
      <scroll-view
        v-else
        class="sent-scroll"
        scroll-y
        :show-scrollbar="false"
        @scrolltolower="load_more"
      >
        <view class="sent-scroll__inner">
          <text v-if="load_error" class="sent-inline-error" role="alert">{{ $t(load_error) }}</text>
          <view
            v-for="item in lanterns"
            :key="item.lantern_id"
            class="lantern-card"
            role="button"
            :aria-label="$t(item.content || $t('Open lantern'))"
            @click="open_detail(item)"
          >
            <image class="lantern-card__cover" :src="SENT_LANTERN_COVER" mode="aspectFill" />
            <view class="lantern-card__shade" aria-hidden="true" />
            <text
              v-if="item.badge"
              class="lantern-card__badge"
              :class="item.status === 'scooped' ? 'lantern-card__badge--scooped' : 'lantern-card__badge--drifting'"
            >{{ $t(item.badge) }}</text>
            <view class="lantern-card__copy">
              <text class="lantern-card__title">{{ item.content || $t('A lantern with no written note.') }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
      <text v-if="action_message" class="sent-inline-error sent-inline-error--pad" role="alert">{{ $t(action_message) }}</text>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectLmLanternPage } from '@/api/lantern'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import SentLanternSkeleton from '@/components/SentLanternSkeleton.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { storeGlobal } from '@/stores/store'
import {
  EMPTY_COPY,
  EMPTY_MARK,
  EMPTY_TITLE,
  PROFILE_PAGE_PATH,
  SENT_LANTERN_COVER,
  build_release_url,
  build_sent_detail_url,
  map_sent_lanterns,
  read_lantern_total,
  read_sent_source
} from '@/utils/sentLanternPresentation'

const PAGE_SIZE = 20
const page_transition = ref(null)
const source_page = ref(PROFILE_PAGE_PATH)
const lanterns = ref([])
const is_loading = ref(true)
const load_error = ref('')
const action_message = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let allow_route_back = false
const next_page = ref(1)
const has_more = ref(false)
let request_context = {}
let load_token = 0

const theme_style = {
  '--sent-background': theme.colors.page.background,
  '--sent-title': theme.colors.text.title,
  '--sent-copy': theme.colors.text.secondary,
  '--sent-on-media': theme.colors.text.on_media,
  '--sent-border': theme.colors.surface.border,
  '--sent-back': theme.colors.surface.deep,
  '--sent-line': theme.colors.lantern_detail.title_line,
  '--sent-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--sent-shade': theme.colors.home.scene_shade,
  '--sent-drifting': theme.colors.status.coin,
  '--sent-drifting-text': theme.colors.messages.segment_active_text,
  '--sent-scooped': theme.colors.surface.play_icon_background,
  '--sent-scooped-text': theme.colors.button.text,
  '--sent-button': theme.colors.button.primary,
  '--sent-button-text': theme.colors.button.text,
  '--sent-skeleton': theme.colors.surface.card,
  '--sent-error': theme.colors.status.info,
  background: theme.colors.page.background
}

const append_lanterns = (incoming, reset) => {
  const known = new Set(reset ? [] : lanterns.value.map((item) => item.lantern_id))
  const next = incoming.filter((item) => {
    if (known.has(item.lantern_id)) return false
    known.add(item.lantern_id)
    return true
  })
  lanterns.value = reset ? next : lanterns.value.concat(next)
}

// feedback_mode: region_loading — the list skeleton follows the lantern query.
const load_lanterns = async ({ reset = true } = {}) => {
  if (!is_page_active.value || is_leaving.value) return
  const account = storeGlobal()
  if (!account.userId) {
    lanterns.value = []
    load_error.value = 'Sign in to see the lanterns you released.'
    is_loading.value = false
    has_more.value = false
    return
  }
  const token = ++load_token
  request_context.cancel?.()
  request_context = {}
  const page = reset ? 1 : next_page.value
  if (reset && lanterns.value.length === 0) is_loading.value = true
  if (reset) load_error.value = ''
  const result = await selectLmLanternPage({
    ownerUserId: account.userId,
    current: page,
    size: PAGE_SIZE
  }, request_context)
  if (!is_page_active.value || is_leaving.value || token !== load_token) return
  if (!result?.success) {
    load_error.value = result?.error || 'Unable to load your lanterns.'
    is_loading.value = false
    return
  }
  const mapped = map_sent_lanterns(result.data)
  append_lanterns(mapped, reset)
  has_more.value = read_lantern_total(result.data) > lanterns.value.length && mapped.length > 0
  next_page.value = page + 1
  is_loading.value = false
}

const load_more = () => {
  if (!has_more.value || is_loading.value || load_error.value) return
  is_loading.value = true
  load_lanterns({ reset: false })
}

const open_detail = (item) => {
  if (!item?.lantern_id || is_leaving.value) return
  action_message.value = ''
  const started = page_transition.value?.navigate_forward({
    url: build_sent_detail_url(item.lantern_id),
    fail: () => {
      action_message.value = 'This lantern cannot be opened.'
    }
  })
  if (!started) action_message.value = 'This lantern cannot be opened.'
}

const release_one = () => {
  if (is_leaving.value) return
  action_message.value = ''
  is_leaving.value = true
  load_token += 1
  request_context.cancel?.()
  const started = page_transition.value?.navigate_relaunch({
    url: build_release_url(),
    fail: () => {
      is_leaving.value = false
      action_message.value = 'Releasing a lantern is unavailable.'
    }
  })
  if (!started) {
    is_leaving.value = false
    action_message.value = 'Releasing a lantern is unavailable.'
  }
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  is_leaving.value = true
  load_token += 1
  request_context.cancel?.()
  const fallback = source_page.value || PROFILE_PAGE_PATH
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
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
      action_message.value = 'Unable to go back.'
    }
    return
  }
  const started = page_transition.value?.navigate_relaunch({
    url: fallback,
    fail: () => {
      is_leaving.value = false
      action_message.value = 'Unable to go back.'
    }
  })
  if (!started) {
    is_leaving.value = false
    action_message.value = 'Unable to go back.'
  }
}

onLoad((query = {}) => {
  source_page.value = read_sent_source(query)
})

onShow(() => {
  load_lanterns({ reset: true })
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  load_token += 1
  request_context.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.sent-page {
  background: var(--sent-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.sent-header {
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
  min-width: 0;
  margin-left: 20rpx;
}

.header-title {
  display: block;
  color: var(--sent-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 48rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 8rpx;
  border-radius: 999rpx;
  background: var(--sent-line);
  box-shadow: 0 0 18rpx var(--sent-line-shadow);
}

.sent-state,
.sent-empty {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 28rpx 36rpx 48rpx;
}

.sent-state--error,
.sent-empty {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.sent-error__copy {
  color: var(--sent-title);
  font-size: 28rpx;
  line-height: 1.4;
}

.sent-error__retry {
  margin-top: 24rpx;
  color: var(--sent-error);
  font-size: 28rpx;
  font-weight: 700;
}

.sent-empty {
  padding-bottom: 120rpx;
}

.sent-empty__mark {
  width: 168rpx;
  height: 168rpx;
}

.sent-empty__title {
  display: block;
  margin-top: 36rpx;
  color: var(--sent-title);
  font-size: 40rpx;
  font-weight: 700;
}

.sent-empty__copy {
  display: block;
  max-width: 520rpx;
  margin-top: 16rpx;
  color: var(--sent-copy);
  font-size: 28rpx;
  line-height: 1.45;
}

.sent-empty__button {
  display: flex;
  height: 96rpx;
  min-width: 320rpx;
  margin-top: 40rpx;
  padding: 0 48rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--sent-button);
  color: var(--sent-button-text);
  font-size: 32rpx;
  font-weight: 700;
}

.sent-scroll {
  min-height: 0;
  flex: 1;
}

.sent-scroll__inner {
  padding: 28rpx 36rpx 48rpx;
}

.lantern-card {
  position: relative;
  overflow: hidden;
  margin-top: 24rpx;
  border-radius: 36rpx;
}

.lantern-card:first-child {
  margin-top: 0;
}

.lantern-card__cover,
.lantern-card__shade {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.lantern-card__shade {
  background: var(--sent-shade);
}

.lantern-card__badge {
  position: absolute;
  z-index: 1;
  top: 24rpx;
  right: 24rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
}

.lantern-card__badge--drifting {
  background: var(--sent-drifting);
  color: var(--sent-drifting-text);
}

.lantern-card__badge--scooped {
  background: var(--sent-scooped);
  color: var(--sent-scooped-text);
}

.lantern-card__copy {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 280rpx;
  flex-direction: column;
  justify-content: flex-end;
  padding: 28rpx;
}

.lantern-card__title {
  display: block;
  overflow: hidden;
  max-height: 88rpx;
  color: var(--sent-on-media);
  font-size: 34rpx;
  font-weight: 700;
  line-height: 44rpx;
}

.sent-inline-error {
  display: block;
  margin-bottom: 16rpx;
  color: var(--sent-error);
  font-size: 24rpx;
  line-height: 34rpx;
}

.sent-inline-error--pad {
  padding: 0 36rpx 16rpx;
}
</style>

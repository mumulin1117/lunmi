<template>
  <PageTransition ref="page_transition" class="scooped-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="scooped-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Scooped') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <view v-if="is_loading && cards.length === 0" class="scooped-state">
        <ScoopedLanternSkeleton />
      </view>
      <view v-else-if="load_error && cards.length === 0" class="scooped-state scooped-state--error" role="alert">
        <text class="scooped-error__copy">{{ $t(load_error) }}</text>
        <view class="scooped-error__retry" role="button" @click="load_scooped">{{ $t('Try again') }}</view>
      </view>
      <view v-else-if="cards.length === 0" class="scooped-empty">
        <image class="scooped-empty__mark" :src="EMPTY_MARK" mode="aspectFit" />
        <text class="scooped-empty__title">{{ $t(EMPTY_TITLE) }}</text>
        <text class="scooped-empty__copy">{{ $t(EMPTY_COPY) }}</text>
        <view class="scooped-empty__button" role="button" :aria-label="$t('Find a lantern')" @click="find_lantern">
          <text>{{ $t('Find a lantern') }}</text>
        </view>
      </view>
      <scroll-view
        v-else
        class="scooped-scroll"
        scroll-y
        :show-scrollbar="false"
        @scrolltolower="load_more"
      >
        <view class="scooped-scroll__inner">
          <text v-if="load_error" class="scooped-inline-error" role="alert">{{ $t(load_error) }}</text>
          <view
            v-for="item in cards"
            :key="item.scoop_id"
            class="scoop-card"
            role="button"
            :aria-label="$t(item.name || 'Open lantern')"
            @click="open_detail(item)"
          >
            <UserAvatar class="scoop-card__avatar" :source="item.avatar_url" />
            <view class="scoop-card__copy">
              <text class="scoop-card__name">{{ item.name_is_placeholder ? $t(item.name) : item.name }}</text>
              <text v-if="item.meta" class="scoop-card__meta">{{ $t(item.meta) }}</text>
              <text
                v-if="item.badge"
                class="scoop-card__badge"
                :class="item.badge.tone === 'messages' ? 'scoop-card__badge--messages' : 'scoop-card__badge--new'"
              >{{ $t(item.badge.label) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
      <text v-if="action_message" class="scooped-inline-error scooped-inline-error--pad" role="alert">{{ $t(action_message) }}</text>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectUserInfo } from '@/api/common'
import { selectLmLanternPage } from '@/api/lantern'
import { selectLmLanternReplyPage, selectLmLanternScoopPage } from '@/api/scoop'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import ScoopedLanternSkeleton from '@/components/ScoopedLanternSkeleton.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import { build_select_reply_params } from '@/utils/lanternDetailPresentation'
import { build_select_lantern_params, map_lantern_record } from '@/utils/releaseLanternPresentation'
import {
  EMPTY_COPY,
  EMPTY_MARK,
  EMPTY_TITLE,
  PROFILE_PAGE_PATH,
  build_find_lantern_url,
  build_scooped_detail_url,
  count_scoop_replies,
  map_scooped_card,
  map_scooped_lanterns,
  read_page_total,
  read_scooped_source
} from '@/utils/scoopedLanternPresentation'

const PAGE_SIZE = 20
const page_transition = ref(null)
const source_page = ref(PROFILE_PAGE_PATH)
const cards = ref([])
const is_loading = ref(true)
const load_error = ref('')
const action_message = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let allow_route_back = false
const next_page = ref(1)
const has_more = ref(false)
let load_token = 0
let request_contexts = []

const theme_style = {
  '--scooped-background': theme.colors.page.background,
  '--scooped-title': theme.colors.text.title,
  '--scooped-copy': theme.colors.text.secondary,
  '--scooped-card': theme.colors.surface.card,
  '--scooped-border': theme.colors.surface.border,
  '--scooped-back': theme.colors.surface.deep,
  '--scooped-line': theme.colors.lantern_detail.title_line,
  '--scooped-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--scooped-new': theme.colors.messages.segment_background,
  '--scooped-messages': theme.colors.status.coin,
  '--scooped-messages-text': theme.colors.messages.segment_active_text,
  '--scooped-button': theme.colors.button.primary,
  '--scooped-button-text': theme.colors.button.text,
  '--scooped-skeleton': theme.colors.surface.card,
  '--scooped-error': theme.colors.status.info,
  background: theme.colors.page.background
}

const track_request = () => {
  const context = {}
  request_contexts.push(context)
  return context
}

const cancel_requests = () => {
  request_contexts.forEach((context) => context.cancel?.())
  request_contexts = []
}

const unique_ids = (values) => [...new Set(values.filter(Boolean))]

const load_card_details = async (scoops) => {
  const lantern_ids = unique_ids(scoops.map((item) => item.lantern_id))
  const lantern_results = await Promise.all(lantern_ids.map((lantern_id) => (
    selectLmLanternPage(build_select_lantern_params({ lantern_id }), track_request())
      .catch(() => null)
  )))
  const lanterns = new Map()
  lantern_results.forEach((result, index) => {
    const record = result?.success ? map_lantern_record(result.data?.records?.[0] || result.data?.[0]) : null
    if (record) lanterns.set(lantern_ids[index], record)
  })
  const owner_ids = unique_ids([...lanterns.values()]
    .filter((lantern) => !lantern.anonymous_display)
    .map((lantern) => `${lantern.owner_user_id || ''}`))
  const user_results = await Promise.all(owner_ids.map((userId) => (
    selectUserInfo({ userId }, track_request()).catch(() => null)
  )))
  const users = new Map()
  user_results.forEach((result, index) => {
    if (!result?.success) return
    users.set(owner_ids[index], {
      user_name: `${result.data?.userName || ''}`.trim(),
      avatar_url: `${result.data?.userImgUrl || result.data?.userImg || ''}`.trim()
    })
  })
  const reply_results = await Promise.all(scoops.map((scoop) => (
    selectLmLanternReplyPage(
      build_select_reply_params({ lantern_scoop_id: scoop.scoop_id, size: 20 }),
      track_request()
    ).catch(() => null)
  )))
  return scoops.map((scoop, index) => {
    const lantern = lanterns.get(scoop.lantern_id) || null
    const owner = lantern ? users.get(`${lantern.owner_user_id || ''}`) : null
    const reply_result = reply_results[index]
    const reply_count = reply_result?.success ? count_scoop_replies(reply_result.data) : null
    return map_scooped_card({
      scoop,
      lantern,
      user_name: owner?.user_name || '',
      avatar_url: owner?.avatar_url || '',
      reply_count
    })
  })
}

const append_cards = (incoming, reset) => {
  const known = new Set(reset ? [] : cards.value.map((item) => item.scoop_id))
  const next = incoming.filter((item) => {
    if (known.has(item.scoop_id)) return false
    known.add(item.scoop_id)
    return true
  })
  cards.value = reset ? next : cards.value.concat(next)
}

// feedback_mode: region_loading — the list skeleton follows the scoop query.
const load_scooped = async ({ reset = true } = {}) => {
  if (!is_page_active.value || is_leaving.value) return
  const account = storeGlobal()
  if (!account.userId) {
    cards.value = []
    load_error.value = 'Sign in to see the lanterns you scooped.'
    is_loading.value = false
    has_more.value = false
    return
  }
  const token = ++load_token
  cancel_requests()
  const page = reset ? 1 : next_page.value
  if (reset && cards.value.length === 0) is_loading.value = true
  if (reset) load_error.value = ''
  try {
    const result = await selectLmLanternScoopPage({
      scooperUserId: account.userId,
      current: page,
      size: PAGE_SIZE
    }, track_request())
    if (!is_page_active.value || is_leaving.value || token !== load_token) return
    if (!result?.success) {
      load_error.value = result?.error || 'Unable to load scooped lanterns.'
      return
    }
    const scoops = map_scooped_lanterns(result.data)
    const detailed = await load_card_details(scoops)
    if (!is_page_active.value || is_leaving.value || token !== load_token) return
    append_cards(detailed, reset)
    has_more.value = read_page_total(result.data) > cards.value.length && scoops.length > 0
    next_page.value = page + 1
  } catch (error) {
    if (is_page_active.value && token === load_token) {
      load_error.value = error?.message || 'Unable to load scooped lanterns.'
    }
  } finally {
    if (is_page_active.value && token === load_token) is_loading.value = false
  }
}

const load_more = () => {
  if (!has_more.value || is_loading.value || load_error.value) return
  is_loading.value = true
  load_scooped({ reset: false })
}

const open_detail = (item) => {
  if (!item?.lantern_id || is_leaving.value) return
  action_message.value = ''
  const started = page_transition.value?.navigate_forward({
    url: build_scooped_detail_url(item.lantern_id),
    fail: () => {
      action_message.value = 'This lantern cannot be opened.'
    }
  })
  if (!started) action_message.value = 'This lantern cannot be opened.'
}

const find_lantern = () => {
  if (is_leaving.value) return
  action_message.value = ''
  is_leaving.value = true
  load_token += 1
  cancel_requests()
  const started = page_transition.value?.navigate_relaunch({
    url: build_find_lantern_url(),
    fail: () => {
      is_leaving.value = false
      action_message.value = 'Finding a lantern is unavailable.'
    }
  })
  if (!started) {
    is_leaving.value = false
    action_message.value = 'Finding a lantern is unavailable.'
  }
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  is_leaving.value = true
  load_token += 1
  cancel_requests()
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
  source_page.value = read_scooped_source(query)
})

onShow(() => {
  load_scooped({ reset: true })
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  load_token += 1
  cancel_requests()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.scooped-page {
  background: var(--scooped-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.scooped-header {
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
  color: var(--scooped-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 48rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 8rpx;
  border-radius: 999rpx;
  background: var(--scooped-line);
  box-shadow: 0 0 18rpx var(--scooped-line-shadow);
}

.scooped-state,
.scooped-empty {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 28rpx 36rpx 48rpx;
}

.scooped-state--error,
.scooped-empty {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.scooped-error__copy {
  color: var(--scooped-title);
  font-size: 28rpx;
  line-height: 1.4;
}

.scooped-error__retry {
  margin-top: 24rpx;
  color: var(--scooped-error);
  font-size: 28rpx;
  font-weight: 700;
}

.scooped-empty {
  padding-bottom: 120rpx;
}

.scooped-empty__mark {
  width: 168rpx;
  height: 168rpx;
}

.scooped-empty__title {
  display: block;
  margin-top: 36rpx;
  color: var(--scooped-title);
  font-size: 40rpx;
  font-weight: 700;
}

.scooped-empty__copy {
  display: block;
  max-width: 520rpx;
  margin-top: 16rpx;
  color: var(--scooped-copy);
  font-size: 28rpx;
  line-height: 1.45;
}

.scooped-empty__button {
  display: flex;
  height: 96rpx;
  min-width: 320rpx;
  margin-top: 40rpx;
  padding: 0 48rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--scooped-button);
  color: var(--scooped-button-text);
  font-size: 32rpx;
  font-weight: 700;
}

.scooped-scroll {
  min-height: 0;
  flex: 1;
}

.scooped-scroll__inner {
  padding: 28rpx 36rpx 48rpx;
}

.scoop-card {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 24rpx;
  border: 2rpx solid var(--scooped-border);
  border-radius: 32rpx;
  background: var(--scooped-card);
}

.scoop-card:first-child {
  margin-top: 0;
}

.scoop-card__avatar {
  width: 112rpx;
  height: 112rpx;
  flex: none;
  border-radius: 28rpx;
  overflow: hidden;
}

.scoop-card__copy {
  min-width: 0;
  margin-left: 24rpx;
}

.scoop-card__name {
  display: block;
  overflow: hidden;
  color: var(--scooped-title);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 40rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scoop-card__meta {
  display: block;
  margin-top: 8rpx;
  color: var(--scooped-copy);
  font-size: 24rpx;
  line-height: 32rpx;
}

.scoop-card__badge {
  display: inline-flex;
  margin-top: 12rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
}

.scoop-card__badge--new {
  background: var(--scooped-new);
  color: var(--scooped-title);
}

.scoop-card__badge--messages {
  background: var(--scooped-messages);
  color: var(--scooped-messages-text);
}

.scooped-inline-error {
  display: block;
  margin-bottom: 16rpx;
  color: var(--scooped-error);
  font-size: 24rpx;
  line-height: 34rpx;
}

.scooped-inline-error--pad {
  padding: 0 36rpx 16rpx;
}
</style>

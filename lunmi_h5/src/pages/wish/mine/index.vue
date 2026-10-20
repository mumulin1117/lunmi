<template>
  <PageTransition ref="page_transition" class="mine-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="mine-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Wishes') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <view v-if="is_loading && wishes.length === 0" class="mine-state">
        <WishMineSkeleton />
      </view>
      <view v-else-if="load_error && wishes.length === 0" class="mine-state mine-state--error" role="alert">
        <text class="mine-error__copy">{{ $t(load_error) }}</text>
        <view class="mine-error__retry" role="button" @click="load_wishes">{{ $t('Try again') }}</view>
      </view>
      <view v-else-if="wishes.length === 0" class="mine-empty">
        <image class="mine-empty__mark" src="/static/icon/wish_empty.png" mode="aspectFit" />
        <text class="mine-empty__title">{{ $t(EMPTY_TITLE) }}</text>
        <text class="mine-empty__copy">{{ $t(EMPTY_COPY) }}</text>
        <view class="mine-empty__button" role="button" @click="make_wish">
          <text>{{ $t('Make a wish') }}</text>
        </view>
      </view>
      <scroll-view v-else class="mine-scroll" scroll-y :show-scrollbar="false">
        <view class="mine-scroll__inner">
          <text v-if="load_error" class="mine-inline-error" role="alert">{{ $t(load_error) }}</text>
          <view
            v-for="item in wishes"
            :key="item.wish_id"
            class="wish-card"
            :class="{ 'wish-card--answered': item.is_answered }"
            role="button"
            :aria-label="$t(item.content || $t('Open wish'))"
            @click="open_detail(item)"
          >
            <image class="wish-card__cover" :src="WISH_MINE_COVER" mode="aspectFill" />
            <view class="wish-card__shade" aria-hidden="true" />
            <text v-if="item.is_answered && item.badge" class="wish-card__badge">{{ $t(item.badge) }}</text>
            <text
              v-else-if="item.branch_label"
              class="wish-card__pill"
              :style="{ background: branch_color(item.branch_label) }"
            >{{ $t(item.branch_label) }}</text>
            <view class="wish-card__copy">
              <text class="wish-card__title">{{ item.content || $t('A wish with no written note.') }}</text>
              <view v-if="item.is_answered" class="wish-card__waiting">
                <image src="/static/icon/small_start.png" mode="aspectFit" />
                <text>{{ $t(item.blessing_count) }} {{ $t('waiting') }}</text>
              </view>
              <text v-else-if="item.meta" class="wish-card__meta">{{ $t(item.meta) }}</text>
            </view>
            <view v-if="item.is_answered" class="wish-card__true">
              <image src="/static/icon/wish_became_true.png" mode="aspectFit" />
              <text>{{ $t('It came true') }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
      <text v-if="action_message" class="mine-inline-error mine-inline-error--pad" role="alert">{{ $t(action_message) }}</text>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectLmWishPage } from '@/api/wish'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import WishMineSkeleton from '@/components/WishMineSkeleton.vue'
import { storeGlobal } from '@/stores/store'
import {
  EMPTY_COPY,
  EMPTY_TITLE,
  PROFILE_PAGE_PATH,
  WISH_MINE_COVER,
  build_make_wish_url,
  build_mine_detail_url,
  map_my_wishes,
  read_mine_source
} from '@/utils/wishMinePresentation'

const page_transition = ref(null)
const source_page = ref(PROFILE_PAGE_PATH)
const wishes = ref([])
const is_loading = ref(true)
const load_error = ref('')
const action_message = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let allow_route_back = false
let request_context = {}

const theme_style = {
  '--mine-background': theme.colors.page.background,
  '--mine-title': theme.colors.text.title,
  '--mine-copy': theme.colors.text.secondary,
  '--mine-on-media': theme.colors.text.on_media,
  '--mine-border': theme.colors.surface.border,
  '--mine-back': theme.colors.surface.deep,
  '--mine-line': theme.colors.lantern_detail.title_line,
  '--mine-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--mine-shade': theme.colors.home.scene_shade,
  '--mine-badge': theme.colors.status.coin,
  '--mine-waiting': theme.colors.status.coin,
  '--mine-true': theme.colors.status.success,
  '--mine-true-bar': theme.colors.surface.deep,
  '--mine-button': theme.colors.button.primary,
  '--mine-button-text': theme.colors.button.text,
  '--mine-skeleton': theme.colors.surface.card,
  '--mine-error': theme.colors.status.info,
  '--mine-pill-text': theme.colors.text.inverse,
  background: theme.colors.page.background
}

const branch_color = (label) => {
  if (label === 'HIGH') return theme.colors.status.coin
  if (label === 'MID') return theme.colors.status.info
  if (label === 'LOW') return theme.colors.status.locked
  return theme.colors.text.tertiary
}

const load_wishes = async () => {
  if (!is_page_active.value || is_leaving.value) return
  const account = storeGlobal()
  if (!account.userId) {
    wishes.value = []
    load_error.value = 'Sign in to see your wishes.'
    is_loading.value = false
    return
  }
  request_context.cancel?.()
  request_context = {}
  if (wishes.value.length === 0) is_loading.value = true
  load_error.value = ''
  const result = await selectLmWishPage({
    ownerUserId: account.userId,
    current: 1,
    size: 20
  }, request_context)
  if (!is_page_active.value || is_leaving.value) return
  if (!result?.success) {
    load_error.value = result?.error || 'Unable to load your wishes.'
    is_loading.value = false
    return
  }
  wishes.value = map_my_wishes(result.data)
  is_loading.value = false
}

const open_detail = (item) => {
  if (!item?.wish_id || is_leaving.value) return
  action_message.value = ''
  const started = page_transition.value?.navigate_forward({
    url: build_mine_detail_url(item.wish_id),
    fail: () => {
      action_message.value = 'This wish cannot be opened.'
    }
  })
  if (!started) action_message.value = 'This wish cannot be opened.'
}

const make_wish = () => {
  if (is_leaving.value) return
  action_message.value = ''
  is_leaving.value = true
  request_context.cancel?.()
  const started = page_transition.value?.navigate_relaunch({
    url: build_make_wish_url(),
    fail: () => {
      is_leaving.value = false
      action_message.value = 'Making a wish is unavailable.'
    }
  })
  if (!started) {
    is_leaving.value = false
    action_message.value = 'Making a wish is unavailable.'
  }
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  is_leaving.value = true
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
  source_page.value = read_mine_source(query)
})

onShow(load_wishes)

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  request_context.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.mine-page {
  background: var(--mine-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.mine-header {
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
  margin-left: 24rpx;
}

.header-title {
  display: block;
  color: var(--mine-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--mine-line);
  box-shadow: 0 0 18rpx var(--mine-line-shadow);
}

.mine-state,
.mine-empty {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 28rpx 36rpx 0;
}

.mine-state--error {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.mine-error__copy {
  color: var(--mine-title);
  font-size: 28rpx;
  line-height: 1.4;
}

.mine-error__retry {
  margin-top: 24rpx;
  color: var(--mine-error);
  font-size: 28rpx;
  font-weight: 700;
}

.mine-empty {
  align-items: center;
  justify-content: center;
  padding-bottom: 120rpx;
  text-align: center;
}

.mine-empty__mark {
  width: 168rpx;
  height: 168rpx;
}

.mine-empty__title {
  display: block;
  margin-top: 36rpx;
  color: var(--mine-title);
  font-size: 40rpx;
  font-weight: 700;
}

.mine-empty__copy {
  display: block;
  max-width: 520rpx;
  margin-top: 16rpx;
  color: var(--mine-copy);
  font-size: 28rpx;
  line-height: 1.45;
}

.mine-empty__button {
  display: flex;
  height: 96rpx;
  margin-top: 40rpx;
  padding: 0 56rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--mine-button);
  color: var(--mine-button-text);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 96rpx;
}

.mine-scroll {
  min-height: 0;
  flex: 1;
}

.mine-scroll__inner {
  padding: 28rpx 36rpx 32rpx;
}

.wish-card {
  position: relative;
  overflow: hidden;
  min-height: 360rpx;
  margin-top: 24rpx;
  border: 1px solid var(--mine-border);
  border-radius: 36rpx;
}

.wish-card--answered {
  border-color: var(--mine-badge);
}

.wish-card__cover,
.wish-card__shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.wish-card__shade {
  background: var(--mine-shade);
}

.wish-card__badge,
.wish-card__pill {
  position: absolute;
  z-index: 1;
  top: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}

.wish-card__badge {
  left: 24rpx;
  border: 1px solid var(--mine-badge);
  color: var(--mine-badge);
}

.wish-card__pill {
  right: 24rpx;
  color: var(--mine-pill-text);
}

.wish-card__copy {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 360rpx;
  flex-direction: column;
  justify-content: flex-end;
  padding: 28rpx;
}

.wish-card__title {
  display: block;
  overflow: hidden;
  max-height: 88rpx;
  color: var(--mine-on-media);
  font-size: 36rpx;
  font-weight: 700;
  line-height: 44rpx;
}

.wish-card__waiting {
  display: flex;
  margin-top: 12rpx;
  align-items: center;
}

.wish-card__waiting image {
  width: 28rpx;
  height: 28rpx;
  margin-right: 8rpx;
}

.wish-card__waiting text,
.wish-card__meta {
  color: var(--mine-waiting);
  font-size: 24rpx;
  font-weight: 700;
}

.wish-card__meta {
  display: block;
  margin-top: 12rpx;
  color: var(--mine-on-media);
  font-weight: 500;
}

.wish-card__true {
  position: relative;
  z-index: 1;
  display: flex;
  height: 84rpx;
  align-items: center;
  justify-content: center;
  background: var(--mine-true-bar);
  color: var(--mine-true);
  font-size: 28rpx;
  font-weight: 700;
}

.wish-card__true image {
  width: 36rpx;
  height: 36rpx;
  margin-right: 10rpx;
}

.mine-inline-error {
  display: block;
  margin-bottom: 16rpx;
  color: var(--mine-error);
  font-size: 24rpx;
  line-height: 1.4;
}

.mine-inline-error--pad {
  padding: 0 36rpx 16rpx;
}
</style>

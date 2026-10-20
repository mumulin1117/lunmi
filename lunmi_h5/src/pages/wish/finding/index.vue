<template>
  <PageTransition ref="page_transition" class="finding-page" :style="theme_style">
    <video
      id="wish-touch-animation-video"
      class="finding-video"
      :src="WISH_TOUCH_ANIMATION_VIDEO"
      autoplay
      playsinline
      webkit-playsinline
      :controls="false"
      :show-center-play-btn="false"
      :show-play-btn="false"
      :enable-progress-gesture="false"
      object-fit="cover"
      @ended="on_search_end"
      @error="on_video_error"
      @timeupdate="on_video_timeupdate"
    />
    <view class="finding-shade" aria-hidden="true" />
    <TopSafeArea />
    <view class="finding-stage">
      <view class="finding-pill" role="status" aria-live="polite">
        <view class="finding-dot" />
        <text>{{ $t('Finding...') }}</text>
      </view>
      <view v-if="load_error" class="finding-error" role="alert">
        <text class="finding-error__copy">{{ $t(load_error) }}</text>
        <view class="finding-error__retry" role="button" @click="search_wishes">{{ $t('Try again') }}</view>
      </view>
      <view class="skip-button" role="button" :aria-label="$t('Skip')" @click="skip_search">
        <text>{{ $t('Skip') }}</text>
        <image src="/static/icon/release_skip.png" mode="aspectFit" />
      </view>
    </view>
    <view v-if="is_empty" class="empty-layer" @click="skip_search">
      <view class="empty-card" @click.stop>
        <text class="empty-title">{{ $t(NO_WISH_TITLE) }}</text>
        <text class="empty-copy">{{ $t(NO_WISH_COPY) }}</text>
        <view class="empty-actions">
          <view class="empty-button empty-button--secondary" role="button" @click="skip_search">{{ $t('Back to the tree') }}</view>
          <view class="empty-button empty-button--primary" role="button" @click="search_again">{{ $t('Try again') }}</view>
        </view>
      </view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onReady, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectRandomLmWish } from '@/api/wish'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { storeGlobal } from '@/stores/store'
import { WISH_TREE_PATH } from '@/utils/wishSheetPresentation'
import { save_found_wish_random_detail } from '@/utils/foundWishRandomCacheStorage'
import {
  NO_WISH_COPY,
  NO_WISH_TITLE,
  WISH_TOUCH_ANIMATION_VIDEO,
  build_found_tree_url,
  read_random_find_wish_id,
  read_finding_wish_id
} from '@/utils/wishFindingPresentation'

const FIND_ANIMATION_MAX_MS = 12000

const page_transition = ref(null)
const preferred_id = ref('')
const found_id = ref('')
const load_error = ref('')
const is_empty = ref(false)
const animation_done = ref(false)
const is_page_active = ref(true)
const is_leaving = ref(false)
let request_context = {}
let video_context = null
let animation_timeout = null
let video_finish_reported = false

const theme_style = {
  '--finding-shade': theme.colors.home.scene_shade,
  '--finding-pill': theme.colors.tabbar.background,
  '--finding-title': theme.colors.text.on_media,
  '--finding-dot': theme.colors.status.info,
  '--finding-error': theme.colors.surface.scrim_soft,
  '--finding-retry': theme.colors.status.info,
  '--finding-skip': theme.colors.surface.deep,
  '--finding-skip-border': theme.colors.surface.border,
  '--finding-card': theme.colors.dialog.background,
  '--finding-card-border': theme.colors.dialog.border,
  '--finding-copy': theme.colors.text.secondary,
  '--finding-scrim': theme.colors.surface.scrim,
  '--finding-primary': theme.colors.button.primary,
  '--finding-primary-text': theme.colors.button.text,
  '--finding-secondary-text': theme.colors.dialog.cancel.text,
  background: theme.colors.page.background
}

const clear_animation_timeout = () => {
  if (animation_timeout == null) return
  clearTimeout(animation_timeout)
  animation_timeout = null
}

const mark_animation_done = () => {
  if (video_finish_reported) return
  video_finish_reported = true
  clear_animation_timeout()
  animation_done.value = true
  maybe_finish()
}

const play_video = () => {
  if (!is_page_active.value || is_leaving.value || is_empty.value) return
  try {
    video_context?.play()
  } catch {}
}

const relaunch_tree = (wish_id = '') => {
  const url = wish_id ? build_found_tree_url(wish_id) : WISH_TREE_PATH
  const started = page_transition.value?.navigate_relaunch({
    url,
    immediate: true,
    fail: () => {
      is_leaving.value = false
      load_error.value = 'Unable to return to the wish tree.'
    }
  })
  if (!started) {
    is_leaving.value = false
    load_error.value = 'Unable to return to the wish tree.'
  }
}

const return_to_tree = (wish_id = '') => {
  if (!is_page_active.value || is_leaving.value) return
  is_leaving.value = true
  clear_animation_timeout()
  request_context.cancel?.()
  try {
    video_context?.pause()
  } catch {}
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const source_page = pages[pages.length - 2]
  if (source_page && `/${source_page.route}` === WISH_TREE_PATH) {
    const started = page_transition.value?.navigate_back({
      immediate: true,
      fail: () => relaunch_tree(wish_id)
    })
    if (!started) relaunch_tree(wish_id)
    return
  }
  relaunch_tree(wish_id)
}

const maybe_finish = () => {
  if (!animation_done.value || load_error.value || is_empty.value || is_leaving.value) return
  if (!found_id.value) return
  return_to_tree(found_id.value)
}

const on_search_end = () => {
  mark_animation_done()
}

const on_video_error = () => {
  if (!is_page_active.value || is_leaving.value) return
  mark_animation_done()
}

const on_video_timeupdate = (event) => {
  const detail = event?.detail || {}
  const current = Number(detail.currentTime)
  const duration = Number(detail.duration)
  if (!Number.isFinite(current) || !Number.isFinite(duration) || duration <= 0) return
  if (duration - current <= 0.35) mark_animation_done()
}

const schedule_animation_timeout = () => {
  clear_animation_timeout()
  animation_timeout = setTimeout(() => {
    animation_timeout = null
    mark_animation_done()
  }, FIND_ANIMATION_MAX_MS)
}

const skip_search = () => {
  if (found_id.value) return_to_tree(found_id.value)
  else return_to_tree()
}

const search_wishes = async () => {
  if (!is_page_active.value || is_leaving.value) return
  load_error.value = ''
  is_empty.value = false
  found_id.value = ''
  request_context.cancel?.()
  request_context = {}
  const account_store = storeGlobal()
  const result = await selectRandomLmWish({}, request_context)
  if (!is_page_active.value || is_leaving.value) return
  if (!result?.success) {
    load_error.value = result?.error || 'Unable to find a wish.'
    return
  }
  const detail = result.data && typeof result.data === 'object' ? result.data : null
  const wish_id = read_random_find_wish_id(detail)
  if (!wish_id) {
    is_empty.value = true
    try {
      video_context?.pause()
    } catch {}
    return
  }
  if (!account_store.userId || !save_found_wish_random_detail({
    user_id: account_store.userId,
    detail
  })) {
    load_error.value = 'Unable to save this wish for display.'
    return
  }
  found_id.value = wish_id
  maybe_finish()
}

const search_again = () => {
  if (is_leaving.value) return
  video_finish_reported = false
  animation_done.value = false
  schedule_animation_timeout()
  play_video()
  search_wishes()
}

onLoad((query = {}) => {
  preferred_id.value = read_finding_wish_id(query)
  schedule_animation_timeout()
  search_wishes()
})

onReady(() => {
  video_context = uni.createVideoContext('wish-touch-animation-video')
  play_video()
})

onShow(() => {
  play_video()
})

onBackPress((event = {}) => {
  if (event.from === 'navigateBack') return false
  skip_search()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  clear_animation_timeout()
  request_context.cancel?.()
  try {
    video_context?.pause()
  } catch {}
})
</script>

<style scoped lang="scss">
.finding-page {
  position: relative;
  background: var(--finding-shade);
}

.finding-video {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.finding-shade {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: var(--finding-shade);
  opacity: 0.12;
  pointer-events: none;
}

.finding-stage {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 34rpx 32rpx;
}

.finding-pill {
  display: flex;
  height: 72rpx;
  align-items: center;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--finding-pill);
  color: var(--finding-title);
  font-size: 28rpx;
  font-weight: 700;
}

.finding-dot {
  width: 16rpx;
  height: 16rpx;
  margin-right: 16rpx;
  border-radius: 50%;
  background: var(--finding-dot);
}

.finding-error {
  display: flex;
  width: 100%;
  margin-top: 48rpx;
  padding: 28rpx 32rpx;
  align-items: center;
  justify-content: space-between;
  border-radius: 24rpx;
  background: var(--finding-error);
}

.finding-error__copy {
  min-width: 0;
  flex: 1;
  color: var(--finding-title);
  font-size: 24rpx;
  line-height: 1.4;
}

.finding-error__retry {
  margin-left: 24rpx;
  color: var(--finding-retry);
  font-size: 24rpx;
  font-weight: 700;
}

.skip-button {
  display: flex;
  width: 162rpx;
  height: 81rpx;
  margin-top: auto;
  margin-left: auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--finding-skip-border);
  border-radius: 999rpx;
  background: var(--finding-skip);
  color: var(--finding-title);
  font-size: 26rpx;
  font-weight: 700;
}

.skip-button image {
  width: 28rpx;
  height: 28rpx;
  margin-left: 10rpx;
}

.empty-layer {
  position: fixed;
  z-index: 3;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--finding-scrim);
}

.empty-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 620rpx;
  padding: 40rpx 36rpx 32rpx;
  border: 1px solid var(--finding-card-border);
  border-radius: 36rpx;
  background: var(--finding-card);
}

.empty-title {
  display: block;
  color: var(--finding-title);
  font-size: 40rpx;
  font-weight: 800;
}

.empty-copy {
  display: block;
  margin-top: 16rpx;
  color: var(--finding-copy);
  font-size: 26rpx;
  line-height: 40rpx;
}

.empty-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}

.empty-button {
  display: flex;
  height: 88rpx;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  font-size: 25rpx;
  font-weight: 800;
}

.empty-button--secondary {
  border: 1px solid var(--finding-skip-border);
  background: var(--finding-skip);
  color: var(--finding-secondary-text);
}

.empty-button--primary {
  background: var(--finding-primary);
  color: var(--finding-primary-text);
}
</style>

<template>
  <PageTransition ref="page_transition" class="wishing-page" :style="theme_style">
    <video
      id="wish-hang-animation-video"
      class="wishing-video"
      :src="WISH_HANG_ANIMATION_VIDEO"
      autoplay
      playsinline
      webkit-playsinline
      :controls="false"
      :show-center-play-btn="false"
      :show-play-btn="false"
      :enable-progress-gesture="false"
      object-fit="cover"
      @ended="on_rise_end"
      @error="on_video_error"
      @timeupdate="on_video_timeupdate"
    />
    <view class="wishing-shade" aria-hidden="true" />
    <TopSafeArea />
    <view class="wishing-stage">
      <view class="wishing-pill" role="status" aria-live="polite">
        <view class="wishing-dot" />
        <text>{{ $t('Rising...') }}</text>
      </view>
      <view v-if="load_error" class="wishing-error" role="alert">
        <text class="wishing-error__copy">{{ $t(load_error) }}</text>
        <view class="wishing-error__retry" role="button" @click="confirm_wish">{{ $t('Try again') }}</view>
      </view>
      <view class="skip-button" role="button" :aria-label="$t('Skip')" @click="skip_rise">
        <text>{{ $t('Skip') }}</text>
        <image src="/static/icon/release_skip.png" mode="aspectFit" />
      </view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onReady, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectLmWishPage } from '@/api/wish'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import {
  WISH_TREE_PATH,
  WISH_HANG_ANIMATION_VIDEO,
  build_tree_published_url,
  read_wishing_query,
  wish_record_exists
} from '@/utils/wishSheetPresentation'

const WISH_ANIMATION_MAX_MS = 12000

const page_transition = ref(null)
const wish_id = ref('')
const load_error = ref('')
const wish_ready = ref(false)
const animation_done = ref(false)
const is_page_active = ref(true)
const is_leaving = ref(false)
let request_context = {}
let video_context = null
let animation_timeout = null
let video_finish_reported = false

const theme_style = {
  '--wishing-shade': theme.colors.home.scene_shade,
  '--wishing-pill': theme.colors.tabbar.background,
  '--wishing-title': theme.colors.text.on_media,
  '--wishing-dot': theme.colors.status.info,
  '--wishing-error': theme.colors.surface.scrim_soft,
  '--wishing-retry': theme.colors.status.info,
  '--wishing-skip': theme.colors.surface.deep,
  '--wishing-skip-border': theme.colors.surface.border,
  '--wishing-skip-text': theme.colors.text.on_media,
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
  if (!is_page_active.value || is_leaving.value) return
  try {
    video_context?.play()
  } catch {}
}

const return_to_tree = (published) => {
  if (!is_page_active.value || is_leaving.value) return
  is_leaving.value = true
  clear_animation_timeout()
  request_context.cancel?.()
  try {
    video_context?.pause()
  } catch {}
  const url = published ? build_tree_published_url() : WISH_TREE_PATH
  const started = page_transition.value?.navigate_relaunch({
    url,
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

const maybe_finish = () => {
  if (!animation_done.value || is_leaving.value) return
  if (!wish_id.value) {
    return_to_tree(false)
    return
  }
  return_to_tree(true)
}

const on_rise_end = () => {
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
  }, WISH_ANIMATION_MAX_MS)
}

const skip_rise = () => {
  return_to_tree(Boolean(wish_id.value))
}

const confirm_wish = async () => {
  if (!is_page_active.value || is_leaving.value) return
  if (!wish_id.value) {
    wish_ready.value = false
    load_error.value = 'This wish cannot be opened.'
    return
  }
  load_error.value = ''
  request_context.cancel?.()
  request_context = {}
  const result = await selectLmWishPage({
    wishId: wish_id.value,
    current: 1,
    size: 1
  }, request_context)
  if (!is_page_active.value || is_leaving.value) return
  if (!result?.success) {
    if (!is_leaving.value) {
      wish_ready.value = false
      load_error.value = result?.error || 'Unable to confirm this wish.'
    }
    return
  }
  if (!wish_record_exists(result.data, wish_id.value)) {
    if (!is_leaving.value) {
      wish_ready.value = false
      load_error.value = 'This wish is no longer available.'
    }
    return
  }
  wish_ready.value = true
}

onLoad((query = {}) => {
  const parsed = read_wishing_query(query)
  wish_id.value = parsed.wish_id
  schedule_animation_timeout()
  void confirm_wish()
})

onReady(() => {
  video_context = uni.createVideoContext('wish-hang-animation-video')
  play_video()
})

onShow(() => {
  play_video()
})

onBackPress(() => {
  skip_rise()
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
.wishing-page {
  position: relative;
  background: var(--wishing-shade);
}

.wishing-video {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.wishing-shade {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: var(--wishing-shade);
  opacity: 0.12;
  pointer-events: none;
}

.wishing-stage {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 34rpx 32rpx;
}

.wishing-pill {
  display: flex;
  height: 72rpx;
  align-items: center;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--wishing-pill);
  color: var(--wishing-title);
  font-size: 28rpx;
  font-weight: 700;
}

.wishing-dot {
  width: 16rpx;
  height: 16rpx;
  margin-right: 16rpx;
  border-radius: 50%;
  background: var(--wishing-dot);
}

.wishing-error {
  display: flex;
  width: 100%;
  margin-top: 48rpx;
  padding: 28rpx 32rpx;
  align-items: center;
  justify-content: space-between;
  border-radius: 24rpx;
  background: var(--wishing-error);
}

.wishing-error__copy {
  min-width: 0;
  flex: 1;
  color: var(--wishing-title);
  font-size: 24rpx;
  line-height: 1.4;
}

.wishing-error__retry {
  margin-left: 24rpx;
  color: var(--wishing-retry);
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
  border: 1px solid var(--wishing-skip-border);
  border-radius: 999rpx;
  background: var(--wishing-skip);
  color: var(--wishing-skip-text);
  font-size: 26rpx;
  font-weight: 700;
}

.skip-button image {
  width: 28rpx;
  height: 28rpx;
  margin-left: 10rpx;
}
</style>

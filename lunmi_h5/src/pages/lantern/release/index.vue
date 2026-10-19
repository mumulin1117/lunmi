<template>
  <PageTransition ref="page_transition" class="release-page" :style="theme_style">
    <video
      id="release-animation-video"
      class="release-video"
      :src="RELEASE_ANIMATION_VIDEO"
      autoplay
      playsinline
      webkit-playsinline
      :controls="false"
      :show-center-play-btn="false"
      :show-play-btn="false"
      :enable-progress-gesture="false"
      object-fit="cover"
      @ended="finish_release"
      @error="handle_video_error"
    />
    <view class="release-shade" aria-hidden="true" />
    <TopSafeArea />
    <view class="release-stage">
      <view v-if="load_error" class="release-error" role="alert">
        <text class="release-error__copy">{{ $t(load_error) }}</text>
        <view
          class="release-error__retry"
          role="button"
          :aria-disabled="is_leaving"
          @click="open_detail"
        >
          {{ $t('Continue') }}
        </view>
      </view>
      <view
        class="skip-button"
        role="button"
        :aria-label="$t('Skip releasing animation')"
        :aria-disabled="is_leaving"
        @click="skip_release"
      >
        <image src="/static/icon/release_skip.png" mode="aspectFit" />
        <text>{{ $t('Skip') }}</text>
      </view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onReady, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import {
  HOME_PAGE_PATH,
  RELEASE_ANIMATION_VIDEO,
  build_lantern_detail_url,
  normalize_lantern_source_page,
  read_route_lantern_id,
  read_route_lantern_type
} from '@/utils/releaseLanternPresentation'

const page_transition = ref(null)
const lantern_id = ref('')
const lantern_type = ref('')
const source_page = ref(HOME_PAGE_PATH)
const load_error = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let video_context = null
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--release-shade': theme.colors.home.scene_shade,
  '--release-ghost-background': theme.colors.button.ghost.background,
  '--release-ghost-border': theme.colors.button.ghost.border,
  '--release-ghost-text': theme.colors.button.ghost.text,
  '--release-error-background': theme.colors.release_flow.error_background,
  '--release-title': theme.colors.text.title,
  '--release-retry': theme.colors.status.info
}

const play_video = () => {
  if (!is_page_active.value || is_leaving.value || load_error.value) return
  try {
    video_context?.play()
  } catch {}
}

const open_detail = () => {
  if (!is_page_active.value || is_leaving.value) return
  if (!lantern_id.value) {
    load_error.value = 'This lantern could not be found.'
    return
  }
  is_leaving.value = true
  try {
    video_context?.pause()
  } catch {}
  const url = build_lantern_detail_url({
    lantern_id: lantern_id.value,
    source_page: HOME_PAGE_PATH,
    lantern_type: lantern_type.value,
    return_home: true,
    released: true
  })
  const fail = () => {
    is_leaving.value = false
    load_error.value = 'Lantern details are not available yet.'
  }
  const started = page_transition.value?.navigate_replace({ url, fail })
  if (!started) fail()
}

const finish_release = () => {
  open_detail()
}

const handle_video_error = () => {
  if (!is_page_active.value || is_leaving.value) return
  load_error.value = 'The release animation could not play.'
}

const skip_release = () => {
  if (!is_page_active.value || is_leaving.value) return
  open_detail()
}

onLoad((options = {}) => {
  lantern_id.value = read_route_lantern_id(options)
  lantern_type.value = read_route_lantern_type(options)
  source_page.value = normalize_lantern_source_page(options?.sourcePage)
  if (!lantern_id.value) load_error.value = 'This lantern could not be found.'
})

onReady(() => {
  video_context = uni.createVideoContext('release-animation-video')
  play_video()
})

onShow(() => {
  play_video()
})

onBackPress(() => {
  if (allow_route_back) return false
  skip_release()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  try {
    video_context?.pause()
  } catch {}
})
</script>

<style scoped lang="scss">
.release-page {
  position: relative;
  background: var(--page-background);
}

.release-video {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.release-shade {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--release-shade);
  opacity: .12;
  pointer-events: none;
}

.release-stage {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 34rpx 32rpx;
}

.release-error {
  display: flex;
  width: 100%;
  margin-top: 48rpx;
  padding: 28rpx 32rpx;
  align-items: center;
  justify-content: space-between;
  border-radius: 24rpx;
  background: var(--release-error-background);
}

.release-error__copy {
  min-width: 0;
  flex: 1;
  color: var(--release-title);
  font-size: 24rpx;
  line-height: 34rpx;
}

.release-error__retry {
  margin-left: 24rpx;
  color: var(--release-retry);
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
  border: 1px solid var(--release-ghost-border);
  border-radius: 999rpx;
  background: var(--release-ghost-background);
  color: var(--release-ghost-text);
  font-size: 26rpx;
}

.skip-button image {
  width: 28rpx;
  height: 28rpx;
  margin-right: 10rpx;
}
</style>

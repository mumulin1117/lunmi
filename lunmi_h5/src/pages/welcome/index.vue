<template>
  <PageTransition ref="page_transition" class="welcome-page" :style="theme_style">
    <video
      id="welcome-background-video"
      class="welcome-scene"
      src="/static/scenes/anim-welcome.mp4"
      poster="/static/icon/welcome_scene.png"
      :autoplay="is_page_shown"
      :muted="true"
      loop
      playsinline
      webkit-playsinline
      :controls="false"
      :show-center-play-btn="false"
      :show-play-btn="false"
      :show-fullscreen-btn="false"
      :enable-progress-gesture="false"
      object-fit="cover"
      aria-hidden="true"
      @loadedmetadata="sync_video_playback"
    />
    <!-- WelcomeBrandHeader 接管顶部安全区，因此不渲染 TopSafeArea。 -->
    <WelcomeBrandHeader />
    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
      <view class="content-scroll__inner">
        <text class="welcome-copy">{{ $t('Let your wishes find the') }}</text>
        <text class="welcome-copy">{{ $t('stars.') }}</text>
      </view>
    </scroll-view>
    <!-- WelcomeBeginBar 接管底部安全区，因此不渲染 BottomSafeArea。 -->
    <WelcomeBeginBar @begin="begin" />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onHide, onReady, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import PageTransition from '@/components/PageTransition.vue'
import WelcomeBeginBar from '@/components/WelcomeBeginBar.vue'
import WelcomeBrandHeader from '@/components/WelcomeBrandHeader.vue'

const page_transition = ref(null)
const is_page_shown = ref(true)
let video_context = null

const sync_video_playback = () => {
  if (!video_context) return
  try {
    if (is_page_shown.value) video_context.play()
    else video_context.pause()
  } catch {}
}

const theme_style = {
  '--welcome-page-background': theme.colors.page.background,
  '--welcome-title-color': theme.colors.text.on_media,
  '--welcome-button-background': theme.colors.button.primary,
  '--welcome-button-text': theme.colors.button.text,
  '--welcome-copy-shadow': theme.colors.surface.shadow
}

const begin = () => {
  page_transition.value?.navigate_forward({
    url: '/pages/profile/user-agreement?sourcePage=welcome'
  })
}

onBackPress(() => true)

onReady(() => {
  video_context = uni.createVideoContext('welcome-background-video')
  sync_video_playback()
})
onShow(() => {
  is_page_shown.value = true
  sync_video_playback()
})
onHide(() => {
  is_page_shown.value = false
  sync_video_playback()
})
onBeforeUnmount(() => {
  is_page_shown.value = false
  sync_video_playback()
  video_context = null
})
</script>

<style scoped lang="scss">
.welcome-page {
  position: relative;
  background: var(--welcome-page-background);
  color: var(--welcome-title-color);
}

.welcome-scene {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.content-scroll {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 100%;
  height: 0;
  min-height: 0;
  flex: 1;
}

.content-scroll__inner {
  display: flex;
  box-sizing: border-box;
  min-height: calc(100% + 2rpx);
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 52rpx 28rpx;
}

.welcome-copy {
  display: block;
  color: var(--welcome-title-color);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 62rpx;
  text-shadow: 0 6rpx 28rpx var(--welcome-copy-shadow);
}
</style>

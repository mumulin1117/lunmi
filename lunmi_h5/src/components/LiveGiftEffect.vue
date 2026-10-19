<template>
  <teleport to="body">
    <view
      ref="effect_root"
      class="gift-effect"
      :class="{ 'gift-effect--hidden': hidden }"
      :style="effect_style"
      aria-hidden="true"
    >
      <view
        v-if="banner"
        class="gift-banner"
      >
        <UserAvatar
          class="gift-banner__avatar"
          :source="banner.userImgUrl"
        />
        <image
          v-if="banner.thumbUrl"
          class="gift-banner__thumb"
          :src="banner.thumbUrl"
          mode="aspectFit"
        />
        <text class="gift-banner__name">{{ $t(banner.giftName) }}</text>
        <text class="gift-banner__count">{{ $t('x') }}{{ $t(banner.giftNum) }}</text>
      </view>
      <view
        v-if="stage"
        class="gift-stage"
        :class="{ 'gift-stage--fullscreen': is_fullscreen }"
      >
        <view
          v-show="is_fullscreen"
          id="live-gift-player-host"
          ref="player_host"
          class="gift-stage__player"
        />
        <image
          v-if="stage.kind === 'image'"
          class="gift-stage__image"
          :src="stage.effectUrl"
          mode="aspectFit"
          @animationend="finish_current"
          @error="finish_current"
        />
      </view>
    </view>
  </teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import theme from '@/config/theme.json'
import UserAvatar from '@/components/UserAvatar.vue'
import {
  GIFT_VIDEO_ELEMENT_ID,
  create_native_element,
  find_inline_video_element,
  load_eva_runtime,
  load_svga_runtime,
  prepare_inline_autoplay_video,
  start_inline_autoplay_video
} from '@/utils/giftEffect'
import { ROUTE_TRANSITION_DURATION } from '@/utils/routeTransition'

defineProps({
  hidden: { type: Boolean, default: false }
})
const IMAGE_EFFECT_MS = 1500
const BANNER_ONLY_MS = 2200
const PREPARE_WATCHDOG_MS = 15000
const PLAYBACK_WATCHDOG_MS = 30000
const QUEUE_GAP_MS = 220
const QUEUE_LIMIT = 10
const queue = []
const banner = ref(null)
const stage = ref(null)
const player_host = ref(null)
const effect_root = ref(null)
let is_playing = false
let play_token = 0
let finish_timer = null
let gap_timer = null
let svga_player = null
let eva_player = null
const effect_style = {
  '--live-text': theme.colors.voice_room.text,
  '--live-yellow': theme.colors.voice_room.yellow,
  '--live-gift-banner': theme.colors.voice_room.gift_banner_background,
  '--route-transition-stack-duration': `${ROUTE_TRANSITION_DURATION.ENTER}ms`
}

const is_fullscreen = computed(() => (
  stage.value?.kind === 'svga' || stage.value?.kind === 'video'
))

const clear_finish_timer = () => {
  if (!finish_timer) return
  clearTimeout(finish_timer)
  finish_timer = null
}

const clear_gap_timer = () => {
  if (!gap_timer) return
  clearTimeout(gap_timer)
  gap_timer = null
}

const as_dom = (value) => {
  if (!value) return null
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) return value
  return as_dom(value.$el)
}

const wait_layout = () => new Promise((resolve) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(resolve)
  })
})

const overlay_size = () => {
  if (typeof window === 'undefined') return { width: 1, height: 1 }
  const visual = window.visualViewport
  const overlay = as_dom(effect_root.value)
  const rect = overlay?.getBoundingClientRect?.()
  return {
    width: Math.max(
      Math.round(rect?.width || 0),
      Math.round(visual?.width || 0),
      window.innerWidth || 0,
      1
    ),
    height: Math.max(
      Math.round(rect?.height || 0),
      Math.round(visual?.height || 0),
      window.innerHeight || 0,
      1
    )
  }
}

const uni_host_element = () => {
  if (typeof document === 'undefined') return null
  return as_dom(player_host.value) || document.getElementById('live-gift-player-host')
}

const attach_native_host = (kind) => {
  const uni_host = uni_host_element()
  if (!uni_host) return null
  while (uni_host.firstChild) {
    uni_host.removeChild(uni_host.firstChild)
  }
  const host = create_native_element('div')
  if (!host) return null
  const size = overlay_size()
  host.style.position = 'absolute'
  host.style.left = '0'
  host.style.right = '0'
  host.style.width = `${size.width}px`
  host.style.overflow = 'hidden'
  host.style.textAlign = 'left'
  if (kind === 'svga') {
    host.style.top = '50%'
    host.style.bottom = 'auto'
    host.style.height = `${size.height}px`
    host.style.marginTop = `-${Math.round(size.height / 2)}px`
  } else {
    host.style.top = '0'
    host.style.bottom = '0'
    host.style.height = `${size.height}px`
    host.style.marginTop = '0'
  }
  uni_host.appendChild(host)
  void host.getBoundingClientRect()
  return host
}

const fit_svga_surface = (host, video_item) => {
  const size = overlay_size()
  const video_width = Number(video_item?.videoSize?.width) || 0
  const video_height = Number(video_item?.videoSize?.height) || 0
  host.style.left = '0'
  host.style.right = '0'
  host.style.width = `${size.width}px`
  if (video_width > 0 && video_height > 0) {
    const height = Math.max(1, Math.round(video_height * (size.width / video_width)))
    host.style.height = `${height}px`
    host.style.top = '50%'
    host.style.bottom = 'auto'
    host.style.marginTop = `-${Math.round(height / 2)}px`
    return
  }
  host.style.top = '0'
  host.style.bottom = '0'
  host.style.height = `${size.height}px`
  host.style.marginTop = '0'
}

const ensure_player_canvas = (player, host) => {
  const current = player?._drawingCanvas || host.querySelector?.('canvas')
  if (current && typeof current.getContext === 'function') {
    player._drawingCanvas = current
    return current
  }
  const canvas = create_native_element('canvas')
  if (!canvas || typeof canvas.getContext !== 'function') return null
  canvas.__isPlayer = true
  canvas.style.display = 'block'
  canvas.style.backgroundColor = 'transparent'
  while (host.firstChild) {
    host.removeChild(host.firstChild)
  }
  host.appendChild(canvas)
  canvas.width = Math.max(host.clientWidth || 0, 1)
  canvas.height = Math.max(host.clientHeight || 0, 1)
  player._drawingCanvas = canvas
  player._container = host
  return canvas
}

const hide_gift_source_videos = (host) => {
  const videos = host?.querySelectorAll?.('video')
  if (!videos?.length) return
  videos.forEach((video) => {
    prepare_inline_autoplay_video(video, { muted: true })
    video.style.position = 'absolute'
    video.style.top = '0'
    video.style.right = '0'
    video.style.bottom = '0'
    video.style.left = '0'
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.opacity = '0'
    video.style.pointerEvents = 'none'
  })
}

const fit_mp4_surface = (host) => {
  const size = overlay_size()
  host.style.width = `${size.width}px`
  host.style.height = `${size.height}px`
  const width = Math.max(host.clientWidth || size.width, 1)
  const height = Math.max(host.clientHeight || size.height, 1)
  const canvases = host.querySelectorAll('canvas')
  canvases.forEach((canvas) => {
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.right = '0'
    canvas.style.bottom = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.maxWidth = 'none'
    canvas.style.maxHeight = 'none'
    canvas.style.backgroundColor = 'transparent'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '1'
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
  })
}

const stop_gift_video = () => {
  if (!eva_player) return
  try {
    eva_player.destroy()
  } catch {
    // Player may already have released its canvas.
  }
  eva_player = null
}

const stop_players = () => {
  if (svga_player) {
    try {
      svga_player.stopAnimation(true)
      svga_player.clear()
    } catch {
      // Player may still be decoding.
    }
    svga_player = null
  }
  stop_gift_video()
  const uni_host = uni_host_element()
  while (uni_host?.firstChild) {
    uni_host.removeChild(uni_host.firstChild)
  }
}

const finish_current = () => {
  if (!is_playing) return
  is_playing = false
  play_token += 1
  clear_finish_timer()
  stop_players()
  banner.value = null
  stage.value = null
  clear_gap_timer()
  gap_timer = setTimeout(() => {
    gap_timer = null
    play_next()
  }, QUEUE_GAP_MS)
}

const schedule_finish = (delay) => {
  clear_finish_timer()
  finish_timer = setTimeout(finish_current, delay)
}

const mark_started = (token) => {
  if (token !== play_token) return
  schedule_finish(PLAYBACK_WATCHDOG_MS)
}

const play_image_fallback = (url) => {
  stop_players()
  stage.value = {
    kind: 'image',
    effectUrl: banner.value?.thumbUrl || url
  }
  schedule_finish(IMAGE_EFFECT_MS)
}

const play_svga = async (url) => {
  const token = play_token
  await wait_layout()
  if (token !== play_token) return
  const host = attach_native_host('svga')
  if (!host) {
    play_image_fallback(url)
    return
  }
  try {
    const runtime = await load_svga_runtime()
    if (token !== play_token) return
    const Player = runtime?.Player
    const Parser = runtime?.Parser
    if (!Player || !Parser) {
      play_image_fallback(url)
      return
    }
    const player = new Player(host)
    svga_player = player
    ensure_player_canvas(player, host)
    player.loops = 1
    player.clearsAfterStop = true
    player.setContentMode('Fill')
    player.setClipsToBounds?.(true)
    player.onFinished(() => {
      if (token === play_token) finish_current()
    })
    const start = (video_item) => {
      if (token !== play_token || player !== svga_player) return
      try {
        fit_svga_surface(host, video_item)
        void host.getBoundingClientRect()
        player.setVideoItem(video_item)
        player.startAnimation()
        mark_started(token)
      } catch {
        play_image_fallback(url)
      }
    }
    new Parser().load(url, start, () => {
      if (token === play_token) play_image_fallback(url)
    })
  } catch {
    if (token === play_token) play_image_fallback(url)
  }
}

const play_video = async (url) => {
  const token = play_token
  await wait_layout()
  if (token !== play_token) return
  const host = attach_native_host('video')
  if (!host) {
    play_image_fallback(url)
    return
  }
  try {
    const runtime = await load_eva_runtime()
    if (token !== play_token) return
    const yyEva = runtime?.yyEva || runtime?.default?.yyEva
    if (!yyEva) {
      play_image_fallback(url)
      return
    }
    const player = await yyEva({
      container: host,
      videoUrl: url,
      videoID: GIFT_VIDEO_ELEMENT_ID,
      autoplay: true,
      loop: 1,
      mute: true,
      mode: 'AspectFit',
      resizeCanvas: 'percent',
      checkTimeout: true,
      showPlayerInfo: false,
      logLevel: 'info',
      useMetaData: true,
      useVideoDBCache: true,
      onRequestClickPlay: () => undefined,
      onStart: () => {
        if (token !== play_token) return
        hide_gift_source_videos(host)
        void start_inline_autoplay_video(
          find_inline_video_element(GIFT_VIDEO_ELEMENT_ID) || host.querySelector('video'),
          { muted: true }
        )
        fit_mp4_surface(host)
        mark_started(token)
      },
      onEnd: () => {
        if (token === play_token) finish_current()
      },
      onError: () => {
        if (token === play_token) play_image_fallback(url)
      }
    })
    if (token !== play_token) {
      player.destroy()
      return
    }
    eva_player = player
    hide_gift_source_videos(host)
    void start_inline_autoplay_video(
      find_inline_video_element(GIFT_VIDEO_ELEMENT_ID) || host.querySelector('video'),
      { muted: true }
    )
    fit_mp4_surface(host)
    player.start()
  } catch {
    if (token === play_token) play_image_fallback(url)
  }
}

const start_effect = (item) => {
  banner.value = item
  if (item.kind === 'svga' || item.kind === 'video') {
    stage.value = {
      kind: item.kind,
      effectUrl: item.effectUrl
    }
    schedule_finish(PREPARE_WATCHDOG_MS)
    nextTick(() => {
      if (item.kind === 'svga') void play_svga(item.effectUrl)
      else void play_video(item.effectUrl)
    })
    return
  }
  if (item.kind === 'image') {
    stage.value = {
      kind: 'image',
      effectUrl: item.effectUrl
    }
    schedule_finish(IMAGE_EFFECT_MS)
    return
  }
  stage.value = null
  schedule_finish(BANNER_ONLY_MS)
}

const play_next = () => {
  if (is_playing) return
  const item = queue.shift()
  if (!item) return
  is_playing = true
  play_token += 1
  start_effect(item)
}

const same_combo = (left, right) => (
  left
  && right
  && `${left.giftConfigId || left.giftName}` === `${right.giftConfigId || right.giftName}`
  && `${left.userName}` === `${right.userName}`
)

const enqueue = (item) => {
  if (!item?.giftName && !item?.effectUrl && !item?.thumbUrl) return
  if (same_combo(banner.value, item) && is_playing) {
    banner.value = {
      ...banner.value,
      giftNum: Number(banner.value.giftNum || 1) + Number(item.giftNum || 1)
    }
    return
  }
  const pending_limit = QUEUE_LIMIT - (is_playing ? 1 : 0)
  if (queue.length >= pending_limit) queue.shift()
  queue.push(item)
  play_next()
}

onMounted(() => {
  const node = as_dom(effect_root.value)
  if (node && node.parentNode !== document.body) document.body.appendChild(node)
})

onBeforeUnmount(() => {
  queue.splice(0, queue.length)
  is_playing = false
  play_token += 1
  clear_finish_timer()
  clear_gap_timer()
  stop_players()
})

defineExpose({ enqueue })
</script>

<style scoped lang="scss">
.gift-effect {
  position: fixed;
  z-index: 1180;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  pointer-events: none;
  backface-visibility: hidden;
  will-change: transform;
  transition: transform var(--route-transition-stack-duration) cubic-bezier(.32, .72, 0, 1);
}

.gift-effect--hidden {
  transform: translate3d(-100%, 0, 0);
}

.gift-banner {
  position: absolute;
  top: 220rpx;
  left: 24rpx;
  z-index: 2;
  display: flex;
  max-width: 520rpx;
  height: 88rpx;
  align-items: center;
  padding: 8rpx 20rpx 8rpx 8rpx;
  border-radius: 999rpx;
  background: var(--live-gift-banner);
  gap: 12rpx;
}

.gift-banner__avatar,
.gift-banner__thumb {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex: none;
}

.gift-banner__name {
  overflow: hidden;
  color: var(--live-text);
  font-size: 26rpx;
  font-weight: 700;
  line-height: 34rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.gift-banner__count {
  color: var(--live-yellow);
  font-size: 32rpx;
  font-weight: 800;
  line-height: 40rpx;
  flex: none;
}

.gift-stage {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gift-stage--fullscreen {
  display: block;
}

.gift-stage__player {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.gift-stage__player :deep(canvas) {
  display: block;
  z-index: 1;
  max-width: none;
  max-height: none;
  pointer-events: none;
  background: transparent;
}

.gift-stage__player :deep(video) {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}

.gift-stage__image {
  width: 400rpx;
  height: 400rpx;
  animation: gift-pop 1.5s ease-out forwards;
}

@keyframes gift-pop {
  0% {
    opacity: 0;
    transform: scale(0);
  }

  30%,
  70% {
    opacity: 1;
    transform: scale(1);
  }

  100% {
    opacity: 0;
    transform: scale(1);
  }
}
</style>

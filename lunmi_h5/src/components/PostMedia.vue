<template>
  <view class="post-media" :style="media_style" :data-media-id="media_key">
    <view v-if="is_image_loading" class="post-media__loading">
      <MediaShimmer class="post-media__shimmer" :label="$t('Loading media')" />
    </view>
    <template v-if="props.contentType === 'video' && !props.coverOnly">
      <video v-if="resolved_url && (!props.playable || has_video_started)" :id="video_id" class="post-media__asset" :style="{ objectFit: props.fit }" :src="resolved_url" :controls="props.controls" :autoplay="is_video_playing" :muted="props.muted" :poster="resolved_poster" object-fit="cover" playsinline webkit-playsinline @click.stop="toggle_video" @loadedmetadata="handle_video_metadata" @canplay="handle_video_canplay" @canplaythrough="handle_video_canplaythrough" @playing="handle_video_playing" @timeupdate="handle_video_time_update" @waiting="handle_video_waiting" @error="handle_video_error" @play="handle_play" @pause="handle_pause" @ended="handle_ended" />
      <image v-else-if="resolved_poster || has_media_error" class="post-media__asset" :style="{ objectFit: props.fit }" :src="has_media_error ? (resolved_poster || fallback_poster) : resolved_poster" mode="aspectFill" @load="handle_image_load" @error="handle_image_error" />
      <image  v-if="props.playable && resolved_url && !is_video_playing && !is_image_loading && !has_media_error" class="post-media__play post-media__play--center" role="button" :aria-label="$t('Play video')" @click.stop="play_video" src="/static/icon/play-circle-fill.png" />
    </template>
    <image v-else-if="resolved_url || resolved_poster || has_media_error" class="post-media__asset" :style="{ objectFit: props.fit }" :src="has_media_error ? (resolved_url || resolved_poster || fallback_poster) : (props.contentType === 'video' ? resolved_poster : resolved_url)" mode="aspectFill" @load="handle_image_load" @error="handle_image_error" />
    <image v-if="props.contentType === 'video' && !props.playable && !props.coverOnly" class="post-media__play" src="/static/icon/play-circle-fill.png" />
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { VideoPlay } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import MediaShimmer from '@/components/MediaShimmer.vue'
import { resolve_post_media_url, revoke_post_media_url } from '@/utils/postMediaStorage'
import { activate_media, clear_media, find_media_element } from '@/utils/mediaPlayback'

const props = defineProps({
  mediaUrl: { type: String, default: '' },
  contentType: { type: String, default: 'image' },
  controls: { type: Boolean, default: false },
  coverOnly: { type: Boolean, default: false },
  playable: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },
  fit: { type: String, default: 'cover' },
  poster: { type: String, default: '' },
  mediaId: { type: [String, Number], default: '' }
})
const emit = defineEmits(['load', 'error', 'ready'])

const resolved_url = ref('')
const resolved_poster = ref('')
const has_media_error = ref(false)
const fallback_poster = '/static/logo.png'
const is_video_playing = ref(false)
const has_video_started = ref(false)
const is_image_loading = ref(true)
const media_style = {
  '--media-surface': theme.colors.surface.card_strong,
  '--media-scrim': theme.colors.surface.play_icon_background,
  '--media-icon': theme.colors.icon.primary,
  '--media-loading-surface': theme.colors.surface.media_shimmer,
  '--media-loading-shine': theme.colors.surface.media_shimmer_shine
}
const component_instance = getCurrentInstance()
const video_id = `post-media-video-${component_instance?.uid || Math.random().toString(36).slice(2, 8)}`
const media_key = computed(() => `${props.mediaId || video_id}`)
let current_media_object_url = ''
let current_poster_object_url = ''
let media_request_id = 0
let poster_request_id = 0
let is_disposed = false

const refresh_media = async () => {
  const request_id = ++media_request_id
  clear_media(media_key.value)
  revoke_post_media_url(current_media_object_url)
  current_media_object_url = ''
  resolved_url.value = ''
  has_video_started.value = false
  is_video_playing.value = false
  has_media_error.value = false
  is_image_loading.value = props.contentType === 'video' && props.playable
    ? Boolean(props.poster)
    : Boolean(props.mediaUrl || props.poster)
  let url = ''
  try {
    url = await resolve_post_media_url(props.mediaUrl)
  } catch {
    url = ''
  }
  if (request_id !== media_request_id) {
    revoke_post_media_url(url)
    return
  }
  current_media_object_url = url
  resolved_url.value = url
  if (props.mediaUrl && !url && !props.poster) {
    has_media_error.value = true
    is_image_loading.value = false
  }
}

const refresh_poster = async () => {
  const request_id = ++poster_request_id
  revoke_post_media_url(current_poster_object_url)
  current_poster_object_url = ''
  resolved_poster.value = ''
  let url = ''
  try {
    url = await resolve_post_media_url(props.poster)
  } catch {
    url = ''
  }
  if (request_id !== poster_request_id) {
    revoke_post_media_url(url)
    return
  }
  current_poster_object_url = url
  resolved_poster.value = url
}

const get_video_element = () => {
  if (typeof document === 'undefined') return null
  const video_root = document.getElementById(video_id)
  if (!video_root) return null
  return video_root.tagName === 'VIDEO' ? video_root : video_root.querySelector('video')
}

const get_media_element = () => {
  return find_media_element(media_key.value)
}

const ensure_audio = (event) => {
  if (props.muted) return
  const event_target = event?.target
  const video = event_target?.tagName === 'VIDEO'
    ? event_target
    : event_target?.querySelector?.('video') || get_video_element()
  if (!video) return
  video.defaultMuted = false
  video.muted = false
  video.volume = 1
}

const handle_image_load = () => {
  is_image_loading.value = false
  emit('load')
  emit('ready')
}
const handle_image_error = () => {
  has_media_error.value = true
  is_image_loading.value = false
  emit('error')
}
const handle_video_metadata = (event) => {
  ensure_audio(event)
}

const handle_video_canplay = () => {
  is_image_loading.value = false;
  emit('ready')
}
const handle_video_canplaythrough = () => {
  is_image_loading.value = false;
  emit('ready')
}
const handle_video_playing = () => {
  is_image_loading.value = false;
  emit('ready')
}
const handle_video_time_update = () => {
  is_image_loading.value = false;
  emit('ready')
}
const handle_video_waiting = () => { is_image_loading.value = true }
const handle_video_error = () => {
  has_media_error.value = true
  is_image_loading.value = false
  emit('error')
}

const handle_play = (event) => {
  has_video_started.value = true
  is_video_playing.value = true
  is_image_loading.value = false
  activate_media({ id: media_key.value, pause: pause_video, get_element: get_media_element })
  ensure_audio(event)
}

const handle_pause = () => {
  is_video_playing.value = false
  is_image_loading.value = false
  clear_media(media_key.value)
}
const handle_ended = () => {
  if (!props.playable) return
  is_video_playing.value = false
  has_video_started.value = false
  clear_media(media_key.value)
}

const play_video = async () => {
  if (!resolved_url.value || has_media_error.value) return
  has_video_started.value = true
  is_video_playing.value = true
  is_image_loading.value = true
  activate_media({ id: media_key.value, pause: pause_video, get_element: get_media_element })
  await nextTick()

  const video = get_video_element()
  ensure_audio({ target: video })
  if (video?.play) {
    video.play().catch(() => {
      if (is_disposed) return
      is_video_playing.value = false
      has_video_started.value = false
      is_image_loading.value = false
      clear_media(media_key.value)
      has_media_error.value = true
    })
  } else if (!is_disposed && typeof uni !== 'undefined' && typeof uni.createVideoContext === 'function') {
    uni.createVideoContext(video_id, component_instance?.proxy)?.play?.()
  }
}

const pause_video = () => {
  if (props.contentType !== 'video') {
    clear_media(media_key.value)
    return
  }
  const video = get_video_element()
  if (video?.pause) {
    video.pause()
  } else if (!is_disposed && typeof uni !== 'undefined' && typeof uni.createVideoContext === 'function') {
    uni.createVideoContext(video_id, component_instance?.proxy)?.pause?.()
  }
  is_video_playing.value = false
  clear_media(media_key.value)
}

const toggle_video = () => {
  if (!props.playable) return
  if (is_video_playing.value) {
    pause_video()
    return
  }
  play_video()
}

watch(() => props.mediaUrl, refresh_media, { immediate: true })
watch(() => props.poster, refresh_poster, { immediate: true })
onBeforeUnmount(() => {
  is_disposed = true
  pause_video()
  media_request_id += 1
  poster_request_id += 1
  revoke_post_media_url(current_media_object_url)
  revoke_post_media_url(current_poster_object_url)
})
</script>

<style scoped lang="scss">
.post-media {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  background: var(--media-surface);
}

.post-media__loading {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--media-loading-surface);
}

.post-media__shimmer {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.post-media__asset {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-media__play {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  display: flex;
  width: 58rpx;
  height: 58rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--media-scrim);
  color: var(--media-icon);
}


.post-media__play--center {
  top: 50%;
  right: auto;
  bottom: auto;
  left: 50%;
  width: 96rpx;
  height: 96rpx;
  transform: translate(-50%, -50%);
}

.post-media__play--center > * {
  width: 48rpx;
  height: 48rpx;
}

</style>

<template>
  <PageTransition ref="page_transition" class="incoming-call-page" :style="theme_style">
    <ConnectedVideoCall
      v-if="CALL_CONNECTION_ENABLED && is_connected"
      ref="connected_video"
      :busy="is_busy"
      :error-message="error_message"
      @hangup="decline_call"
    />
    <template v-else-if="CALL_CONNECTION_ENABLED">
      <view class="incoming-media" aria-hidden="true">
        <UserAvatar v-if="caller_avatar_url" class="incoming-media__fallback" :source="caller_avatar_url" />
        <video
          id="incoming-intro-video"
          class="incoming-media__video"
          :src="VIDEO_CALL_MEDIA_URL"
          autoplay
          playsinline
          webkit-playsinline
          object-fit="cover"
          :controls="false"
          :show-center-play-btn="false"
          :show-play-btn="false"
          :show-fullscreen-btn="false"
          :enable-progress-gesture="false"
          @loadedmetadata="update_intro_progress"
          @timeupdate="update_intro_progress"
          @ended="finish_intro_preview"
          @error="handle_intro_error"
        />
      </view>
      <view class="incoming-shade" />
      <view v-if="caller_user_id" class="incoming-overlay">
        <view class="incoming-heading">
          <text class="incoming-kicker">{{ $t('Incoming video call') }}</text>
          <text class="incoming-name">{{ caller_name }}</text>
          <text class="incoming-meta">{{ $t('Mobile · recent calls') }}</text>
        </view>
        <view class="incoming-spacer" />
        <view class="incoming-intro-status">
          <text class="incoming-purpose">{{ $t('Urgent') }}</text>
          <view class="incoming-playing-row">
            <image src="/static/icons/call/camera-reels-fill-on-media.svg" mode="aspectFit" />
            <text>{{ $t(intro_error ? 'Video unavailable' : 'Playing introduction') }}</text>
            <text class="incoming-time">{{ $t(intro_time_label) }}</text>
          </view>
          <view class="incoming-progress" aria-hidden="true">
            <view class="incoming-progress__value" :style="{ width: `${intro_progress}%` }" />
          </view>
        </view>
        <view v-if="error_message" class="incoming-error" role="alert">
          <text>{{ $t(error_message) }}</text>
        </view>
        <view class="incoming-primary-actions">
          <view class="incoming-primary-action">
            <view
              class="incoming-round-button incoming-round-button--decline"
              role="button"
              :aria-label="$t('Decline')"
              :aria-disabled="is_busy"
              @click="decline_call"
            >
              <image src="/static/icons/call/x-primary.svg" mode="aspectFit" />
            </view>
            <text>{{ $t('Decline') }}</text>
          </view>
          <view class="incoming-primary-action">
            <view
              class="incoming-round-button incoming-round-button--answer"
              role="button"
              :aria-label="$t('Answer')"
              :aria-disabled="is_busy"
              @click="answer_call"
            >
              <image src="/static/icons/call/camera-reels-fill-on-media.svg" mode="aspectFit" />
            </view>
            <text>{{ $t('Answer') }}</text>
          </view>
        </view>
        <view class="incoming-secondary-actions">
          <view
            class="incoming-secondary-action"
            role="button"
            :aria-disabled="is_busy"
            @click="replay_intro"
          >
            <image src="/static/icons/call/arrow-repeat-on-media.svg" mode="aspectFit" />
            <text>{{ $t('Replay intro') }}</text>
          </view>
          <view
            class="incoming-secondary-action"
            role="button"
            :aria-disabled="is_busy"
            @click="send_message"
          >
            <image src="/static/icons/call/envelope-on-media.svg" mode="aspectFit" />
            <text>{{ $t('Send message') }}</text>
          </view>
          <view
            class="incoming-secondary-action"
            role="button"
            :aria-disabled="is_busy"
            @click="decline_call"
          >
            <image src="/static/icons/call/x-primary.svg" mode="aspectFit" />
            <text>{{ $t('Call back later') }}</text>
          </view>
        </view>
      </view>
      <view v-else class="incoming-unavailable">
        <text>{{ $t(error_message || 'This incoming call is unavailable.') }}</text>
        <view role="button" @click="leave_call">{{ $t('Return') }}</view>
      </view>
    </template>
    <view v-else class="incoming-unavailable">
      <text>{{ $t('This incoming call is unavailable.') }}</text>
      <view role="button" @click="leave_call">{{ $t('Return') }}</view>
    </view>
  </PageTransition>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { onHide, onLoad, onReady, onShow } from '@dcloudio/uni-app'
import { CALL_CONNECTION_ENABLED, VIDEO_CALL_MEDIA_URL } from '@/config/callMedia'
import theme from '@/config/theme.json'
import pages_config from '@/pages.json'
import ConnectedVideoCall from '@/components/ConnectedVideoCall.vue'
import PageTransition from '@/components/PageTransition.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { build_chat_page_url } from '@/utils/chatPresentation'
import { create_call_sound_controller } from '@/utils/callSounds'

const page_transition = ref(null)
const connected_video = ref(null)
const caller_user_id = ref('')
const caller_name = ref('Incoming caller')
const caller_avatar_url = ref('')
const return_url = ref('/pages/discover/index')
const is_connected = ref(false)
const is_busy = ref(false)
const error_message = ref('')
const intro_current_time = ref(0)
const intro_duration = ref(15)
const intro_error = ref(false)
const intro_progress = computed(() => Math.min(100, Math.max(0, intro_current_time.value / Math.max(1, intro_duration.value) * 100)))
const format_intro_time = (value) => `${Math.max(0, Number(value) || 0).toFixed(1)}s`
const intro_time_label = computed(() => `${format_intro_time(intro_current_time.value)} / ${format_intro_time(intro_duration.value)}`)
const call_sounds = create_call_sound_controller()
let video_context = null
let visible = false
let leaving = false

const source_routes = Object.freeze({
  home: '/pages/discover/index',
  messages: '/pages/messages/index',
  videos: '/pages/videos/index',
  profile: '/pages/profile/index'
})

const decode_query_value = (value) => {
  const text = `${value || ''}`
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

const normalize_return_url = (value, source) => {
  const fallback = source_routes[source] || source_routes.home
  const candidate = String(value || fallback).trim()
  const normalized = candidate.startsWith('/') ? candidate : `/${candidate}`
  const path = normalized.split('?')[0].slice(1)
  return path !== 'pages/profile/incoming-call' && pages_config.pages.some((page) => page.path === path)
    ? normalized
    : fallback
}

const pause_intro = () => {
  try {
    video_context?.pause()
  } catch {}
}

const play_intro = () => {
  if (!CALL_CONNECTION_ENABLED || !visible || is_connected.value) return
  intro_error.value = false
  nextTick(() => {
    try {
      video_context?.play()
    } catch {}
  })
}

const replay_intro = () => {
  if (is_busy.value) return
  intro_current_time.value = 0
  intro_error.value = false
  try {
    video_context?.seek(0)
    video_context?.play()
  } catch {
    intro_error.value = true
  }
}

const update_intro_progress = (event) => {
  const detail = event?.detail || {}
  const source_duration = Number(detail.duration) || 15
  intro_duration.value = Math.min(15, Math.max(1, source_duration))
  intro_current_time.value = Math.min(intro_duration.value, Math.max(0, Number(detail.currentTime) || 0))
  if (intro_current_time.value >= 15) pause_intro()
}

const finish_intro_preview = () => {
  intro_current_time.value = intro_duration.value
}

const handle_intro_error = () => {
  intro_error.value = true
  error_message.value = 'The caller’s video introduction is unavailable.'
}

const leave_call = () => {
  if (leaving) return
  leaving = true
  pause_intro()
  call_sounds.stop_waiting()
  const fail = () => {
    leaving = false
    error_message.value = 'Unable to return to the previous page. Please try again.'
  }
  if (getCurrentPages().length > 1) {
    page_transition.value?.navigate_back({ fail })
    return
  }
  page_transition.value?.navigate_relaunch({ url: return_url.value, fail })
}

const answer_call = () => {
  if (!CALL_CONNECTION_ENABLED || !caller_user_id.value || is_busy.value || is_connected.value) return
  is_busy.value = true
  pause_intro()
  call_sounds.stop_waiting()
  is_connected.value = true
  is_busy.value = false
  nextTick(() => connected_video.value?.start_camera())
}

const decline_call = () => {
  if (is_busy.value) return
  connected_video.value?.stop_camera()
  pause_intro()
  call_sounds.play_ended()
  leave_call()
}

const send_message = () => {
  if (!caller_user_id.value || is_busy.value) return
  pause_intro()
  leaving = true
  const url = build_chat_page_url({
    user_id: caller_user_id.value,
    user_name: caller_name.value,
    user_avatar_url: caller_avatar_url.value
  })
  const fail = () => {
    leaving = false
    error_message.value = 'Unable to open this conversation. Please try again.'
  }
  const started = page_transition.value?.navigate_replace({ url, fail })
  if (!page_transition.value || started === false) fail()
}

onLoad((query = {}) => {
  caller_user_id.value = decode_query_value(query.user_id)
  caller_name.value = decode_query_value(query.user_name) || 'Incoming caller'
  caller_avatar_url.value = decode_query_value(query.avatar_url)
  return_url.value = normalize_return_url(query.return_url, query.source)
  if (!caller_user_id.value) error_message.value = 'This incoming call is unavailable.'
})

onReady(() => {
  if (!CALL_CONNECTION_ENABLED) return
  video_context = uni.createVideoContext('incoming-intro-video')
  play_intro()
})

onShow(() => {
  visible = true
  leaving = false
  if (is_connected.value) nextTick(() => connected_video.value?.start_camera())
  else play_intro()
})

onHide(() => {
  visible = false
  pause_intro()
})

onBeforeUnmount(() => {
  visible = false
  pause_intro()
  connected_video.value?.stop_camera()
  call_sounds.stop_all()
})

const theme_style = {
  '--incoming-background': theme.colors.call.background,
  '--incoming-text': theme.colors.text.on_media,
  '--incoming-muted': theme.colors.video_detail.secondary,
  '--incoming-shade': theme.colors.video_detail.shade,
  '--incoming-track': theme.colors.video_detail.progress_track,
  '--incoming-progress': theme.colors.text.on_media,
  '--incoming-control': theme.colors.surface.scrim_soft,
  '--incoming-control-border': theme.colors.video_detail.action_outline,
  '--incoming-purpose': theme.colors.button.primary,
  '--incoming-purpose-text': theme.colors.button.text,
  '--incoming-danger': theme.colors.status.danger,
  '--incoming-answer': theme.colors.status.success,
  '--incoming-error': theme.colors.status.error,
  '--incoming-shadow': theme.colors.surface.shadow
}
</script>

<style scoped lang="scss">
@use '../../styles/incoming-call';
</style>

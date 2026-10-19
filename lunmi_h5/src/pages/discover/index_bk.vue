<template>
  <view class="page discover-page" :style="theme_style">
    <TopSafeArea />
    <MainTabSkeleton v-if="is_main_tab_loading || (is_discover_loading && !has_remote_discover_data)" type="discover" />
    <view v-else class="main-page-content discover-content">
      <view class="discover-header">
        <text class="discover-title">{{ $t('Discover') }}</text>
        <view class="create-entry" role="button" :aria-label="$t('Create a post')" @click="open_create">
          <image class="create-entry__icon" src="/static/icons/discover_add.png" mode="aspectFit" aria-hidden="true" />
        </view>
      </view>
      <scroll-view class="discover-scroll" scroll-y :show-scrollbar="false">
        <view class="discover-scroll__inner">
          <DiscoverDataLoading v-if="is_discover_loading" />
          <view v-else-if="discover_error && !has_remote_discover_data" class="discover-state" role="alert">
            <text class="discover-state__title">{{ $t('Unable to load Discover') }}</text>
            <text class="discover-state__copy">{{ $t(discover_error) }}</text>
            <view class="discover-state__action" role="button" @click="load_discover_posts">{{ $t('Try again') }}</view>
          </view>
          <transition v-else name="page-fade-up" appear>
            <view :key="moment_posts.length">
              <view v-for="post in moment_posts" :key="post.post_id" class="post-card" role="article">
                <view class="post-card__author-row">
                  <view class="author-entry" role="button" :aria-label="$t(`Open ${post.author_name} profile`)"
                    @click="open_author(post)">
                    <UserAvatar class="author-avatar" :source="post.author_avatar" />
                    <text class="author-name">{{ post.author_name_is_placeholder ? $t(post.author_name) : post.author_name }}</text>
                  </view>
                  <view v-if="post.owner_user_id !== current_user_id" class="follow-entry"
                    :class="{ 'follow-entry--pending': is_action_pending(`follow:${post.owner_user_id}`) }" role="button"
                    :aria-label="$t(get_follow_label(post))" :aria-disabled="is_action_pending(`follow:${post.owner_user_id}`)"
                    @click.stop="toggle_follow(post)">
                    <image class="follow-entry__icon" :src="get_relationship_state(post).is_following
                      ? '/static/icons/discover_followed.png'
                      : '/static/icons/discover_follow.png'" mode="aspectFit" aria-hidden="true" />
                  </view>
                </view>
                <view v-if="post.content" class="post-copy-entry" role="button" :aria-label="$t('Open post details')"
                  @click="open_post(post)">
                  <text class="post-copy">{{ post.content }}</text>
                </view>
                <view v-if="get_voice_clip(post)" class="voice-player"
                  :class="{ 'voice-player--error': voice_error_ids.has(post.post_id) }" role="button"
                  :aria-label="$t(is_voice_playing(post) ? 'Pause voice post' : 'Play voice post')" @click="toggle_voice(post)">
                  <image class="voice-player__icon" :src="is_voice_playing(post)
                    ? '/static/icons/discover_pause_black.png'
                    : '/static/icons/discover_play_black.png'" mode="aspectFit" aria-hidden="true" />
                  <view class="voice-wave" aria-hidden="true">
                    <view v-for="bar in voice_wave_bars" :key="bar" class="voice-wave__bar"
                      :style="{ height: `${get_voice_wave_height(bar, post)}rpx` }" />
                  </view>
                  <text class="voice-player__duration">
                    {{ $t(voice_error_ids.has(post.post_id) ? 'Unavailable' : get_voice_duration_label(post)) }}
                  </text>
                </view>
                <view v-if="get_post_images(post).length" class="post-media-grid"
                  :class="{ 'post-media-grid--single': get_post_images(post).length === 1 }">
                  <view v-for="media in get_post_images(post).slice(0, 3)" :key="media.media_id" class="post-media-entry"
                    role="button" :aria-label="$t('Open post details')" @click="open_post(post)">
                    <PostMedia class="post-media" :media-url="media.media_url" content-type="image" />
                  </view>
                </view>
                <view class="post-card__actions">
                  <view class="post-card__actions-left">
                    <view class="post-action" :class="{ 'post-action--pending': is_action_pending(`like:${post.post_id}`) }"
                      role="button" :aria-label="$t(is_post_liked(post) ? 'Unlike post' : 'Like post')"
                      :aria-disabled="is_action_pending(`like:${post.post_id}`)" @click="toggle_like(post)">
                      <image class="post-action__icon" :src="is_post_liked(post)
                        ? '/static/icons/discover_liked.png'
                        : '/static/icons/discover_like.png'" mode="aspectFit" aria-hidden="true" />
                      <text>{{ $t(format_count(post.like_count)) }}</text>
                    </view>
                    <view class="post-action" role="button" :aria-label="$t('Open comments')" @click.stop="open_comments(post)">
                      <image class="post-action__icon" src="/static/icons/discover_comment.png" mode="aspectFit"
                        aria-hidden="true" />
                      <text>{{ $t(format_count(post.comment_count)) }}</text>
                    </view>
                    <view class="post-action post-action--stat" :aria-label="$t('Saved count')">
                      <text class="post-action__label">{{ $t('Saved') }}</text>
                      <text>{{ $t(format_count(post.store_count)) }}</text>
                    </view>
                  </view>
                  <view class="post-card__actions-right">
                    <view v-if="post.owner_user_id !== current_user_id" class="more-entry" role="button"
                      :aria-label="$t('Open post actions')" @click.stop="open_content_actions(post)">
                      <image class="more-entry__icon" src="/static/icons/discover_more.png" mode="aspectFit"
                        aria-hidden="true" />
                    </view>
                    <text v-else class="yoursInfo">{{ $t('Yours') }}</text>
                  </view>
                </view>
              </view>
              <view v-if="!moment_posts.length" class="empty-state">
                <text class="empty-state__title">{{ $t('Nothing here yet') }}</text>
                <text class="empty-state__copy">{{ $t('Create a post to start the conversation.') }}</text>
                <view class="empty-state__action" role="button" @click="open_create">{{ $t('Create post') }}</view>
              </view>
            </view>
          </transition>
        </view>
      </scroll-view>
      <text v-if="action_feedback" class="action-feedback" :class="`action-feedback--${feedback_tone}`">{{
        $t(action_feedback) }}</text>
    </view>
    <ContentActionSheet :visible="is_action_sheet_visible" @close="close_content_actions"
      @report="open_report_sheet" @block="open_block_dialog" />
    <ReportUserSheet :visible="is_report_sheet_visible" bottom-offset="var(--app-main-tab-bar-height)"
      :target-name="selected_post?.author_name || ''"
      :target-user-id="selected_post?.owner_user_id || ''" :post-id="selected_post?.post_id || ''"
      @update:visible="is_report_sheet_visible = $event" @submitted="handle_report_submitted" />
    <BlockUserConfirmDialog :visible="is_block_dialog_visible" :target-name="selected_post?.author_name || ''"
      @cancel="is_block_dialog_visible = false" @confirm="confirm_block" />
    <UserBlockingLoading v-if="is_blocking" />
    <CustomTabBar />
  </view>
</template>

<script setup>
import { map_legacy_discover_feed_item, read_legacy_blocked_user_ids } from '@/utils/legacyPagePresentation'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import theme from '@/config/theme.json'
import BlockUserConfirmDialog from '@/components/BlockUserConfirmDialog.vue'
import ContentActionSheet from '@/components/ContentActionSheet.vue'
import CustomTabBar from '@/components/CustomTabBar.vue'
import DiscoverDataLoading from '@/components/DiscoverDataLoading.vue'
import MainTabSkeleton from '@/components/MainTabSkeleton.vue'
import PostMedia from '@/components/PostMedia.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserBlockingLoading from '@/components/UserBlockingLoading.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { selectBlacklistedUsers, updateUserRelation } from '@/api/common'
import { selectDynamicList, updateDynamicStore } from '@/api/dynamic'
import { storeGlobal } from '@/stores/store'
import { resolve_post_media_url, revoke_post_media_url } from '@/utils/postMediaStorage'
import { push_route, replace_route } from '@/utils/routeTransition'
import { use_main_tab_skeleton } from '@/utils/useMainTabSkeleton'

const account_store = storeGlobal()
const { is_main_tab_loading } = use_main_tab_skeleton('pages/discover/index')
const is_discover_loading = ref(true)
const discover_error = ref('')
const action_feedback = ref('')
const feedback_tone = ref('error')
const is_action_sheet_visible = ref(false)
const is_report_sheet_visible = ref(false)
const is_block_dialog_visible = ref(false)
const is_blocking = ref(false)
const pending_action_keys = ref(new Set())
const selected_post = ref(null)
const voice_error_ids = ref(new Set())
const playing_voice_media_id = ref('')
const voice_playing = ref(false)
const voice_remaining_seconds = ref(0)
const voice_wave_phase = ref(0)
const voice_wave_bars = Object.freeze(Array.from({ length: 14 }, (_, index) => index + 1))
const page_posts = ref([])
const liked_post_ids = ref(new Set())
const blocked_user_ids = ref(new Set())
let feedback_timer = null
let block_timer = null
let voice_context = null
let current_voice_source = ''
let voice_request_id = 0
let voice_wave_timer = null
let voice_countdown_timer = null

const current_user_id = computed(() => account_store.userId)
const moment_posts = computed(() => page_posts.value
  .filter((post) => !blocked_user_ids.value.has(`${post.owner_user_id}`)))
const has_remote_discover_data = computed(() => page_posts.value.length > 0)
const discover_request_context = {}
let is_unmounted = false
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--surface-color': theme.colors.surface.card,
  '--surface-soft': theme.colors.surface.card_soft,
  '--surface-border': theme.colors.surface.border_soft,
  '--surface-shadow': theme.colors.surface.shadow,
  '--title-color': theme.colors.text.title,
  '--secondary-color': theme.colors.text.secondary,
  '--tertiary-color': theme.colors.text.tertiary,
  '--accent-color': theme.colors.button.primary,
  '--accent-text': theme.colors.button.text,
  '--voice-background': theme.colors.surface.highlight,
  '--danger-color': theme.colors.status.danger,
  '--success-color': theme.colors.status.success
}

const get_post_images = (post) => {
  if (post.content_type === 'audio') return []
  const media_urls = post.content_type === 'video' && post.cover_url
    ? [post.cover_url]
    : post.media_urls
  const urls = Array.isArray(media_urls) && media_urls.length
    ? media_urls
    : post.media_url
      ? [post.media_url]
      : []
  return urls.map((media_url, index) => ({
    media_id: `${post.post_id}-media-${index}`,
    media_url
  }))
}
const get_voice_clip = (post) => post.content_type === 'audio' && post.media_url
  ? {
      media_id: `${post.post_id}-audio`,
      media: { media_url: post.media_url, duration_seconds: post.duration_seconds || 0 }
    }
  : null
const is_post_liked = (post) => liked_post_ids.value.has(post.post_id)
const get_relationship_state = (post) => ({
  is_following: Number(post.attentionFlag ?? post.attention_flag) === 1,
  is_mutual: Number(post.friendFlag ?? post.friend_flag) === 2
})
const get_follow_label = (post) => {
  if (is_action_pending(`follow:${post.owner_user_id}`)) return 'Saving follow state'
  const state = get_relationship_state(post)
  if (state.is_mutual) return 'Friends'
  return state.is_following ? 'Unfollow' : 'Follow'
}
const is_voice_playing = (post) => voice_playing.value && playing_voice_media_id.value === get_voice_clip(post)?.media_id
const get_voice_duration_label = (post) => {
  const voice_clip = get_voice_clip(post)
  if (!voice_clip?.media) return '0s'
  const seconds = playing_voice_media_id.value === voice_clip.media_id && voice_remaining_seconds.value > 0
    ? voice_remaining_seconds.value
    : Math.max(0, Number(voice_clip.media.duration_seconds || 0))
  return `${Math.ceil(seconds)}s`
}
const get_voice_wave_height = (bar, post) => {
  const active = playing_voice_media_id.value === get_voice_clip(post)?.media_id
  const phase = active ? voice_wave_phase.value : 0
  const level = active ? Math.abs(Math.sin((bar * 0.8) + phase)) : ((bar * 11) % 30) / 30
  return Math.round(18 + level * 30)
}
const is_action_pending = (action_key) => pending_action_keys.value.has(action_key)

const format_count = (count) => {
  const value = Math.max(0, Number(count || 0))
  if (value < 1000) return `${value}`
  const shortened = Math.round(value / 100) / 10
  return `${shortened.toFixed(shortened % 1 === 0 ? 0 : 1)}k`
}

const show_feedback = (message, tone = 'error') => {
  action_feedback.value = message
  feedback_tone.value = tone
  clearTimeout(feedback_timer)
  feedback_timer = setTimeout(() => { action_feedback.value = '' }, 2200)
}
const finish_action = (action_key) => {
  const next_keys = new Set(pending_action_keys.value)
  next_keys.delete(action_key)
  pending_action_keys.value = next_keys
}
const schedule_local_action = (action_key, action) => {
  if (is_action_pending(action_key)) return
  action_feedback.value = ''
  pending_action_keys.value = new Set([...pending_action_keys.value, action_key])
  const result = action()
  if (!result?.success) show_feedback(result?.error || 'Unable to save this change.')
  finish_action(action_key)
}

const toggle_like = async (post) => {
  const action_key = `like:${post.post_id}`
  if (is_action_pending(action_key) || is_unmounted) return
  pending_action_keys.value = new Set([...pending_action_keys.value, action_key])
  const was_liked = is_post_liked(post)
  const previous_count = Number(post.like_count || 0)
  const apply_like = (liked, count) => {
    const next_ids = new Set(liked_post_ids.value)
    if (liked) next_ids.add(post.post_id)
    else next_ids.delete(post.post_id)
    liked_post_ids.value = next_ids
    page_posts.value = page_posts.value.map((item) => item.post_id === post.post_id
      ? { ...item, like_count: count }
      : item)
  }
  apply_like(!was_liked, Math.max(0, previous_count + (was_liked ? -1 : 1)))
  try {
    const result = await updateDynamicStore({ dynamicId: post.post_id })
    if (!result?.success) {
      apply_like(was_liked, previous_count)
      show_feedback(result?.error || 'Unable to update this post.')
    }
  } catch (error) {
    apply_like(was_liked, previous_count)
    show_feedback(error?.message || 'Unable to update this post.')
  } finally {
    finish_action(action_key)
  }
}
const toggle_follow = (post) => schedule_local_action(
  `follow:${post.owner_user_id}`,
  async () => {
    const result = await updateUserRelation({ beHandleUserId: post.owner_user_id, hanldeType: 1 })
    if (result?.success) {
      page_posts.value = page_posts.value.map((item) => item.post_id === post.post_id
        ? { ...item, attentionFlag: get_relationship_state(post).is_following ? 0 : 1 }
        : item)
    }
    return result
  }
)
const release_voice = () => {
  voice_request_id += 1
  voice_context?.stop?.()
  voice_context?.destroy?.()
  voice_context = null
  playing_voice_media_id.value = ''
  voice_playing.value = false
  voice_remaining_seconds.value = 0
  clearInterval(voice_wave_timer)
  voice_wave_timer = null
  stop_voice_countdown()
  revoke_post_media_url(current_voice_source)
  current_voice_source = ''
}
const start_voice_wave = () => {
  clearInterval(voice_wave_timer)
  voice_wave_timer = setInterval(() => { voice_wave_phase.value += 0.45 }, 120)
}
const stop_voice_wave = () => {
  clearInterval(voice_wave_timer)
  voice_wave_timer = null
}
const stop_voice_countdown = () => {
  clearInterval(voice_countdown_timer)
  voice_countdown_timer = null
}
const start_voice_countdown = () => {
  stop_voice_countdown()
  voice_countdown_timer = setInterval(() => {
    if (voice_remaining_seconds.value <= 1) {
      voice_remaining_seconds.value = 0
      stop_voice_countdown()
      return
    }
    voice_remaining_seconds.value -= 1
  }, 1000)
}
const mark_voice_error = (post_id) => {
  voice_error_ids.value = new Set([...voice_error_ids.value, post_id])
  show_feedback('This voice post is unavailable.')
}
const toggle_voice = async (post) => {
  const voice_clip = get_voice_clip(post)
  if (!voice_clip?.media?.media_url) {
    mark_voice_error(post.post_id)
    return
  }
  if (playing_voice_media_id.value === voice_clip.media_id) {
    if (voice_playing.value) {
      voice_context?.pause?.()
      voice_playing.value = false
      stop_voice_wave()
    } else {
      voice_context?.play?.()
      voice_playing.value = true
      start_voice_wave()
    }
    return
  }
  release_voice()
  const request_id = voice_request_id
  try {
    const source = await resolve_post_media_url(voice_clip.media.media_url)
    if (request_id !== voice_request_id) {
      revoke_post_media_url(source)
      return
    }
    current_voice_source = source
    voice_context = uni.createInnerAudioContext()
    voice_context.src = source
    voice_context.onEnded(() => {
      voice_remaining_seconds.value = 0
      release_voice()
    })
    voice_context.onPlay(() => {
      voice_playing.value = true
      start_voice_wave()
      start_voice_countdown()
    })
    voice_context.onPause(() => {
      voice_playing.value = false
      stop_voice_wave()
      stop_voice_countdown()
    })
    voice_context.onError(() => {
      release_voice()
      mark_voice_error(post.post_id)
    })
    playing_voice_media_id.value = voice_clip.media_id
    voice_remaining_seconds.value = Number(voice_clip.media.duration_seconds || 0)
    voice_context.play()
  } catch {
    mark_voice_error(post.post_id)
  }
}

const show_route_error = () => show_feedback('This destination is not available.')
const open_create = () => push_route({ url: '/pages/discover/create', fail: show_route_error })
const open_post = (post) => push_route({
  url: `/pages/discover/detail?post_id=${encodeURIComponent(post.post_id)}&return_to=discover`,
  fail: show_route_error
})
const open_comments = (post) => push_route({
  url: `/pages/discover/detail?post_id=${encodeURIComponent(post.post_id)}&return_to=discover&focus=comments`,
  fail: show_route_error
})
const open_author = (post) => {
  if (post.owner_user_id === current_user_id.value) {
    replace_route({ url: '/pages/profile/index', fail: show_route_error })
    return
  }
  push_route({
    url: `/pages/profile/user?user_id=${encodeURIComponent(post.owner_user_id)}`,
    fail: show_route_error
  })
}

const load_discover_posts = async () => {
  if (is_unmounted) return
  is_discover_loading.value = true
  discover_error.value = ''
  const result = await selectDynamicList({}, discover_request_context)
  if (is_unmounted) return
  if (!result.success) {
    discover_error.value = result.error || 'Unable to load Discover.'
    show_feedback(discover_error.value)
  } else {
    page_posts.value = (Array.isArray(result.data?.records) ? result.data.records : [])
      .map(map_legacy_discover_feed_item)
    const next_liked_ids = new Set()
    page_posts.value.forEach((post) => {
      if (Number(post.storeFlag) === 1) next_liked_ids.add(post.post_id)
    })
    liked_post_ids.value = next_liked_ids
  }
  is_discover_loading.value = false
}

onMounted(() => {
  void load_discover_posts()
  void selectBlacklistedUsers().then((result) => {
    if (result?.success && !is_unmounted) blocked_user_ids.value = read_legacy_blocked_user_ids(Array.isArray(result.data) ? result.data : [])
  })
})

const open_content_actions = (post) => {
  selected_post.value = post
  is_action_sheet_visible.value = true
}
const close_content_actions = () => { is_action_sheet_visible.value = false }
const open_report_sheet = () => {
  is_action_sheet_visible.value = false
  is_report_sheet_visible.value = true
}
const open_block_dialog = () => {
  is_action_sheet_visible.value = false
  is_block_dialog_visible.value = true
}
const handle_report_submitted = () => show_feedback('Report sent.', 'success')
const confirm_block = async () => {
  if (!selected_post.value || is_blocking.value) return
  is_block_dialog_visible.value = false
  is_blocking.value = true
  try {
    const target_user_id = selected_post.value.owner_user_id
    const result = await updateUserRelation({ beHandleUserId: target_user_id, hanldeType: 2 })
    if (!result?.success) {
      show_feedback(result?.error || 'Unable to block this user.')
      return
    }
    blocked_user_ids.value = new Set([...blocked_user_ids.value, `${target_user_id}`])
    selected_post.value = null
    show_feedback('User blocked. Their content is now hidden.', 'success')
  } finally {
    is_blocking.value = false
  }
}

onBeforeUnmount(() => {
  is_unmounted = true
  clearTimeout(feedback_timer)
  clearTimeout(block_timer)
  clearInterval(voice_wave_timer)
  release_voice()
  discover_request_context.cancel?.()
})
</script>

<style scoped lang="scss">
.discover-page {
  position: relative;
  background: var(--page-background);
  color: var(--title-color);
}

.discover-content {
  display: flex;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.discover-header {
  display: flex;
  height: 110rpx;
  align-items: center;
  justify-content: space-between;
  padding: 0 40rpx 8rpx 30rpx;
  flex: 0 0 110rpx;
}

.discover-title {
  font-size: 42rpx;
  font-weight: 900 !important;
  font-style: italic;
}

.create-entry {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
  border-radius: 32rpx;
  background: var(--title-color);
}

.create-entry__icon {
  width: 64rpx;
  height: 64rpx;
}

.discover-scroll {
  width: 100%;
  height: 0;
  min-height: 0;
  flex: 1;
}

.discover-scroll__inner {
  box-sizing: border-box;
  min-height: calc(100% + 2rpx);
  padding: 0 20rpx 32rpx;
}

.post-card {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 22rpx;
  padding: 30rpx 24rpx 24rpx;
  border-radius: 38rpx;
  background: var(--surface-color);
  box-shadow: 0 12rpx 42rpx var(--surface-shadow);
}

.post-card__author-row,
.author-entry,
.follow-entry,
.post-card__actions,
.post-card__actions-left,
.post-card__actions-right,
.post-action {
  display: flex;
  align-items: center;
}

.post-card__actions-left {
  gap: 58rpx;
}

.post-card__author-row {
  justify-content: space-between;
  gap: 16rpx;
}

.author-entry {
  min-width: 0;
  gap: 14rpx;
}

.author-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  flex: none;
}

.author-name {
  overflow: hidden;
  color: var(--title-color);
  font-size: 29rpx;
  font-weight: 800 !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.follow-entry {
  width: 168rpx;
  height: 58rpx;
  justify-content: center;
  flex: 0 0 168rpx;
}

.follow-entry--pending {
  opacity: .48;
}

.follow-entry__icon {
  width: 168rpx;
  height: 58rpx;
}

.post-copy-entry {
  margin: 24rpx 0;
}

.post-copy {
  display: block;
  font-size: 29rpx;
  line-height: 42rpx;
}

.voice-player {
  display: flex;
  height: 104rpx;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  margin: 18rpx 0;
  padding: 0 34rpx;
  border-radius: 18rpx;
  background: var(--voice-background);
  gap: 28rpx;
}

.voice-player--error {
  opacity: .62;
}

.voice-player__icon {
  width: 28rpx;
  height: 34rpx;
  flex: none;
}

.voice-wave {
  display: flex;
  height: 50rpx;
  align-items: center;
  gap: 5rpx;
}

.voice-wave__bar {
  width: 5rpx;
  border-radius: 4rpx;
  background: var(--title-color);
}

.voice-player__duration {
  margin-left: 8rpx;
  font-size: 29rpx;
  font-weight: 700 !important;
}

.post-media-grid {
  display: grid;
  gap: 8rpx;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.post-media-entry {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1;
  border-radius: 22rpx;
  background: var(--surface-soft);
}

.post-media-grid--single {
  display: block;
  width: 416rpx;
}

.post-media-grid--single .post-media-entry {
  width: 416rpx;
  height: 478rpx;
  aspect-ratio: auto;
}

.post-media {
  width: 100%;
  height: 100%;
}

.post-card__actions {
  min-height: 70rpx;
  margin-top: 16rpx;
  justify-content: space-between;
}

.post-card__actions-right {
  justify-content: center;
}

.post-action {
  color: var(--secondary-color);
  gap: 14rpx;
  font-size: 25rpx;
}

.post-action--pending {
  opacity: .42;
}

.post-action__icon {
  width: 42rpx;
  height: 42rpx;
}

.post-action--bookmark {
  margin-left: auto;
  opacity: .62;
}

.post-action__icon--bookmark {
  width: 48rpx;
  height: 48rpx;
}

.more-entry {
  display: flex;
  width: 54rpx;
  height: 54rpx;
  align-items: center;
  justify-content: center;
}

.more-entry__icon {
  width: 48rpx;
  height: 48rpx;
}

.empty-state {
  display: flex;
  min-height: 520rpx;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  text-align: center;
  flex-direction: column;
}

.empty-state__title {
  font-size: 34rpx;
  font-weight: 800 !important;
}

.empty-state__copy {
  margin-top: 14rpx;
  color: var(--secondary-color);
  font-size: 24rpx;
  line-height: 36rpx;
}

.empty-state__action {
  height: 70rpx;
  margin-top: 26rpx;
  padding: 0 30rpx;
  border-radius: 35rpx;
  background: var(--accent-color);
  color: var(--accent-text);
  font-size: 25rpx;
  font-weight: 700 !important;
  line-height: 70rpx;
}

.action-feedback {
  position: absolute;
  z-index: 1100;
  top: 16rpx;
  right: 28rpx;
  left: 28rpx;
  padding: 14rpx 20rpx;
  border-radius: 18rpx;
  background: var(--surface-color);
  font-size: 22rpx;
  text-align: center;
}

.action-feedback--error {
  color: var(--danger-color);
}

.action-feedback--success {
  color: var(--success-color);
}

.yoursInfo {
  font-size: 23rpx;
  text-align: center;
  color: var(--secondary-color);
}

.discover-state {
  display: flex;
  min-height: 360rpx;
  padding: 48rpx 32rpx;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  background: var(--surface-soft);
  text-align: center;
  flex-direction: column;
}

.discover-state__title {
  color: var(--title-color);
  font-size: 34rpx;
  font-weight: 800 !important;
}

.discover-state__copy {
  margin-top: 14rpx;
  color: var(--secondary-color);
  font-size: 24rpx;
  line-height: 36rpx;
}

.discover-state__action {
  height: 70rpx;
  margin-top: 26rpx;
  padding: 0 30rpx;
  border-radius: 35rpx;
  background: var(--accent-color);
  color: var(--accent-text);
  font-size: 25rpx;
  font-weight: 700 !important;
  line-height: 70rpx;
}

.page-fade-up-enter-active {
  transition: opacity 0.4s cubic-bezier(0.33, 1, 0.68, 1), transform 0.4s cubic-bezier(0.33, 1, 0.68, 1);
}

.page-fade-up-enter-from {
  opacity: 0;
  transform: translateY(36rpx);
}
</style>

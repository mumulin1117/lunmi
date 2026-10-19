<template>
  <PageTransition ref="page_transition" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <SecondaryPageHeader
        :title="$t(is_video_post ? 'Video post' : 'Photo post')"
        :return-url="return_to_videos ? '/pages/videos/index' : ''"
      >
        <template v-if="is_video_post && post" #default>
          <view class="video-detail-author">
            <view v-if="can_open_author_profile" class="video-detail-header__avatar" role="button" :aria-label="$t(`Open ${post.author_name}'s profile`)" @click="open_author_profile">
              <UserAvatar class="avatar-link__image" :source="post.author_avatar" />
            </view>
            <UserAvatar v-else class="video-detail-header__avatar" :source="post.author_avatar" />
            <view class="video-detail-header__copy">
              <text class="video-detail-header__name">{{ post.author_name_is_placeholder ? $t(post.author_name) : post.author_name }}</text>
              <text class="video-detail-header__time">{{ $t(format_post_time(post.created_at)) }}</text>
            </view>
          </view>
        </template>
        <template v-if="is_video_post && post" #actions>
          <view v-if="is_owner" class="video-detail-header__edit" role="button" @click="go_to_edit">
            <text>{{ $t('Edit') }}</text>
          </view>
          <view v-else class="video-detail-header__report" role="button" :aria-label="$t('Report post')" @click="open_post_report">
            <image class="video-detail-header__report-icon" src="/static/icons/report-danger.svg" mode="aspectFit" />
          </view>
        </template>
      </SecondaryPageHeader>
      <view v-if="post && !is_video_post" class="author author--fixed">
        <view v-if="can_open_author_profile" class="avatar" role="button" :aria-label="$t(`Open ${post.author_name}'s profile`)" @click="open_author_profile">
          <UserAvatar class="avatar-link__image" :source="post.author_avatar" />
        </view>
        <UserAvatar v-else class="avatar" :source="post.author_avatar" />
        <view>
          <text class="author-name">{{ post.author_name_is_placeholder ? $t(post.author_name) : post.author_name }}</text>
          <text class="meta">{{ $t(format_post_time(post.created_at)) }}</text>
        </view>
        <view v-if="is_owner" class="edit-button" role="button" @click="go_to_edit">{{ $t('Edit') }}</view>
        <view v-else class="report-button" role="button" :aria-label="$t('Report post')" @click="open_post_report">
          <MoreFilled />
        </view>
      </view>
      <scroll-view class="content-scroll" :scroll-into-view="comment_scroll_target" scroll-y :show-scrollbar="false">
        <DiscoverDataLoading v-if="is_detail_loading" />
        <view v-else-if="post" class="content content-scroll__inner" :class="{ 'content--photo': !is_video_post }">
          <view v-if="is_video_post" class="post-video">
            <video
              v-if="resolved_video_url"
              :id="video_id"
              class="post-video__asset"
              :src="resolved_video_url"
              :poster="resolved_video_poster"
              :controls="false"
              :autoplay="false"
              :muted="false"
              :show-center-play-btn="false"
              :show-play-btn="false"
              :show-fullscreen-btn="false"
              :enable-progress-gesture="false"
              object-fit="cover"
              playsinline
              webkit-playsinline
              @click.stop="toggle_video_playback"
              @loadedmetadata="ensure_video_audio"
              @canplay="handle_video_ready"
              @playing="handle_video_ready"
              @waiting="handle_video_waiting"
              @error="handle_video_error"
              @play="handle_video_play"
              @pause="handle_video_pause"
              @ended="handle_video_pause"
            />
            <view v-if="is_video_loading" class="post-video__loading" :aria-label="$t('Loading video')">
              <view class="post-video__spinner" />
            </view>
            <VideoPlayButton :visible="!is_video_playing" :disabled="!resolved_video_url" @play="play_video" />
          </view>
          <PostMedia v-else-if="post.media_url" class="post-media" :media-url="post.media_url" :content-type="post.content_type" :poster="post.cover_url" />
          <text v-if="post.content" class="post-copy">{{ post.content }}</text>
          <view class="actions">
            <view class="action" :class="{ 'action--active': is_liked }" role="button" @click="toggle_like">
              <Star />
              <text>{{ $t(post.like_count) }} {{ $t('likes') }}</text>
            </view>
            <view class="action">
              <ChatDotRound />
              <text>{{ $t(post.comment_count) }} {{ $t('replies') }}</text>
            </view>
          </view>
          <view id="latest-comments" />
          <PostComments :comments="comments" :current-user-id="current_user_id" @report="open_comment_report" @delete="request_comment_delete" />
        </view>
        <view v-else class="not-found content-scroll__inner">
          <text class="not-found__title">{{ $t('Post unavailable') }}</text>
          <text class="not-found__copy">{{ $t('This post may have been removed or hidden.') }}</text>
        </view>
      </scroll-view>
      <view v-if="post" class="comment-composer">
        <input v-model="comment_draft" class="comment-input" :disabled="is_comment_submitting" maxlength="300" :placeholder="$t('Write a reply...')" placeholder-class="comment-placeholder" confirm-type="send" @input="vibrate_on_keyboard_input" @confirm="submit_comment" />
        <view class="send-comment" :class="{ 'send-comment--disabled': !comment_draft.trim() || is_comment_submitting }" role="button" @click="submit_comment">
          <Promotion />
        </view>
      </view>
    </view>
    <BottomSafeArea />
    <CommentDeletingLoading v-if="is_comment_deleting" />
    <CommentDeleteConfirmDialog :visible="is_delete_dialog_visible" @cancel="close_comment_delete" @confirm="confirm_comment_delete" />
    <ReportUserSheet :visible="is_report_visible" :target-name="report_target?.user_name || ''" :target-user-id="report_target?.user_id || ''" :post-id="post?.post_id || ''" :comment-id="report_target?.comment_id || ''" @update:visible="is_report_visible = $event" @submitted="handle_report_submitted" />
  </PageTransition>
</template>

<script setup>
import { map_legacy_video_comments, merge_legacy_video_detail } from '@/utils/legacyPagePresentation'
import { t } from '@/utils/i18n'

import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onHide, onLoad } from '@dcloudio/uni-app'
import { ChatDotRound, MoreFilled, Promotion, Star } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import CommentDeleteConfirmDialog from '@/components/CommentDeleteConfirmDialog.vue'
import CommentDeletingLoading from '@/components/CommentDeletingLoading.vue'
import DiscoverDataLoading from '@/components/DiscoverDataLoading.vue'
import PageTransition from '@/components/PageTransition.vue'
import PostMedia from '@/components/PostMedia.vue'
import PostComments from '@/components/PostComments.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import SecondaryPageHeader from '@/components/SecondaryPageHeader.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import VideoPlayButton from '@/components/VideoPlayButton.vue'
import { selectDynamicInfo, updateDynamicStore, commentDynamic, deleteComment } from '@/api/dynamic'
import { storeGlobal } from '@/stores/store'
import { map_user_dynamic_post } from '@/utils/profilePresentation'
import { resolve_post_media_url, revoke_post_media_url } from '@/utils/postMediaStorage'
import { vibrate_on_keyboard_input } from '@/utils/keyboardVibration'

const account_store = storeGlobal()
const component_instance = getCurrentInstance()
const DEFAULT_VIDEO_URL = '/static/assets/video/video_4.mp4'
const DEFAULT_VIDEO_POSTER_URL = '/static/assets/video/video_4.png'
const page_transition = ref(null)
const post_id = ref('')
const is_report_visible = ref(false)
const report_target = ref(null)
const comment_delete_target = ref(null)
const is_delete_dialog_visible = ref(false)
const is_comment_deleting = ref(false)
const comment_draft = ref('')
const comment_scroll_target = ref('')
const is_comment_submitting = ref(false)
const return_to_videos = ref(false)
const resolved_video_url = ref('')
const resolved_video_poster = ref('')
const is_video_playing = ref(false)
const is_video_loading = ref(true)
const cached_post = ref(null)
const cached_comments = ref([])
const is_detail_loading = ref(true)
const video_id = `video-detail-${component_instance?.uid || Math.random().toString(36).slice(2, 8)}`
let is_unmounted = false
const comment_request_context = {}
let temporary_comment_sequence = 0
let current_video_object_url = ''
let current_video_poster_object_url = ''
let video_request_id = 0
let video_poster_request_id = 0
const post = computed(() => cached_post.value)
const comments = computed(() => cached_comments.value)
const current_user_id = computed(() => account_store.userId)
const is_owner = computed(() => post.value?.owner_user_id === current_user_id.value)
const can_open_author_profile = computed(() => Boolean(post.value?.owner_user_id && !is_owner.value))
const is_liked = ref(false)
const is_video_post = computed(() => post.value?.content_type === 'video')
const theme_style = { '--page-background': theme.colors.page.background, '--title-color': theme.colors.text.title, '--secondary-color': theme.colors.text.secondary, '--accent-color': theme.colors.button.primary, '--accent-text-color': theme.colors.button.text, '--surface-color': theme.colors.surface.card_soft, '--surface-strong': theme.colors.surface.card_strong, '--surface-border': theme.colors.surface.border_soft, '--danger-color': theme.colors.status.danger, '--icon-color': theme.colors.icon.primary, '--media-surface': theme.colors.surface.card, background: theme.colors.page.background, color: theme.colors.text.title }
const format_post_time = (date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date))
const normalize_comments = (items = []) => map_legacy_video_comments(items, post_id.value)
const load_detail = async () => {
  if (!post_id.value) return
  is_detail_loading.value = true
  const result = await selectDynamicInfo({ dynamicId: post_id.value })
  if (is_unmounted) return
  if (!result?.success || !result.data || typeof result.data !== 'object') {
    cached_post.value = null
    cached_comments.value = []
    is_detail_loading.value = false
    return
  }
  const mapped = map_user_dynamic_post(result.data)
  cached_post.value = merge_legacy_video_detail(mapped, result.data)
  cached_comments.value = normalize_comments(result.data.commentVoList)
  is_liked.value = Number(result.data.storeFlag) === 1
  is_detail_loading.value = false
}
const go_to_edit = () => page_transition.value?.navigate_forward({
  url: `/pages/videos/create?post_id=${encodeURIComponent(post.value.post_id)}`
})
const open_author_profile = () => {
  if (!can_open_author_profile.value) return
  page_transition.value?.navigate_forward({
    url: `/pages/profile/user?user_id=${encodeURIComponent(post.value.owner_user_id)}`
  })
}
const get_video_element = () => {
  if (typeof document === 'undefined') return null
  const video_root = document.getElementById(video_id)
  if (!video_root) return null
  return video_root.tagName === 'VIDEO' ? video_root : video_root.querySelector('video')
}
const ensure_video_audio = (event) => {
  const event_target = event?.target
  const video_element = event_target?.tagName === 'VIDEO'
    ? event_target
    : event_target?.querySelector?.('video') || get_video_element()
  if (!video_element) return
  video_element.defaultMuted = false
  video_element.muted = false
  video_element.volume = 1
}
const handle_video_play = (event) => {
  ensure_video_audio(event)
  is_video_playing.value = true
}
const handle_video_ready = () => { is_video_loading.value = false }
const handle_video_waiting = () => { is_video_loading.value = true }
const handle_video_error = () => { is_video_loading.value = false }
const handle_video_pause = () => { is_video_playing.value = false }
const pause_video = () => {
  const video_element = get_video_element()
  if (video_element) video_element.pause()
  else if (typeof uni !== 'undefined' && typeof uni.createVideoContext === 'function') uni.createVideoContext(video_id, component_instance)?.pause?.()
  is_video_playing.value = false
}
const play_video = async () => {
  if (!resolved_video_url.value || is_video_playing.value) return
  is_video_playing.value = true
  await nextTick()
  const video_element = get_video_element()
  ensure_video_audio({ target: video_element })
  try {
    if (video_element?.play) await video_element.play()
    else if (typeof uni !== 'undefined' && typeof uni.createVideoContext === 'function') uni.createVideoContext(video_id, component_instance)?.play?.()
  } catch {
    is_video_playing.value = false
  }
}
const toggle_video_playback = () => {
  if (is_video_playing.value) pause_video()
  else void play_video()
}
const get_video_poster_source = () => {
  if (!is_video_post.value) return ''
  const cover_url = post.value?.cover_url || ''
  const uses_legacy_default_cover = post.value?.media_url === DEFAULT_VIDEO_URL
    && cover_url === '/static/background.png'
  return uses_legacy_default_cover ? DEFAULT_VIDEO_POSTER_URL : cover_url || DEFAULT_VIDEO_POSTER_URL
}
const refresh_video_source = async () => {
  const request_id = ++video_request_id
  pause_video()
  revoke_post_media_url(current_video_object_url)
  current_video_object_url = ''
  resolved_video_url.value = ''
  is_video_loading.value = Boolean(is_video_post.value)
  let source = ''
  try {
    source = await resolve_post_media_url(is_video_post.value ? post.value?.media_url || DEFAULT_VIDEO_URL : '')
  } catch {
    source = ''
  }
  if (request_id !== video_request_id) {
    revoke_post_media_url(source)
    return
  }
  current_video_object_url = source
  resolved_video_url.value = source
  if (!source && is_video_post.value) is_video_loading.value = false
}
const refresh_video_poster = async () => {
  const request_id = ++video_poster_request_id
  revoke_post_media_url(current_video_poster_object_url)
  current_video_poster_object_url = ''
  resolved_video_poster.value = ''
  const source = await resolve_post_media_url(get_video_poster_source())
  if (request_id !== video_poster_request_id) {
    revoke_post_media_url(source)
    return
  }
  current_video_poster_object_url = source
  resolved_video_poster.value = source
}
// feedback_mode: control_pending — optimistic state with rollback.
const like_request_contexts = new Map()
const toggle_like = async (target = null) => {
  target = post.value
  const id = target?.post_id
  if (is_unmounted || !id || !current_user_id.value || like_request_contexts.has(id)) return
  const previous_liked = is_liked.value
  const previous_count = Number(target.like_count || 0)
  const context = {}
  like_request_contexts.set(id, context)
  is_liked.value = !previous_liked
  cached_post.value = { ...target, like_count: Math.max(0, previous_count + (previous_liked ? -1 : 1)) }
  try {
    const result = await updateDynamicStore({ dynamicId: id }, context)
    if (!result?.success) {
      is_liked.value = previous_liked
      cached_post.value = { ...cached_post.value, like_count: previous_count }
      if (!is_unmounted && result?.error !== 'Request cancelled.') uni.showToast({ title: t(result?.error || 'Unable to update this post.'), icon: 'none' })
    }
  } catch (error) {
    is_liked.value = previous_liked
    cached_post.value = { ...cached_post.value, like_count: previous_count }
    if (!is_unmounted) uni.showToast({ title: t(error?.message || 'Unable to update this post.'), icon: 'none' })
  } finally {
    like_request_contexts.delete(id)
  }
}

const open_post_report = () => {
  report_target.value = { user_id: post.value.owner_user_id, user_name: post.value.author_name, comment_id: '' };
  is_report_visible.value = true
}
const open_comment_report = (comment) => {
  if (!comment || comment.user_id === current_user_id.value || is_comment_deleting.value) return
  report_target.value = { user_id: comment.user_id, user_name: comment.user_name, comment_id: comment.comment_id }
  is_report_visible.value = true
}
const request_comment_delete = (comment) => {
  if (!comment || comment.is_temporary || comment.user_id !== current_user_id.value || is_comment_deleting.value) return
  comment_delete_target.value = comment
  is_delete_dialog_visible.value = true
}
const close_comment_delete = () => {
  if (is_comment_deleting.value) return
  is_delete_dialog_visible.value = false
  comment_delete_target.value = null
}
const confirm_comment_delete = async () => {
  const comment_id = comment_delete_target.value?.comment_id
  if (!comment_id || is_comment_deleting.value) return
  is_delete_dialog_visible.value = false
  is_comment_deleting.value = true
  try {
    const result = await deleteComment({ commentId: comment_id })
    if (!result?.success) {
      uni.showToast({ title: t(result?.error || 'Unable to delete comment.'), icon: 'none' })
      return
    }
    cached_comments.value = cached_comments.value.filter((item) => item.comment_id !== `${comment_id}`)
    cached_post.value = { ...cached_post.value, comment_count: Math.max(0, Number(cached_post.value.comment_count || 0) - 1) }
    comment_delete_target.value = null
    is_comment_deleting.value = false
  } finally {
    is_comment_deleting.value = false
  }
}
const handle_report_submitted = ({ blocked }) => {
  if (blocked && !post.value) page_transition.value?.navigate_relaunch({ url: '/pages/videos/index' })
}
// feedback_mode: control_pending — normal reply row before network completion.
const submit_comment = async () => {
  const content = comment_draft.value.trim()
  if (!content || is_unmounted || is_comment_submitting.value || !post.value || !current_user_id.value) return
  is_comment_submitting.value = true
  const id = post_id.value
  const temporary_id = `pending-comment-${Date.now()}-${++temporary_comment_sequence}`
  const user = account_store.userInfo || {}
  const optimistic_comment = {
    comment_id: temporary_id,
    is_temporary: true,
    post_id: id,
    user_id: current_user_id.value,
    user_name: user.userName || 'You',
    user_avatar_url: user.userImgUrl || '',
    content,
    created_at: new Date().toISOString()
  }
  cached_comments.value = [...cached_comments.value, optimistic_comment]
  cached_post.value = { ...cached_post.value, comment_count: Number(cached_post.value.comment_count || 0) + 1 }
  comment_draft.value = ''
  comment_scroll_target.value = ''
  void nextTick(() => {
    if (!is_unmounted) comment_scroll_target.value = 'latest-comments'
  })
  const rollback = () => {
    cached_comments.value = cached_comments.value.filter((item) => item.comment_id !== temporary_id)
    cached_post.value = { ...cached_post.value, comment_count: Math.max(0, Number(cached_post.value.comment_count || 0) - 1) }
    if (!is_unmounted && !comment_draft.value) comment_draft.value = content
  }
  try {
    const result = await commentDynamic({ dynamicId: id, replyContent: content }, comment_request_context)
    if (!result?.success) {
      rollback()
      if (!is_unmounted && result?.error !== 'Request cancelled.') uni.showToast({ title: t(result?.error || 'Unable to send comment.'), icon: 'none' })
      return
    }
    cached_comments.value = cached_comments.value.map((item) => item.comment_id === temporary_id
      ? { ...item, comment_id: String(result.data?.commentId ?? temporary_id), is_temporary: result.data?.commentId == null }
      : item)
  } catch (error) {
    rollback()
    if (!is_unmounted) uni.showToast({ title: t(error?.message || 'Unable to send comment.'), icon: 'none' })
  } finally {
    if (!is_unmounted) is_comment_submitting.value = false
  }
}
onLoad((query) => {
  post_id.value = query?.post_id || ''
  return_to_videos.value = query?.return_to_videos === 'videos_index'
  void load_detail()
})
watch(() => is_video_post.value ? post.value?.media_url || DEFAULT_VIDEO_URL : '', refresh_video_source, { immediate: true })
watch(get_video_poster_source, refresh_video_poster, { immediate: true })
onHide(pause_video)
onBeforeUnmount(() => {
  is_unmounted = true
  like_request_contexts.forEach((context) => context.cancel?.())
  comment_request_context.cancel?.()
  video_request_id += 1
  video_poster_request_id += 1
  pause_video()
  revoke_post_media_url(current_video_object_url)
  revoke_post_media_url(current_video_poster_object_url)
})
</script>

<style scoped lang="scss">
.content {
  padding: 28rpx 40rpx 72rpx;
}

.content--photo {
  padding-top: 0;
}

.author--fixed {
  padding: 28rpx 40rpx 0;
  flex: none;
}

.video-detail-author {
  display: flex;
  min-width: 0;
  align-items: center;
}

.video-detail-header__report,
.video-detail-header__edit {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.video-detail-header__avatar {
  width: 72rpx;
  height: 72rpx;
  margin-right: 18rpx;
  overflow: hidden;
  flex: none;
  border-radius: 50%;
}

.avatar-link__image {
  width: 100%;
  height: 100%;
}

.video-detail-header__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.video-detail-header__name {
  overflow: hidden;
  color: var(--title-color);
  font-size: 28rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-detail-header__time {
  margin-top: 7rpx;
  color: var(--secondary-color);
  font-size: 20rpx;
}

.video-detail-header__report {
  width: 72rpx;
  height: 72rpx;
}

.video-detail-header__report-icon {
  width: 38rpx;
  height: 38rpx;
}

.video-detail-header__edit {
  min-width: 72rpx;
  height: 62rpx;
  padding: 0 22rpx;
  border-radius: 18rpx;
  background: var(--accent-color);
  color: var(--accent-text-color);
  font-size: 22rpx;
  font-weight: 800;
  line-height: 62rpx;
  text-align: center;
}

.author,
.actions,
.comment-composer {
  display: flex;
  align-items: center;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  margin-right: 18rpx;
  overflow: hidden;
  border-radius: 24rpx;
}

.author-name {
  display: block;
  font-size: 29rpx;
  font-weight: 800;
}

.meta {
  display: block;
  margin-top: 7rpx;
  color: var(--secondary-color);
  font-size: 20rpx;
}

.edit-button,
.report-button {
  display: flex;
  min-width: 72rpx;
  height: 62rpx;
  margin-left: auto;
  align-items: center;
  justify-content: center;
  padding: 0 22rpx;
  border-radius: 18rpx;
  background: var(--accent-color);
  color: var(--accent-text-color);
  font-size: 22rpx;
  font-weight: 800;
}

.edit-button {
  line-height: 62rpx;
  text-align: center;
}

.report-button > * {
  width: 32rpx;
  height: 32rpx;
}

.post-media {
  display: block;
  height: 620rpx;
  margin-top: 34rpx;
  border-radius: 30rpx;
}

.post-video {
  position: relative;
  width: 100%;
  height: 620rpx;
  overflow: hidden;
  border-radius: 24rpx;
  background: var(--media-surface);
}

.post-video__asset {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--media-surface);
  object-fit: cover;
}

.post-video__asset :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-video__loading {
  position: absolute;
  z-index: 2;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--media-surface);
}

.post-video__spinner {
  width: 48rpx;
  height: 48rpx;
  border: 5rpx solid var(--surface-border);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: videos-video-loading-spin .72s linear infinite;
}

@keyframes videos-video-loading-spin {
  to { transform: rotate(360deg); }
}

.post-copy {
  display: block;
  margin-top: 30rpx;
  font-size: 32rpx;
  line-height: 1.5;
}

.actions {
  gap: 28rpx;
  margin-top: 30rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--surface-border);
  color: var(--secondary-color);
}

.action {
  display: flex;
  gap: 8rpx;
  align-items: center;
  font-size: 23rpx;
}

.action > *:first-child {
  width: 30rpx;
  height: 30rpx;
}

.action--active {
  color: var(--accent-color);
}

.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 48rpx;
  flex-direction: column;
  text-align: center;
}

.not-found__title {
  font-size: 36rpx;
  font-weight: 900;
}

.not-found__copy {
  margin-top: 16rpx;
  color: var(--secondary-color);
  font-size: 24rpx;
}

.comment-composer {
  min-height: 104rpx;
  padding: 14rpx 28rpx;
  border-top: 1rpx solid var(--surface-border);
  background: var(--page-background);
  flex: none;
}

.comment-input {
  height: 76rpx;
  min-width: 0;
  padding: 0 24rpx;
  border-radius: 24rpx;
  background: var(--surface-strong);
  color: var(--title-color);
  flex: 1;
  font-size: 25rpx;
}

.comment-placeholder {
  color: var(--secondary-color);
}

.send-comment {
  display: flex;
  width: 70rpx;
  height: 70rpx;
  margin-left: 14rpx;
  align-items: center;
  justify-content: center;
  border-radius: 22rpx;
  background: var(--accent-color);
  color: var(--accent-text-color);
}

.send-comment > * {
  width: 34rpx;
  height: 34rpx;
}

.send-comment--disabled {
  opacity: .5;
  pointer-events: none;
}
</style>

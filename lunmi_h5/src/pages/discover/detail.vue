<template>
  <PageTransition ref="page_transition" :style="theme_style">
    <TopSafeArea />
    <view class="page-content discover-detail-page">
      <SecondaryPageHeader title="" :return-url="detail_return_url">
        <view v-if="post" class="author-entry" role="button" :aria-label="$t(`Open ${post.userName} profile`)" @click="open_author">
          <UserAvatar class="author-avatar" :source="post.userImgUrl" />
          <text class="author-name">{{ post.userName }}</text>
        </view>
        <template v-if="post && !is_owner" #actions>
          <view
            class="follow-button"
            :class="{ 'follow-button--pending': is_follow_pending }"
            role="button"
            :aria-label="$t(follow_label)"
            :aria-disabled="is_follow_pending"
            @click="toggle_follow"
          >
            <text>{{ $t(follow_label) }}</text>
          </view>
        </template>
      </SecondaryPageHeader>
      <scroll-view ref="detail_scroll" class="content-scroll detail-scroll" scroll-y :scroll-into-view="scroll_target" :show-scrollbar="false" @scroll="handle_detail_scroll">
        <view v-if="is_detail_loading" class="content-scroll__inner detail-scroll__inner detail-loading" :aria-label="$t('Loading post details')">
          <view class="detail-loading__media skeleton-block" />
          <view class="detail-loading__copy skeleton-block" />
          <view class="detail-loading__comments-title skeleton-block" />
          <view v-for="item in 3" :key="`comment-skeleton-${item}`" class="detail-loading__comment">
            <view class="detail-loading__comment-avatar skeleton-block" />
            <view class="detail-loading__comment-body">
              <view class="detail-loading__comment-name skeleton-block" />
              <view class="detail-loading__comment-line skeleton-block" />
              <view class="detail-loading__comment-time skeleton-block" />
            </view>
          </view>
        </view>
        <view v-else-if="post" class="content-scroll__inner detail-scroll__inner">
          <view v-if="video_media" class="gallery-card">
            <PostMedia
              class="gallery-media"
              :media-url="video_media.media_url"
              content-type="video"
              :poster="video_media.poster_url"
              :media-id="video_media.media_id"
              playable
              controls
            />
          </view>
          <view v-else-if="image_media.length" class="gallery-card">
            <swiper class="gallery-swiper" :current="gallery_index" @change="change_gallery">
              <swiper-item v-for="media in image_media" :key="media.media_id">
                <PostMedia class="gallery-media" :media-url="media.media_url" content-type="image" />
              </swiper-item>
            </swiper>
            <view v-if="voice_clip" class="voice-overlay" :data-media-id="voice_clip.media_id" role="button" :aria-label="$t(is_voice_playing ? 'Pause voice post' : 'Play voice post')" @click="toggle_voice">
              <image
                class="voice-overlay__control"
                :src="is_voice_playing ? '/static/icon/linear.png' : '/static/icon/linear.png'"
                mode="aspectFit"
              />
              <view class="voice-wave voice-overlay__wave" aria-hidden="true">
                <view v-for="bar in voice_wave_bars" :key="`overlay-wave-${bar}`" class="voice-wave__bar"
                  :style="{ height: `${get_voice_wave_height(bar)}rpx` }" />
              </view>
              <text class="voice-overlay__duration">{{ $t(voice_duration_label) }}</text>
            </view>
            <view v-if="image_media.length > 1" class="gallery-dots" :aria-label="$t('Image position')">
              <view
                v-for="(media, index) in image_media"
                :key="`dot-${media.media_id}`"
                class="gallery-dot"
                :class="{ 'gallery-dot--active': index === gallery_index }"
              />
            </view>
          </view>
          <view v-else-if="voice_clip" class="voice-card" :data-media-id="voice_clip.media_id" role="button" :aria-label="$t(is_voice_playing ? 'Pause voice post' : 'Play voice post')" @click="toggle_voice">
            <text v-if="post_content" class="voice-card__copy">{{ post_content }}</text>
            <view class="voice-card__controls">
              <image
                class="voice-card__control"
                :src="is_voice_playing ? '/static/icon/linear.png' : '/static/icon/linear.png'"
                mode="aspectFit"
              />
              <view class="voice-wave voice-card__wave" aria-hidden="true">
                <view v-for="bar in voice_wave_bars" :key="`card-wave-${bar}`" class="voice-wave__bar"
                  :style="{ height: `${get_voice_wave_height(bar)}rpx` }" />
              </view>
              <text class="voice-card__duration">{{ $t(voice_duration_label) }}</text>
            </view>
          </view>
          <text v-if="post_content && image_media.length" class="post-copy">{{ post_content }}</text>
          <text v-else-if="post_content && !voice_clip" class="post-copy post-copy--first">{{ post_content }}</text>
          <text v-if="voice_error" class="voice-error" role="alert">{{ $t(voice_error) }}</text>
          <view id="comments-section" class="comments-section">
            <PostComments
              :title="$t('Comments')"
              :comments="comments"
              :current-user-id="current_user_id"
              @report="open_comment_report"
              @delete="request_comment_delete"
            />
          </view>
        </view>
        <view v-else class="content-scroll__inner not-found">
          <text class="not-found__title">{{ $t(detail_error || 'Post unavailable') }}</text>
          <text class="not-found__copy">{{ $t(detail_error ? 'Please try again later.' : 'This post may have been removed or hidden.') }}</text>
        </view>
      </scroll-view>
      <view v-if="post" class="comment-composer">
        <input
          v-model="comment_draft"
          class="comment-input"
          type="text"
          maxlength="300"
          confirm-type="send"
          :placeholder="$t('What do you want to say?')"
          :placeholder-style="placeholder_style"
          :focus="should_focus_comment"
          :disabled="is_comment_submitting"
          :aria-label="$t('Write a comment')"
          @input="vibrate_on_keyboard_input"
          @confirm="submit_comment"
        />
        <view
          class="send-comment"
          :class="{ 'send-comment--disabled': !comment_draft.trim() || is_comment_submitting }"
          role="button"
          :aria-label="$t('Send comment')"
          :aria-disabled="!comment_draft.trim() || is_comment_submitting"
          @click="submit_comment"
        >
          <view v-if="is_comment_submitting" class="send-comment__spinner" :aria-label="$t('Sending comment')" />
          <image v-else class="send-comment__icon" src="/static/icon/reply_comment.png" mode="aspectFit" />
        </view>
      </view>
      <text
        v-if="action_feedback"
        class="action-feedback"
        :class="`action-feedback--${feedback_tone}`"
        role="alert"
      >{{ $t(action_feedback) }}</text>
    </view>
    <BottomSafeArea />
    <CommentDeleteConfirmDialog
      :visible="is_delete_dialog_visible"
      @cancel="close_comment_delete"
      @confirm="confirm_comment_delete"
    />
    <CommentDeletingLoading v-if="is_comment_deleting" />
    <ReportUserSheet
      :visible="is_report_visible"
      :target-name="report_target?.user_name || ''"
      :target-user-id="report_target?.user_id ?? ''"
      :post-id="post?.dynamicId ? String(post.dynamicId) : ''"
      :comment-id="report_target?.comment_id || ''"
      @update:visible="is_report_visible = $event"
      @submitted="handle_report_submitted"
    />
  </PageTransition>
</template>

<script setup>
import { map_legacy_discover_comments, read_legacy_comment_id, read_legacy_post_id } from '@/utils/legacyPagePresentation'
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { onHide, onLoad } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import CommentDeleteConfirmDialog from '@/components/CommentDeleteConfirmDialog.vue'
import CommentDeletingLoading from '@/components/CommentDeletingLoading.vue'
import PageTransition from '@/components/PageTransition.vue'
import PostComments from '@/components/PostComments.vue'
import PostMedia from '@/components/PostMedia.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import SecondaryPageHeader from '@/components/SecondaryPageHeader.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import { vibrate_on_keyboard_input } from '@/utils/keyboardVibration'
import { resolve_post_media_url, revoke_post_media_url } from '@/utils/postMediaStorage'
import { selectDynamicInfo, commentDynamic, deleteComment } from '@/api/dynamic'
import { updateUserRelation } from '@/api/common'
import { activate_media, clear_media, find_media_element, stop_active_media, stop_active_media_if_hidden } from '@/utils/mediaPlayback'

const account_store = storeGlobal()
const page_transition = ref(null)
const post_id = ref('')
const detail_return_url = ref('')
const gallery_index = ref(0)
const comment_draft = ref('')
const should_focus_comment = ref(false)
const is_comment_submitting = ref(false)
const is_follow_pending = ref(false)
const is_report_visible = ref(false)
const report_target = ref(null)
const comment_delete_target = ref(null)
const is_delete_dialog_visible = ref(false)
const is_comment_deleting = ref(false)
const action_feedback = ref('')
const feedback_tone = ref('error')
const cached_post = ref(null)
const cached_comments = ref([])
const is_detail_loading = ref(true)
const detail_error = ref('')
const voice_error = ref('')
const is_voice_playing = ref(false)
const voice_remaining_seconds = ref(0)
const voice_wave_phase = ref(0)
const voice_wave_bars = Object.freeze(Array.from({ length: 16 }, (_, index) => index + 1))
const scroll_target = ref('')
const detail_scroll = ref(null)
const comment_request_context = {}
const delete_request_context = {}
const detail_request_context = {}
const follow_request_context = {}
let is_unmounted = false
let temporary_comment_sequence = 0
let feedback_timer = null
let voice_context = null
let voice_source = ''
let voice_request_id = 0
let voice_wave_timer = null
let voice_countdown_timer = null

const post = computed(() => cached_post.value)
const post_content = computed(() => post.value?.dynamicContent || post.value?.dynamicTitle || '')
const comments = computed(() => cached_comments.value)
const current_user_id = computed(() => account_store.userId)
const is_owner = computed(() => `${post.value?.userId || ''}` === `${current_user_id.value || ''}`)
const get_dynamic_image_urls = (dynamic) => (
  Array.isArray(dynamic?.dynamicImgList)
    ? dynamic.dynamicImgList.filter(Boolean)
    : []
)
const is_voice_source = (media_url) => (
  /\.(aac|flac|m4a|mp3|ogg|wav|webm)(?:[?#].*)?$/i.test(media_url)
  || /(?:^|[/_-])(audio|voice)(?:[/_.-]|$)/i.test(media_url)
)
const is_voice_dynamic = (dynamic) => {
  const media_url = `${dynamic?.videoImgUrl || ''}`.trim()
  const has_images = get_dynamic_image_urls(dynamic).length > 0
  const has_duration = Number(dynamic?.fileTimes || 0) > 0
  const is_other_dynamic = Number(dynamic?.dynamicType) === 2
  const is_video_dynamic = Number(dynamic?.dynamicType) === 3
  return Boolean(media_url)
    && !has_images
    && !is_video_dynamic
    && (is_other_dynamic || (has_duration || is_voice_source(media_url)))
}
const video_media = computed(() => {
  if (!post.value || is_voice_dynamic(post.value) || Number(post.value.dynamicType) !== 3) return null
  const video_url = get_dynamic_image_urls(post.value)[0]
  if (!video_url) return null
  return {
    media_id: `${post.value.dynamicId}-video`,
    media_url: video_url,
    poster_url: post.value.videoImgUrl || ''
  }
})
const image_media = computed(() => {
  if (!post.value || is_voice_dynamic(post.value) || video_media.value) return []
  const media_urls = get_dynamic_image_urls(post.value)
  return media_urls.map((media_url, index) => ({
    media_id: `${post.value.dynamicId}-media-${index}`,
    media_url
  }))
})
const voice_clip = computed(() => {
  if (!is_voice_dynamic(post.value)) return null
  return {
    media_id: `${post.value.dynamicId}-audio`,
    media: {
      media_url: post.value.videoImgUrl,
      duration_seconds: Number(post.value.fileTimes || 0)
    }
  }
})
const is_following = computed(() => Number(post.value?.attentionFlag) === 1)
const normalize_cached_comments = (items = []) => map_legacy_discover_comments(items, post_id.value)
const read_cached_post = () => cached_post.value
const load_dynamic_info = async (dynamic_id) => {
  is_detail_loading.value = true
  detail_error.value = ''
  const result = await selectDynamicInfo({ dynamicId: dynamic_id }, detail_request_context)
  if (is_unmounted || post_id.value !== String(dynamic_id)) return
  if (!result?.success) {
    cached_post.value = null
    cached_comments.value = []
    detail_error.value = result?.error || 'Unable to load this post.'
    is_detail_loading.value = false
    return
  }
  const dynamic_data = result.data && typeof result.data === 'object' && !Array.isArray(result.data)
    ? result.data
    : null
  if (!dynamic_data) {
    cached_post.value = null
    cached_comments.value = []
    detail_error.value = 'Unable to load this post.'
    is_detail_loading.value = false
    return
  }
  cached_post.value = dynamic_data
  cached_comments.value = normalize_cached_comments(dynamic_data.commentVoList || [])
  is_detail_loading.value = false
}
const follow_label = computed(() => {
  if (is_follow_pending.value) return 'Saving'
  return is_following.value ? 'Following' : 'Follow'
})
const voice_duration_label = computed(() => voice_error.value
  ? 'Unavailable'
  : `${Math.ceil(voice_remaining_seconds.value > 0
    ? voice_remaining_seconds.value
    : Number(voice_clip.value?.media?.duration_seconds || 0))}s`)
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--surface-color': theme.colors.surface.card,
  '--surface-strong': theme.colors.surface.card_strong,
  '--surface-soft': theme.colors.surface.card_soft,
  '--surface-border': theme.colors.surface.border,
  '--surface-shadow': theme.colors.surface.shadow,
  '--title-color': theme.colors.text.title,
  '--secondary-color': theme.colors.text.secondary,
  '--tertiary-color': theme.colors.text.tertiary,
  '--accent-color': theme.colors.button.primary,
  '--danger-color': theme.colors.status.danger,
  '--success-color': theme.colors.status.success,
  '--scrim-color': theme.colors.surface.scrim
}
const placeholder_style = `color:${theme.colors.text.secondary};font-size:27rpx;`

const show_feedback = (message, tone = 'error') => {
  action_feedback.value = message
  feedback_tone.value = tone
  clearTimeout(feedback_timer)
  feedback_timer = setTimeout(() => { action_feedback.value = '' }, 2200)
}

const open_author = () => {
  if (!post.value) return
  if (is_owner.value) {
    page_transition.value?.navigate_replace({ url: '/pages/profile/index' })
    return
  }
  page_transition.value?.navigate_forward({
    url: `/pages/profile/user?user_id=${encodeURIComponent(post.value.userId)}`
  })
}

const toggle_follow = async () => {
  if (!post.value || is_owner.value || is_follow_pending.value) return
  is_follow_pending.value = true
  const was_following = is_following.value
  try {
    const result = await updateUserRelation({
      beHandleUserId: post.value.userId,
      hanldeType: 1
    }, follow_request_context)
    if (!result?.success) {
      show_feedback(result?.error || 'Unable to update this relationship.')
      return
    }
    cached_post.value = { ...read_cached_post(), attentionFlag: was_following ? 0 : 1 }
  } catch (error) {
    show_feedback(error?.message || 'Unable to update this relationship.')
  } finally {
    is_follow_pending.value = false
  }
}

const change_gallery = (event) => {
  gallery_index.value = Math.max(0, Number(event?.detail?.current || 0))
}

const release_voice = () => {
  clear_media(voice_clip.value?.media_id)
  voice_request_id += 1
  voice_context?.stop?.()
  voice_context?.destroy?.()
  voice_context = null
  is_voice_playing.value = false
  voice_remaining_seconds.value = 0
  clearInterval(voice_wave_timer)
  voice_wave_timer = null
  stop_voice_countdown()
  revoke_post_media_url(voice_source)
  voice_source = ''
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
const get_voice_wave_height = (bar) => {
  const level = is_voice_playing.value ? Math.abs(Math.sin((bar * 0.72) + voice_wave_phase.value)) : ((bar * 9) % 30) / 30
  return Math.round(18 + level * 30)
}

const toggle_voice = async () => {
  const media_url = voice_clip.value?.media?.media_url || ''
  if (!media_url) {
    voice_error.value = 'This recording is unavailable.'
    return
  }
  if (is_voice_playing.value) {
    voice_context?.pause?.()
    clear_media(voice_clip.value?.media_id)
    is_voice_playing.value = false
    stop_voice_wave()
    return
  }
  if (voice_context && voice_source) {
    activate_media({
      id: voice_clip.value.media_id,
      pause: release_voice,
      get_element: () => find_media_element(voice_clip.value.media_id)
    })
    voice_context.play?.()
    is_voice_playing.value = true
    start_voice_wave()
    return
  }
  release_voice()
  const request_id = voice_request_id
  voice_error.value = ''
  const media_id = voice_clip.value.media_id
  activate_media({
    id: media_id,
    pause: release_voice,
    get_element: () => find_media_element(media_id)
  })
  try {
    const source = await resolve_post_media_url(media_url)
    if (request_id !== voice_request_id) {
      revoke_post_media_url(source)
      return
    }
    voice_source = source
    voice_context = uni.createInnerAudioContext()
    voice_context.src = source
    voice_context.onEnded(() => {
      voice_remaining_seconds.value = 0
      release_voice()
    })
    voice_context.onPlay(() => {
      is_voice_playing.value = true
      start_voice_wave()
      start_voice_countdown()
    })
    voice_context.onPause(() => {
      is_voice_playing.value = false
      stop_voice_wave()
      stop_voice_countdown()
    })
    voice_context.onError(() => {
      release_voice()
      voice_error.value = 'This recording is unavailable.'
    })
    voice_remaining_seconds.value = Number(voice_clip.value?.media?.duration_seconds || 0)
    voice_context.play()
  } catch {
    release_voice()
    voice_error.value = 'This recording is unavailable.'
  }
}

const get_detail_scroll_element = () => detail_scroll.value?.$el || detail_scroll.value
const handle_detail_scroll = () => stop_active_media_if_hidden(get_detail_scroll_element())

// feedback_mode: control_pending — show the submitted content before the API resolves.
const submit_comment = async () => {
  const content = comment_draft.value.trim()
  if (!content || is_unmounted || is_comment_submitting.value || !post.value || !current_user_id.value) return
  const dynamic_id = post.value.dynamicId
  if (dynamic_id == null) return
  is_comment_submitting.value = true
  const temporary_id = `pending-comment-${++temporary_comment_sequence}`
  const user = account_store.userInfo || {}
  const optimistic_comment = {
    commentId: temporary_id,
    is_temporary: true,
    replyUserId: current_user_id.value,
    replyUserName: user.userName || 'You',
    replyUserImgUrl: user.userImgUrl || '',
    replyContent: content,
    createDate: new Date().toISOString()
  }
  const update_comments = (list, delta = 0) => {
    cached_post.value = {
      ...cached_post.value,
      commentVoList: list,
      commentNum: Math.max(0, Number(cached_post.value.commentNum ?? cached_comments.value.length) + delta)
    }
    cached_comments.value = normalize_cached_comments(list)
  }
  update_comments([...(post.value.commentVoList || []), optimistic_comment], 1)
  comment_draft.value = ''
  scroll_target.value = ''
  void nextTick(() => {
    if (!is_unmounted) scroll_target.value = 'comments-section'
  })
  const rollback = () => {
    update_comments((post.value.commentVoList || []).filter((item) => item.commentId !== temporary_id), -1)
    if (!comment_draft.value) comment_draft.value = content
  }
  try {
    const result = await commentDynamic({ dynamicId: dynamic_id, replyContent: content }, comment_request_context)
    if (is_unmounted) return
    if (!result?.success) {
      rollback()
      if (result?.error !== 'Request cancelled.') show_feedback(result?.error || 'Unable to send comment.')
      return
    }
    const server_comment = result.data && typeof result.data === 'object' && !Array.isArray(result.data) ? result.data : {}
    update_comments((post.value.commentVoList || []).map((item) => item.commentId === temporary_id
      ? { ...item, ...server_comment, commentId: server_comment.commentId ?? temporary_id, is_temporary: server_comment.commentId == null }
      : item))
    // Without a server ID, the row remains visible but cannot be sent to delete/report APIs.
  } catch (error) {
    if (!is_unmounted) {
      rollback()
      show_feedback(error?.message || 'Unable to send comment.')
    }
  } finally {
    if (!is_unmounted) is_comment_submitting.value = false
  }
}

const open_comment_report = (comment) => {
  if (!comment || comment.user_id === current_user_id.value) return
  report_target.value = {
    user_id: comment.user_id,
    user_name: comment.user_name,
    comment_id: comment.comment_id
  }
  is_report_visible.value = true
}

const handle_report_submitted = ({ blocked = false } = {}) => {
  if (blocked && report_target.value?.user_id) {
    cached_post.value = null
    cached_comments.value = []
    cached_comments.value = cached_comments.value.filter((comment) => (
      `${comment.user_id}` !== `${report_target.value.user_id}`
    ))
  }
  show_feedback(blocked ? 'Report sent and user blocked.' : 'Report sent.', 'success')
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
  if (comment_id === undefined || comment_id === null || is_comment_deleting.value) return
  is_delete_dialog_visible.value = false
  is_comment_deleting.value = true
  try {
    const result = await deleteComment({ commentId: comment_id }, delete_request_context)
    if (!result?.success) {
      show_feedback(result?.error || 'Unable to delete comment.')
      return
    }
    const latest_post = read_cached_post() || post.value
    const previous_comment_list = Array.isArray(latest_post?.commentVoList)
      ? latest_post.commentVoList
      : []
    const next_comment_list = previous_comment_list.filter((comment, index) => read_legacy_comment_id(comment, post_id.value, index) !== String(comment_id))
    const has_removed_comment = next_comment_list.length < previous_comment_list.length
    cached_post.value = {
      ...latest_post,
      commentVoList: next_comment_list,
      commentNum: has_removed_comment
        ? Math.max(0, Number(latest_post?.commentNum || cached_comments.value.length) - 1)
        : Number(latest_post?.commentNum || cached_comments.value.length)
    }
    cached_comments.value = normalize_cached_comments(next_comment_list)
  } catch (error) {
    show_feedback(error?.message || 'Unable to delete comment.')
  } finally {
    is_comment_deleting.value = false
    comment_delete_target.value = null
  }
}

onLoad((query = {}) => {
  post_id.value = read_legacy_post_id(query)
  cached_post.value = null
  cached_comments.value = []
  const pages = getCurrentPages()
  const source_route = pages[pages.length - 2]?.route
  const return_target = query.return_to === 'discover'
    ? { route: 'pages/discover/index', url: '/pages/discover/index' }
    : query.return_to === 'videos'
      ? { route: 'pages/videos/index', url: '/pages/videos/index' }
      : null
  detail_return_url.value = return_target && source_route !== return_target.route
    ? return_target.url
    : ''
  should_focus_comment.value = query.focus === 'comments'
  if (should_focus_comment.value) scroll_target.value = 'comments-section'
  if (!post_id.value) {
    detail_error.value = 'Invalid post.'
    is_detail_loading.value = false
    return
  }
  void load_dynamic_info(post_id.value)
})

onHide(() => {
  release_voice()
  stop_active_media()
})
onBeforeUnmount(() => {
  is_unmounted = true
  clearTimeout(feedback_timer)
  clearInterval(voice_wave_timer)
  detail_request_context.cancel?.()
  follow_request_context.cancel?.()
  comment_request_context.cancel?.()
  delete_request_context.cancel?.()
  release_voice()
})
</script>

<style scoped lang="scss">
.discover-detail-page {
  position: relative;
  background: transparent;
}

.author-entry {
  display: flex;
  min-width: 0;
  align-items: center;
}

.author-avatar {
  width: 72rpx;
  height: 72rpx;
  margin-right: 16rpx;
  border-radius: 50%;
  flex: 0 0 72rpx;
}

.author-name {
  overflow: hidden;
  color: var(--title-color);
  font-size: 30rpx;
  font-weight: 800;
  line-height: 40rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.follow-button {
  display: flex;
  box-sizing: border-box;
  min-width: 168rpx;
  height: 58rpx;
  padding: 0 22rpx;
  align-items: center;
  justify-content: center;
  border-radius: 30rpx;
  background: var(--accent-color);
  color: var(--title-color);
  font-size: 27rpx;
  font-weight: 700;
}

.follow-button--pending {
  opacity: 0.48;
}

.detail-scroll {
  background: transparent;
}

.detail-scroll__inner {
  box-sizing: border-box;
  min-height: 100%;
  padding: 12rpx 30rpx 50rpx;
}

.detail-loading {
  display: block;
}

.skeleton-block {
  position: relative;
  overflow: hidden;
  background: var(--surface-soft);
}

.skeleton-block::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(90deg, transparent, var(--surface-border), transparent);
  content: '';
  animation: detail-skeleton-shimmer 1.1s linear infinite;
}

.detail-loading__media {
  width: 100%;
  height: 520rpx;
  border-radius: 34rpx;
}

.detail-loading__copy {
  width: 88%;
  height: 34rpx;
  margin-top: 30rpx;
  border-radius: 17rpx;
}

.detail-loading__comments-title {
  width: 180rpx;
  height: 38rpx;
  margin-top: 48rpx;
  border-radius: 19rpx;
}

.detail-loading__comment {
  display: flex;
  margin-top: 18rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: var(--surface-soft);
}

.detail-loading__comment-avatar {
  width: 58rpx;
  height: 58rpx;
  border-radius: 20rpx;
  flex: none;
}

.detail-loading__comment-body {
  min-width: 0;
  margin-left: 18rpx;
  flex: 1;
}

.detail-loading__comment-name {
  width: 32%;
  height: 26rpx;
  border-radius: 13rpx;
}

.detail-loading__comment-line {
  width: 84%;
  height: 24rpx;
  margin-top: 14rpx;
  border-radius: 12rpx;
}

.detail-loading__comment-time {
  width: 24%;
  height: 20rpx;
  margin-top: 12rpx;
  border-radius: 10rpx;
}

@keyframes detail-skeleton-shimmer {
  to {
    transform: translateX(100%);
  }
}

.gallery-card {
  position: relative;
  height: 520rpx;
  overflow: hidden;
  border-radius: 34rpx;
  background: var(--surface-color);
  box-shadow: 0 10rpx 32rpx var(--surface-shadow);
}

.gallery-swiper,
.gallery-media {
  width: 100%;
  height: 100%;
}

.voice-overlay {
  position: absolute;
  top: 18rpx;
  left: 18rpx;
  display: flex;
  box-sizing: border-box;
  min-width: 292rpx;
  height: 58rpx;
  padding: 0 18rpx;
  align-items: center;
  border-radius: 30rpx;
  background: var(--accent-color);
}

.voice-overlay__control {
  width: 30rpx;
  height: 34rpx;
}

.voice-overlay__wave {
  display: flex;
  width: 142rpx;
  height: 34rpx;
  margin-left: 12rpx;
  align-items: center;
  gap: 4rpx;
  flex: 1;
}

.voice-overlay__duration {
  margin-left: 10rpx;
  color: var(--title-color);
  font-size: 23rpx;
  font-weight: 700;
}

.gallery-dots {
  position: absolute;
  right: 0;
  bottom: 18rpx;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.gallery-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: var(--surface-border);
}

.gallery-dot--active {
  width: 26rpx;
  border-radius: 8rpx;
  background: var(--surface-color);
}

.voice-card {
  box-sizing: border-box;
  min-height: 168rpx;
  padding: 24rpx 26rpx 28rpx;
  border: 2rpx solid var(--title-color);
  border-radius: 18rpx;
  background: var(--surface-color);
  box-shadow: 0 10rpx 0 var(--title-color);
}

.voice-card__copy {
  display: block;
  color: var(--title-color);
  font-size: 28rpx;
  line-height: 40rpx;
}

.voice-card__controls {
  display: flex;
  margin-top: 22rpx;
  align-items: center;
}

.voice-card__control {
  width: 34rpx;
  height: 38rpx;
}

.voice-card__wave {
  display: flex;
  width: 110rpx;
  height: 40rpx;
  margin-left: 30rpx;
  align-items: center;
  gap: 4rpx;
}

.voice-wave__bar {
  width: 4rpx;
  min-height: 10rpx;
  border-radius: 4rpx;
  background: var(--title-color);
}

.voice-card__duration {
  margin-left: 28rpx;
  color: var(--title-color);
  font-size: 30rpx;
  font-weight: 700;
}

.post-copy {
  display: block;
  margin-top: 26rpx;
  color: var(--title-color);
  font-size: 29rpx;
  line-height: 42rpx;
}

.post-copy--first {
  margin-top: 0;
}

.voice-error {
  display: block;
  margin-top: 16rpx;
  color: var(--danger-color);
  font-size: 23rpx;
  line-height: 34rpx;
}

.comments-section {
  margin-top: 12rpx;
}

.not-found {
  display: flex;
  padding: 100rpx 48rpx;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.not-found__title {
  color: var(--title-color);
  font-size: 36rpx;
  font-weight: 900;
}

.not-found__copy {
  margin-top: 16rpx;
  color: var(--secondary-color);
  font-size: 24rpx;
  line-height: 36rpx;
}

.comment-composer {
  display: flex;
  box-sizing: border-box;
  min-height: 104rpx;
  padding: 14rpx 30rpx;
  align-items: center;
  border-top: 1rpx solid var(--surface-border);
  background: var(--surface-strong);
  flex: 0 0 auto;
}

.comment-input {
  min-width: 0;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 36rpx;
  background-color: var(--surface-soft);
  color: var(--title-color);
  flex: 1;
  font-size: 27rpx;
}

.send-comment {
  display: flex;
  width: 72rpx;
  height: 72rpx;
  margin-left: 16rpx;
  align-items: center;
  justify-content: center;
  flex: 0 0 72rpx;
}

.send-comment--disabled {
  opacity: 0.45;
}

.send-comment__icon {
  width: 72rpx;
  height: 72rpx;
}

.send-comment__spinner {
  width: 34rpx;
  height: 34rpx;
  border: 4rpx solid var(--surface-border);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: send-comment-spin 700ms linear infinite;
}

.action-feedback {
  position: absolute;
  top: 12rpx;
  right: 36rpx;
  left: 36rpx;
  z-index: 9;
  padding: 16rpx 22rpx;
  border-radius: 20rpx;
  background: var(--surface-color);
  color: var(--danger-color);
  font-size: 23rpx;
  line-height: 34rpx;
  text-align: center;
  box-shadow: 0 8rpx 24rpx var(--surface-shadow);
}

.action-feedback--success {
  color: var(--success-color);
}

@keyframes send-comment-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

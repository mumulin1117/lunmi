<template>
  <PageTransition ref="page_transition" class="detail-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="detail-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Post') }}</text>
          <view class="header-line" />
        </view>
        <view
          v-if="post && is_mine"
          class="header-action header-action--danger"
          role="button"
          :aria-label="$t('Delete post')"
          @click="request_post_delete"
        >
          <image src="/static/icon/post_details_del.png" mode="aspectFit" />
        </view>
        <view
          v-else-if="post && can_report_post"
          class="header-action"
          role="button"
          :aria-label="$t('Report post')"
          @click="open_post_report"
        >
          <image src="/static/icon/wall_vertical_more.png" mode="aspectFit" />
        </view>
      </view>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content-scroll__inner">
          <view v-if="is_loading && !post" class="detail-skeleton" aria-hidden="true">
            <view class="detail-skeleton__media" />
            <view class="detail-skeleton__line" />
            <view class="detail-skeleton__line detail-skeleton__line--short" />
          </view>
          <view v-else-if="load_error && !post" class="state-card" role="alert">
            <text class="state-card__copy">{{ $t(load_error) }}</text>
            <view class="state-card__retry" role="button" :aria-label="$t('Try again')" @click="load_post">
              {{ $t('Try again') }}
            </view>
          </view>
          <template v-else-if="post">
            <view v-if="post.media_url" class="detail-media">
              <PostMedia
                :media-url="post.media_url"
                :content-type="post.media_type"
                :poster="post.media_poster"
                :media-id="`${post.post_id}-detail`"
                :playable="post.media_type === 'video'"
                controls
              />
              <view v-if="place_chip" class="place-chip">
                <text>{{ $t(place_chip) }}</text>
              </view>
            </view>
            <view
              class="author-row"
              role="button"
              :aria-label="$t(`Open profile for ${post.author_name}`)"
              @click="open_author(post.author_id)"
            >
              <UserAvatar class="author-avatar" :source="post.author_avatar" />
              <view class="author-copy">
                <text class="author-name">{{ post.author_name_is_placeholder ? $t(post.author_name) : post.author_name }}</text>
                <text v-if="stamp" class="author-stamp">{{ $t(stamp) }}</text>
              </view>
            </view>
            <text v-if="post.caption" class="detail-caption">{{ post.caption }}</text>
            <view class="stat-row">
              <view
                class="stat-pill"
                role="button"
                :aria-label="$t(post.is_liked ? 'Unlike post' : 'Like post')"
                @click="toggle_like"
              >
                <image
                  :src="post.is_liked ? '/static/icon/wall_stared.png' : '/static/icon/wall_star.png'"
                  mode="aspectFit"
                />
                <text :style="post.is_liked ? 'color: #FFC24F;':''">{{ $t(post.like_count) }}</text>
              </view>
              <view class="stat-pill">
                <image src="/static/icon/wall_comment.png" mode="aspectFit" />
                <text>{{ $t(post.comment_count) }}</text>
              </view>
            </view>
            <view class="replies-heading">
              <text>{{ $t('REPLIES') }}</text>
              <view class="replies-line" />
            </view>
            <view v-if="!comments.length" class="empty-replies">
              <text>{{ $t('No replies yet.') }}</text>
            </view>
            <view v-for="comment in comments" :key="comment.comment_id" class="reply-card">
              <view
                class="reply-face"
                role="button"
                :aria-label="$t(`Open profile for ${comment.author_name}`)"
                @click="open_author(comment.author_id)"
              >
                <UserAvatar class="reply-avatar" :source="comment.author_avatar" />
              </view>
              <view class="reply-copy">
                <text class="reply-name">{{ comment.author_name_is_placeholder ? $t(comment.author_name) : comment.author_name }}</text>
                <text class="reply-body">{{ comment.content }}</text>
              </view>
              <view
                v-if="is_real_comment_id(comment)"
                class="reply-more"
                role="button"
                :aria-label="$t(comment.author_id === current_user_id ? 'Delete reply' : 'Report reply')"
                @click="open_comment_more(comment)"
              >
                <image :src="comment.author_id === current_user_id ? '/static/icon/post_details_del.png' : '/static/icon/wall_vertical_more.png'" mode="aspectFit" />
              </view>
            </view>
          </template>
        </view>
      </scroll-view>
      <text v-if="action_error" class="action-error" role="alert">{{ $t(action_error) }}</text>
      <view v-if="post" class="composer">
        <input
          v-model="reply_draft"
          class="composer__input"
          maxlength="200"
          confirm-type="send"
          :placeholder="$t('Write a reply...')"
          :placeholder-style="placeholder_style"
          :aria-label="$t('Write a reply')"
          @confirm="send_reply"
        />
        <view class="composer__send" role="button" :aria-label="$t('Send reply')" @click="send_reply">
          <image src="/static/icon/send_wish_comment_button.png" mode="aspectFit" />
        </view>
      </view>
    </view>
    <BottomSafeArea />
    <ReportUserSheet
      :visible="is_report_visible"
      :target-name="report_target.author_name"
      :target-user-id="report_target.author_id"
      :post-id="post?.post_id || ''"
      :comment-id="report_target.comment_id"
      bottom-offset="0rpx"
      @update:visible="is_report_visible = $event"
    />
    <CommentDeleteConfirmDialog
      :visible="is_delete_visible"
      :error="delete_error"
      :pending="is_deleting_reply"
      @cancel="close_reply_delete"
      @confirm="confirm_reply_delete"
    />
    <SuccessToast :message="$t(success_toast)" @dismiss="success_toast = ''" />
    <DeleteConfirmDialog
      :visible="is_post_delete_visible"
      :title="$t(DELETE_COPY.post.title)"
      :copy="$t(DELETE_COPY.post.copy)"
      :error="post_delete_error"
      @cancel="close_post_delete"
      @confirm="confirm_post_delete"
    />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { commentDynamic, deleteComment, selectDynamicInfo, updateDynamicStore } from '@/api/dynamic'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import CommentDeleteConfirmDialog from '@/components/CommentDeleteConfirmDialog.vue'
import SuccessToast from '@/components/SuccessToast.vue'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import PageTransition from '@/components/PageTransition.vue'
import PostMedia from '@/components/PostMedia.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import {
  REPLY_MAX_LENGTH,
  build_delete_reply_params,
  build_detail_author_url,
  build_like_detail_params,
  build_reply_params,
  format_post_stamp,
  is_real_comment_id,
  map_post_comments,
  map_post_detail,
  post_place_chip,
  read_detail_back,
  read_detail_post_id
} from '@/utils/postDetailPresentation.js'
import { WALL_DETAIL_PATH } from '@/utils/wallPresentation.js'
import { DELETE_COPY, POST_DELETE_UNAVAILABLE } from '@/utils/deleteConfirmPresentation'
import { SUCCESS_TOAST } from '@/utils/successToast'

const account_store = storeGlobal()
const page_transition = ref(null)
const post_id = ref('')
const back_target = ref({ page: '/pages/community/index', prefer_relaunch: false })
const post = ref(null)
const comments = ref([])
const is_loading = ref(true)
const load_error = ref('')
const action_error = ref('')
const success_toast = ref('')
const reply_draft = ref('')
const is_report_visible = ref(false)
const is_delete_visible = ref(false)
const is_post_delete_visible = ref(false)
const delete_error = ref('')
const post_delete_error = ref('')
const is_deleting_reply = ref(false)
const report_target = ref({ author_name: '', author_id: '', comment_id: '' })
const delete_target = ref(null)
const is_page_active = ref(true)
const is_leaving = ref(false)
const placeholder_style = `color:${theme.colors.text.tertiary};font-size:28rpx;`
const pending_likes = new Set()
const pending_replies = new Set()
let load_context = { cancel() {} }
let allow_route_back = false
let reply_sequence = 0

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--detail-title': theme.colors.text.title,
  '--detail-copy': theme.colors.text.secondary,
  '--detail-muted': theme.colors.text.tertiary,
  '--detail-border': theme.colors.surface.border,
  '--detail-surface': theme.colors.surface.card,
  '--detail-chip': theme.colors.status.info,
  '--detail-chip-surface': theme.colors.surface.scrim_soft,
  '--detail-header-surface': theme.colors.lantern_detail.header_surface,
  '--detail-line': theme.colors.lantern_detail.title_line,
  '--detail-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--detail-skeleton': theme.colors.lantern_detail.skeleton,
  '--detail-button': theme.colors.button.primary,
  '--detail-button-text': theme.colors.button.text,
  '--detail-danger': theme.colors.dialog.danger.background,
  '--detail-composer': theme.colors.voice_room.search_surface,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const current_user_id = computed(() => `${account_store.userId || ''}`)
const is_mine = computed(() => Boolean(post.value?.author_id) && post.value.author_id === current_user_id.value)
const can_report_post = computed(() => Boolean(post.value?.author_id) && !is_mine.value)
const place_chip = computed(() => post_place_chip(post.value))
const stamp = computed(() => format_post_stamp(post.value?.created_at))

const begin_load = () => {
  load_context.cancel?.()
  load_context = { cancel() {} }
  return load_context
}

const detail_source = () => {
  const params = [`dynamicId=${encodeURIComponent(post_id.value)}`]
  if (back_target.value.page) params.push(`sourcePage=${encodeURIComponent(back_target.value.page)}`)
  return `${WALL_DETAIL_PATH}?${params.join('&')}`
}

const load_post = async () => {
  if (!is_page_active.value || !post_id.value) return
  if (!post.value) is_loading.value = true
  load_error.value = ''
  const context = begin_load()
  const result = await selectDynamicInfo({ dynamicId: post_id.value }, context)
  if (!is_page_active.value || context !== load_context) return
  if (!result?.success) {
    if (result?.error !== 'Request cancelled.') {
      load_error.value = result?.error || 'Unable to load this post.'
    }
  } else {
    const mapped = map_post_detail(result.data)
    if (!mapped) {
      load_error.value = 'Unable to load this post.'
    } else {
      const kept_like = pending_likes.has(mapped.post_id) ? post.value : null
      post.value = kept_like
        ? { ...mapped, is_liked: kept_like.is_liked, like_count: kept_like.like_count }
        : mapped
      const pending = comments.value.filter((item) => item.is_pending)
      comments.value = [...mapped.comments, ...pending]
    }
  }
  is_loading.value = false
}

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  if (is_report_visible.value) {
    is_report_visible.value = false
    return
  }
  if (is_post_delete_visible.value) {
    close_post_delete()
    return
  }
  if (is_delete_visible.value) {
    close_reply_delete()
    return
  }
  is_leaving.value = true
  load_context.cancel?.()
  const fallback = back_target.value.page || '/pages/community/index'
  if (!back_target.value.prefer_relaunch && page_stack_length() > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        is_leaving.value = false
        page_transition.value?.navigate_relaunch({ url: fallback })
      }
    })
    if (!started) {
      allow_route_back = false
      is_leaving.value = false
      page_transition.value?.navigate_relaunch({ url: fallback })
    }
    return
  }
  page_transition.value?.navigate_relaunch({ url: fallback })
}

const open_author = (author_id) => {
  if (!author_id || is_leaving.value) return
  page_transition.value?.navigate_forward({
    url: build_detail_author_url(author_id, detail_source())
  })
}

const open_post_report = () => {
  if (!can_report_post.value) return
  report_target.value = {
    author_name: post.value.author_name,
    author_id: post.value.author_id,
    comment_id: ''
  }
  is_report_visible.value = true
}

const request_post_delete = () => {
  if (!post.value || is_deleting_reply.value) return
  post_delete_error.value = ''
  is_post_delete_visible.value = true
}

const close_post_delete = () => {
  is_post_delete_visible.value = false
  post_delete_error.value = ''
}

const confirm_post_delete = () => {
  post_delete_error.value = POST_DELETE_UNAVAILABLE
}

const open_comment_more = (comment) => {
  if (!is_real_comment_id(comment)) return
  if (comment.author_id && comment.author_id === current_user_id.value) {
    delete_error.value = ''
    delete_target.value = comment
    is_delete_visible.value = true
    return
  }
  report_target.value = {
    author_name: comment.author_name,
    author_id: comment.author_id,
    comment_id: comment.comment_id
  }
  is_report_visible.value = true
}

const close_reply_delete = () => {
  if (is_deleting_reply.value) return
  is_delete_visible.value = false
  delete_target.value = null
  delete_error.value = ''
}

const confirm_reply_delete = async () => {
  const comment = delete_target.value
  if (!is_real_comment_id(comment) || is_deleting_reply.value) return
  is_deleting_reply.value = true
  action_error.value = ''
  delete_error.value = ''
  const context = { cancel() {} }
  const result = await deleteComment(build_delete_reply_params(comment), context)
  is_deleting_reply.value = false
  if (!is_page_active.value) return
  if (!result?.success) {
    delete_error.value = result?.error || 'Unable to delete this reply.'
    return
  }
  comments.value = comments.value.filter((item) => item.comment_id !== comment.comment_id)
  if (post.value) {
    post.value = {
      ...post.value,
      comment_count: Math.max(0, post.value.comment_count - 1)
    }
  }
  is_delete_visible.value = false
  delete_target.value = null
  delete_error.value = ''
  success_toast.value = SUCCESS_TOAST.deleted
}

const toggle_like = async () => {
  if (!post.value?.post_id || pending_likes.has(post.value.post_id)) return
  const previous = { ...post.value }
  const next_liked = !post.value.is_liked
  pending_likes.add(post.value.post_id)
  action_error.value = ''
  post.value = {
    ...post.value,
    is_liked: next_liked,
    like_count: Math.max(0, post.value.like_count + (next_liked ? 1 : -1))
  }
  const context = { cancel() {} }
  const result = await updateDynamicStore(build_like_detail_params(previous), context)
  pending_likes.delete(previous.post_id)
  if (!is_page_active.value) return
  if (!result?.success) {
    post.value = previous
    action_error.value = result?.error || 'Unable to update this post.'
  }
}

const send_reply = async () => {
  const content = reply_draft.value.trim()
  if (!post.value?.post_id || !content) return
  if (content.length > REPLY_MAX_LENGTH) {
    action_error.value = 'A reply can be 200 characters at most.'
    return
  }
  const temporary_id = `pending-${++reply_sequence}`
  if (pending_replies.has(temporary_id)) return
  const account = account_store.userInfo || {}
  const temporary = {
    comment_id: temporary_id,
    author_id: current_user_id.value,
    author_name: `${account.userName || ''}`.trim() || 'You',
    author_avatar: `${account.userImgUrl || ''}`.trim(),
    content,
    created_at: new Date().toISOString(),
    is_pending: true
  }
  pending_replies.add(temporary_id)
  action_error.value = ''
  comments.value = [...comments.value, temporary]
  post.value = { ...post.value, comment_count: post.value.comment_count + 1 }
  reply_draft.value = ''
  const context = { cancel() {} }
  const result = await commentDynamic(build_reply_params(post.value, content), context)
  pending_replies.delete(temporary_id)
  if (!is_page_active.value) return
  if (!result?.success) {
    comments.value = comments.value.filter((item) => item.comment_id !== temporary_id)
    if (post.value) {
      post.value = {
        ...post.value,
        comment_count: Math.max(0, post.value.comment_count - 1)
      }
    }
    if (!reply_draft.value) reply_draft.value = content
    if (result?.error !== 'Request cancelled.') {
      action_error.value = result?.error || 'Unable to send this reply.'
    }
    return
  }
  const confirmed = map_post_comments([result.data])[0]
  comments.value = comments.value.map((item) => {
    if (item.comment_id !== temporary_id) return item
    if (!confirmed?.comment_id || confirmed.is_pending) return { ...item, is_pending: true }
    return confirmed
  })
}

onLoad((query) => {
  post_id.value = read_detail_post_id(query)
  back_target.value = read_detail_back(query)
  if (!post_id.value) {
    is_loading.value = false
    load_error.value = 'This post cannot be opened.'
    return
  }
  void load_post()
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  load_context.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.detail-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.detail-header {
  display: flex;
  height: 80rpx;
  flex: none;
  align-items: center;
  padding: 0 36rpx;
}

.header-action {
  display: flex;
  width: 72rpx;
  height: 72rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 38rpx;
}

.back-button {
  @include page_back.button;
}

.header-action image {
  width: 72rpx;
  height: 72rpx;
}

.header-copy {
  min-width: 0;
  flex: 1;
  margin-left: 24rpx;
}

.header-title {
  display: block;
  color: var(--detail-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--detail-line);
  box-shadow: 0 0 18rpx var(--detail-line-shadow);
}

.header-action {
  margin-left: 16rpx;
}

.header-action--danger {
  border-color: var(--detail-danger);
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  padding: 20rpx 36rpx 24rpx;
}

.detail-media {
  position: relative;
  height: 420rpx;
  overflow: hidden;
  border-radius: 32rpx;
}

.detail-media :deep(.post-media) {
  width: 100%;
  height: 420rpx;
}

.place-chip {
  position: absolute;
  z-index: 2;
  top: 20rpx;
  left: 20rpx;
  max-width: 70%;
  padding: 8rpx 16rpx;
  border: 1px solid var(--detail-chip);
  border-radius: 12rpx;
  background: var(--detail-chip-surface);
}

.place-chip text {
  color: var(--detail-chip);
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  text-transform: uppercase;
}

.author-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
}

.author-avatar,
.reply-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 36rpx;
}

.author-copy,
.reply-copy {
  min-width: 0;
  flex: 1;
  margin-left: 16rpx;
}

.author-name,
.reply-name {
  display: block;
  color: var(--detail-title);
  font-size: 30rpx;
  font-weight: 700;
}

.author-stamp {
  display: block;
  margin-top: 6rpx;
  color: var(--detail-muted);
  font-size: 22rpx;
  letter-spacing: 1rpx;
  text-transform: uppercase;
}

.detail-caption {
  display: block;
  margin-top: 22rpx;
  color: var(--detail-title);
  font-size: 36rpx;
  font-weight: 700;
  line-height: 48rpx;
}

.stat-row {
  display: flex;
  margin-top: 22rpx;
}

.stat-pill {
  display: flex;
  height: 64rpx;
  align-items: center;
  margin-right: 16rpx;
  // padding: 26rpx 0 24rpx 0;
  border: 1px solid var(--detail-border);
  border-radius: 20rpx;
}

.stat-pill image {
  width: 28rpx;
  height: 28rpx;
  margin-right: 18rpx;
  margin-left: 30rpx;
}

.stat-pill text {
  margin-left: 8rpx;
  color: var(--detail-title);
  font-size: 26rpx;
  font-weight: 700;
  margin-right: 30rpx;

}

.replies-heading {
  display: flex;
  align-items: center;
  margin-top: 32rpx;
}

.replies-heading text {
  color: var(--detail-muted);
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.replies-line {
  height: 2rpx;
  flex: 1;
  margin-left: 16rpx;
  background: var(--detail-border);
}

.empty-replies {
  margin-top: 20rpx;
  color: var(--detail-copy);
  font-size: 26rpx;
}

.reply-card {
  display: flex;
  align-items: flex-start;
  margin-top: 18rpx;
  padding: 20rpx;
  border: 1px solid var(--detail-border);
  border-radius: 28rpx;
  background: var(--detail-surface);
}

.reply-body {
  display: block;
  margin-top: 6rpx;
  color: var(--detail-copy);
  font-size: 26rpx;
  line-height: 36rpx;
}

.reply-more {
  display: flex;
  width: 52rpx;
  height: 60rpx;
  flex: none;
  align-items: center;
  justify-content: center;
}

.reply-more image {
  width: 52rpx;
  height: 60rpx;
}

.detail-skeleton__media,
.detail-skeleton__line {
  background: var(--detail-skeleton);
  animation: detail-pulse 1.2s ease-in-out infinite;
}

.detail-skeleton__media {
  height: 420rpx;
  border-radius: 32rpx;
}

.detail-skeleton__line {
  height: 32rpx;
  margin-top: 24rpx;
  border-radius: 16rpx;
}

.detail-skeleton__line--short {
  width: 46%;
}

.state-card {
  display: flex;
  min-height: 360rpx;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.state-card__copy,
.action-error {
  color: var(--detail-copy);
  font-size: 26rpx;
  line-height: 38rpx;
}

.state-card__retry {
  height: 70rpx;
  margin-top: 24rpx;
  padding: 0 30rpx;
  border-radius: 35rpx;
  background: var(--detail-button);
  color: var(--detail-button-text);
  font-size: 25rpx;
  font-weight: 700;
  line-height: 70rpx;
}

.action-error {
  display: block;
  flex: none;
  margin: 0 36rpx 8rpx;
}

.composer {
  display: flex;
  height: 96rpx;
  flex: none;
  align-items: center;
  margin: 8rpx 36rpx 16rpx;
  background: var(--detail-composer);
}

.composer__input {
  width: 566rpx;
  height: 97rpx;
  min-width: 0;
  flex: 1;
  color: var(--detail-title);
  font-size: 28rpx;
  background: rgba(20,14,44,0.7);
  border-radius: 44rpx 44rpx 44rpx 44rpx;
  border: 2rpx solid rgba(198,178,255,0.22);
  padding-left: 34rpx;
  padding-right: 34rpx;
  margin-right: 20rpx;
}

.composer__send {
  display: flex;
  width: 92rpx;
  height: 92rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  margin-right: 10rpx;
  border-radius: 46rpx;
}

.composer__send image {
  width: 92rpx;
  height: 92rpx;
}

@keyframes detail-pulse {
  0%,
  100% { opacity: 0.45; }
  50% { opacity: 1; }
}
</style>

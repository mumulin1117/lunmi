<template>
  <view class="page videos-page" :style="theme_style">
    <TopSafeArea />
    <MainTabSkeleton
      v-if="is_main_tab_loading || (is_videos_loading && !has_remote_videos_data)"
      type="videos"
    />
    <view v-else class="main-page-content videos-content">
      <view class="videos-header">
        <text class="videos-title">{{ $t('Videos') }}</text>
        <view class="create-entry" role="button" :aria-label="$t('Create a video post')" @click="go_to_create">
          <image
            class="create-entry__icon"
            src="/static/icons/discover_add.png"
            mode="aspectFit"
            aria-hidden="true"
          />
        </view>
      </view>
      <scroll-view
        ref="videos_scroll"
        class="videos-scroll"
        scroll-y
        :scroll-top="videos_scroll_top"
        :show-scrollbar="false"
        @scroll="handle_videos_scroll"
      >
        <view class="videos-scroll__inner">
          <DiscoverDataLoading v-if="is_videos_loading" />
          <view v-else-if="videos_error && !has_remote_videos_data" class="videos-state" role="alert">
            <text class="videos-state__title">{{ $t('Unable to load videos') }}</text>
            <text class="videos-state__copy">{{ $t(videos_error) }}</text>
            <view class="videos-state__action" role="button" @click="load_videos_posts">{{ $t('Try again') }}</view>
          </view>
          <transition v-else name="page-fade-up" appear>
            <view :key="video_posts.length">
              <view v-for="post in video_posts" :key="post.dynamicId" class="post-card" role="article">
                <view class="post-card__author-row">
                  <view
                    class="author-entry"
                    role="button"
                    :aria-label="$t(`Open ${post.userName} profile`)"
                    @click="open_author(post)"
                  >
                    <UserAvatar class="author-avatar" :source="post.userImgUrl" />
                    <text class="author-name">{{ post.userName }}</text>
                  </view>
                  <view
                    v-if="String(post.userId) !== String(current_user_id)"
                    class="follow-entry"
                    :class="{ 'follow-entry--pending': is_action_pending(`follow:${post.userId}`) }"
                    role="button"
                    :aria-label="$t(get_follow_label(post))"
                    :aria-disabled="is_action_pending(`follow:${post.userId}`)"
                    @click.stop="toggle_follow(post)"
                  >
                    <image
                      class="follow-entry__icon"
                      :src="is_post_following(post)
                      ? '/static/icons/discover_followed.png'
                      : '/static/icons/discover_follow.png'"
                      mode="aspectFit"
                      aria-hidden="true"
                    />
                  </view>
                </view>
                <view
                  v-if="get_post_content(post)"
                  class="post-copy-entry"
                  role="button"
                  :aria-label="$t('Open video details')"
                  @click="open_post(post)"
                >
                  <text class="post-copy">{{ get_post_content(post) }}</text>
                </view>
                <view class="post-video-entry" role="button" :aria-label="$t('Play video')" @click="open_post(post)">
                  <PostMedia
                    class="post-video"
                    :media-url="get_video_media(post).media_url"
                    content-type="video"
                    :poster="get_video_media(post).poster_url"
                    :media-id="get_video_media(post).media_id"
                    playable
                  />
                </view>
                <view class="post-card__actions">
                  <view class="post-card__actions-left">
                    <view
                      class="post-action"
                      :class="{ 'post-action--pending': is_action_pending(`like:${post.dynamicId}`) }"
                      role="button"
                      :aria-label="$t(is_post_liked(post) ? 'Unlike video' : 'Like video')"
                      :aria-disabled="is_action_pending(`like:${post.dynamicId}`)"
                      @click="toggle_like(post)"
                    >
                      <image
                        class="post-action__icon"
                        :src="is_post_liked(post)
                        ? '/static/icons/discover_liked.png'
                        : '/static/icons/discover_like.png'"
                        mode="aspectFit"
                        aria-hidden="true"
                      />
                      <text>{{ $t(format_count(post.praiseNum)) }}</text>
                    </view>
                    <view class="post-action" role="button" :aria-label="$t('Open comments')" @click="open_post(post)">
                      <image
                        class="post-action__icon"
                        src="/static/icons/discover_comment.png"
                        mode="aspectFit"
                        aria-hidden="true"
                      />
                      <text>{{ $t(format_count(post.commentNum)) }}</text>
                    </view>
                  </view>
                  <view class="post-card__actions-right">
                    <view
                      v-if="String(post.userId) !== String(current_user_id)"
                      class="more-entry"
                      role="button"
                      :aria-label="$t('Open video actions')"
                      @click.stop="open_content_actions(post)"
                    >
                      <image
                        class="more-entry__icon"
                        src="/static/icons/discover_more.png"
                        mode="aspectFit"
                        aria-hidden="true"
                      />
                    </view>
                    <text v-else class="yoursInfo">{{ $t('Yours') }}</text>
                  </view>
                </view>
              </view>
              <view v-if="!video_posts.length" class="empty-state">
                <text class="empty-state__title">{{ $t('No videos yet') }}</text>
                <text class="empty-state__copy">{{ $t('Video posts will appear here.') }}</text>
              </view>
            </view>
          </transition>
        </view>
      </scroll-view>
      <text
        v-if="action_feedback"
        class="action-feedback"
        :class="`action-feedback--${feedback_tone}`"
        role="alert"
      >{{ $t(action_feedback) }}</text>
    </view>
    <ContentActionSheet
      :visible="is_action_sheet_visible"
      @close="close_content_actions"
      @report="open_report_sheet"
      @block="open_block_dialog"
    />
    <ReportUserSheet
      :visible="is_report_sheet_visible"
      :target-name="selected_post?.userName || ''"
      :target-user-id="selected_post?.userId ?? ''"
      :post-id="selected_post?.dynamicId || ''"
      @update:visible="is_report_sheet_visible = $event"
      @submitted="handle_report_submitted"
    />
    <BlockUserConfirmDialog
      :visible="is_block_dialog_visible"
      :target-name="selected_post?.userName || ''"
      :target-user-id="selected_post?.userId ?? ''"
      @cancel="is_block_dialog_visible = false"
      @confirm="confirm_block"
    />
    <UserBlockingLoading v-if="is_blocking" />
    <ApiErrorDialog />
    <CustomTabBar />
  </view>
</template>

<script setup>
import { read_legacy_blocked_user_ids } from '@/utils/legacyPagePresentation'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import ApiErrorDialog from '@/components/ApiErrorDialog.vue'
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
import { activate_media, clear_media, find_media_element, stop_active_media, stop_active_media_if_hidden } from '@/utils/mediaPlayback'
import { push_route, replace_route } from '@/utils/routeTransition'
import { use_main_tab_skeleton } from '@/utils/useMainTabSkeleton'

const account_store = storeGlobal()
const { is_main_tab_loading } = use_main_tab_skeleton('pages/videos/index')
const is_videos_loading = ref(true)
const videos_error = ref('')
const action_feedback = ref('')
const feedback_tone = ref('error')
const is_action_sheet_visible = ref(false)
const is_report_sheet_visible = ref(false)
const is_block_dialog_visible = ref(false)
const is_blocking = ref(false)
const pending_action_keys = ref(new Set())
const selected_post = ref(null)
const page_posts = ref([])
const liked_post_ids = ref(new Set())
const blocked_user_ids = ref(new Set())
const videos_scroll = ref(null)
const videos_scroll_top = ref(0)
const videos_request_context = {}
const follow_request_context = {}
const block_request_context = {}
let feedback_timer = null
let is_unmounted = false
let like_revision = 0
let saved_videos_scroll_top = 0
let should_restore_videos_scroll = false
let videos_list_snapshot = null
let is_returning_from_videos_child = false

const current_user_id = computed(() => account_store.userId)
const video_posts = computed(() => page_posts.value
  .filter((post) => !blocked_user_ids.value.has(`${post.userId}`))
  .filter((post) => Number(post.dynamicClassify) === 2 || Number(post.dynamicType) === 3))
const has_remote_videos_data = computed(() => page_posts.value.length > 0)
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--surface-color': theme.colors.surface.card,
  '--surface-border': theme.colors.surface.border_soft,
  '--surface-shadow': theme.colors.surface.shadow,
  '--title-color': theme.colors.text.title,
  '--secondary-color': theme.colors.text.secondary,
  '--accent-color': theme.colors.button.primary,
  '--accent-text': theme.colors.button.text,
  '--danger-color': theme.colors.status.danger,
  '--success-color': theme.colors.status.success
}

const get_post_content = (post) => post.dynamicContent || post.dynamicTitle || ''
const get_video_media = (post) => {
  const media_url = Array.isArray(post.dynamicImgList) ? post.dynamicImgList.find(Boolean) : ''
  return {
    media_id: `${post.dynamicId}-video`,
    media_url: media_url || '',
    poster_url: post.videoImgUrl || ''
  }
}
const is_post_liked = (post) => liked_post_ids.value.has(`${post.dynamicId}`)
const is_post_following = (post) => Number(post.attentionFlag) === 1
const is_action_pending = (action_key) => pending_action_keys.value.has(action_key)
const finish_action = (action_key) => {
  const next_keys = new Set(pending_action_keys.value)
  next_keys.delete(action_key)
  pending_action_keys.value = next_keys
}
const format_count = (count) => {
  const value = Math.max(0, Number(count || 0))
  if (value < 1000) return `${value}`
  const shortened = Math.round(value / 100) / 10
  return `${shortened.toFixed(shortened % 1 === 0 ? 0 : 1)}k`
}
const get_follow_label = (post) => {
  if (is_action_pending(`follow:${post.userId}`)) return 'Saving follow state'
  return is_post_following(post) ? 'Unfollow' : 'Follow'
}
const show_feedback = (message, tone = 'error') => {
  action_feedback.value = message
  feedback_tone.value = tone
  clearTimeout(feedback_timer)
  feedback_timer = setTimeout(() => { action_feedback.value = '' }, 2200)
}

const load_videos_posts = async () => {
  if (is_unmounted) return
  is_videos_loading.value = true
  videos_error.value = ''
  const revision = like_revision
  const result = await selectDynamicList({ dynamicClassify: 2 }, videos_request_context)
  if (is_unmounted) return
  if (revision !== like_revision || like_request_contexts.size) {
    is_videos_loading.value = false
    restore_videos_scroll()
    return
  }
  if (!result?.success) {
    videos_error.value = result?.error || 'Unable to load videos.'
  } else {
    const records = Array.isArray(result.data?.records)
      ? result.data.records
      : Array.isArray(result.data)
        ? result.data
        : []
    page_posts.value = records
    liked_post_ids.value = new Set(records
      .filter((post) => Number(post.storeFlag) === 1)
      .map((post) => `${post.dynamicId}`))
  }
  is_videos_loading.value = false
  restore_videos_scroll()
}

// feedback_mode: control_pending — render before awaiting the write.
const like_request_contexts = new Map()
const toggle_like = async (post) => {
  const action_key = `like:${post.dynamicId}`
  if (is_unmounted || is_action_pending(action_key) || !current_user_id.value) return
  pending_action_keys.value = new Set([...pending_action_keys.value, action_key])
  like_revision += 1
  const was_liked = is_post_liked(post)
  const previous_count = Number(post.praiseNum || 0)
  const context = {}
  like_request_contexts.set(action_key, context)
  const apply_like = (liked, count) => {
    const ids = new Set(liked_post_ids.value)
    if (liked) ids.add(`${post.dynamicId}`)
    else ids.delete(`${post.dynamicId}`)
    liked_post_ids.value = ids
    page_posts.value = page_posts.value.map((item) => String(item.dynamicId) === String(post.dynamicId)
      ? { ...item, storeFlag: liked ? 1 : 0, praiseNum: count }
      : item)
  }
  apply_like(!was_liked, Math.max(0, previous_count + (was_liked ? -1 : 1)))
  try {
    const result = await updateDynamicStore({ dynamicId: post.dynamicId }, context)
    if (is_unmounted) return
    if (!result?.success) {
      apply_like(was_liked, previous_count)
      if (result?.error !== 'Request cancelled.') show_feedback(result?.error || 'Unable to update this post.')
    }
  } catch (error) {
    if (!is_unmounted) {
      apply_like(was_liked, previous_count)
      show_feedback(error?.message || 'Unable to update this post.')
    }
  } finally {
    like_request_contexts.delete(action_key)
    if (!is_unmounted) finish_action(action_key)
  }
}

const toggle_follow = async (post) => {
  const action_key = `follow:${post.userId}`
  if (is_action_pending(action_key)) return
  pending_action_keys.value = new Set([...pending_action_keys.value, action_key])
  const was_following = is_post_following(post)
  try {
    const result = await updateUserRelation({
      beHandleUserId: post.userId,
      hanldeType: 1
    }, follow_request_context)
    if (!result?.success) {
      show_feedback(result?.error || 'Unable to update this relationship.')
      return
    }
    page_posts.value = page_posts.value.map((item) => String(item.userId) === String(post.userId)
      ? { ...item, attentionFlag: was_following ? 0 : 1 }
      : item)
  } catch (error) {
    show_feedback(error?.message || 'Unable to update this relationship.')
  } finally {
    finish_action(action_key)
  }
}

const open_post = (post) => {
  capture_videos_list_snapshot()
  push_route({
    url: `/pages/discover/detail?dynamicId=${encodeURIComponent(post.dynamicId)}&return_to=videos`,
    fail: () => {
      is_returning_from_videos_child = false
      videos_list_snapshot = null
      show_feedback('This destination is not available.')
    }
  })
}
const go_to_create = () => push_route({
  url: '/pages/videos/create',
  fail: () => show_feedback('This destination is not available.')
})
const open_author = (post) => {
  if (String(post.userId) === String(current_user_id.value)) {
    replace_route({ url: '/pages/profile/index', fail: () => show_feedback('This destination is not available.') })
    return
  }
  capture_videos_list_snapshot()
  push_route({
    url: `/pages/profile/user?user_id=${encodeURIComponent(post.userId)}`,
    fail: () => {
      is_returning_from_videos_child = false
      videos_list_snapshot = null
      show_feedback('This destination is not available.')
    }
  })
}
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
const handle_report_submitted = ({ blocked = false } = {}) => {
  if (blocked && selected_post.value?.userId) {
    blocked_user_ids.value = new Set([...blocked_user_ids.value, `${selected_post.value.userId}`])
    selected_post.value = null
  }
  show_feedback(blocked ? 'Report sent and user blocked.' : 'Report sent.', 'success')
}
const confirm_block = async (dialog_target_user_id = '') => {
  const target_user_id = dialog_target_user_id ?? selected_post.value?.userId
  if (!selected_post.value || target_user_id === '' || target_user_id === null
    || target_user_id === undefined || is_blocking.value) return
  is_block_dialog_visible.value = false
  is_blocking.value = true
  try {
    const result = await updateUserRelation({
      beHandleUserId: target_user_id,
      hanldeType: 2
    }, block_request_context)
    if (!result?.success) {
      show_feedback(result?.error || 'Unable to block this user.')
      return
    }
    blocked_user_ids.value = new Set([...blocked_user_ids.value, `${target_user_id}`])
    selected_post.value = null
    show_feedback('User blocked. Their content is now hidden.', 'success')
  } catch (error) {
    show_feedback(error?.message || 'Unable to block this user.')
  } finally {
    is_blocking.value = false
  }
}

const get_scroll_element = () => videos_scroll.value?.$el || videos_scroll.value
const handle_videos_scroll = (event) => {
  const scroll_top = Number(event?.detail?.scrollTop ?? event?.target?.scrollTop)
  if (Number.isFinite(scroll_top)) videos_scroll_top.value = Math.max(0, scroll_top)
  stop_active_media_if_hidden(get_scroll_element())
}
const remember_videos_scroll = () => {
  const current_scroll_top = Number(get_scroll_element()?.scrollTop)
  saved_videos_scroll_top = Number.isFinite(current_scroll_top) && current_scroll_top > 0
    ? current_scroll_top
    : videos_scroll_top.value
  should_restore_videos_scroll = true
}
const capture_videos_list_snapshot = () => {
  remember_videos_scroll()
  videos_list_snapshot = {
    posts: page_posts.value.slice(),
    liked_post_ids: new Set(liked_post_ids.value),
    blocked_user_ids: new Set(blocked_user_ids.value),
    scroll_top: saved_videos_scroll_top
  }
  is_returning_from_videos_child = true
}
const restore_videos_list_snapshot = () => {
  if (!videos_list_snapshot) return
  if (!page_posts.value.length && videos_list_snapshot.posts.length) {
    page_posts.value = videos_list_snapshot.posts
    liked_post_ids.value = videos_list_snapshot.liked_post_ids
    blocked_user_ids.value = videos_list_snapshot.blocked_user_ids
  }
  saved_videos_scroll_top = videos_list_snapshot.scroll_top
  should_restore_videos_scroll = true
  videos_list_snapshot = null
  restore_videos_scroll()
}
const restore_videos_scroll = () => {
  if (!should_restore_videos_scroll) return
  const scroll_top = saved_videos_scroll_top
  nextTick(() => { videos_scroll_top.value = scroll_top })
}

onShow(() => {
  if (is_returning_from_videos_child) {
    is_returning_from_videos_child = false
    restore_videos_list_snapshot()
    return
  }
  restore_videos_scroll()
  if (!like_request_contexts.size) void load_videos_posts()
})

onMounted(() => {
  void selectBlacklistedUsers().then((result) => {
    if (result?.success && !is_unmounted) blocked_user_ids.value = read_legacy_blocked_user_ids(Array.isArray(result.data) ? result.data : [])
  })
})
onHide(() => stop_active_media())
onBeforeUnmount(() => {
  like_request_contexts.forEach((context) => context.cancel?.())
  is_unmounted = true
  clearTimeout(feedback_timer)
  videos_request_context.cancel?.()
  follow_request_context.cancel?.()
  block_request_context.cancel?.()
  stop_active_media()
})
</script>

<style scoped lang="scss">
.videos-page {
  position: relative;
  background: var(--page-background);
  color: var(--title-color);
}

.videos-content {
  display: flex;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.videos-header {
  display: flex;
  height: 110rpx;
  align-items: center;
  justify-content: space-between;
  padding: 0 40rpx 8rpx 30rpx;
  flex: 0 0 110rpx;
}

.videos-title {
  font-size: 56rpx;
  font-weight: 900;
}

.create-entry {
  display: flex;
  width: 70rpx;
  height: 70rpx;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background: var(--accent-color);
}

.create-entry__icon {
  width: 38rpx;
  height: 38rpx;
}

.videos-scroll {
  min-height: 0;
  flex: 1;
}

.videos-scroll__inner {
  box-sizing: border-box;
  padding: 0 30rpx calc(150rpx + var(--app-safe-bottom));
}

.post-card {
  margin-bottom: 24rpx;
  padding: 28rpx;
  border: 1rpx solid var(--surface-border);
  border-radius: 32rpx;
  background: var(--surface-color);
  box-shadow: 0 14rpx 40rpx var(--surface-shadow);
}

.post-card__author-row,
.post-card__actions,
.post-card__actions-left,
.post-card__actions-right,
.author-entry,
.follow-entry,
.post-action {
  display: flex;
  align-items: center;
}

.post-card__author-row,
.post-card__actions {
  justify-content: space-between;
}

.author-entry {
  min-width: 0;
}

.author-avatar {
  width: 70rpx;
  height: 70rpx;
  margin-right: 16rpx;
  border-radius: 22rpx;
}

.author-name {
  overflow: hidden;
  font-size: 27rpx;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.follow-entry {
  width: 168rpx;
  height: 58rpx;
  justify-content: center;
}

.follow-entry__icon {
  width: 168rpx;
  height: 58rpx;
}

.follow-entry--pending,
.post-action--pending {
  opacity: .55;
  pointer-events: none;
}

.post-copy-entry {
  margin-top: 24rpx;
}

.post-copy {
  display: block;
  color: var(--title-color);
  font-size: 28rpx;
  line-height: 1.5;
}

.post-video-entry {
  width: 100%;
  height: 420rpx;
  margin-top: 24rpx;
  overflow: hidden;
  border-radius: 26rpx;
}

.post-video {
  width: 100%;
  height: 100%;
}

.post-card__actions {
  margin-top: 24rpx;
}

.post-card__actions-left {
  gap: 28rpx;
}

.post-action {
  gap: 8rpx;
  color: var(--secondary-color);
  font-size: 23rpx;
}

.post-action__icon,
.more-entry__icon {
  width: 32rpx;
  height: 32rpx;
}

.post-action--active {
  color: var(--accent-color);
}

.more-entry {
  display: flex;
  width: 54rpx;
  height: 54rpx;
  align-items: center;
  justify-content: center;
}

.yoursInfo {
  color: var(--secondary-color);
  font-size: 21rpx;
  font-weight: 800;
}

.videos-state,
.empty-state {
  display: flex;
  align-items: center;
  padding: 90rpx 32rpx;
  flex-direction: column;
  text-align: center;
}

.videos-state__title,
.empty-state__title {
  font-size: 30rpx;
  font-weight: 850;
}

.videos-state__copy,
.empty-state__copy {
  margin-top: 14rpx;
  color: var(--secondary-color);
  font-size: 24rpx;
  line-height: 1.45;
}

.videos-state__action {
  display: flex;
  min-width: 220rpx;
  height: 76rpx;
  margin-top: 28rpx;
  align-items: center;
  justify-content: center;
  border-radius: 22rpx;
  background: var(--accent-color);
  color: var(--accent-text);
  font-size: 24rpx;
  font-weight: 800;
}
</style>

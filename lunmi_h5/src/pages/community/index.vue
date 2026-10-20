<template>
  <PageTransition ref="page_transition" class="wall-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="wall-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('The Wall') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <view class="transmit" role="button" :aria-label="$t('New transmission')" @click="open_create">
        <view>
          {{ $t('NEW TRANSMISSION') }}
        </view>
      </view>
      <scroll-view
        ref="content_scroll"
        class="content-scroll"
        scroll-y
        :show-scrollbar="false"
        :lower-threshold="120"
        @scroll="handle_wall_scroll"
        @scrolltolower="load_more_posts"
      >
        <view class="content-scroll__inner">
          <view v-if="is_loading && !posts.length" class="wall-skeleton" aria-hidden="true">
            <view v-for="slot in skeleton_slots" :key="slot" class="wall-skeleton__card" />
          </view>
          <view v-else-if="load_error && !posts.length" class="state-card" role="alert">
            <text class="state-card__copy">{{ $t(load_error) }}</text>
            <view class="state-card__retry" role="button" :aria-label="$t('Try again')" @click="load_posts">
              {{ $t('Try again') }}
            </view>
          </view>
          <view v-else-if="!posts.length" class="state-card">
            <text class="state-card__title">{{ $t('No posts yet') }}</text>
            <text class="state-card__copy">{{ $t('The wall is waiting for a new transmission.') }}</text>
          </view>
          <template v-else>
            <view v-if="load_error" class="inline-error" role="alert">
              <text>{{ $t(load_error) }}</text>
              <view role="button" :aria-label="$t('Try again')" @click="load_posts">{{ $t('Try again') }}</view>
            </view>
            <view
              v-for="post in posts"
              :key="post.post_id"
              class="wall-card"
              role="button"
              :aria-label="$t(`Open post by ${post.author_name}`)"
              @click="open_detail(post)"
            >
              <view v-if="post.media_url" class="wall-card__media">
                <PostMedia
                  :media-url="post.media_url"
                  :content-type="post.media_type"
                  :poster="post.media_poster"
                  :media-id="`${post.post_id}-wall`"
                  :cover-only="post.media_type !== 'video'"
                  :playable="post.media_type === 'video'"
                />
                <view v-if="wall_chip(post)" class="wall-chip">
                  <text>{{ $t(wall_chip(post)) }}</text>
                </view>
              </view>
              <view
                class="wall-more"
                role="button"
                :aria-label="$t(can_report(post) ? 'Report post' : 'Your post')"
                @click.stop="open_more(post)"
              >
                <image src="/static/icon/vertical_more.png" mode="aspectFit" />
              </view>
              <view class="wall-card__author">
                <view
                  class="author-face"
                  role="button"
                  :aria-label="$t(`Open profile for ${post.author_name}`)"
                  @click.stop="open_author(post)"
                >
                  <UserAvatar class="author-avatar" :source="post.author_avatar" />
                </view>
                <text class="author-name">{{ post.author_name_is_placeholder ? $t(post.author_name) : post.author_name }}</text>
                <view
                  class="author-stat"
                  role="button"
                  :aria-label="$t(post.is_liked ? 'Unlike post' : 'Like post')"
                  @click.stop="toggle_like(post)"
                  style="margin-right: 20rpx;"
                >
                  <image
                    :src="post.is_liked ? '/static/icon/wall_stared.png' : '/static/icon/wall_star.png'"
                    mode="aspectFit"
                  />
                  <text :style="post.is_liked ? 'color: #FFC24F;':''">{{ $t(post.like_count) }}</text>
                </view>
                <view class="author-stat" >
                  <image src="/static/icon/wall_comment.png" mode="aspectFit" />
                  <text>{{ $t(post.comment_count) }}</text>
                </view>
              </view>
              <text v-if="post.caption" class="wall-card__caption">{{ post.caption }}</text>
            </view>
            <text v-if="action_error" class="inline-error" role="alert">{{ $t(action_error) }}</text>
            <view v-if="is_loading_more" class="wall-skeleton" aria-hidden="true">
              <view class="wall-skeleton__card" />
            </view>
            <view v-else-if="more_error" class="inline-error" role="alert">
              <text>{{ $t(more_error) }}</text>
              <view role="button" :aria-label="$t('Try again')" @click="load_more_posts">{{ $t('Try again') }}</view>
            </view>
            <text v-else-if="!has_more" class="list-end">{{ $t('No more posts') }}</text>
          </template>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <ReportUserSheet
      :visible="is_report_visible"
      :target-name="report_post?.author_name || ''"
      :target-user-id="report_post?.author_id || ''"
      :post-id="report_post?.post_id || ''"
      bottom-offset="0rpx"
      @update:visible="is_report_visible = $event"
    />
    <ApiErrorDialog />
  </PageTransition>
</template>

<script setup>
import { t } from '@/utils/i18n'

import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onHide, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectDynamicList, updateDynamicStore } from '@/api/dynamic'
import ApiErrorDialog from '@/components/ApiErrorDialog.vue'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import PostMedia from '@/components/PostMedia.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { stop_active_media, stop_active_media_if_hidden } from '@/utils/mediaPlayback'
import { storeGlobal } from '@/stores/store'
import {
  HOME_PAGE_PATH,
  build_like_post_params,
  read_wall_source,
  build_wall_author_url,
  build_wall_create_url,
  build_wall_detail_url,
  build_wall_page_params,
  build_wall_page_url,
  map_wall_posts,
  wall_place_chip
} from '@/utils/wallPresentation.js'

const account_store = storeGlobal()
const page_transition = ref(null)
const source_page = ref(HOME_PAGE_PATH)
const posts = ref([])
const content_scroll = ref(null)
const is_loading = ref(true)
const is_loading_more = ref(false)
const has_more = ref(true)
const current_page = ref(1)
const load_error = ref('')
const more_error = ref('')
const action_error = ref('')
const is_report_visible = ref(false)
const report_post = ref(null)
const is_page_active = ref(true)
const is_leaving = ref(false)
const skeleton_slots = [1, 2]
const pending_likes = new Set()
let load_context = { cancel() {} }
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--wall-title': theme.colors.text.title,
  '--wall-meta': theme.colors.messages.card_secondary,
  '--wall-copy': theme.colors.text.secondary,
  '--wall-border': theme.colors.surface.border,
  '--wall-surface': theme.colors.surface.card,
  '--wall-chip': theme.colors.status.info,
  '--wall-chip-surface': theme.colors.surface.scrim_soft,
  '--wall-transmit-surface': theme.colors.voice_room.gift_menu_active,
  '--wall-transmit-border': theme.colors.status.locked,
  '--wall-transmit-text': theme.colors.voice_room.detail_text,
  '--wall-plus': theme.colors.voice_room.gift_send_background,
  '--wall-header-surface': theme.colors.lantern_detail.header_surface,
  '--wall-line': theme.colors.lantern_detail.title_line,
  '--wall-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--wall-skeleton': theme.colors.lantern_detail.skeleton,
  '--wall-button': theme.colors.button.primary,
  '--wall-button-text': theme.colors.button.text,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const current_user_id = computed(() => `${account_store.userId || ''}`)
const wall_chip = (post) => wall_place_chip(post)
const can_report = (post) => Boolean(post?.author_id) && post.author_id !== current_user_id.value

const begin_load = () => {
  load_context.cancel?.()
  load_context = { cancel() {} }
  return load_context
}

const keep_pending_like = (post) => {
  if (!pending_likes.has(post.post_id)) return post
  return posts.value.find((item) => item.post_id === post.post_id) || post
}

const load_posts = async ({ reset = true } = {}) => {
  if (!is_page_active.value) return
  if (!reset && (is_loading.value || is_loading_more.value || !has_more.value)) return
  const page = reset ? 1 : current_page.value + 1
  if (reset) {
    if (!posts.value.length) is_loading.value = true
    load_error.value = ''
  } else {
    is_loading_more.value = true
    more_error.value = ''
  }
  const context = begin_load()
  const result = await selectDynamicList(build_wall_page_params({ current: page }), context)
  if (!is_page_active.value || context !== load_context) return
  if (!result?.success) {
    if (result?.error !== 'Request cancelled.') {
      const message = result?.error || 'Unable to load posts.'
      if (reset) load_error.value = message
      else more_error.value = message
    }
  } else {
    const mapped = map_wall_posts(result.data).map(keep_pending_like)
    if (reset) {
      posts.value = mapped
      current_page.value = 1
      has_more.value = true
      more_error.value = ''
    } else {
      const known = new Set(posts.value.map((item) => item.post_id))
      const incoming = mapped.filter((post) => !known.has(post.post_id))
      if (!incoming.length) {
        has_more.value = false
      } else {
        posts.value = posts.value.concat(incoming)
        current_page.value = page
      }
    }
  }
  is_loading.value = false
  is_loading_more.value = false
}

const load_more_posts = () => {
  void load_posts({ reset: false })
}

const get_scroll_element = () => content_scroll.value?.$el || content_scroll.value

const handle_wall_scroll = () => {
  stop_active_media_if_hidden(get_scroll_element())
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
  is_leaving.value = true
  load_context.cancel?.()
  const fallback = source_page.value || HOME_PAGE_PATH
  if (page_stack_length() > 1) {
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

const wall_url = () => build_wall_page_url(source_page.value)

const open_create = () => {
  if (is_leaving.value) return
  page_transition.value?.navigate_forward({ url: build_wall_create_url(wall_url()) })
}

const open_detail = (post) => {
  if (!post?.post_id || is_leaving.value) return
  page_transition.value?.navigate_forward({ url: build_wall_detail_url(post, wall_url()) })
}

const open_author = (post) => {
  if (!post?.author_id || is_leaving.value) return
  page_transition.value?.navigate_forward({ url: build_wall_author_url(post, wall_url()) })
}

const open_more = (post) => {
  if (can_report(post)) {
    report_post.value = post
    is_report_visible.value = true
    return
  }
  uni.showToast({ title: t('This post is yours.'), icon: 'none' })
  // action_error.value = 'This post is yours.'
}

const toggle_like = async (post) => {
  if (!post?.post_id || pending_likes.has(post.post_id)) return
  const previous = { ...post }
  const next_liked = !post.is_liked
  pending_likes.add(post.post_id)
  action_error.value = ''
  posts.value = posts.value.map((item) => (
    item.post_id === post.post_id
      ? {
        ...item,
        is_liked: next_liked,
        like_count: Math.max(0, item.like_count + (next_liked ? 1 : -1))
      }
      : item
  ))
  const context = { cancel() {} }
  const result = await updateDynamicStore(build_like_post_params(post), context)
  pending_likes.delete(post.post_id)
  if (!is_page_active.value) return
  if (!result?.success) {
    posts.value = posts.value.map((item) => (item.post_id === post.post_id ? previous : item))
    action_error.value = result?.error || 'Unable to update this post.'
  }
}

onLoad((query) => {
  source_page.value = read_wall_source(query?.sourcePage)
})

onShow(() => {
  void load_posts()
})

onHide(() => {
  stop_active_media()
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  load_context.cancel?.()
  stop_active_media()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.wall-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.wall-header {
  display: flex;
  height: 80rpx;
  flex: none;
  align-items: center;
  padding: 0 36rpx;
}

.back-button {
  @include page_back.button;
}

.header-copy {
  margin-left: 24rpx;
}

.header-title {
  display: block;
  color: var(--wall-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--wall-line);
  box-shadow: 0 0 18rpx var(--wall-line-shadow);
}

.transmit {
  display: flex;
  width: 678rpx;
  height: 108rpx;
  flex: none;
  align-items: center;
  margin: 24rpx 36rpx 0;
  border-radius: 28rpx;
  border: 2rpx solid rgba(196,120,255,0.5);
  background-image: url('/static/icon/wall_top_create_bg.png');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;

  view{
    margin-left: 116rpx;
    font-weight: 400;
    font-size: 23rpx;
    color: #FFD3EC;
    letter-spacing: 1px;
  }
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  min-height: 100%;
  padding: 22rpx 36rpx 32rpx;
}

.wall-card {
  position: relative;
  margin-bottom: 24rpx;
  overflow: hidden;
  border: 1px solid var(--wall-border);
  border-radius: 32rpx;
  background: var(--wall-surface);
}

.wall-card__media {
  position: relative;
  height: 360rpx;
}

.wall-card__media :deep(.post-media) {
  width: 100%;
  height: 360rpx;
}

.wall-chip,
.wall-more {
  position: absolute;
  z-index: 2;
  top: 20rpx;
}

.wall-chip {
  left: 20rpx;
  max-width: 70%;
  padding: 8rpx 16rpx;
  border: 1px solid var(--wall-chip);
  border-radius: 12rpx;
  background: var(--wall-chip-surface);
}

.wall-chip text {
  color: var(--wall-chip);
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  text-transform: uppercase;
}

.wall-more {
  right: 16rpx;
  display: flex;
  width: 48rpx;
  height: 48rpx;
  align-items: center;
  justify-content: center;
}

.wall-more image {
  width: 48rpx;
  height: 48rpx;
}

.wall-card__author {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx 0;
}

.author-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
}

.author-name {
  min-width: 0;
  flex: 1;
  margin-left: 16rpx;
  overflow: hidden;
  color: var(--wall-title);
  font-size: 28rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-stat {
  display: flex;
  flex: none;
  align-items: center;
  margin-left: 12rpx;
}

.author-stat image {
  width: 28rpx;
  height: 28rpx;
  margin-right: 5rpx;
}

.author-stat text {
  margin-left: 15rpx;
  color: var(--wall-meta);
  font-size: 24rpx;
}

.wall-card__caption {
  display: block;
  padding: 16rpx 24rpx 24rpx;
  color: var(--wall-copy);
  font-size: 28rpx;
  line-height: 40rpx;
}

.wall-skeleton__card {
  height: 460rpx;
  margin-bottom: 24rpx;
  border-radius: 32rpx;
  background: var(--wall-skeleton);
  animation: wall-pulse 1.2s ease-in-out infinite;
}

.state-card {
  display: flex;
  min-height: 360rpx;
  align-items: center;
  justify-content: center;
  padding: 48rpx 24rpx;
  text-align: center;
  flex-direction: column;
}

.state-card__title {
  color: var(--wall-title);
  font-size: 32rpx;
  font-weight: 700;
}

.state-card__copy,
.inline-error {
  margin-top: 12rpx;
  color: var(--wall-meta);
  font-size: 26rpx;
  line-height: 38rpx;
}

.state-card__retry,
.inline-error view {
  height: 70rpx;
  margin-top: 24rpx;
  padding: 0 30rpx;
  border-radius: 35rpx;
  background: var(--wall-button);
  color: var(--wall-button-text);
  font-size: 25rpx;
  font-weight: 700;
  line-height: 70rpx;
}

.inline-error {
  display: block;
  margin-bottom: 18rpx;
}

.list-end {
  display: block;
  margin: 8rpx 0 24rpx;
  color: var(--wall-meta);
  font-size: 24rpx;
  line-height: 34rpx;
  text-align: center;
}

@keyframes wall-pulse {
  0%,
  100% { opacity: 0.45; }
  50% { opacity: 1; }
}
</style>

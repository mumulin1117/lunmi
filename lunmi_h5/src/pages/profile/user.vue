<template>
  <PageTransition ref="page_transition" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <SecondaryPageHeader :title="$t('Profile')" />
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content content-scroll__inner">
          <DiscoverDataLoading v-if="is_profile_loading && !target_user" />
          <view v-else-if="profile_error && !target_user" class="empty-state" role="alert">
            <text class="empty-title">{{ $t('Unable to load profile') }}</text>
            <text class="empty-copy">{{ $t(profile_error) }}</text>
            <view class="list-state__action" role="button" @click="load_profile()">{{ $t('Try again') }}</view>
          </view>
          <view v-else-if="target_user">
            <text v-if="profile_error" class="list-inline-error">{{ $t(profile_error) }}</text>
            <view class="profile-hero">
              <UserAvatar class="profile-avatar" :source="target_user.avatar_url" />
              <text class="eyebrow">{{ $t('COMMUNITY MEMBER') }}</text>
              <text class="title">{{ target_user.username }}</text>
              <text class="handle">{{ $t(user_handle) }}</text>
              <text class="bio">{{ $t(target_user.signature || 'Sharing moments with the community.') }}</text>
            </view>
            <view class="stats">
              <view v-for="item in profile_stats" :key="item.label" class="stat">
                <text class="stat-value">{{ $t(item.value) }}</text>
                <text class="stat-label">{{ $t(item.label) }}</text>
              </view>
            </view>
            <view class="profile-actions">
              <view class="video-call-user" role="button" @click="open_video_call">{{ $t('Video call') }}</view>
              <view class="report-user" role="button" @click="is_report_visible = true">{{ $t('Report user') }}</view>
            </view>
            <text class="section-title">{{ $t('Recent posts') }}</text>
            <view v-if="!user_posts.length" class="empty-state">
              <text class="empty-title">{{ $t('No posts yet') }}</text>
              <text class="empty-copy">{{ $t('This member has not shared anything here.') }}</text>
            </view>
            <view
              v-for="post in user_posts"
              :key="post.post_id"
              class="post-card"
              role="button"
              @click="open_post(post)"
            >
              <view class="post-card__header">
                <text class="post-card__type">{{ $t(post.content_type === 'video' ? 'VIDEO' : 'PHOTO') }}</text>
                <text class="post-card__time">{{ $t(format_post_time(post.created_at)) }}</text>
              </view>
              <PostMedia
                v-if="post.media_url"
                class="post-card__media"
                :media-url="post.media_url"
                :content-type="post.content_type"
                :poster="post.cover_url"
                cover-only
              />
              <text v-if="post.content" class="post-card__copy">{{ post.content }}</text>
              <view class="post-card__meta">
                <text>{{ $t(post.like_count) }} {{ $t('likes') }}</text>
                <text>{{ $t(post.comment_count) }} {{ $t('replies') }}</text>
              </view>
            </view>
          </view>
          <view v-else class="empty-state">
            <text class="empty-title">{{ $t('Profile unavailable') }}</text>
            <text class="empty-copy">{{ $t('This member may no longer be available.') }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <ReportUserSheet
      :visible="is_report_visible"
      :target-name="target_user?.username || ''"
      :target-user-id="target_user?.user_id || ''"
      :post-id="report_context_post_id"
      @update:visible="is_report_visible = $event"
      @submitted="handle_report_submitted"
    />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import DiscoverDataLoading from '@/components/DiscoverDataLoading.vue'
import PageTransition from '@/components/PageTransition.vue'
import PostMedia from '@/components/PostMedia.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import SecondaryPageHeader from '@/components/SecondaryPageHeader.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { selectUserInfo } from '@/api/common'
import { map_public_user_profile, to_user_id_param } from '@/utils/profilePresentation'

const page_transition = ref(null)
const target_user_id = ref('')
const target_user = ref(null)
const profile_error = ref('')
const is_profile_loading = ref(true)
const is_report_visible = ref(false)
const profile_request_context = {}
let is_unmounted = false
const user_posts = computed(() => target_user.value?.posts || [])
const report_context_post_id = computed(() => user_posts.value[0]?.post_id || '')
const user_handle = computed(() => (
  `@${`${target_user.value?.username || 'member'}`.toLowerCase().replace(/\s+/g, '')}`
))
const profile_stats = computed(() => [
  { value: user_posts.value.length, label: 'Posts' },
  { value: target_user.value?.following_count || 0, label: 'Following' },
  { value: target_user.value?.follower_count || 0, label: 'Followers' }
])
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--title-color': theme.colors.text.title,
  '--secondary-color': theme.colors.text.secondary,
  '--accent-color': theme.colors.button.primary,
  '--accent-text-color': theme.colors.button.text,
  '--surface-color': theme.colors.surface.card_soft,
  '--surface-border': theme.colors.surface.border_soft,
  '--ghost-background': theme.colors.button.ghost.background,
  '--ghost-border': theme.colors.button.ghost.border,
  '--ghost-text': theme.colors.button.ghost.text,
  '--danger-color': theme.colors.status.danger,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const format_post_time = (date) => {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parsed)
}

const load_profile = async ({ show_loading = true } = {}) => {
  if (is_unmounted) return
  if (!target_user_id.value) {
    profile_error.value = 'Unable to load this profile.'
    is_profile_loading.value = false
    return
  }
  if (show_loading) is_profile_loading.value = true
  profile_error.value = ''
  const result = await selectUserInfo({ userId: to_user_id_param(target_user_id.value) }, profile_request_context)
  if (is_unmounted) return
  if (!result?.success) {
    if (result?.error !== 'Request cancelled.') {
      profile_error.value = result?.error || 'Unable to load this profile.'
    }
  } else {
    const profile = map_public_user_profile(result.data || {})
    if (profile.user_id) target_user.value = profile
    else profile_error.value = 'Unable to load this profile.'
  }
  is_profile_loading.value = false
}

const open_post = (post) => {
  if (!post?.post_id) return
  page_transition.value?.navigate_forward({
    url: `/pages/discover/detail?dynamicId=${encodeURIComponent(post.post_id)}`
  })
}

const open_video_call = () => {
  if (!target_user.value?.user_id) return
  is_report_visible.value = false
  page_transition.value?.navigate_forward({
    url: [
      '/pages/profile/video-call?user_id=',
      encodeURIComponent(target_user.value.user_id),
      '&user_name=',
      encodeURIComponent(target_user.value.username || ''),
      '&avatar_url=',
      encodeURIComponent(target_user.value.avatar_url || '')
    ].join('')
  })
}

const handle_report_submitted = ({ blocked }) => {
  if (blocked) page_transition.value?.navigate_back()
}

onLoad((query = {}) => {
  target_user_id.value = `${query?.user_id || ''}`.trim()
})

onShow(() => {
  if (!target_user_id.value) return
  void load_profile({ show_loading: !target_user.value })
})

onBeforeUnmount(() => {
  is_unmounted = true
  profile_request_context.cancel?.()
})
</script>

<style scoped lang="scss">
.page {
  background: var(--page-background);
  color: var(--title-color);
}

.content {
  padding: 28rpx 40rpx 72rpx;
}

.profile-hero {
  display: flex;
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.profile-avatar {
  width: 152rpx;
  height: 152rpx;
  overflow: hidden;
  border: 4px solid var(--accent-color);
  border-radius: 52rpx;
}

.eyebrow {
  margin-top: 28rpx;
  color: var(--secondary-color);
  font-size: 19rpx;
  letter-spacing: 2rpx;
}

.title {
  margin-top: 12rpx;
  font-size: 48rpx;
}

.handle {
  margin-top: 8rpx;
  color: var(--secondary-color);
  font-size: 23rpx;
}

.bio {
  max-width: 580rpx;
  margin-top: 26rpx;
  color: var(--secondary-color);
  font-size: 25rpx;
  line-height: 1.55;
}

.stats {
  display: flex;
  margin-top: 38rpx;
  padding: 28rpx 0;
  border-top: 1px solid var(--surface-border);
  border-bottom: 1px solid var(--surface-border);
}

.stat {
  display: flex;
  align-items: center;
  flex: 1;
  flex-direction: column;
}

.stat-value { font-size: 34rpx; }

.stat-label {
  margin-top: 8rpx;
  color: var(--secondary-color);
  font-size: 20rpx;
}

.profile-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.video-call-user,
.report-user {
  height: 80rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  line-height: 80rpx;
  text-align: center;
  flex: 1;
}

.video-call-user {
  background: var(--accent-color);
  color: var(--accent-text-color);
}

.report-user {
  border: 1px solid var(--ghost-border);
  background: var(--ghost-background);
  color: var(--ghost-text);
}

.section-title {
  display: block;
  margin-top: 44rpx;
  font-size: 32rpx;
}

.post-card {
  margin-top: 20rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: var(--surface-color);
}

.post-card__header,
.post-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.post-card__type {
  color: var(--accent-color);
  font-size: 18rpx;
  letter-spacing: 2rpx;
}

.post-card__time {
  color: var(--secondary-color);
  font-size: 19rpx;
}

.post-card__media {
  display: block;
  height: 340rpx;
  margin-top: 20rpx;
  border-radius: 24rpx;
}

.post-card__copy {
  display: block;
  margin-top: 20rpx;
  font-size: 25rpx;
  line-height: 1.5;
}

.post-card__meta {
  margin-top: 20rpx;
  color: var(--secondary-color);
  font-size: 20rpx;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  flex-direction: column;
  text-align: center;
}

.empty-title { font-size: 34rpx; }

.empty-copy {
  margin-top: 14rpx;
  color: var(--secondary-color);
  font-size: 23rpx;
}

.list-state__action {
  height: 70rpx;
  margin-top: 26rpx;
  padding: 0 30rpx;
  border-radius: 35rpx;
  background: var(--accent-color);
  color: var(--accent-text-color);
  font-size: 25rpx;
  font-weight: 700;
  line-height: 70rpx;
}

.list-inline-error {
  display: block;
  padding: 0 0 16rpx;
  color: var(--danger-color);
  font-size: 23rpx;
  line-height: 1.4;
}
</style>

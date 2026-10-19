<template>
  <PageTransition ref="page_transition" class="profile-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="profile-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Profile') }}</text>
          <view class="header-line" />
        </view>
        <view
          v-if="profile"
          class="more-button"
          role="button"
          :aria-label="$t('Report user')"
          @click="open_report"
        >
          <image src="/static/icon/vertical_more.png" mode="aspectFit" />
        </view>
      </view>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content-scroll__inner">
          <view v-if="is_loading && !profile" class="profile-skeleton" aria-hidden="true">
            <view class="profile-skeleton__card" />
            <view class="profile-skeleton__line" />
          </view>
          <view v-else-if="load_error && !profile" class="state-card" role="alert">
            <text class="state-card__copy">{{ $t(load_error) }}</text>
            <view class="state-card__retry" role="button" :aria-label="$t('Try again')" @click="load_profile">
              {{ $t('Try again') }}
            </view>
          </view>
          <template v-else-if="profile">
            <view class="identity-card">
              <UserAvatar class="identity-avatar" :source="profile.avatar_url" />
              <view class="identity-copy">
                <text class="identity-name">{{ profile.username || $t('Anonymous') }}</text>
                <view v-if="profile.location" class="identity-location">
                  <image src="/static/icon/profile_location.png" mode="aspectFit" />
                  <text>{{ profile.location }}</text>
                </view>
                <text v-if="joined_date" class="identity-joined">{{ $t(joined_date) }}</text>
              </view>
            </view>
            <view v-if="profile.signature" class="bio-card">
              <text>{{ $t(profile.signature) }}</text>
            </view>
            <view class="stat-card">
              <view class="stat-item">
                <text class="stat-item__value stat-item__value--wish">{{ $t(wish_count) }}</text>
                <text class="stat-item__label">{{ $t('Wishes on the tree') }}</text>
              </view>
              <view class="stat-divider" />
              <view class="stat-item">
                <text class="stat-item__value stat-item__value--blessing">{{ $t(sent_blessing_count) }}</text>
                <text class="stat-item__label">{{ $t('Blessings sent') }}</text>
              </view>
            </view>
            <view class="action-row">
              <view
                class="relation-button"
                :class="`relation-button--${relation}`"
                role="button"
                :aria-disabled="is_relation_pending || is_loading"
                :aria-busy="is_relation_pending"
                :aria-label="$t(relation_label(relation))"
                @click="change_relation"
              >
                <image
                  v-if="relation === 'none'"
                  src="/static/icon/release_lantern_add.png"
                  mode="aspectFit"
                />
                <image
                  v-else-if="relation === 'requested'"
                  src="/static/icon/user_follow_request.png"
                  mode="aspectFit"
                />
                <image
                  v-else-if="relation === 'mutual'"
                  src="/static/icon/user_follow_mutual.png"
                  mode="aspectFit"
                />
                <text>{{ $t(relation_label(relation)) }}</text>
              </view>
              <view
                class="message-button"
                :class="{ 'message-button--open': relation === 'mutual' }"
                role="button"
                :aria-disabled="relation !== 'mutual' || is_relation_pending"
                :aria-label="$t('Message')"
                @click="open_chat"
              >
                <image
                  :src="relation === 'mutual' ? '/static/icon/user_follow_message.png' : '/static/icon/login_lock_design.png'"
                  mode="aspectFit"
                />
                <text>{{ $t('Message') }}</text>
              </view>
            </view>
            <view class="hint-card">
              <image src="/static/icon/login_lock_design.png" mode="aspectFit" />
              <text>{{ $t(relation_hint(relation)) }}</text>
            </view>
            <view class="wish-heading">
              <text>{{ $t('WISHES ON THE TREE') }}</text>
              <view class="wish-line" />
            </view>
            <view v-if="load_error" class="wish-error" role="alert">
              <text>{{ $t(load_error) }}</text>
              <view role="button" :aria-label="$t('Try profile again')" @click="load_profile">{{ $t('Try again') }}</view>
            </view>
            <view v-if="!wishes.length && !load_error" class="empty-wishes">
              <text>{{ $t('No wishes on the tree yet.') }}</text>
            </view>
            <view
              v-for="wish in wishes"
              :key="wish.wish_id"
              class="wish-card"
              role="button"
              :aria-label="$t(wish.content || $t('Open wish'))"
              @click="open_wish(wish)"
            >
              <image class="wish-card__scene" src="/static/icon/wish_tree_scene.png" mode="aspectFill" />
              <view class="wish-card__shade">
                <text v-if="wish.content" class="wish-card__copy">{{ wish.content }}</text>
                <view class="wish-card__count">
                  <image src="/static/icon/small_start.png" mode="aspectFit" />
                  <text>{{ $t(wish.blessing_count) }}</text>
                </view>
              </view>
            </view>
          </template>
        </view>
      </scroll-view>
      <text v-if="action_error" class="action-error" role="alert">{{ $t(action_error) }}</text>
    </view>
    <BottomSafeArea />
    <ReportUserSheet
      :visible="is_report_visible"
      :target-name="profile?.username || ''"
      :target-user-id="target_user_id"
      bottom-offset="0rpx"
      @update:visible="is_report_visible = $event"
    />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { updateUserRelation } from '@/api/common'
import { selectLmUserInfo } from '@/api/userModule'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import {
  PROFILE_PAGE_PATH_SELF,
  build_profile_chat_url,
  build_profile_page_url,
  build_profile_wish_url,
  format_profile_joined_date,
  map_profile_wishes,
  read_profile_back,
  read_profile_user_id,
  relation_hint,
  relation_label,
  relation_state
} from '@/utils/communityUserPresentation.js'
import { map_public_user_profile, to_user_id_param } from '@/utils/profilePresentation.js'
import { WALL_PAGE_PATH } from '@/utils/wallPresentation.js'

const account_store = storeGlobal()
const page_transition = ref(null)
const target_user_id = ref('')
const source_page = ref(WALL_PAGE_PATH)
const profile = ref(null)
const wishes = ref([])
const wish_count = ref(0)
const sent_blessing_count = ref(0)
const joined_date = ref('')
const is_loading = ref(true)
const load_error = ref('')
const action_error = ref('')
const is_relation_pending = ref(false)
const is_report_visible = ref(false)
const is_page_active = ref(true)
const is_leaving = ref(false)
const redirect_self = ref(false)
let user_context = { cancel() {} }
let relation_context = { cancel() {} }
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--profile-title': theme.colors.text.title,
  '--profile-copy': theme.colors.text.secondary,
  '--profile-muted': theme.colors.text.tertiary,
  '--profile-border': theme.colors.surface.border,
  '--profile-surface': theme.colors.surface.card,
  '--profile-header-surface': theme.colors.lantern_detail.header_surface,
  '--profile-line': theme.colors.lantern_detail.title_line,
  '--profile-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--profile-skeleton': theme.colors.lantern_detail.skeleton,
  '--profile-wish': theme.colors.status.locked,
  '--profile-blessing': theme.colors.status.coin,
  '--profile-success': theme.colors.status.success,
  '--profile-button': theme.colors.voice_room.button_surface,
  '--profile-button-text': theme.colors.button.text,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const relation = computed(() => relation_state(profile.value))

const begin_user = () => {
  user_context.cancel?.()
  user_context = { cancel() {} }
  return user_context
}

const profile_url = () => build_profile_page_url(target_user_id.value, source_page.value)

const load_profile = async () => {
  if (!is_page_active.value || is_leaving.value || !target_user_id.value) return
  is_loading.value = true
  load_error.value = ''
  const context = begin_user()
  const requested_user_id = target_user_id.value
  const is_current_request = () => (
    is_page_active.value && !is_leaving.value && context === user_context
    && requested_user_id === target_user_id.value
  )
  try {
    const result = await selectLmUserInfo({
      userId: to_user_id_param(requested_user_id)
    }, context)
    if (!is_current_request()) return
    if (!result?.success) {
      if (result?.error !== 'Request cancelled.') {
        load_error.value = result?.error || 'Unable to load this profile.'
      }
      return
    }
    const data = result.data || {}
    const mapped = map_public_user_profile(data)
    const sent_count = Number(data.sentBlessingCount)
    if (mapped.user_id !== requested_user_id || !Array.isArray(data.wishList)
      || data.sentBlessingCount === null || data.sentBlessingCount === undefined
      || `${data.sentBlessingCount}`.trim() === '' || !Number.isFinite(sent_count) || sent_count < 0) {
      load_error.value = 'This profile is unavailable.'
      return
    }
    const mapped_wishes = map_profile_wishes(data.wishList)
    profile.value = mapped
    wishes.value = mapped_wishes
    wish_count.value = mapped_wishes.length
    sent_blessing_count.value = sent_count
    joined_date.value = format_profile_joined_date(data.createDate)
  } catch {
    if (is_current_request()) load_error.value = 'Unable to load this profile.'
  } finally {
    if (is_current_request()) is_loading.value = false
  }
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
  user_context.cancel?.()
  relation_context.cancel?.()
  const fallback = source_page.value || WALL_PAGE_PATH
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

const open_report = () => {
  if (!profile.value) return
  is_report_visible.value = true
}

const change_relation = async () => {
  if (!profile.value || !is_page_active.value || is_leaving.value
    || is_relation_pending.value || is_loading.value) return
  const was_following = relation.value !== 'none'
  is_relation_pending.value = true
  action_error.value = ''
  relation_context.cancel?.()
  relation_context = { cancel() {} }
  const context = relation_context
  const requested_user_id = target_user_id.value
  const is_current_request = () => (
    is_page_active.value && !is_leaving.value && context === relation_context
    && requested_user_id === target_user_id.value
  )
  try {
    const result = await updateUserRelation({
      beHandleUserId: to_user_id_param(requested_user_id),
      hanldeType: 1
    }, context)
    if (!is_current_request()) return
    if (!result?.success) {
      if (result?.error !== 'Request cancelled.') {
        action_error.value = result?.error || 'Unable to update this relationship.'
      }
      return
    }
    profile.value = was_following
      ? { ...profile.value, attention_flag: 0, friend_flag: 0 }
      : { ...profile.value, attention_flag: 1, friend_flag: 1 }
    await load_profile()
  } catch {
    if (is_current_request()) action_error.value = 'Unable to update this relationship.'
  } finally {
    if (is_page_active.value && context === relation_context) is_relation_pending.value = false
  }
}

const open_chat = () => {
  if (relation.value !== 'mutual' || is_relation_pending.value || is_leaving.value) return
  page_transition.value?.navigate_forward({
    url: build_profile_chat_url(target_user_id.value, profile_url(), profile.value || {})
  })
}

const open_wish = (wish) => {
  if (!wish?.wish_id || is_leaving.value) return
  page_transition.value?.navigate_forward({
    url: build_profile_wish_url(wish, profile_url())
  })
}

onLoad((query) => {
  target_user_id.value = read_profile_user_id(query)
  source_page.value = read_profile_back(query)
  if (!target_user_id.value) {
    is_loading.value = false
    load_error.value = 'This profile cannot be opened.'
    return
  }
  if (`${account_store.userId || ''}` === target_user_id.value) {
    redirect_self.value = true
    is_loading.value = false
    return
  }
  void load_profile()
})

onMounted(() => {
  if (!redirect_self.value) return
  is_leaving.value = true
  page_transition.value?.navigate_relaunch({ url: PROFILE_PAGE_PATH_SELF })
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  user_context.cancel?.()
  relation_context.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.profile-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.profile-header {
  display: flex;
  height: 80rpx;
  flex: none;
  align-items: center;
  padding: 0 36rpx;
}

.back-button {
  @include page_back.button;
}
.more-button {
  display: flex;
  width: 80rpx;
  height: 80rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 40rpx;
}

.more-button image {
  width: 52rpx;
  height: 60rpx;
}
.header-copy {
  min-width: 0;
  flex: 1;
  margin-left: 24rpx;
}

.header-title {
  display: block;
  color: var(--profile-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--profile-line);
  box-shadow: 0 0 18rpx var(--profile-line-shadow);
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  padding: 20rpx 36rpx 32rpx;
}

.identity-card,
.bio-card,
.stat-card,
.hint-card {
  border: 1px solid var(--profile-border);
  border-radius: 28rpx;
  background: var(--profile-surface);
}

.identity-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
}

.identity-avatar {
  width: 112rpx;
  height: 112rpx;
  flex: none;
  border-radius: 56rpx;
}

.identity-copy {
  min-width: 0;
  margin-left: 20rpx;
}

.identity-name {
  display: block;
  color: var(--profile-title);
  font-size: 36rpx;
  font-weight: 700;
}

.identity-location {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.identity-location image {
  width: 24rpx;
  height: 24rpx;
}

.identity-location text {
  margin-left: 8rpx;
  color: var(--profile-muted);
  font-size: 24rpx;
}

.identity-joined {
  display: block;
  margin-top: 8rpx;
  color: var(--profile-muted);
  font-size: 22rpx;
  line-height: 32rpx;
}

.bio-card {
  margin-top: 18rpx;
  padding: 24rpx 28rpx;
}

.bio-card text,
.hint-card text {
  color: var(--profile-copy);
  font-size: 26rpx;
  line-height: 38rpx;
}

.stat-card {
  display: flex;
  align-items: center;
  margin-top: 18rpx;
  padding: 28rpx 12rpx;
}

.stat-item {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  flex-direction: column;
}

.stat-item__value {
  font-size: 40rpx;
  font-weight: 700;
}

.stat-item__value--wish {
  color: var(--profile-wish);
}

.stat-item__value--blessing {
  color: var(--profile-blessing);
}

.stat-item__label {
  margin-top: 8rpx;
  color: var(--profile-muted);
  font-size: 22rpx;
  text-align: center;
}

.stat-divider {
  width: 2rpx;
  height: 64rpx;
  background: var(--profile-border);
}

.action-row {
  display: flex;
  margin-top: 20rpx;
  gap: 16rpx;
}

.relation-button,
.message-button {
  display: flex;
  box-sizing: border-box;
  width: 330rpx;
  height: 96rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 44rpx;
}

.relation-button {
  background: var(--profile-button);
  background: rgba(122,214,255,0.18);
  border-radius: 1998rpx 1998rpx 1998rpx 1998rpx;
  border: 2rpx solid rgba(122,214,255,0.4);
}

.relation-button image,
.message-button image,
.hint-card image {
  width: 28rpx;
  height: 28rpx;
}

.relation-button text {
  margin-left: 10rpx;
  color: var(--profile-title);
  font-size: 28rpx;
  font-weight: 700;
}

.relation-button--requested {
  border: 1px solid var(--profile-border);
 background: rgba(150,170,255,0.12);
}

.relation-button--requested text {
  color: var(--profile-muted);

}

.relation-button--mutual {
  border: 1px solid var(--profile-success);
  background: rgba(78,214,160,0.14);
}

.relation-button--mutual text {
  color: var(--profile-success);
}

.message-button {
  border: 1px solid var(--profile-border);
}

.message-button text {
  margin-left: 10rpx;
  color: var(--profile-muted);
  font-size: 28rpx;
  font-weight: 700;
}

.message-button--open {
  border-width: 0px;
}

.message-button--open text {
  color: var(--profile-title);
}

.hint-card {
  display: flex;
  align-items: flex-start;
  margin-top: 18rpx;
  padding: 22rpx 24rpx;
}

.hint-card image {
  margin-top: 4rpx;
  margin-right: 12rpx;
  flex: none;
}

.wish-heading {
  display: flex;
  align-items: center;
  margin-top: 32rpx;
}

.wish-heading text {
  color: var(--profile-muted);
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.wish-line {
  height: 2rpx;
  flex: 1;
  margin-left: 16rpx;
  background: var(--profile-border);
}

.wish-card {
  position: relative;
  height: 240rpx;
  margin-top: 18rpx;
  overflow: hidden;
  border-radius: 28rpx;
}

.wish-card__scene {
  width: 100%;
  height: 240rpx;
}

.wish-card__shade {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 20rpx 24rpx;
}

.wish-card__copy {
  display: block;
  color: var(--profile-title);
  font-size: 26rpx;
  font-weight: 700;
  line-height: 36rpx;
}

.wish-card__count {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.wish-card__count image {
  width: 24rpx;
  height: 24rpx;
}

.wish-card__count text {
  margin-left: 8rpx;
  color: var(--profile-blessing);
  font-size: 24rpx;
  font-weight: 700;
}

.profile-skeleton__card,
.profile-skeleton__line {
  background: var(--profile-skeleton);
  animation: profile-pulse 1.2s ease-in-out infinite;
}

.profile-skeleton__card {
  height: 180rpx;
  border-radius: 28rpx;
}

.profile-skeleton__line {
  height: 32rpx;
  margin-top: 20rpx;
  border-radius: 16rpx;
}

.state-card,
.empty-wishes,
.wish-error {
  margin-top: 20rpx;
  color: var(--profile-copy);
  font-size: 26rpx;
  line-height: 38rpx;
}

.state-card {
  display: flex;
  min-height: 360rpx;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.state-card__retry,
.wish-error view {
  height: 70rpx;
  margin-top: 16rpx;
  padding: 0 28rpx;
  border-radius: 35rpx;
  background: var(--profile-button);
  color: var(--profile-title);
  font-size: 25rpx;
  font-weight: 700;
  line-height: 70rpx;
}

.action-error {
  display: block;
  flex: none;
  margin: 0 36rpx 12rpx;
  color: var(--profile-copy);
  font-size: 24rpx;
  line-height: 34rpx;
}

@keyframes profile-pulse {
  0%,
  100% { opacity: 0.45; }
  50% { opacity: 1; }
}
</style>

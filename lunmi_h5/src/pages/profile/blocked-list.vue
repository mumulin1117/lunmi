<template>
  <PageTransition ref="page_transition" class="blocked-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="blocked-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Blocked users') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <view v-if="is_loading && users.length === 0" class="blocked-state">
        <BlockedUsersSkeleton />
      </view>
      <view v-else-if="load_error && users.length === 0" class="blocked-state blocked-state--error" role="alert">
        <text class="blocked-error__copy">{{ $t(load_error) }}</text>
        <view class="blocked-error__retry" role="button" @click="load_users">{{ $t('Try again') }}</view>
      </view>
      <view v-else-if="users.length === 0" class="blocked-empty">
        <image class="blocked-empty__mark" :src="EMPTY_MARK" mode="aspectFit" />
        <text class="blocked-empty__title">{{ $t(EMPTY_TITLE) }}</text>
        <text class="blocked-empty__copy">{{ $t(EMPTY_COPY) }}</text>
      </view>
      <scroll-view v-else class="blocked-scroll" scroll-y :show-scrollbar="false">
        <view class="blocked-scroll__inner">
          <text v-if="action_message" class="blocked-inline-error" role="alert">{{ $t(action_message) }}</text>
          <view v-for="item in users" :key="item.user_id" class="blocked-card">
            <UserAvatar class="blocked-card__avatar" :source="item.avatar_url" />
            <text class="blocked-card__name">{{ item.user_name || $t('Blocked user') }}</text>
            <view
              class="blocked-card__action"
              :class="{ 'blocked-card__action--pending': pending_ids.has(item.user_id) }"
              role="button"
              :aria-label="$t(`Unblock ${item.user_name || $t('user')}`)"
              :aria-disabled="pending_ids.has(item.user_id)"
              @click="unblock_user(item)"
            >
              <text>{{ $t('Unblock') }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectBlacklistedUsers, updateUserRelation } from '@/api/common'
import BlockedUsersSkeleton from '@/components/BlockedUsersSkeleton.vue'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import {
  EMPTY_COPY,
  EMPTY_MARK,
  EMPTY_TITLE,
  build_unblock_params,
  map_blocked_users,
  read_blocked_source
} from '@/utils/blockedUsersPresentation'
import { SETTINGS_PAGE_PATH } from '@/utils/settingsPresentation'

const page_transition = ref(null)
const source_page = ref(SETTINGS_PAGE_PATH)
const users = ref([])
const pending_ids = ref(new Set())
const is_loading = ref(true)
const load_error = ref('')
const action_message = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let load_token = 0
let list_context = {}
const unblock_contexts = new Map()

const theme_style = {
  '--blocked-background': theme.colors.page.background,
  '--blocked-title': theme.colors.text.title,
  '--blocked-copy': theme.colors.text.secondary,
  '--blocked-card': theme.colors.surface.card,
  '--blocked-border': theme.colors.surface.border,
  '--blocked-back': theme.colors.surface.deep,
  '--blocked-line': theme.colors.lantern_detail.title_line,
  '--blocked-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--blocked-action': theme.colors.status.coin,
  '--blocked-action-text': theme.colors.messages.segment_active_text,
  '--blocked-skeleton': theme.colors.surface.card,
  '--blocked-error': theme.colors.status.info,
  background: theme.colors.page.background
}

const remember_pending = (user_id, pending) => {
  const next = new Set(pending_ids.value)
  if (pending) next.add(user_id)
  else next.delete(user_id)
  pending_ids.value = next
}

// feedback_mode: region_loading — the list skeleton follows the blacklist query.
const load_users = async () => {
  if (!is_page_active.value || is_leaving.value) return
  const token = ++load_token
  list_context.cancel?.()
  list_context = {}
  if (users.value.length === 0) is_loading.value = true
  load_error.value = ''
  const result = await selectBlacklistedUsers(list_context)
  if (!is_page_active.value || is_leaving.value || token !== load_token) return
  if (!result?.success) {
    load_error.value = result?.error || 'Unable to load blocked users.'
    is_loading.value = false
    return
  }
  users.value = map_blocked_users(result.data)
  is_loading.value = false
}

// feedback_mode: control_pending — Unblock waits for the relation update, then the row leaves.
const unblock_user = async (item) => {
  const user_id = item?.user_id
  if (!user_id || pending_ids.value.has(user_id) || is_leaving.value) return
  action_message.value = ''
  remember_pending(user_id, true)
  const context = {}
  unblock_contexts.set(user_id, context)
  try {
    const result = await updateUserRelation(build_unblock_params(user_id), context)
    if (!is_page_active.value || is_leaving.value) return
    if (result?.data?.cancelled) return
    if (!result?.success) {
      action_message.value = result?.error || 'Unable to unblock this user.'
      return
    }
    users.value = users.value.filter((entry) => entry.user_id !== user_id)
  } catch (error) {
    if (is_page_active.value) action_message.value = error?.message || 'Unable to unblock this user.'
  } finally {
    unblock_contexts.delete(user_id)
    if (is_page_active.value) remember_pending(user_id, false)
  }
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  is_leaving.value = true
  load_token += 1
  list_context.cancel?.()
  unblock_contexts.forEach((context) => context.cancel?.())
  const fallback = source_page.value || SETTINGS_PAGE_PATH
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    const started = page_transition.value?.navigate_back({
      fail: () => {
        is_leaving.value = false
        page_transition.value?.navigate_relaunch({ url: fallback })
      }
    })
    if (!started) {
      is_leaving.value = false
      action_message.value = 'Unable to go back.'
    }
    return
  }
  const started = page_transition.value?.navigate_relaunch({
    url: fallback,
    fail: () => {
      is_leaving.value = false
      action_message.value = 'Unable to go back.'
    }
  })
  if (!started) {
    is_leaving.value = false
    action_message.value = 'Unable to go back.'
  }
}

onLoad((query = {}) => {
  source_page.value = read_blocked_source(query)
})

onShow(() => {
  load_users()
})

onBackPress(() => {
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  load_token += 1
  list_context.cancel?.()
  unblock_contexts.forEach((context) => context.cancel?.())
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.blocked-page {
  background: var(--blocked-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.blocked-header {
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
  min-width: 0;
  margin-left: 20rpx;
}

.header-title {
  display: block;
  color: var(--blocked-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 48rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 8rpx;
  border-radius: 999rpx;
  background: var(--blocked-line);
  box-shadow: 0 0 18rpx var(--blocked-line-shadow);
}

.blocked-state,
.blocked-empty {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 28rpx 36rpx 48rpx;
}

.blocked-state--error,
.blocked-empty {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.blocked-error__copy {
  color: var(--blocked-title);
  font-size: 28rpx;
  line-height: 1.4;
}

.blocked-error__retry {
  margin-top: 24rpx;
  color: var(--blocked-error);
  font-size: 28rpx;
  font-weight: 700;
}

.blocked-empty {
  padding-bottom: 120rpx;
}

.blocked-empty__mark {
  width: 168rpx;
  height: 168rpx;
}

.blocked-empty__title {
  display: block;
  margin-top: 36rpx;
  color: var(--blocked-title);
  font-size: 40rpx;
  font-weight: 700;
}

.blocked-empty__copy {
  display: block;
  max-width: 520rpx;
  margin-top: 16rpx;
  color: var(--blocked-copy);
  font-size: 28rpx;
  line-height: 1.45;
}

.blocked-scroll {
  min-height: 0;
  flex: 1;
}

.blocked-scroll__inner {
  padding: 28rpx 36rpx 48rpx;
}

.blocked-card {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 24rpx;
  border: 2rpx solid var(--blocked-border);
  border-radius: 32rpx;
  background: var(--blocked-card);
}

.blocked-card:first-child {
  margin-top: 0;
}

.blocked-card__avatar {
  width: 96rpx;
  height: 96rpx;
  flex: none;
  border-radius: 24rpx;
  overflow: hidden;
}

.blocked-card__name {
  min-width: 0;
  flex: 1;
  margin-left: 20rpx;
  overflow: hidden;
  color: var(--blocked-title);
  font-size: 30rpx;
  font-weight: 700;
  line-height: 40rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blocked-card__action {
  display: flex;
  height: 64rpx;
  flex: none;
  margin-left: 16rpx;
  padding: 0 24rpx;
  align-items: center;
  border-radius: 999rpx;
  background: var(--blocked-action);
  color: var(--blocked-action-text);
  font-size: 26rpx;
  font-weight: 700;
}

.blocked-card__action--pending {
  opacity: 0.6;
}

.blocked-inline-error {
  display: block;
  margin-bottom: 16rpx;
  color: var(--blocked-error);
  font-size: 24rpx;
  line-height: 34rpx;
}
</style>

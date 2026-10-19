<template>
  <PageTransition ref="page_transition" class="settings-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="settings-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Settings') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <scroll-view class="settings-scroll" scroll-y :show-scrollbar="false">
        <view class="settings-scroll__inner">
          <view class="account-card">
            <SettingsAccountSkeleton v-if="is_loading && !account" />
            <view v-else-if="load_error && !account" class="account-error" role="alert">
              <text>{{ $t(load_error) }}</text>
              <view role="button" @click="load_account">{{ $t('Try again') }}</view>
            </view>
            <template v-else-if="account">
              <UserAvatar v-if="account.avatar_url" class="account-avatar" :source="account.avatar_url" />
              <view v-else class="account-avatar account-avatar--empty" aria-hidden="true" />
              <view class="account-copy">
                <text class="account-name">{{ account.user_name || $t('You') }}</text>
                <text v-if="account.email" class="account-email">{{ account.email }}</text>
              </view>
            </template>
          </view>
          <text v-if="load_error && account" class="settings-inline-error" role="alert">{{ $t(load_error) }}</text>
          <text v-if="action_message" class="settings-inline-error" role="alert">{{ $t(action_message) }}</text>
          <view
            v-for="item in setting_rows"
            :key="item.key"
            class="settings-row"
            role="button"
            :aria-label="$t(item.title)"
            @click="open_row(item)"
          >
            <image class="settings-row__icon" :src="item.icon" mode="aspectFit" />
            <text class="settings-row__title">{{ $t(item.title) }}</text>
            <text v-if="item.value" class="settings-row__value">{{ $t(item.value) }}</text>
            <ArrowRight class="settings-row__arrow" />
          </view>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <LogoutConfirmDialog
      :visible="is_logout_visible"
      :pending="is_logging_out"
      :error="logout_error"
      @cancel="cancel_logout"
      @confirm="confirm_logout"
    />
    <LogoutLoading v-if="is_logging_out" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import { ArrowRight } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import { selectUserInfo } from '@/api/common'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog.vue'
import LogoutLoading from '@/components/LogoutLoading.vue'
import PageTransition from '@/components/PageTransition.vue'
import SettingsAccountSkeleton from '@/components/SettingsAccountSkeleton.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import { clear_login_state } from '@/utils/auth'
import { read_app_language_label } from '@/utils/languagePreference'
import {
  BLOCKED_PAGE_PATH,
  DELETE_ACCOUNT_PAGE_PATH,
  FEEDBACK_PAGE_PATH,
  LANGUAGE_PAGE_PATH,
  LOGIN_PAGE_PATH,
  PRIVACY_PAGE_PATH,
  PROFILE_PAGE_PATH,
  SAFETY_PAGE_PATH,
  build_settings_url,
  build_terms_url,
  map_settings_account,
  read_settings_source
} from '@/utils/settingsPresentation'
import { PERMISSION_RECORD_PAGE_PATH } from '@/utils/permissionRecordsPresentation'

const page_transition = ref(null)
const source_page = ref(PROFILE_PAGE_PATH)
const account = ref(null)
const language_label = ref(read_app_language_label())
const is_loading = ref(true)
const load_error = ref('')
const action_message = ref('')
const is_logout_visible = ref(false)
const is_logging_out = ref(false)
const logout_error = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let allow_route_back = false
let request_context = {}

const theme_style = {
  '--settings-background': theme.colors.page.background,
  '--settings-title': theme.colors.text.title,
  '--settings-copy': theme.colors.text.secondary,
  '--settings-muted': theme.colors.text.tertiary,
  '--settings-border': theme.colors.surface.border,
  '--settings-card': theme.colors.surface.card,
  '--settings-back': theme.colors.surface.deep,
  '--settings-line': theme.colors.lantern_detail.title_line,
  '--settings-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--settings-skeleton': theme.colors.surface.card_strong,
  '--settings-error': theme.colors.status.info,
  '--settings-arrow': theme.colors.icon.secondary,
  background: theme.colors.page.background
}

const setting_rows = computed(() => [
  { key: 'privacy', title: 'Privacy Policy', icon: '/static/icon/setting_privacy.png', url: build_settings_url(PRIVACY_PAGE_PATH) },
  { key: 'language', title: 'Language', icon: '/static/icon/setting_language.png', value: language_label.value, url: build_settings_url(LANGUAGE_PAGE_PATH) },
  { key: 'safety', title: 'Safety & Support', icon: '/static/icon/setting_safety.png', url: build_settings_url(SAFETY_PAGE_PATH) },
  { key: 'terms', title: 'Terms of Service', icon: '/static/icon/setting_terms.png', url: build_terms_url() },
  { key: 'blocked', title: 'Blocked users', icon: '/static/icon/setting_blocks.png', url: build_settings_url(BLOCKED_PAGE_PATH) },
  { key: 'feedback', title: 'Feedback', icon: '/static/icon/setting_feed_back.png', url: build_settings_url(FEEDBACK_PAGE_PATH) },
  { key: 'logout', title: 'Log out', icon: '/static/icon/setting_logout.png', action: 'logout' },
  { key: 'delete', title: 'Delete Account', icon: '/static/icon/post_details_del.png', url: build_settings_url(DELETE_ACCOUNT_PAGE_PATH) },
  // { key: 'permissions', title: 'Authorization records', icon: '/static/icon/notiication_release.png', url: build_settings_url(PERMISSION_RECORD_PAGE_PATH) },
])

const load_account = async () => {
  if (!is_page_active.value || is_leaving.value) return
  const user_id = storeGlobal().userId
  if (!user_id) {
    account.value = null
    load_error.value = 'Sign in to open settings.'
    is_loading.value = false
    return
  }
  request_context.cancel?.()
  request_context = {}
  if (!account.value) is_loading.value = true
  load_error.value = ''
  const result = await selectUserInfo({ userId: user_id }, request_context)
  if (!is_page_active.value || is_leaving.value) return
  if (!result?.success) {
    load_error.value = result?.error || 'Unable to load your account.'
    is_loading.value = false
    return
  }
  account.value = map_settings_account(result.data)
  is_loading.value = false
}

const open_row = (item) => {
  if (is_leaving.value) return
  action_message.value = ''
  if (item.action === 'logout') {
    logout_error.value = ''
    is_logout_visible.value = true
    return
  }
  const started = page_transition.value?.navigate_forward({
    url: item.url,
    fail: () => {
      action_message.value = `${item.title} is unavailable.`
    }
  })
  if (!started) action_message.value = `${item.title} is unavailable.`
}

const restore_login_snapshot = (snapshot) => {
  const store = storeGlobal()
  store.login(snapshot.token, snapshot.userInfo)
  store.setBalance(snapshot.balance)
  store.setLoginStatus(snapshot.isLogin)
}

// feedback_mode: confirm_then_loading
const confirm_logout = () => {
  if (is_logging_out.value || is_leaving.value) return
  is_logging_out.value = true
  logout_error.value = ''
  const store = storeGlobal()
  const snapshot = {
    token: store.token,
    userInfo: store.userInfo ? { ...store.userInfo } : {},
    balance: store.balance,
    isLogin: store.isLogin
  }
  try {
    clear_login_state()
  } catch {
    is_logging_out.value = false
    logout_error.value = 'Unable to log out.'
    return
  }
  request_context.cancel?.()
  const fail_logout = () => {
    restore_login_snapshot(snapshot)
    is_logging_out.value = false
    is_leaving.value = false
    logout_error.value = 'Unable to log out.'
  }
  is_leaving.value = true
  const started = page_transition.value?.navigate_relaunch({
    url: LOGIN_PAGE_PATH,
    fail: fail_logout
  })
  if (!started) fail_logout()
}

const cancel_logout = () => {
  if (is_logging_out.value) return
  is_logout_visible.value = false
  logout_error.value = ''
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value || is_logging_out.value) return
  if (is_logout_visible.value) {
    is_logout_visible.value = false
    return
  }
  is_leaving.value = true
  request_context.cancel?.()
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        is_leaving.value = false
        page_transition.value?.navigate_relaunch({ url: source_page.value })
      }
    })
    if (!started) {
      allow_route_back = false
      is_leaving.value = false
      action_message.value = 'Unable to go back.'
    }
    return
  }
  const started = page_transition.value?.navigate_relaunch({
    url: source_page.value,
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
  source_page.value = read_settings_source(query)
})

onShow(() => {
  language_label.value = read_app_language_label()
  load_account()
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  request_context.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.settings-page {
  background: var(--settings-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.settings-header {
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
  margin-left: 24rpx;
}

.header-title {
  display: block;
  color: var(--settings-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--settings-line);
  box-shadow: 0 0 18rpx var(--settings-line-shadow);
}

.settings-scroll {
  min-height: 0;
  flex: 1;
}

.settings-scroll__inner {
  padding: 28rpx 36rpx 32rpx;
}

.account-card,
.settings-row {
  display: flex;
  align-items: center;
  border: 1px solid var(--settings-border);
  border-radius: 32rpx;
  background: var(--settings-card);
}

.account-card {
  min-height: 144rpx;
  padding: 24rpx 28rpx;
}

.account-avatar {
  width: 96rpx;
  height: 96rpx;
  flex: none;
  border-radius: 50%;
  overflow: hidden;
}

.account-avatar--empty {
  background: var(--settings-skeleton);
}

.account-copy {
  min-width: 0;
  margin-left: 20rpx;
}

.account-name {
  display: block;
  color: var(--settings-title);
  font-size: 32rpx;
  font-weight: 700;
}

.account-email {
  display: block;
  margin-top: 6rpx;
  color: var(--settings-copy);
  font-size: 24rpx;
}

.account-error {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: var(--settings-title);
  font-size: 26rpx;
  line-height: 1.4;
}

.account-error view {
  margin-left: 24rpx;
  color: var(--settings-error);
  font-size: 26rpx;
  font-weight: 700;
}

.settings-inline-error {
  display: block;
  margin-top: 16rpx;
  color: var(--settings-error);
  font-size: 24rpx;
  line-height: 1.4;
}

.settings-row {
  height: 112rpx;
  margin-top: 20rpx;
  padding: 0 28rpx;
}

.settings-row__icon {
  width: 72rpx;
  height: 72rpx;
  flex: none;
}

.settings-row__title {
  min-width: 0;
  flex: 1;
  margin-left: 20rpx;
  color: var(--settings-title);
  font-size: 30rpx;
  font-weight: 700;
}

.settings-row__value {
  margin-right: 8rpx;
  color: var(--settings-muted);
  font-size: 26rpx;
}

.settings-row__arrow {
  width: 32rpx;
  height: 32rpx;
  flex: none;
  color: var(--settings-arrow);
}
</style>

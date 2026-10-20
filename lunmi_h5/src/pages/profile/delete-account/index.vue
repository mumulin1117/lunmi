<template>
  <PageTransition ref="page_transition" class="delete-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="delete-header">
        <image class="back-button" role="button" :aria-label="$t('Go back to settings')" :aria-disabled="is_deleting" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Delete account') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <scroll-view class="delete-scroll" scroll-y :show-scrollbar="false">
        <view class="delete-scroll__inner">
          <view class="delete-hero">
            <view class="delete-hero__icon" aria-hidden="true">
              <image src="/static/icon/delete_account_trash.svg" mode="aspectFit" />
            </view>
            <text class="delete-hero__title">{{ $t('Delete account') }}</text>
            <text class="delete-hero__copy">{{ $t('This cannot be undone') }}</text>
          </view>
          <view class="affected-grid">
            <view class="affected-card">
              <image src="/static/icon/signup_user_design.png" mode="aspectFit" />
              <text>{{ $t('Profile') }}</text>
            </view>
            <view class="affected-card">
              <image src="/static/icon/del_account_lantern.png" mode="aspectFit" />
              <text>{{ $t('Lanterns') }}</text>
            </view>
            <view class="affected-card">
              <image src="/static/icon/delete_account_messages.svg" mode="aspectFit" />
              <text>{{ $t('Messages') }}</text>
            </view>
            <view class="affected-card affected-card--coins">
              <image src="/static/icon/del_account_coib.png" mode="aspectFit" />
              <text>{{ $t(coin_label) }}</text>
            </view>
          </view>
          <view v-if="balance_error" class="balance-error" role="alert">
            <text>{{ $t(balance_error) }}</text>
            <view role="button" :aria-disabled="is_balance_loading || is_deleting || is_deleted" @click="load_balance">{{ $t('Try again') }}</view>
          </view>
          <view
            class="acknowledgement"
            role="checkbox"
            :aria-checked="is_understood"
            :aria-disabled="is_deleting || is_deleted"
            @click="toggle_understanding"
          >
            <view class="acknowledgement__box" :class="{ 'acknowledgement__box--checked': is_understood }">
              <image v-if="is_understood" src="/static/icon/login_terms_check.png" mode="aspectFit" />
            </view>
            <text>{{ $t('I understand') }}</text>
          </view>
          <view
            class="delete-button"
            :class="{ 'delete-button--disabled': !can_delete }"
            role="button"
            :aria-disabled="!can_delete"
            @click="open_confirmation"
          >{{ $t('Delete my account') }}</view>
          <view v-if="navigation_error" class="navigation-error" role="alert">
            <text>{{ $t(navigation_error) }}</text>
            <view v-if="is_deleted" role="button" @click="open_login">{{ $t('Go to login') }}</view>
          </view>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <DeleteAccountConfirmDialog
      :visible="is_confirm_visible"
      :pending="is_deleting"
      :error="delete_error"
      @cancel="close_confirmation"
      @confirm="confirm_deletion"
    />
    <DeleteObjectLoading v-if="is_deleting" :title="$t('Deleting account...')" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { destroyCount, selectUserBalance } from '@/api/common'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import DeleteAccountConfirmDialog from '@/components/DeleteAccountConfirmDialog.vue'
import DeleteObjectLoading from '@/components/DeleteObjectLoading.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { storeGlobal } from '@/stores/store'
import { clear_deleted_account_state } from '@/utils/auth'
import { format_profile_count, read_coin_balance } from '@/utils/myProfilePresentation'
import { LOGIN_PAGE_PATH, SETTINGS_PAGE_PATH } from '@/utils/settingsPresentation'

const account_store = storeGlobal()
const page_transition = ref(null)
const coin_balance = ref(null)
const balance_error = ref('')
const is_balance_loading = ref(false)
const is_understood = ref(false)
const is_confirm_visible = ref(false)
const is_deleting = ref(false)
const is_deleted = ref(false)
const delete_error = ref('')
const navigation_error = ref('')
const is_leaving = ref(false)
let is_page_active = true
let allow_route_back = false
let balance_context = null
let delete_context = null

const can_delete = computed(() => is_understood.value && !is_deleting.value && !is_deleted.value && !is_leaving.value)
const coin_label = computed(() => (
  coin_balance.value !== null ? `${format_profile_count(coin_balance.value)} coins`
    : is_balance_loading.value ? 'Loading...' : 'Coins'
))
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--delete-title': theme.colors.text.title,
  '--delete-copy': theme.colors.text.tertiary,
  '--delete-muted': theme.colors.text.secondary,
  '--delete-border': theme.colors.surface.border,
  '--delete-surface': theme.colors.surface.card,
  '--delete-back': theme.colors.lantern_detail.header_surface,
  '--delete-line': theme.colors.lantern_detail.title_line,
  '--delete-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--delete-hero': theme.colors.delete_account.hero_background,
  '--delete-checkbox-border': theme.colors.delete_account.checkbox_border,
  '--delete-coin': theme.colors.status.coin,
  '--delete-danger': theme.colors.dialog.danger.background,
  '--delete-danger-text': theme.colors.dialog.danger.text,
  '--delete-disabled': theme.colors.delete_account.disabled_background,
  '--delete-checkbox-active': theme.colors.button_change.active.background,
  background: theme.colors.page.background
}

const load_balance = async () => {
  if (!is_page_active || is_deleting.value || is_deleted.value || is_leaving.value) return
  balance_context?.cancel?.()
  const context = {}
  balance_context = context
  const user_id = `${account_store.userId || ''}`
  is_balance_loading.value = true
  balance_error.value = ''
  const is_current_request = () => (
    is_page_active && balance_context === context && !is_deleted.value && !is_deleting.value
    && `${account_store.userId || ''}` === user_id
  )
  try {
    const result = await selectUserBalance({}, context)
    if (!is_current_request()) return
    if (!result?.success || result.data === null || result.data === undefined) {
      if (result?.error !== 'Request cancelled.') balance_error.value = result?.error || 'Unable to load your coins.'
      return
    }
    coin_balance.value = read_coin_balance(result.data)
  } catch {
    if (is_current_request()) balance_error.value = 'Unable to load your coins.'
  } finally {
    if (balance_context === context) {
      balance_context = null
      is_balance_loading.value = false
    }
  }
}

const toggle_understanding = () => {
  if (is_deleting.value || is_deleted.value || is_leaving.value) return
  is_understood.value = !is_understood.value
}
const open_confirmation = () => {
  if (!can_delete.value || !is_page_active) return
  delete_error.value = ''
  is_confirm_visible.value = true
}
const close_confirmation = () => {
  if (is_deleting.value) return
  is_confirm_visible.value = false
  delete_error.value = ''
}

const open_login = () => {
  if (!is_page_active || is_leaving.value || !is_deleted.value) return
  is_leaving.value = true
  navigation_error.value = ''
  const fail_login = () => {
    is_leaving.value = false
    navigation_error.value = 'Your account was deleted. Please go to login.'
  }
  const started = page_transition.value?.navigate_relaunch({
    url: LOGIN_PAGE_PATH,
    immediate: true,
    fail: fail_login
  })
  if (!started) fail_login()
}

// feedback_mode: confirm_then_loading; only confirmed server success clears the session.
const confirm_deletion = async () => {
  if (!is_confirm_visible.value || !can_delete.value || !is_page_active) return
  const user_id = `${account_store.userId || ''}`
  is_deleting.value = true
  delete_error.value = ''
  balance_context?.cancel?.()
  balance_context = null
  is_balance_loading.value = false
  const context = {}
  delete_context = context
  const is_current_request = () => (
    is_page_active && delete_context === context && `${account_store.userId || ''}` === user_id
  )
  try {
    const result = await destroyCount({}, context)
    if (!is_current_request()) return
    if (!result?.success || result.data !== true) {
      if (result?.error !== 'Request cancelled.') delete_error.value = result?.error || 'Unable to delete your account.'
      return
    }
    is_deleted.value = true
    is_confirm_visible.value = false
    clear_deleted_account_state()
    open_login()
  } catch {
    if (is_deleted.value) {
      navigation_error.value = 'Your account was deleted. Please go to login.'
    } else if (is_current_request()) {
      delete_error.value = 'Unable to delete your account. Please try again.'
    }
  } finally {
    if (delete_context === context) {
      delete_context = null
      is_deleting.value = false
    }
  }
}

const go_back = () => {
  if (!is_page_active || is_leaving.value || is_deleting.value) return
  if (is_deleted.value) {
    open_login()
    return
  }
  if (is_confirm_visible.value) {
    close_confirmation()
    return
  }
  is_leaving.value = true
  balance_context?.cancel?.()
  const fail_back = () => {
    allow_route_back = false
    is_leaving.value = false
    navigation_error.value = 'Unable to return to settings. Please try again.'
  }
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const previous_route = `${pages[pages.length - 2]?.route || ''}`.replace(/^\//, '')
  if (previous_route === SETTINGS_PAGE_PATH.slice(1)) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: fail_back
    })
    if (!started) fail_back()
    return
  }
  const started = page_transition.value?.navigate_replace({ url: SETTINGS_PAGE_PATH, fail: fail_back })
  if (!started) fail_back()
}

onShow(load_balance)
onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})
onBeforeUnmount(() => {
  is_page_active = false
  balance_context?.cancel?.()
  delete_context?.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.delete-page { background: var(--page-background); }

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.delete-header {
  display: flex;
  height: 80rpx;
  flex: none;
  align-items: center;
  margin-top: 24rpx;
  padding: 0 36rpx;
}

.back-button {
  @include page_back.button;
}

.header-copy { min-width: 0; margin-left: 24rpx; }

.header-title {
  display: block;
  color: var(--delete-title);
  font-size: 48rpx;
  font-weight: 700;
  line-height: 60rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--delete-line);
  box-shadow: 0 0 18rpx var(--delete-line-shadow);
}

.delete-scroll { height: 0; min-height: 0; flex: 1; }
.delete-scroll__inner { padding: 36rpx 36rpx 48rpx; }
.delete-hero { text-align: center; }

.delete-hero__icon {
  display: flex;
  width: 192rpx;
  height: 192rpx;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border-radius: 96rpx;
  background: var(--delete-hero);
}

.delete-hero__icon image { width: 64rpx; height: 64rpx; }

.delete-hero__title {
  display: block;
  margin-top: 44rpx;
  color: var(--delete-title);
  font-size: 50rpx;
  font-weight: 700;
  line-height: 64rpx;
}

.delete-hero__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--delete-muted);
  font-size: 28rpx;
  line-height: 40rpx;
}

.affected-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 58rpx;
  gap: 20rpx;
}

.affected-card {
  display: flex;
  box-sizing: border-box;
  height: 220rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--delete-border);
  border-radius: 44rpx;
  background: var(--delete-surface);
  gap: 26rpx;
}

.affected-card image { width: 44rpx; height: 44rpx; }

.affected-card text {
  color: var(--delete-copy);
  font-size: 28rpx;
  font-weight: 700;
  line-height: 38rpx;
}

.affected-card--coins text { color: var(--delete-coin); }

.acknowledgement {
  display: flex;
  align-items: center;
  margin-top: 44rpx;
  gap: 22rpx;
}

.acknowledgement__box {
  display: flex;
  box-sizing: border-box;
  width: 52rpx;
  height: 52rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--delete-checkbox-border);
  border-radius: 18rpx;
}

.acknowledgement__box--checked {
  border-color: var(--delete-coin);
  background: var(--delete-checkbox-active);
}

.acknowledgement__box image { width: 30rpx; height: 30rpx; }

.acknowledgement text { color: var(--delete-copy); font-size: 28rpx; line-height: 42rpx; }

.delete-button {
  height: 116rpx;
  margin-top: 40rpx;
  border-radius: 58rpx;
  background: var(--delete-danger);
  color: var(--delete-danger-text);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 116rpx;
  text-align: center;
}

.delete-button--disabled { background: var(--delete-disabled); color: var(--delete-muted); }

.balance-error,
.navigation-error {
  margin-top: 20rpx;
  color: var(--delete-danger);
  font-size: 24rpx;
  line-height: 34rpx;
}

.balance-error text,
.navigation-error text { display: block; }

.balance-error view,
.navigation-error view { margin-top: 12rpx; font-weight: 700; }
</style>

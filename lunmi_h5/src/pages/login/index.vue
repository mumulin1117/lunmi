<template>
  <PageTransition ref="page_transition" class="login-page" :style="theme_style">
    <image class="login-scene" src="/static/icon/login_bg.png" mode="aspectFill" aria-hidden="true" />
    <!-- LoginTopBar 接管顶部安全区，因此不渲染 TopSafeArea。 -->
    <LoginTopBar @back="go_back" />
    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
      <view class="content-scroll__inner">
        <AuthLotusGlow class="login-lotus" source="/static/icon/login_lotus.png" />
        <text class="login-title">{{ $t('Welcome back') }}</text>
        <view class="login-form">
          <view class="login-field" :class="{ 'login-field--invalid': email_error }">
            <image class="login-field__icon" src="/static/icon/login_email_design.png" mode="aspectFit" />
            <input
              v-model="email"
              class="login-input"
              type="text"
              autocomplete="email"
              :placeholder="$t('Please enter your email')"
              placeholder-class="login-placeholder"
              @input="clear_email_error"
            />
          </view>
          <text v-if="email_error" class="login-error">{{ $t(email_error) }}</text>
          <view class="login-field" :class="{ 'login-field--invalid': password_error }">
            <image class="login-field__icon" src="/static/icon/login_lock_design.png" mode="aspectFit" />
            <input
              v-model="password"
              class="login-input"
              :password="!is_password_visible"
              autocomplete="current-password"
              :placeholder="$t('Please enter password')"
              placeholder-class="login-placeholder"
              @confirm="sign_in"
              @input="clear_password_error"
            />
            <view
              class="password-toggle"
              role="button"
              :aria-label="$t(is_password_visible ? 'Hide password' : 'Show password')"
              @click="is_password_visible = !is_password_visible"
            >
              <Hide v-if="is_password_visible" class="password-toggle__icon" />
              <View v-else class="password-toggle__icon" />
            </view>
          </view>
          <text v-if="password_error" class="login-error">{{ $t(password_error) }}</text>
          <text v-if="login_error" class="login-error" role="alert">{{ $t(login_error) }}</text>
          <text v-if="terms_error" class="login-error">{{ $t(terms_error) }}</text>
        </view>
      </view>
    </scroll-view>
    <view class="login-consent-region">
      <view class="login-terms" role="checkbox" :aria-checked="is_terms_agreed" @click="toggle_terms">
        <view class="login-terms__box" :class="{ 'login-terms__box--checked': is_terms_agreed }">
          <image
            v-if="is_terms_agreed"
            class="login-terms__check"
            src="/static/icon/login_terms_check.png"
            mode="aspectFit"
          />
        </view>
        <view class="login-terms__copy">
          <text class="login-terms__label">{{ $t('I agree to the') }} </text>
          <text class="login-terms__link" role="button" @click.stop="open_terms">{{ $t('Terms') }}</text>
          <text class="login-terms__label"> {{ $t('and') }} </text>
          <text class="login-terms__link" role="button" @click.stop="open_privacy">{{ $t('Privacy') }}</text>
        </view>
      </view>
    </view>
    <!-- LoginActionBar 接管底部安全区，因此不渲染 BottomSafeArea。 -->
    <LoginActionBar :disabled="is_signing_in || is_entering_app" @sign-in="sign_in" @create-account="open_signup" />
    <AccountActionLoading v-if="is_signing_in" action="login" />
  </PageTransition>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onUnload } from '@dcloudio/uni-app'
import { Hide, View } from '@element-plus/icons-vue'
import { emailLogin } from '@/api/auth'
import theme from '@/config/theme.json'
import AccountActionLoading from '@/components/AccountActionLoading.vue'
import AuthLotusGlow from '@/components/AuthLotusGlow.vue'
import LoginActionBar from '@/components/LoginActionBar.vue'
import LoginTopBar from '@/components/LoginTopBar.vue'
import PageTransition from '@/components/PageTransition.vue'
import { storeGlobal } from '@/stores/store'
import { ROUTE_MOTION } from '@/utils/routeTransition'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HOME_PAGE_PATH = '/pages/home/index'
const SETUP_PAGE_PATH = '/pages/profile/setup/index'

const page_transition = ref(null)
const account_store = storeGlobal()
const email = ref('')
const password = ref('')
const email_error = ref('')
const password_error = ref('')
const terms_error = ref('')
const login_error = ref('')
const is_password_visible = ref(false)
const is_terms_agreed = ref(false)
const is_signing_in = ref(false)
const is_entering_app = ref(false)
const is_page_active = ref(true)
const login_request_context = {}
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--login-page-background': theme.colors.page.background,
  '--login-title-color': theme.colors.text.on_media,
  '--login-field-background': theme.colors.surface.card,
  '--login-field-border': theme.colors.surface.border,
  '--login-field-text': theme.colors.text.title,
  '--login-placeholder-color': theme.colors.text.secondary,
  '--login-accent-color': theme.colors.status.coin,
  '--login-link-color': theme.colors.status.info,
  '--login-error-color': theme.colors.status.danger,
  '--login-icon-color': theme.colors.icon.secondary,
  '--login-button-background': theme.colors.button.primary,
  '--login-button-text': theme.colors.button.text,
  '--login-ghost-background': theme.colors.button.ghost.background,
  '--login-ghost-border': theme.colors.button.ghost.border,
  '--login-ghost-text': theme.colors.button.ghost.text
}

const clear_email_error = () => {
  email_error.value = ''
  login_error.value = ''
}

const clear_password_error = () => {
  password_error.value = ''
  login_error.value = ''
}

// feedback_mode: immediate — the checkbox only changes the current control.
const toggle_terms = () => {
  is_terms_agreed.value = !is_terms_agreed.value
  if (is_terms_agreed.value) terms_error.value = ''
}

const open_terms = () => {
  page_transition.value?.navigate_forward({
    url: '/pages/profile/user-agreement?type=terms&sourcePage=login'
  })
}

const open_privacy = () => {
  page_transition.value?.navigate_forward({
    url: '/pages/profile/privacy?sourcePage=login'
  })
}

const open_signup = () => {
  if (is_signing_in.value || is_entering_app.value) return
  page_transition.value?.navigate_forward({
    url: '/pages/signup/index?sourcePage=login'
  })
}

const go_back = () => {
  if (is_signing_in.value || is_entering_app.value) return
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
      }
    })
    if (!started) allow_route_back = false
    return
  }
  page_transition.value?.navigate_relaunch({ url: '/pages/welcome/index' })
}

const destination_after_login = (user) => {
  const user_name = `${user?.userName || ''}`.trim()
  return user_name ? HOME_PAGE_PATH : SETUP_PAGE_PATH
}

// feedback_mode: page_action_loading — AccountActionLoading follows the login request.
const sign_in = async () => {
  if (is_signing_in.value || is_entering_app.value) return
  email_error.value = ''
  password_error.value = ''
  terms_error.value = ''
  login_error.value = ''
  const normalized_email = email.value.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(normalized_email)) {
    email_error.value = 'Please enter a valid email address.'
    return
  }
  if (!password.value.trim()) {
    password_error.value = 'Please enter your password.'
    return
  }
  if (!is_terms_agreed.value) {
    terms_error.value = 'Agree to the Terms and Privacy before signing in.'
    return
  }
  uni.hideKeyboard?.()
  document.activeElement?.blur?.()
  is_signing_in.value = true
  try {
    const result = await emailLogin({
      userEmail: normalized_email,
      password: password.value.trim(),
      type: 1
    }, login_request_context)
    if (!is_page_active.value) return
    if (!result?.success) {
      if (result?.error !== 'Request cancelled.') {
        login_error.value = result?.error || 'Unable to sign in. Please try again.'
      }
      return
    }
    const token = `${result.data?.token || ''}`.trim()
    if (!token) {
      login_error.value = 'Unable to sign in. The login response is incomplete.'
      return
    }
    account_store.login(token, result.data || {})
    is_entering_app.value = true
    is_signing_in.value = false
    await nextTick()
    if (!is_page_active.value) return
    const destination = destination_after_login(result.data)
    const started = page_transition.value?.navigate_relaunch({
      url: destination,
      immediate: true,
      entry_motion: ROUTE_MOTION.CURTAIN,
      fail: () => {
        if (!is_page_active.value) return
        is_entering_app.value = false
        login_error.value = 'Unable to open your account. Please try signing in again.'
      }
    })
    if (!started) {
      is_entering_app.value = false
      login_error.value = 'Unable to open your account. Please try signing in again.'
    }
  } catch {
    if (is_page_active.value) {
      is_entering_app.value = false
      login_error.value = 'Unable to sign in. Please try again.'
    }
  } finally {
    if (is_page_active.value) is_signing_in.value = false
  }
}

onLoad((query = {}) => {
  if (query.email) email.value = decodeURIComponent(`${query.email}`)
})

onBackPress(() => {
  if (allow_route_back) return false
  return true
})

const dispose_login = () => {
  if (!is_page_active.value) return
  is_page_active.value = false
  login_request_context.cancel?.()
}
onUnload(dispose_login)
onBeforeUnmount(dispose_login)
</script>

<style scoped lang="scss">
.login-page {
  position: relative;
  background: var(--login-page-background);
  color: var(--login-title-color);
}

.login-scene {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.content-scroll {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 100%;
  height: 0;
  min-height: 0;
  flex: 1;
}

.content-scroll__inner {
  display: flex;
  box-sizing: border-box;
  min-height: 100%;
  flex-direction: column;
  padding: 24rpx 40rpx 44rpx;
}

.login-lotus {
  width: 220rpx;
  height: 200rpx;
  flex: none;
  margin: 36rpx auto 0;
}

.login-title {
  display: block;
  flex: none;
  margin-top: 20rpx;
  color: var(--login-title-color);
  font-size: 56rpx;
  font-weight: 800;
  line-height: 68rpx;
  text-align: center;
}

.login-form {
  flex: none;
  margin: auto 0 0;
  padding: 28rpx 0 0;
}

.login-form > .login-field:first-child { margin-top: 0; }

.login-field {
  display: flex;
  box-sizing: border-box;
  height: 112rpx;
  align-items: center;
  margin-top: 28rpx;
  padding: 0 32rpx;
  border: 1px solid var(--login-field-border);
  border-radius: 999rpx;
  background: var(--login-field-background);
}

.login-field--invalid {
  border-color: var(--login-error-color);
}

.login-field__icon {
  width: 40rpx;
  height: 40rpx;
  flex: none;
}

.login-input {
  width: 0;
  height: 112rpx;
  min-width: 0;
  margin-left: 20rpx;
  color: var(--login-field-text);
  font-size: 30rpx;
  flex: 1;
}

:deep(.login-placeholder) {
  color: var(--login-placeholder-color);
}

.password-toggle {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
  flex: none;
}

.password-toggle__icon {
  width: 40rpx;
  height: 40rpx;
  color: var(--login-icon-color);
}

.login-error {
  display: block;
  margin-top: 12rpx;
  padding: 0 24rpx;
  color: var(--login-error-color);
  font-size: 24rpx;
  font-weight: 600;
  line-height: 34rpx;
}

.login-consent-region {
  position: relative;
  z-index: 1;
  flex: none;
  padding: 0 40rpx 36rpx;
}

.login-terms {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.login-terms__box {
  display: flex;
  width: 48rpx;
  height: 48rpx;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--login-accent-color);
  border-radius: 14rpx;
  flex: none;
}

.login-terms__box--checked {
  background: var(--login-accent-color);
}

.login-terms__check {
  width: 28rpx;
  height: 28rpx;
}

.login-terms__copy {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.login-terms__label {
  color: var(--login-title-color);
  font-size: 28rpx;
  font-weight: 600;
  line-height: 40rpx;
}

.login-terms__link {
  color: var(--login-link-color);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 40rpx;
  padding: 0 10rpx;
}
</style>

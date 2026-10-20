<template>
  <PageTransition ref="page_transition" class="signup-page" :style="theme_style">
    <image class="signup-scene" src="/static/icon/login_bg.png" mode="aspectFill" aria-hidden="true" />
    <!-- LoginTopBar 接管顶部安全区，因此不渲染 TopSafeArea。 -->
    <LoginTopBar @back="go_back" />
    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
      <view class="content-scroll__inner">
        <AuthLotusGlow class="signup-lotus" source="/static/icon/signup_lotus.png" />
        <text class="signup-title">{{ $t('Create account') }}</text>
        <view class="signup-form">
          <view class="signup-field" :class="{ 'signup-field--invalid': username_error }">
            <image class="signup-field__icon" src="/static/icon/signup_user_design.png" mode="aspectFit" />
            <input
              v-model="username"
              class="signup-input"
              maxlength="30"
              :placeholder="$t('Username')"
              placeholder-class="signup-placeholder"
              @input="username_error = ''"
            />
          </view>
          <text v-if="username_error" class="signup-error">{{ $t(username_error) }}</text>
          <view class="signup-field" :class="{ 'signup-field--invalid': email_error }">
            <image class="signup-field__icon" src="/static/icon/login_email_design.png" mode="aspectFit" />
            <input
              v-model="email"
              class="signup-input"
              type="text"
              maxlength="80"
              autocomplete="email"
              :placeholder="$t('Email')"
              placeholder-class="signup-placeholder"
              @input="email_error = ''"
            />
          </view>
          <text v-if="email_error" class="signup-error">{{ $t(email_error) }}</text>
          <view class="signup-field" :class="{ 'signup-field--invalid': password_error }">
            <image class="signup-field__icon" src="/static/icon/login_lock_design.png" mode="aspectFit" />
            <input
              v-model="password"
              class="signup-input"
              :password="!is_password_visible"
              autocomplete="new-password"
              :placeholder="$t('Password')"
              placeholder-class="signup-placeholder"
              @input="password_error = ''"
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
          <text v-if="password_error" class="signup-error">{{ $t(password_error) }}</text>
          <view class="signup-field" :class="{ 'signup-field--invalid': confirm_error }">
            <image class="signup-field__icon" src="/static/icon/login_lock_design.png" mode="aspectFit" />
            <input
              v-model="confirm_password"
              class="signup-input"
              :password="!is_confirm_visible"
              autocomplete="new-password"
              :placeholder="$t('Confirm')"
              placeholder-class="signup-placeholder"
              @confirm="create_account"
              @input="confirm_error = ''"
            />
            <view
              class="password-toggle"
              role="button"
              :aria-label="$t(is_confirm_visible ? 'Hide confirm password' : 'Show confirm password')"
              @click="is_confirm_visible = !is_confirm_visible"
            >
              <Hide v-if="is_confirm_visible" class="password-toggle__icon" />
              <View v-else class="password-toggle__icon" />
            </view>
          </view>
          <text v-if="confirm_error" class="signup-error">{{ $t(confirm_error) }}</text>
        </view>
        <view class="signup-terms" role="checkbox" :aria-checked="is_terms_agreed" @click="toggle_terms">
          <view class="signup-terms__box" :class="{ 'signup-terms__box--checked': is_terms_agreed }">
            <image
              v-if="is_terms_agreed"
              class="signup-terms__check"
              src="/static/icon/login_terms_check.png"
              mode="aspectFit"
            />
          </view>
          <view class="signup-terms__copy">
            <text class="signup-terms__label">{{ $t('I agree to the') }} </text>
            <text class="signup-terms__link" role="button" @click.stop="open_terms">{{ $t('Terms') }}</text>
            <text class="signup-terms__label"> {{ $t('and') }} </text>
            <text class="signup-terms__link" role="button" @click.stop="open_privacy">{{ $t('Privacy') }}</text>
          </view>
        </view>
        <text v-if="terms_error" class="signup-error">{{ $t(terms_error) }}</text>
      </view>
    </scroll-view>
    <!-- SignupActionBar 接管底部安全区，因此不渲染 BottomSafeArea。 -->
    <SignupActionBar :disabled="is_creating" @create="create_account" />
    <AccountActionLoading v-if="is_creating" action="create" />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress } from '@dcloudio/uni-app'
import { Hide, View } from '@element-plus/icons-vue'
import { emailLogin } from '@/api/auth'
import theme from '@/config/theme.json'
import AccountActionLoading from '@/components/AccountActionLoading.vue'
import AuthLotusGlow from '@/components/AuthLotusGlow.vue'
import LoginTopBar from '@/components/LoginTopBar.vue'
import PageTransition from '@/components/PageTransition.vue'
import SignupActionBar from '@/components/SignupActionBar.vue'
import { storeGlobal } from '@/stores/store'
import { read_agreement_consent } from '@/utils/agreementConsent'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SETUP_PAGE_PATH = '/pages/profile/setup/index'

const page_transition = ref(null)
const account_store = storeGlobal()
const username = ref('')
const email = ref('')
const password = ref('')
const confirm_password = ref('')
const username_error = ref('')
const email_error = ref('')
const password_error = ref('')
const confirm_error = ref('')
const terms_error = ref('')
const is_password_visible = ref(false)
const is_confirm_visible = ref(false)
const is_terms_agreed = ref(read_agreement_consent())
const is_creating = ref(false)
const is_page_active = ref(true)
const create_request_context = {}
let allow_route_back = false

const theme_style = {
  '--signup-page-background': theme.colors.page.background,
  '--signup-title-color': theme.colors.text.on_media,
  '--signup-field-background': theme.colors.surface.card,
  '--signup-field-border': theme.colors.surface.border,
  '--signup-field-text': theme.colors.text.title,
  '--signup-placeholder-color': theme.colors.text.secondary,
  '--signup-accent-color': theme.colors.status.coin,
  '--signup-link-color': theme.colors.status.info,
  '--signup-error-color': theme.colors.status.danger,
  '--signup-icon-color': theme.colors.icon.secondary,
  '--signup-button-background': theme.colors.button.primary,
  '--signup-button-text': theme.colors.button.text
}

// feedback_mode: immediate — the checkbox only changes the current control.
const toggle_terms = () => {
  is_terms_agreed.value = !is_terms_agreed.value
  if (is_terms_agreed.value) terms_error.value = ''
}

const open_terms = () => {
  page_transition.value?.navigate_forward({
    url: '/pages/profile/user-agreement?type=terms&sourcePage=signup'
  })
}

const open_privacy = () => {
  page_transition.value?.navigate_forward({
    url: '/pages/profile/privacy?sourcePage=signup'
  })
}

const go_back = () => {
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
  page_transition.value?.navigate_relaunch({ url: '/pages/login/index' })
}

const validate_form = () => {
  username_error.value = ''
  email_error.value = ''
  password_error.value = ''
  confirm_error.value = ''
  terms_error.value = ''
  const normalized_username = username.value.trim()
  const normalized_email = email.value.trim().toLowerCase()
  if (normalized_username.length < 2) {
    username_error.value = 'Username must contain at least 2 characters.'
    return false
  }
  if (!EMAIL_PATTERN.test(normalized_email)) {
    email_error.value = 'Please enter a valid email address.'
    return false
  }
  if (password.value.trim().length < 6) {
    password_error.value = 'Password must contain at least 6 characters.'
    return false
  }
  if (confirm_password.value !== password.value) {
    confirm_error.value = 'Passwords must match.'
    return false
  }
  if (!is_terms_agreed.value) {
    terms_error.value = 'Agree to the Terms and Privacy before creating an account.'
    return false
  }
  return true
}

// feedback_mode: page_action_loading — AccountActionLoading follows the create request.
const create_account = async () => {
  if (is_creating.value) return
  if (!validate_form()) return
  is_creating.value = true
  try {
    const result = await emailLogin({
      userEmail: email.value.trim().toLowerCase(),
      password: password.value.trim(),
      type: 1,
      userName: username.value.trim()
    }, create_request_context)
    if (!is_page_active.value || !result?.success) return
    const token = `${result.data?.token || ''}`.trim()
    if (!token) {
      email_error.value = 'The create account response is incomplete.'
      return
    }
    account_store.login(token, result.data || {})
    page_transition.value?.navigate_relaunch({ url: SETUP_PAGE_PATH })
  } finally {
    if (is_page_active.value) is_creating.value = false
  }
}

onBackPress(() => {
  if (allow_route_back) return false
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  create_request_context.cancel?.()
})
</script>

<style scoped lang="scss">
.signup-page {
  position: relative;
  background: var(--signup-page-background);
  color: var(--signup-title-color);
}

.signup-scene {
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
  padding: 12rpx 40rpx 46rpx;
}

.signup-lotus {
  width: 200rpx;
  height: 180rpx;
  flex: none;
  margin: 12rpx auto 0;
}

.signup-title {
  display: block;
  flex: none;
  margin-top: 12rpx;
  color: var(--signup-title-color);
  font-size: 52rpx;
  font-weight: 800;
  line-height: 64rpx;
  text-align: center;
}

.signup-form {
  flex: none;
  margin: auto 0 0;
  padding: 20rpx 0 0;
}

.signup-form > .signup-field:first-child {
  margin-top: 0;
}

.signup-field {
  display: flex;
  box-sizing: border-box;
  height: 104rpx;
  align-items: center;
  margin-top: 20rpx;
  padding: 0 32rpx;
  border: 1px solid var(--signup-field-border);
  border-radius: 999rpx;
  background: var(--signup-field-background);
}

.signup-field--invalid {
  border-color: var(--signup-error-color);
}

.signup-field__icon {
  width: 40rpx;
  height: 40rpx;
  flex: none;
}

.signup-input {
  width: 0;
  height: 104rpx;
  min-width: 0;
  margin-left: 20rpx;
  color: var(--signup-field-text);
  font-size: 30rpx;
  flex: 1;
}

:deep(.signup-placeholder) {
  color: var(--signup-placeholder-color);
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
  color: var(--signup-icon-color);
}

.signup-error {
  display: block;
  margin-top: 8rpx;
  padding: 0 24rpx;
  color: var(--signup-error-color);
  font-size: 24rpx;
  font-weight: 600;
  line-height: 34rpx;
}

.signup-terms {
  display: flex;
  align-items: center;
  margin-top: 44rpx;
  gap: 16rpx;
}

.signup-terms__box {
  display: flex;
  width: 48rpx;
  height: 48rpx;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--signup-accent-color);
  border-radius: 14rpx;
  flex: none;
}

.signup-terms__box--checked {
  background: var(--signup-accent-color);
}

.signup-terms__check {
  width: 28rpx;
  height: 28rpx;
}

.signup-terms__copy {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.signup-terms__label {
  color: var(--signup-title-color);
  font-size: 28rpx;
  font-weight: 600;
  line-height: 40rpx;
}

.signup-terms__link {
  color: var(--signup-link-color);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 40rpx;
  padding: 0 10rpx;
}
</style>

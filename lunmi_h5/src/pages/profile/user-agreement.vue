<template>
  <PageTransition ref="page_transition" class="agreement-page" :style="theme_style">
    <image
      v-if="!is_read_only"
      class="agreement-scene"
      src="/static/icon/eula_bg.png"
      mode="aspectFill"
      aria-hidden="true"
    />
    <!-- AgreementTopBar 接管顶部安全区，因此不渲染 TopSafeArea。 -->
    <AgreementTopBar :title="is_read_only ? $t(visible_agreement.title) : ''" @back="go_back" />
    <scroll-view v-if="is_read_only" class="content-scroll" scroll-y :show-scrollbar="false">
      <view class="content-scroll__inner">
        <view v-for="section in visible_agreement.sections" :key="section.title" class="terms-card">
          <text class="terms-card__title" :class="{ 'terms-card__title--accent': section.accent }">{{ $t(section.title) }}</text>
          <text v-if="section.content" class="terms-card__copy">{{ $t(section.content) }}</text>
        </view>
      </view>
    </scroll-view>
    <template v-else>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="agreement-body">
          <view class="agreement-intro">
            <text class="agreement-badge">{{ $t('EULA 1.0') }}</text>
            <text class="agreement-heading">{{ $t('Welcome to Lunmi') }}</text>
          </view>
          <view class="agreement-warning">
            <InfoFilled class="agreement-warning__icon" aria-hidden="true" />
            <text class="agreement-warning__copy">{{ $t('You must be 18 or older to use Lunmi. By continuing you confirm your age and accept that this app hosts user-generated content.') }}</text>
          </view>
          <view v-for="section in visible_agreement.sections" :key="section.title" class="agreement-card">
            <text class="terms-card__title" :class="{ 'terms-card__title--accent': section.accent }">{{ $t(section.title) }}</text>
            <text class="agreement-copy">{{ $t(section.content) }}</text>
          </view>
        </view>
      </scroll-view>
    </template>
    <!-- AgreementContinueBar 接管底部安全区。条款只读页没有底部操作栏，改用 BottomSafeArea。 -->
    <AgreementContinueBar
      v-if="!is_read_only"
      :agreed="is_agreed"
      :error="agreement_error"
      @toggle="toggle_agreement"
      @continue="continue_onboarding"
      @open-eula="open_eula"
      @open-terms="open_terms"
      @open-privacy="open_privacy"
    />
    <BottomSafeArea v-else />
  </PageTransition>
</template>

<script setup>
import { t } from '@/utils/i18n'

import { computed, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import { InfoFilled } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import { AGREEMENTS } from '@/config/agreements'
import AgreementContinueBar from '@/components/AgreementContinueBar.vue'
import AgreementTopBar from '@/components/AgreementTopBar.vue'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import { read_agreement_consent, write_agreement_consent } from '@/utils/agreementConsent'

const SOURCE_PAGE_ROUTES = Object.freeze({
  welcome: '/pages/welcome/index',
  settings: '/pages/profile/settings',
  login: '/pages/login/index',
  signup: '/pages/signup/index',
  agreement: '/pages/profile/user-agreement?sourcePage=welcome'
})

const page_transition = ref(null)
const page_type = ref('agreement')
const source_page = ref('')
const is_agreed = ref(false)
const agreement_error = ref('')
let allow_route_back = false

const theme_style = {
  '--agreement-page-background': theme.colors.page.background,
  '--agreement-title-color': theme.colors.text.on_media,
  '--agreement-copy-color': theme.colors.text.tertiary,
  '--agreement-card-background': theme.colors.surface.card,
  '--agreement-card-border': theme.colors.surface.border,
  '--agreement-accent-color': theme.colors.status.coin,
  '--agreement-link-color': theme.colors.status.info,
  '--agreement-warning-color': theme.colors.status.danger,
  '--agreement-button-background': theme.colors.button.primary,
  '--agreement-button-text': theme.colors.button.text
}

const is_terms = computed(() => page_type.value === 'terms')
const is_read_only = computed(() => page_type.value !== 'agreement')
const visible_agreement = computed(() => is_terms.value ? AGREEMENTS.user : AGREEMENTS.eula)

const update_document_title = () => {
  if (typeof uni !== 'undefined' && typeof uni.setNavigationBarTitle === 'function') {
    uni.setNavigationBarTitle({ title: t(visible_agreement.value.title) })
  }
}

const read_route_query = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const current = pages[pages.length - 1]
  const options = current?.options || current?.$page?.options || {}
  if (options.type || options.sourcePage) return options
  if (typeof window === 'undefined' || !window.location?.hash) return {}
  const query_index = window.location.hash.indexOf('?')
  if (query_index < 0) return {}
  const params = new URLSearchParams(window.location.hash.slice(query_index + 1))
  return {
    type: params.get('type') || '',
    sourcePage: params.get('sourcePage') || ''
  }
}

const apply_query = (query = {}) => {
  page_type.value = ['terms', 'eula'].includes(query.type) ? query.type : 'agreement'
  source_page.value = `${query.sourcePage || ''}`
  if (page_type.value === 'agreement') is_agreed.value = read_agreement_consent()
  update_document_title()
}

const initial_query = read_route_query()
apply_query(initial_query)

onLoad((query = {}) => {
  apply_query({ ...initial_query, ...query })
})

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
  const fallback = SOURCE_PAGE_ROUTES[source_page.value] || SOURCE_PAGE_ROUTES.welcome
  page_transition.value?.navigate_relaunch({ url: fallback })
}

// feedback_mode: immediate — the checkbox only changes the current control.
const toggle_agreement = () => {
  is_agreed.value = !is_agreed.value
  if (is_agreed.value) agreement_error.value = ''
}

const open_terms = () => {
  page_transition.value?.navigate_forward({
    url: '/pages/profile/user-agreement?type=terms&sourcePage=agreement'
  })
}

const open_eula = () => {
  page_transition.value?.navigate_forward({
    url: '/pages/profile/user-agreement?type=eula&sourcePage=agreement'
  })
}

const open_privacy = () => {
  page_transition.value?.navigate_forward({
    url: '/pages/profile/privacy?sourcePage=agreement'
  })
}

// feedback_mode: navigation — saving the local agreement record does not show Loading.
const continue_onboarding = () => {
  if (!is_agreed.value) {
    agreement_error.value = 'Agree to the EULA and Terms of Service before continuing.'
    return
  }
  agreement_error.value = ''
  const saved = write_agreement_consent(true)
  if (!saved) {
    agreement_error.value = 'Unable to save your agreement. Please try again.'
    return
  }
  page_transition.value?.navigate_forward({ url: '/pages/login/index' })
}

onBackPress(() => {
  if (is_read_only.value || allow_route_back) return false
  return true
})
</script>

<style scoped lang="scss">
.agreement-page {
  position: relative;
  background: var(--agreement-page-background);
  color: var(--agreement-title-color);
}

.agreement-scene {
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
  min-height: calc(100% + 2rpx);
  flex-direction: column;
  padding: 12rpx 40rpx 32rpx;
  gap: 24rpx;
}

.agreement-badge {
  align-self: flex-start;
  padding: 8rpx 18rpx;
  border: 1px solid var(--agreement-link-color);
  border-radius: 999rpx;
  color: var(--agreement-link-color);
  font-size: 22rpx;
  font-weight: 800;
  line-height: 32rpx;
}

.agreement-intro {
  position: relative;
  z-index: 1;
  display: flex;
  flex: none;
  flex-direction: column;
  margin-bottom: 36rpx;
  gap: 24rpx;
}

.agreement-body {
  display: flex;
  box-sizing: border-box;
  min-height: 100%;
  flex-direction: column;
  padding: 24rpx 40rpx 42rpx;
  gap: 24rpx;
}

.agreement-card {
  flex: none;
}

.agreement-heading {
  color: var(--agreement-title-color);
  font-size: 64rpx;
  font-weight: 800;
  line-height: 76rpx;
}

.agreement-card,
.terms-card {
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  padding: 32rpx;
  border: 1px solid var(--agreement-card-border);
  border-radius: 32rpx;
  background: var(--agreement-card-background);
  gap: 24rpx;
  flex: none;
  background: rgba(30,24,62,0.6);
  box-shadow: 0rpx 0rpx 36rpx 0rpx rgba(122,214,255,0.12), 0rpx 0rpx 0rpx 2rpx rgba(196,120,255,0.1);
  border-radius: 44rpx 44rpx 44rpx 44rpx;
  border: 2rpx solid rgba(198,178,255,0.22);

}

.agreement-copy,
.terms-card__copy {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--agreement-copy-color);
  font-size: 28rpx;
  font-weight: 500;
  line-height: 44rpx;
  font-weight: 400;
  font-size: 26rpx;
  color: #A9B2D4;
  line-height: 48rpx;
}

.agreement-warning {
  display: flex;
  align-items: flex-start;
  padding: 24rpx;
  border: 1px solid var(--agreement-warning-color);
  border-radius: 24rpx;
  gap: 16rpx;
  background: rgba(255,107,138,0.08);
border-radius: 28rpx 28rpx 28rpx 28rpx;
border: 2rpx solid rgba(255,107,138,0.3);
}

.agreement-warning__icon {
  width: 36rpx;
  height: 36rpx;
  flex: none;
  color: var(--agreement-warning-color);
}

.agreement-warning__copy {
  color: var(--agreement-warning-color);
  font-size: 26rpx;
  font-weight: 600;
  line-height: 40rpx;
  font-weight: 400;
  font-size: 22rpx;
  color: #FFC2CF;
  line-height: 38rpx;
}

.terms-card__title {
  color: var(--agreement-title-color);
  font-size: 32rpx;
  font-weight: 800;
  line-height: 44rpx;
}

.terms-card__title--accent {
  color: var(--agreement-accent-color);
}
</style>

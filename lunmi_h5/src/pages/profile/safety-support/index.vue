<template>
  <PageTransition ref="page_transition" class="safety-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="safety-header">
        <image class="back-button" role="button" :aria-label="$t('Go back to settings')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Safety & Support') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <scroll-view class="safety-scroll" scroll-y :show-scrollbar="false">
        <view class="safety-scroll__inner">
          <view class="review-card">
            <view class="review-heading">
              <view class="review-icon" aria-hidden="true">
                <image src="/static/icon/safety_review.svg" mode="aspectFit" />
              </view>
              <view class="review-heading__copy">
                <text class="review-title">{{ $t('We answer within 24 hours') }}</text>
                <text class="review-subtitle">{{ $t('Every report is reviewed by a person') }}</text>
              </view>
            </view>
            <text class="review-copy">{{ $t('Reports on lanterns, wishes, posts, replies and voice rooms are reviewed within 24 hours. Content that breaks the rules is removed and repeat accounts are restricted.') }}</text>
          </view>
          <view class="contacts-card">
            <text class="contacts-title">{{ $t('CONTACT US') }}</text>
            <view
              v-for="contact in contacts"
              :key="contact.key"
              class="contact-row"
              role="button"
              :aria-label="$t(`Email ${contact.label} at ${contact.address}`)"
              @click="open_email(contact)"
            >
              <view class="contact-icon" aria-hidden="true">
                <image src="/static/icon/safety_mail.svg" mode="aspectFit" />
              </view>
              <view class="contact-copy">
                <text class="contact-label">{{ $t(contact.label) }}</text>
                <text class="contact-address">{{ $t(contact.address) }}</text>
              </view>
              <image class="row-arrow" src="/static/icon/notiication_right.png" mode="aspectFit" />
            </view>
          </view>
          <view class="feedback-card" role="button" @click="open_feedback">
            <view class="feedback-icon" aria-hidden="true">
              <image src="/static/icon/safety_feedback.svg" mode="aspectFit" />
            </view>
            <text class="feedback-title">{{ $t('Send feedback in the app') }}</text>
            <image class="row-arrow" src="/static/icon/notiication_right.png" mode="aspectFit" />
          </view>
          <text v-if="action_error" class="action-error" role="alert">{{ $t(action_error) }}</text>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { LEGAL_CONTACT_EMAIL } from '@/config/agreements'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { open_ios_support_email } from '@/utils/iosMailBridge'
import { FEEDBACK_PAGE_PATH, SAFETY_PAGE_PATH, SETTINGS_PAGE_PATH } from '@/utils/settingsPresentation'

// Use the same published contact for support, safety and privacy requests.
const contacts = [
  { key: 'safety', label: 'Safety and abuse', address: LEGAL_CONTACT_EMAIL },
  { key: 'account', label: 'Account and billing', address: LEGAL_CONTACT_EMAIL },
  { key: 'privacy', label: 'Privacy requests', address: LEGAL_CONTACT_EMAIL }
]
const page_transition = ref(null)
const action_error = ref('')
const is_leaving = ref(false)
let is_page_active = true
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--safety-title': theme.colors.text.title,
  '--safety-copy': theme.colors.text.tertiary,
  '--safety-muted': theme.colors.text.secondary,
  '--safety-surface': theme.colors.surface.card,
  '--safety-border': theme.colors.surface.border,
  '--safety-back': theme.colors.lantern_detail.header_surface,
  '--safety-line': theme.colors.lantern_detail.title_line,
  '--safety-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--safety-review': theme.colors.safety_support.review_background,
  '--safety-review-border': theme.colors.safety_support.review_border,
  '--safety-review-icon': theme.colors.safety_support.review_icon_background,
  '--safety-feedback-icon': theme.colors.safety_support.feedback_icon_background,
  '--safety-email': theme.colors.status.info,
  '--safety-error': theme.colors.status.danger,
  background: theme.colors.page.background
}

const open_email = (contact) => {
  if (!is_page_active || is_leaving.value) return
  action_error.value = ''
  const result = open_ios_support_email({
    address: contact.address,
    subject: `Lunmi: ${contact.label}`
  })
  if (!result.dispatched) action_error.value = result.error
}

const open_feedback = () => {
  if (!is_page_active || is_leaving.value) return
  action_error.value = ''
  const started = page_transition.value?.navigate_forward({
    url: `${FEEDBACK_PAGE_PATH}?sourcePage=${encodeURIComponent(SAFETY_PAGE_PATH)}`,
    fail: () => {
      action_error.value = 'Unable to open feedback. Please try again.'
    }
  })
  if (!started) action_error.value = 'Unable to open feedback. Please try again.'
}

const go_back = () => {
  if (!is_page_active || is_leaving.value) return
  is_leaving.value = true
  action_error.value = ''
  const fail_return = () => {
    allow_route_back = false
    is_leaving.value = false
    action_error.value = 'Unable to return to settings. Please try again.'
  }
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const previous_route = `${pages[pages.length - 2]?.route || ''}`.replace(/^\//, '')
  if (previous_route === SETTINGS_PAGE_PATH.slice(1)) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: fail_return
    })
    if (!started) fail_return()
    return
  }
  const started = page_transition.value?.navigate_replace({ url: SETTINGS_PAGE_PATH, fail: fail_return })
  if (!started) fail_return()
}

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})
onBeforeUnmount(() => {
  is_page_active = false
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.safety-page { background: var(--page-background); }

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.safety-header {
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
  color: var(--safety-title);
  font-size: 48rpx;
  font-weight: 700;
  line-height: 60rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--safety-line);
  box-shadow: 0 0 18rpx var(--safety-line-shadow);
}

.safety-scroll { height: 0; min-height: 0; flex: 1; }
.safety-scroll__inner { padding: 36rpx 36rpx 48rpx; }

.review-card {
  padding: 36rpx 32rpx;
  border: 1px solid var(--safety-review-border);
  border-radius: 48rpx;
  background: var(--safety-review);
}

.review-heading { display: flex; align-items: center; gap: 22rpx; }

.review-icon {
  display: flex;
  width: 88rpx;
  height: 88rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 30rpx;
  background: var(--safety-review-icon);
}

.review-icon image { width: 40rpx; height: 40rpx; }
.review-heading__copy { min-width: 0; flex: 1; }

.review-title {
  display: block;
  color: var(--safety-title);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 44rpx;
}

.review-subtitle {
  display: block;
  margin-top: 4rpx;
  color: var(--safety-muted);
  font-size: 24rpx;
  line-height: 34rpx;
}

.review-copy {
  display: block;
  margin-top: 28rpx;
  color: var(--safety-copy);
  font-size: 24rpx;
  line-height: 40rpx;
}

.contacts-card {
  margin-top: 24rpx;
  padding: 32rpx;
  border: 1px solid var(--safety-border);
  border-radius: 48rpx;
  background: var(--safety-surface);
}

.contacts-title {
  display: block;
  color: var(--safety-muted);
  font-size: 20rpx;
  letter-spacing: 3rpx;
  line-height: 28rpx;
}

.contact-row {
  display: flex;
  box-sizing: border-box;
  height: 116rpx;
  align-items: center;
  gap: 24rpx;
}

.contact-row + .contact-row { border-top: 1px solid var(--safety-border); }
.contact-row:last-child { height: 92rpx; }
.contact-icon { width: 32rpx; height: 32rpx; flex: none; }
.contact-icon image { width: 100%; height: 100%; }
.contact-copy { min-width: 0; flex: 1; }

.contact-label {
  display: block;
  color: var(--safety-title);
  font-size: 28rpx;
  font-weight: 700;
  line-height: 36rpx;
}

.contact-address {
  display: block;
  margin-top: 2rpx;
  color: var(--safety-email);
  font-size: 24rpx;
  line-height: 34rpx;
}

.row-arrow { width: 24rpx; height: 32rpx; flex: none; }

.feedback-card {
  display: flex;
  box-sizing: border-box;
  min-height: 136rpx;
  align-items: center;
  margin-top: 24rpx;
  padding: 24rpx 32rpx;
  border: 1px solid var(--safety-border);
  border-radius: 44rpx;
  background: var(--safety-surface);
  gap: 26rpx;
}

.feedback-icon {
  display: flex;
  width: 84rpx;
  height: 84rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  background: var(--safety-feedback-icon);
}

.feedback-icon image { width: 40rpx; height: 40rpx; }

.feedback-title {
  min-width: 0;
  flex: 1;
  color: var(--safety-title);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.action-error {
  display: block;
  margin-top: 20rpx;
  color: var(--safety-error);
  font-size: 24rpx;
  line-height: 36rpx;
}
</style>

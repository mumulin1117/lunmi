<template>
  <PageTransition ref="page_transition" class="feedback-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="feedback-header">
        <image class="back-button" role="button" :aria-label="$t('Go back to settings')" @click="return_to_settings" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Feedback') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <scroll-view class="feedback-scroll" scroll-y :show-scrollbar="false">
        <view class="feedback-scroll__inner">
          <view class="category-row">
            <view
              v-for="category in categories"
              :key="category.key"
              class="category-pill"
              :class="[`category-pill--${category.key}`, { 'category-pill--active': selected_category === category.key }]"
              role="button"
              :aria-pressed="selected_category === category.key"
              :aria-disabled="is_sending || has_submitted"
              @click="select_category(category.key)"
            >
              <text>{{ $t(category.label) }}</text>
            </view>
          </view>
          <textarea
            v-model="feedback_content"
            class="feedback-input"
            maxlength="500"
            :placeholder="$t('What happened?')"
            :placeholder-style="placeholder_style"
            :disabled="is_sending || has_submitted"
            :adjust-position="true"
            @input="handle_feedback_input"
          />
          <text v-if="form_error" class="form-error" role="alert">{{ $t(form_error) }}</text>
          <view class="submit-region">
            <view
              class="submit-button"
              :class="{ 'submit-button--disabled': is_sending || has_submitted }"
              role="button"
              :aria-disabled="is_sending || has_submitted"
              :aria-busy="is_sending"
              @click="send_feedback"
            >{{ $t(is_sending ? 'Submitting...' : 'Submit') }}</view>
          </view>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <FeedbackSendingLoading v-if="is_sending" />
    <FeedbackSuccessDialog :visible="is_success_visible" @confirm="return_to_settings" />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onHide, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import FeedbackSendingLoading from '@/components/FeedbackSendingLoading.vue'
import FeedbackSuccessDialog from '@/components/FeedbackSuccessDialog.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { vibrate_on_keyboard_input } from '@/utils/keyboardVibration'
import { SETTINGS_PAGE_PATH } from '@/utils/settingsPresentation'

const categories = [
  { key: 'bug', label: 'Bug' },
  { key: 'content', label: 'Content' },
  { key: 'account', label: 'Account' },
  { key: 'other', label: 'Other' }
]
const page_transition = ref(null)
const selected_category = ref('bug')
const feedback_content = ref('')
const form_error = ref('')
const is_sending = ref(false)
const has_submitted = ref(false)
const is_success_visible = ref(false)
const is_leaving = ref(false)
let is_page_active = true
let submit_timer = null
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--feedback-title': theme.colors.text.title,
  '--feedback-copy': theme.colors.text.tertiary,
  '--feedback-surface': theme.colors.surface.card,
  '--feedback-border': theme.colors.surface.border,
  '--feedback-back': theme.colors.lantern_detail.header_surface,
  '--feedback-line': theme.colors.lantern_detail.title_line,
  '--feedback-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--feedback-category-surface': theme.colors.button_change.default.background,
  '--feedback-category-border': theme.colors.feedback.category_border,
  '--feedback-category-active': theme.colors.feedback.category_active_background,
  '--feedback-category-active-text': theme.colors.button.text,
  '--feedback-submit': theme.colors.button.primary,
  '--feedback-submit-text': theme.colors.button.text,
  '--feedback-error': theme.colors.status.danger,
  background: theme.colors.page.background
}
const placeholder_style = `color: ${theme.colors.text.secondary}`

const select_category = (key) => {
  if (is_sending.value || has_submitted.value || is_leaving.value) return
  selected_category.value = key
}

const handle_feedback_input = () => {
  vibrate_on_keyboard_input()
  form_error.value = ''
}

const cancel_submission = () => {
  if (submit_timer !== null) clearTimeout(submit_timer)
  submit_timer = null
  is_sending.value = false
}

const send_feedback = () => {
  if (!is_page_active || is_leaving.value || is_sending.value || has_submitted.value) return
  form_error.value = ''
  if (!feedback_content.value.trim()) {
    form_error.value = 'Enter your feedback before submitting.'
    return
  }
  is_sending.value = true
  // The user explicitly requested a simulated submission lasting 300–500 ms.
  const delay_ms = 300 + Math.floor(Math.random() * 201)
  submit_timer = setTimeout(() => {
    submit_timer = null
    if (!is_page_active || is_leaving.value) return
    is_sending.value = false
    has_submitted.value = true
    is_success_visible.value = true
  }, delay_ms)
}

const return_to_settings = () => {
  if (!is_page_active || is_leaving.value) return
  cancel_submission()
  is_success_visible.value = false
  is_leaving.value = true
  const fail_return = () => {
    allow_route_back = false
    is_leaving.value = false
    form_error.value = 'Unable to return to settings. Please try again.'
    is_success_visible.value = has_submitted.value
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
  const started = page_transition.value?.navigate_replace({
    url: SETTINGS_PAGE_PATH,
    fail: fail_return
  })
  if (!started) fail_return()
}

onBackPress(() => {
  if (allow_route_back) return false
  return_to_settings()
  return true
})
onHide(() => {
  cancel_submission()
  is_success_visible.value = false
})
onShow(() => {
  if (has_submitted.value && !is_leaving.value) is_success_visible.value = true
})
onBeforeUnmount(() => {
  is_page_active = false
  cancel_submission()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.feedback-page { background: var(--page-background); }

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.feedback-header {
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
  color: var(--feedback-title);
  font-size: 48rpx;
  font-weight: 700;
  line-height: 60rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--feedback-line);
  box-shadow: 0 0 18rpx var(--feedback-line-shadow);
}

.feedback-scroll { height: 0; min-height: 0; flex: 1; }

.feedback-scroll__inner { padding: 36rpx 36rpx 48rpx; }

.category-row { display: flex; gap: 16rpx; }

.category-pill {
  box-sizing: border-box;
  height: 80rpx;
  flex: none;
  border: 1px solid var(--feedback-category-border);
  border-radius: 40rpx;
  background: var(--feedback-category-surface);
  color: var(--feedback-copy);
  font-size: 28rpx;
  font-weight: 700;
  line-height: 78rpx;
  text-align: center;
}

.category-pill--bug { width: 120rpx; }
.category-pill--content { width: 170rpx; }
.category-pill--account { width: 174rpx; }
.category-pill--other { width: 140rpx; }

.category-pill--active {
  border-color: transparent;
  background: var(--feedback-category-active);
  color: var(--feedback-category-active-text);
}

.feedback-input {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 360rpx;
  margin-top: 24rpx;
  padding: 36rpx;
  border: 1px solid var(--feedback-border);
  border-radius: 40rpx;
  background: var(--feedback-surface);
  color: var(--feedback-title);
  font-size: 28rpx;
  line-height: 40rpx;
}

.form-error {
  display: block;
  margin-top: 16rpx;
  color: var(--feedback-error);
  font-size: 24rpx;
  line-height: 34rpx;
}

.submit-region {
  margin-top: 64rpx;
  padding-top: 24rpx;
  border-top: 1px solid var(--feedback-border);
}

.submit-button {
  height: 116rpx;
  border-radius: 58rpx;
  background: var(--feedback-submit);
  color: var(--feedback-submit-text);
  font-size: 36rpx;
  font-weight: 700;
  line-height: 116rpx;
  text-align: center;
}

.submit-button--disabled { opacity: .5; }
</style>

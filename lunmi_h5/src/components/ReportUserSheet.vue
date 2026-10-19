<template>
  <transition name="report-sheet-slide">
    <view v-if="visible" class="report-sheet" :style="theme_style" @touchmove.stop.prevent>
      <view class="report-sheet__scrim" @click="close" />
      <view class="report-sheet__panel">
        <view class="report-sheet__handle" />
        <template v-if="!is_submitted">
          <view class="report-sheet__header">
            <image class="report-sheet__badge" src="/static/icon/report_dilalog.png" mode="aspectFit" />
            <view class="report-sheet__heading">
              <text class="report-sheet__title">{{ $t('Report') }}</text>
              <text class="report-sheet__copy">{{ $t(subtitle) }}</text>
            </view>
            <view class="report-sheet__close" role="button" :aria-label="$t('Close report')" :aria-disabled="is_submitting" @click="close">
              <image src="/static/icon/report_close.png" mode="aspectFit" />
            </view>
          </view>
          <text class="report-sheet__prompt">{{ $t('WHY ARE YOU REPORTING THIS?') }}</text>
          <scroll-view scroll-y class="report-sheet__body">
            <view class="reason-list" role="radiogroup" :aria-label="$t('Report reason')">
              <view
                v-for="reason in REPORT_REASONS"
                :key="reason.id"
                class="reason"
                :class="{ 'reason--selected': selected_reason === reason.label }"
                role="radio"
                :aria-checked="selected_reason === reason.label"
                @click="select_reason(reason.label)"
              >
                <image class="reason__icon" :src="reason_icons[reason.id]" mode="aspectFit" />
                <text class="reason__label">{{ $t(reason.label) }}</text>
                <view class="reason__radio" :class="{ 'reason__radio--selected': selected_reason === reason.label }">
                  <view v-if="selected_reason === reason.label" class="reason__radio-dot" />
                </view>
              </view>
            </view>
            <textarea
              v-model="details_text"
              class="details-field"
              maxlength="500"
              :placeholder="$t('Add details (optional)')"
              :placeholder-style="placeholder_style"
              :disabled="is_submitting"
            />
            <view
              v-if="can_block"
              class="block-option"
              role="switch"
              :aria-checked="block_selected"
              :aria-disabled="is_submitting"
              :aria-label="$t('Also block this person')"
              @click="toggle_block"
            >
              <image class="block-option__badge" src="/static/icon/report_block.png" mode="aspectFit" />
              <view class="block-option__copy">
                <text class="block-option__title">{{ $t('Also block this person') }}</text>
                <text class="block-option__hint">{{ $t('They can no longer reach you') }}</text>
              </view>
              <view class="block-switch" :class="{ 'block-switch--on': block_selected }">
                <view class="block-switch__thumb" />
              </view>
            </view>
            <text class="report-sheet__note">{{ $t(REPORT_REVIEW_NOTE) }}</text>
          </scroll-view>
          <text v-if="error_message" class="error-message">{{ $t(error_message) }}</text>
          <view
            class="submit-button"
            :class="{ 'submit-button--ready': Boolean(selected_reason) && !is_submitting }"
            role="button"
            :aria-disabled="!selected_reason || is_submitting"
            @click="submit"
          >{{ $t(button_label) }}</view>
        </template>
      </view>
      <ReportSubmittingLoading v-if="is_submitting" />
    </view>
  </transition>
  <SuccessToast :message="$t(toast_message)" @dismiss="toast_message = ''" />
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import ReportSubmittingLoading from '@/components/ReportSubmittingLoading.vue'
import SuccessToast from '@/components/SuccessToast.vue'
import { updateUserRelation } from '@/api/common'
import { get_current_user } from '@/utils/auth'
import { SUCCESS_TOAST } from '@/utils/successToast'
import {
  REPORT_REASONS,
  REPORT_REVIEW_NOTE,
  can_block_report_target,
  report_button_label,
  report_subtitle
} from '@/utils/reportSheetPresentation'

const props = defineProps({
  visible: { type: Boolean, default: false },
  bottomOffset: { type: String, default: 'auto' },
  targetName: { type: String, default: 'this user' },
  targetUserId: { type: [String, Number], default: '' },
  postId: { type: String, default: '' },
  commentId: { type: String, default: '' }
})
const emit = defineEmits(['update:visible', 'submitted'])
const reason_icons = {
  sexual: '/static/icon/report_sexual.png',
  harassment: '/static/icon/report_hate.png',
  violence: '/static/icon/report_violence.png',
  spam: '/static/icon/report_spam.png',
  other: '/static/icon/report_something.png'
}
const selected_reason = ref('')
const details_text = ref('')
const block_selected = ref(false)
const error_message = ref('')
const is_submitting = ref(false)
const is_submitted = ref(false)
const toast_message = ref('')
const was_blocked = ref(false)
const REPORT_FEEDBACK_DELAY_MS = 400
let block_request_context = null
let report_feedback_timer = null
let resolve_report_feedback = null
let submission_sequence = 0
let is_component_active = true
const resolved_bottom_offset = computed(() => (
  props.bottomOffset === 'auto' ? '0rpx' : props.bottomOffset
))
const can_block = computed(() => (
  can_block_report_target(props.targetUserId)
    && Boolean(get_current_user()?.userId)
    && `${props.targetUserId}` !== `${get_current_user()?.userId}`
))
const subtitle = computed(() => report_subtitle({
  post_id: props.postId,
  comment_id: props.commentId
}))
const button_label = computed(() => (
  is_submitting.value ? 'Submitting...' : report_button_label(selected_reason.value)
))
const placeholder_style = `color: ${theme.colors.text.tertiary}`
const theme_style = computed(() => ({
  '--report-page': theme.colors.page.background,
  '--report-sheet': theme.colors.voice_room.sheet_surface,
  '--report-title': theme.colors.text.title,
  '--report-muted': theme.colors.text.secondary,
  '--report-soft': theme.colors.text.tertiary,
  '--report-line': theme.colors.surface.border,
  '--report-fill': theme.colors.surface.card,
  '--report-danger': theme.colors.dialog.danger.background,
  '--report-danger-text': theme.colors.dialog.danger.text,
  '--report-accent': theme.colors.status.info,
  '--report-ready': theme.colors.button.primary,
  '--report-ready-text': theme.colors.button.text,
  '--report-scrim': theme.colors.surface.scrim,
  '--report-shadow': theme.colors.surface.shadow,
  '--report-disabled-text': theme.colors.text.tertiary,
  '--report-switch': theme.colors.button_change.default.background,
  '--report-switch-on': theme.colors.button_change.active.background,
  '--report-switch-thumb': theme.colors.button_change.default.text,
  '--report-switch-thumb-on': theme.colors.text.inverse,
  '--report-button': theme.colors.page.background,
  '--bottom-offset': resolved_bottom_offset.value
}))

const close = () => {
  if (is_submitting.value) return
  emit('update:visible', false)
}
const select_reason = (label) => {
  if (is_submitting.value) return
  selected_reason.value = label
  error_message.value = ''
}
const toggle_block = () => {
  if (is_submitting.value || !can_block.value) return
  block_selected.value = !block_selected.value
}

// User-requested simulation for reporting only; no report is persisted here.
const wait_report_feedback = () => new Promise((resolve) => {
  resolve_report_feedback = resolve
  report_feedback_timer = setTimeout(() => {
    report_feedback_timer = null
    resolve_report_feedback = null
    resolve(true)
  }, REPORT_FEEDBACK_DELAY_MS)
})

const cancel_submission = () => {
  submission_sequence += 1
  block_request_context?.cancel?.()
  block_request_context = null
  clearTimeout(report_feedback_timer)
  report_feedback_timer = null
  resolve_report_feedback?.(false)
  resolve_report_feedback = null
  is_submitting.value = false
}

// feedback_mode: page_action_loading — block follows the API; report only uses the requested delay.
const submit = async () => {
  if (!props.visible || !is_component_active || !selected_reason.value || is_submitting.value) return
  error_message.value = ''
  if (block_selected.value && !can_block.value) {
    error_message.value = 'This person cannot be blocked.'
    return
  }
  const submission_id = ++submission_sequence
  const target_user_id = props.targetUserId
  const reporter_user_id = get_current_user()?.userId
  const should_block = block_selected.value
  const is_current_submission = () => (
    is_component_active && props.visible && submission_id === submission_sequence
      && `${props.targetUserId}` === `${target_user_id}`
      && `${get_current_user()?.userId || ''}` === `${reporter_user_id || ''}`
  )
  is_submitting.value = true
  was_blocked.value = false
  try {
    if (should_block) {
      block_request_context = {}
      const block_result = await updateUserRelation({
        beHandleUserId: target_user_id,
        hanldeType: 2
      }, block_request_context)
      if (!is_current_submission()) return
      if (!block_result?.success || block_result.data !== true) {
        if (block_result?.error !== 'Request cancelled.') {
          error_message.value = block_result?.error || 'Unable to block this person. Please try again.'
        }
        return
      }
      was_blocked.value = true
    } else {
      const completed = await wait_report_feedback()
      if (!completed || !is_current_submission()) return
    }
    toast_message.value = should_block ? 'User blocked' : SUCCESS_TOAST.report
    finish()
  } catch (error) {
    if (is_current_submission()) {
      error_message.value = error?.message || 'Unable to submit. Please try again.'
    }
  } finally {
    if (is_component_active && submission_id === submission_sequence) {
      block_request_context = null
      is_submitting.value = false
    }
  }
}
const finish = () => {
  emit('update:visible', false)
  emit('submitted', { blocked: was_blocked.value })
}

watch(() => [props.visible, props.targetUserId, props.postId, props.commentId], ([visible]) => {
  cancel_submission()
  if (!visible) return
  selected_reason.value = ''
  details_text.value = ''
  block_selected.value = false
  error_message.value = ''
  is_submitted.value = false
  was_blocked.value = false
  toast_message.value = ''
})
onBeforeUnmount(() => {
  is_component_active = false
  cancel_submission()
})
</script>

<style scoped lang="scss">
.report-sheet {
  position: fixed;
  z-index: 1400;
  inset: 0;
  display: flex;
  box-sizing: border-box;
  align-items: flex-end;
  color: var(--report-title);
}

.report-sheet__scrim {
  position: absolute;
  inset: 0;
  background: var(--report-scrim);
}

.report-sheet__panel {
  position: relative;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  max-height: 1280rpx;
  flex-direction: column;
  margin-bottom: var(--bottom-offset);
  padding: 16rpx 32rpx calc(28rpx + var(--page-safe-bottom));
  border-radius: 48rpx 48rpx 0 0;
  background: var(--report-sheet);
  box-shadow: 0 -18rpx 60rpx var(--report-shadow);
}

.report-sheet__handle {
  width: 72rpx;
  height: 8rpx;
  margin: 0 auto 28rpx;
  border-radius: 999rpx;
  background: var(--report-line);
}

.report-sheet__header {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.report-sheet__badge,
.block-option__badge {
  width: 80rpx;
  height: 80rpx;
  flex: 0 0 80rpx;
}

.report-sheet__heading {
  flex: 1;
  min-width: 0;
}

.report-sheet__title {
  display: block;
  color: var(--report-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.15;
}

.report-sheet__copy {
  display: block;
  margin-top: 8rpx;
  color: var(--report-muted);
  font-size: 22rpx;
  line-height: 1.35;
}

.report-sheet__close {
  width: 64rpx;
  height: 64rpx;
  flex: 0 0 64rpx;
}

.report-sheet__close image {
  width: 64rpx;
  height: 64rpx;
}

.report-sheet__prompt {
  display: block;
  margin: 28rpx 4rpx 16rpx;
  color: var(--report-soft);
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.report-sheet__body {
  max-height: 720rpx;
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.reason,
.block-option {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  min-height: 96rpx;
  align-items: center;
  padding: 20rpx 28rpx;
  border: 1px solid var(--report-line);
  border-radius: 28rpx;
  background: var(--report-fill);
}

.reason--selected {
  border-color: var(--report-accent);
}

.reason__icon {
  width: 32rpx;
  height: 32rpx;
  flex: 0 0 32rpx;
  color: var(--report-muted);
}

.reason__label {
  flex: 1;
  margin-left: 18rpx;
  color: var(--report-title);
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.3;
}

.reason__radio {
  display: flex;
  width: 36rpx;
  height: 36rpx;
  flex: 0 0 36rpx;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--report-soft);
  border-radius: 50%;
}

.reason__radio--selected {
  border-color: var(--report-accent);
}

.reason__radio-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: var(--report-accent);
}

.details-field {
  box-sizing: border-box;
  width: 100%;
  height: 120rpx;
  margin-top: 16rpx;
  padding: 22rpx 24rpx;
  border: 1px solid var(--report-line);
  border-radius: 28rpx;
  background: var(--report-fill);
  color: var(--report-title);
  font-size: 26rpx;
  line-height: 1.4;
}

.block-option {
  margin-top: 16rpx;
  gap: 16rpx;
}

.block-option__copy {
  flex: 1;
  min-width: 0;
}

.block-option__title,
.block-option__hint {
  display: block;
}

.block-option__title {
  color: var(--report-title);
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.25;
}

.block-option__hint {
  margin-top: 6rpx;
  color: var(--report-muted);
  font-size: 22rpx;
  line-height: 1.3;
}

.block-switch {
  position: relative;
  width: 88rpx;
  height: 48rpx;
  flex: 0 0 88rpx;
  border-radius: 999rpx;
  background: var(--report-switch);
}

.block-switch--on {
  background: var(--report-switch-on);
}

.block-switch__thumb {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--report-switch-thumb);
  transition: transform .2s ease, background-color .2s ease;
}

.block-switch--on .block-switch__thumb {
  background: var(--report-switch-thumb-on);
  transform: translateX(40rpx);
}

.report-sheet__note {
  display: block;
  margin: 18rpx 4rpx 8rpx;
  color: var(--report-soft);
  font-size: 22rpx;
  line-height: 1.45;
}

.error-message {
  display: block;
  margin: 12rpx 4rpx 0;
  color: var(--report-danger);
  font-size: 22rpx;
  line-height: 1.35;
}

.submit-button {
  display: flex;
  width: 680rpx;
  height: 124rpx;
  margin-top: 18rpx;
  margin-bottom: 20rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(20,14,44,0.7);
  border-radius: 1998rpx 1998rpx 1998rpx 1998rpx;
  border: 2rpx solid rgba(198,178,255,0.22);
  color: #6E7C9E;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 124rpx;
  text-align: center;
}

.submit-button--ready {
  background: var(--report-ready);
  color: var(--report-ready-text);
}

.success-state {
  display: flex;
  min-height: 520rpx;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.success-state__mark {
  width: 120rpx;
  height: 120rpx;
}

.success-state__title {
  display: block;
  margin-top: 28rpx;
  color: var(--report-title);
  font-size: 40rpx;
  font-weight: 700;
}

.success-state__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--report-muted);
  font-size: 24rpx;
  line-height: 1.4;
}

.success-state .submit-button {
  margin-top: 40rpx;
}

.report-sheet-slide-enter-active,
.report-sheet-slide-leave-active {
  transition: opacity .28s ease;
}

.report-sheet-slide-enter-active .report-sheet__panel,
.report-sheet-slide-leave-active .report-sheet__panel {
  transition: transform .32s cubic-bezier(.22, .8, .25, 1);
}

.report-sheet-slide-enter-from,
.report-sheet-slide-leave-to {
  opacity: 0;
}

.report-sheet-slide-enter-from .report-sheet__panel,
.report-sheet-slide-leave-to .report-sheet__panel {
  transform: translateY(100%);
}
</style>

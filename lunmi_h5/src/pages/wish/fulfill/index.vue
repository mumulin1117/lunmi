<template>
  <PageTransition ref="page_transition" class="fulfill-page" :style="theme_style">
    <view class="fulfill-preview" aria-hidden="true">
      <TopSafeArea />
      <view class="preview-header">
        <image class="preview-back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="preview-copy">
          <text class="preview-title">{{ $t('Wish details') }}</text>
          <view class="preview-line" />
        </view>
      </view>
      <view v-if="wish" class="preview-body">
        <view class="preview-photo">
          <image :src="WISH_DETAIL_COVER" mode="aspectFill" />
          <text v-if="wish.badge" class="preview-badge">{{ $t(wish.badge) }}</text>
        </view>
        <text class="preview-content">{{ wish.content || $t('A wish with no written note.') }}</text>
        <view class="preview-waiting">
          <image src="/static/icon/small_start.png" mode="aspectFit" />
          <text>{{ $t(wish.waiting_label) }}</text>
        </view>
      </view>
    </view>
    <view class="fulfill-scrim" @click="return_to_detail" />
    <view class="fulfill-sheet" @click.stop>
      <view class="fulfill-handle" aria-hidden="true" />
      <view v-if="is_loading" class="fulfill-loading" aria-hidden="true">
        <view class="fulfill-loading__line" />
        <view class="fulfill-loading__line fulfill-loading__line--short" />
      </view>
      <view v-else-if="load_error" class="fulfill-error" role="alert">
        <text>{{ $t(load_error) }}</text>
        <view role="button" @click="load_fulfill">{{ $t('Try again') }}</view>
      </view>
      <template v-else>
        <view class="fulfill-head">
          <image src="/static/icon/wish_became_true.png" mode="aspectFit" />
          <view class="fulfill-head__copy">
            <text class="fulfill-title">{{ $t(is_read_only ? ALREADY_TOLD_TITLE : FULFILL_TITLE) }}</text>
            <text v-if="wish" class="fulfill-subtitle">{{ $t(blessed_label(wish.blessing_count)) }}</text>
          </view>
        </view>
        <textarea
          v-model="outcome_text"
          class="fulfill-input"
          :maxlength="OUTCOME_MAX_LENGTH"
          :placeholder="$t('How did it end?')"
          :placeholder-style="placeholder_style"
          :disabled="is_read_only || is_publishing"
        />
        <view class="fulfill-note">
          <InfoFilled class="fulfill-note__icon" />
          <text>{{ $t(FULFILL_NOTE) }}</text>
        </view>
        <text v-if="form_error" class="fulfill-form-error" role="alert">{{ $t(form_error) }}</text>
        <view
          class="tell-button"
          role="button"
          :aria-disabled="is_publishing"
          @click="submit_or_back"
        >
          <text>{{ $t(is_read_only ? 'Back to the wish' : 'Tell them') }}</text>
        </view>
      </template>
      <BottomSafeArea />
    </view>
    <OutcomeTellingLoading v-if="is_publishing" />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import { InfoFilled } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import { addLmWishOutcome, selectLmWishOutcomePage, selectLmWishPage } from '@/api/wish'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import OutcomeTellingLoading from '@/components/OutcomeTellingLoading.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { storeGlobal } from '@/stores/store'
import { can_delete_owned_object } from '@/utils/deleteConfirmPresentation'
import { read_wish_record } from '@/utils/foundWishPresentation'
import { read_published_outcome, WISH_DETAIL_COVER, map_wish_detail } from '@/utils/wishDetailPresentation'
import {
  ALREADY_TOLD_TITLE,
  FULFILL_NOTE,
  FULFILL_TITLE,
  OUTCOME_MAX_LENGTH,
  blessed_label,
  build_outcome_params,
  read_fulfill_query
} from '@/utils/wishFulfillPresentation'
import { SUCCESS_TOAST, queue_success_toast } from '@/utils/successToast'

const page_transition = ref(null)
const wish_id = ref('')
const return_page = ref('')
const wish = ref(null)
const outcome_text = ref('')
const is_read_only = ref(false)
const is_loading = ref(true)
const is_publishing = ref(false)
const load_error = ref('')
const form_error = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let allow_route_back = false
let load_contexts = []
let publish_context = {}

const theme_style = {
  '--fulfill-background': theme.colors.page.background,
  '--fulfill-title': theme.colors.text.title,
  '--fulfill-copy': theme.colors.text.secondary,
  '--fulfill-muted': theme.colors.text.tertiary,
  '--fulfill-on-media': theme.colors.text.on_media,
  '--fulfill-border': theme.colors.surface.border,
  '--fulfill-back': theme.colors.surface.deep,
  '--fulfill-line': theme.colors.lantern_detail.title_line,
  '--fulfill-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--fulfill-badge': theme.colors.status.coin,
  '--fulfill-waiting': theme.colors.status.coin,
  '--fulfill-sheet': theme.colors.dialog.background,
  '--fulfill-input': theme.colors.surface.deep,
  '--fulfill-note': theme.colors.surface.card,
  '--fulfill-info': theme.colors.status.info,
  '--fulfill-scrim': theme.colors.surface.scrim,
  '--fulfill-button': theme.colors.button.primary,
  '--fulfill-button-text': theme.colors.button.text,
  '--fulfill-error': theme.colors.status.info,
  '--fulfill-skeleton': theme.colors.surface.card,
  background: theme.colors.page.background
}

const placeholder_style = `color: ${theme.colors.text.secondary}`

const cancel_load = () => {
  load_contexts.forEach((item) => item.cancel?.())
  load_contexts = []
}

const return_to_detail = () => {
  if (!is_page_active.value || is_leaving.value || is_publishing.value) return
  is_leaving.value = true
  cancel_load()
  publish_context.cancel?.()
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
        page_transition.value?.navigate_relaunch({ url: return_page.value })
      }
    })
    if (!started) {
      allow_route_back = false
      is_leaving.value = false
      form_error.value = 'Unable to return to this wish.'
    }
    return
  }
  const started = page_transition.value?.navigate_relaunch({
    url: return_page.value,
    fail: () => {
      is_leaving.value = false
      form_error.value = 'Unable to return to this wish.'
    }
  })
  if (!started) {
    is_leaving.value = false
    form_error.value = 'Unable to return to this wish.'
  }
}

const load_fulfill = async () => {
  if (!is_page_active.value || is_leaving.value) return
  if (!wish_id.value) {
    wish.value = null
    load_error.value = 'This wish cannot be opened.'
    is_loading.value = false
    return
  }
  cancel_load()
  const contexts = [{}, {}]
  load_contexts = contexts
  is_loading.value = !wish.value
  load_error.value = ''
  const [wish_result, outcome_result] = await Promise.all([
    selectLmWishPage({ wishId: wish_id.value, current: 1, size: 1 }, contexts[0]),
    selectLmWishOutcomePage({ wishId: wish_id.value, current: 1, size: 20 }, contexts[1])
  ])
  if (!is_page_active.value || is_leaving.value || load_contexts !== contexts) return
  if (!wish_result?.success) {
    load_error.value = wish_result?.error || 'Unable to load this wish.'
    is_loading.value = false
    return
  }
  const mapped = map_wish_detail(read_wish_record(wish_result.data))
  if (!mapped) {
    wish.value = null
    load_error.value = 'This wish is no longer available.'
    is_loading.value = false
    return
  }
  wish.value = mapped
  if (!outcome_result?.success) {
    load_error.value = outcome_result?.error || 'Unable to check whether this wish was already told.'
    is_loading.value = false
    return
  }
  const outcome = read_published_outcome(outcome_result.data)
  if (outcome) {
    is_read_only.value = true
    outcome_text.value = outcome.outcome_text
  }
  const account = storeGlobal()
  if (!is_read_only.value && !can_delete_owned_object(mapped.owner_user_id, account.userId)) {
    form_error.value = 'Only you can tell how this wish ended.'
    is_read_only.value = true
  }
  is_loading.value = false
}

const publish_outcome = async () => {
  if (is_publishing.value || is_read_only.value || !wish.value) return
  const account = storeGlobal()
  if (!account.userId) {
    form_error.value = 'Sign in to tell them.'
    return
  }
  if (!can_delete_owned_object(wish.value.owner_user_id, account.userId)) {
    form_error.value = 'Only you can tell how this wish ended.'
    return
  }
  const text = outcome_text.value.trim()
  if (!text) {
    form_error.value = 'Write how it ended.'
    return
  }
  is_publishing.value = true
  form_error.value = ''
  publish_context.cancel?.()
  publish_context = {}
  const existing = await selectLmWishOutcomePage({
    wishId: wish.value.wish_id,
    current: 1,
    size: 20
  }, publish_context)
  if (!is_page_active.value) return
  if (!existing?.success) {
    is_publishing.value = false
    form_error.value = existing?.error || 'Unable to check whether this wish was already told.'
    return
  }
  const outcome = read_published_outcome(existing.data)
  if (outcome) {
    is_publishing.value = false
    is_read_only.value = true
    outcome_text.value = outcome.outcome_text || outcome_text.value
    form_error.value = 'This wish was already told.'
    return
  }
  const result = await addLmWishOutcome(build_outcome_params({
    wish_id: wish.value.wish_id,
    owner_user_id: account.userId,
    outcome_text: text,
    published_at: new Date().toISOString()
  }), publish_context)
  is_publishing.value = false
  if (!is_page_active.value) return
  if (!result?.success) {
    form_error.value = result?.error || 'Unable to tell them how it ended.'
    return
  }
  queue_success_toast(SUCCESS_TOAST.fulfill)
  return_to_detail()
}

const submit_or_back = () => {
  if (is_publishing.value) return
  if (is_read_only.value) {
    return_to_detail()
    return
  }
  publish_outcome()
}

onLoad((query = {}) => {
  const parsed = read_fulfill_query(query)
  wish_id.value = parsed.wish_id
  return_page.value = parsed.return_page
  load_fulfill()
})

onBackPress(() => {
  if (allow_route_back) return false
  return_to_detail()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  cancel_load()
  publish_context.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.fulfill-page {
  background: var(--fulfill-background);
}

.fulfill-preview {
  position: absolute;
  z-index: 0;
  inset: 0;
  opacity: 0.42;
}

.preview-header,
.preview-waiting {
  display: flex;
  align-items: center;
}

.preview-header {
  height: 80rpx;
  padding: 0 36rpx;
}

.preview-back {
  @include page_back.button;
}

.preview-copy {
  margin-left: 24rpx;
}

.preview-title {
  display: block;
  color: var(--fulfill-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.preview-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--fulfill-line);
  box-shadow: 0 0 18rpx var(--fulfill-line-shadow);
}

.preview-body {
  padding: 28rpx 36rpx 0;
}

.preview-photo {
  position: relative;
  overflow: hidden;
  height: 280rpx;
  border-radius: 32rpx;
}

.preview-photo image {
  width: 100%;
  height: 100%;
}

.preview-badge {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  padding: 8rpx 16rpx;
  border: 1px solid var(--fulfill-badge);
  border-radius: 999rpx;
  color: var(--fulfill-badge);
  font-size: 20rpx;
  font-weight: 700;
}

.preview-content {
  display: block;
  margin-top: 28rpx;
  color: var(--fulfill-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.35;
}

.preview-waiting {
  margin-top: 20rpx;
}

.preview-waiting image {
  width: 28rpx;
  height: 28rpx;
  margin-right: 10rpx;
}

.preview-waiting text {
  color: var(--fulfill-waiting);
  font-size: 26rpx;
  font-weight: 700;
}

.fulfill-scrim {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: var(--fulfill-scrim);
}

.fulfill-sheet {
  position: absolute;
  z-index: 2;
  right: 28rpx;
  bottom: 24rpx;
  left: 28rpx;
  padding: 16rpx 28rpx 20rpx;
  border: 1px solid var(--fulfill-border);
  border-radius: 40rpx;
  background: var(--fulfill-sheet);
}

.fulfill-handle {
  width: 84rpx;
  height: 8rpx;
  margin: 0 auto 24rpx;
  border-radius: 999rpx;
  background: var(--fulfill-border);
}

.fulfill-loading__line {
  height: 36rpx;
  border-radius: 18rpx;
  background: var(--fulfill-skeleton);
}

.fulfill-loading__line--short {
  width: 60%;
  margin-top: 16rpx;
}

.fulfill-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--fulfill-title);
  font-size: 26rpx;
  line-height: 1.4;
}

.fulfill-error view {
  margin-left: 24rpx;
  color: var(--fulfill-error);
  font-size: 26rpx;
  font-weight: 700;
}

.fulfill-head {
  display: flex;
  align-items: center;
}

.fulfill-head image {
  width: 72rpx;
  height: 72rpx;
  flex: none;
}

.fulfill-head__copy {
  min-width: 0;
  margin-left: 18rpx;
}

.fulfill-title {
  display: block;
  color: var(--fulfill-title);
  font-size: 36rpx;
  font-weight: 700;
}

.fulfill-subtitle {
  display: block;
  margin-top: 6rpx;
  color: var(--fulfill-muted);
  font-size: 24rpx;
}

.fulfill-input {
  box-sizing: border-box;
  width: 100%;
  height: 180rpx;
  margin-top: 24rpx;
  padding: 24rpx;
  border: 1px solid var(--fulfill-border);
  border-radius: 28rpx;
  background: var(--fulfill-input);
  color: var(--fulfill-title);
  font-size: 28rpx;
  line-height: 1.4;
}

.fulfill-note {
  display: flex;
  margin-top: 20rpx;
  padding: 20rpx;
  align-items: flex-start;
  border: 1px solid var(--fulfill-border);
  border-radius: 28rpx;
  background: var(--fulfill-note);
}

.fulfill-note__icon {
  width: 32rpx;
  height: 32rpx;
  flex: none;
  margin-top: 4rpx;
  color: var(--fulfill-info);
}

.fulfill-note text {
  margin-left: 12rpx;
  color: var(--fulfill-copy);
  font-size: 24rpx;
  line-height: 1.4;
}

.fulfill-form-error {
  display: block;
  margin-top: 16rpx;
  color: var(--fulfill-error);
  font-size: 24rpx;
  line-height: 1.4;
}

.tell-button {
  display: flex;
  height: 96rpx;
  margin-top: 24rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--fulfill-button);
  color: var(--fulfill-button-text);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 96rpx;
}
</style>

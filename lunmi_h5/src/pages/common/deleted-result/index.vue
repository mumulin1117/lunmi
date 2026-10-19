<template>
  <PageTransition ref="page_transition" class="deleted-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="deleted-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Deleted') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <view v-if="is_loading" class="deleted-skeleton" aria-hidden="true">
        <view class="deleted-skeleton__mark" />
        <view class="deleted-skeleton__line" />
        <view class="deleted-skeleton__line deleted-skeleton__line--short" />
      </view>
      <view v-else-if="load_error" class="state-card" role="alert">
        <text class="state-card__copy">{{ $t(load_error) }}</text>
        <view class="state-card__retry" role="button" @click="load_result">{{ $t('Try again') }}</view>
      </view>
      <view v-else class="deleted-body">
        <view class="deleted-mark" aria-hidden="true">
          <image src="/static/icon/post_details_del.png" mode="aspectFit" />
        </view>
        <text class="deleted-title">{{ $t(result_copy.title) }}</text>
        <text class="deleted-copy">{{ $t(result_copy.copy) }}</text>
        <view class="deleted-action" role="button" @click="go_back">
          <text>{{ $t(result_copy.action) }}</text>
        </view>
      </view>
    </view>
    <BottomSafeArea />
    <SuccessToast :message="$t(success_toast)" @dismiss="success_toast = ''" />
  </PageTransition>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectDynamicInfo } from '@/api/dynamic'
import { selectLmLanternPage } from '@/api/lantern'
import { selectLmWishPage } from '@/api/wish'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import SuccessToast from '@/components/SuccessToast.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { SUCCESS_TOAST } from '@/utils/successToast'
import { clear_login_state } from '@/utils/auth'
import {
  DELETE_OBJECT,
  DELETED_RESULT_STATUS,
  LOGIN_PAGE_PATH,
  can_verify_deleted_object,
  deleted_result_back_target,
  deleted_result_copy,
  is_account_deletion,
  read_deleted_result_query,
  result_is_removed
} from '@/utils/deleteConfirmPresentation'

const page_transition = ref(null)
const object_type = ref('')
const object_id = ref('')
const return_target = ref('')
const status = ref(DELETED_RESULT_STATUS.SUCCESS)
const is_loading = ref(true)
const load_error = ref('')
const success_toast = ref('')
const redirect_login = ref(false)
const is_page_active = ref(true)
const is_leaving = ref(false)
let request_context = {}

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--deleted-title': theme.colors.text.title,
  '--deleted-copy': theme.colors.text.secondary,
  '--deleted-border': theme.colors.surface.border,
  '--deleted-header-surface': theme.colors.lantern_detail.header_surface,
  '--deleted-line': theme.colors.lantern_detail.title_line,
  '--deleted-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--deleted-danger': theme.colors.dialog.danger.background,
  '--deleted-mark': theme.colors.surface.card,
  '--deleted-action': theme.colors.dialog.cancel.background,
  '--deleted-action-text': theme.colors.dialog.cancel.text,
  '--deleted-skeleton': theme.colors.lantern_detail.skeleton,
  '--deleted-error': theme.colors.status.info,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const result_copy = computed(() => deleted_result_copy(object_type.value, status.value))

const leave_to = (url) => {
  if (!is_page_active.value || is_leaving.value) return
  is_leaving.value = true
  request_context.cancel?.()
  nextTick(() => {
    const started = page_transition.value?.navigate_relaunch({
      url,
      fail: () => {
        is_leaving.value = false
        load_error.value = 'Unable to leave this page.'
      }
    })
    if (!started) {
      is_leaving.value = false
      load_error.value = 'Unable to leave this page.'
    }
  })
}

const go_back = () => {
  if (redirect_login.value) {
    leave_to(LOGIN_PAGE_PATH)
    return
  }
  leave_to(return_target.value)
}

const load_result = async () => {
  if (!is_page_active.value || redirect_login.value) return
  if (!object_id.value) {
    status.value = DELETED_RESULT_STATUS.GONE
    load_error.value = ''
    is_loading.value = false
    return
  }
  if (!can_verify_deleted_object(object_type.value)) {
    status.value = DELETED_RESULT_STATUS.SUCCESS
    success_toast.value = SUCCESS_TOAST.deleted
    load_error.value = ''
    is_loading.value = false
    return
  }
  is_loading.value = true
  load_error.value = ''
  request_context.cancel?.()
  request_context = {}
  const request = object_type.value === DELETE_OBJECT.POST
    ? selectDynamicInfo({ dynamicId: object_id.value }, request_context)
    : object_type.value === DELETE_OBJECT.WISH
      ? selectLmWishPage({ wishId: object_id.value, current: 1, size: 1 }, request_context)
      : selectLmLanternPage({ lanternId: object_id.value, current: 1, size: 1 }, request_context)
  const result = await request
  if (!is_page_active.value) return
  is_loading.value = false
  if (!result?.success) {
    status.value = DELETED_RESULT_STATUS.FAILURE
    load_error.value = result?.error || 'Unable to confirm this deletion.'
    return
  }
  if (!result_is_removed(result.data)) {
    status.value = DELETED_RESULT_STATUS.FAILURE
    load_error.value = 'This item is still available.'
    return
  }
  status.value = DELETED_RESULT_STATUS.SUCCESS
  success_toast.value = SUCCESS_TOAST.deleted
}

onLoad((query = {}) => {
  const parsed = read_deleted_result_query(query)
  object_type.value = parsed.object_type
  object_id.value = parsed.object_id
  return_target.value = deleted_result_back_target(parsed)
  if (is_account_deletion(parsed.object_type)) {
    redirect_login.value = true
    is_loading.value = false
    return
  }
  load_result()
})

onMounted(() => {
  if (!redirect_login.value) return
  clear_login_state()
  leave_to(LOGIN_PAGE_PATH)
})

onBackPress(() => {
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

.deleted-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.deleted-header {
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
  color: var(--deleted-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--deleted-line);
  box-shadow: 0 0 18rpx var(--deleted-line-shadow);
}

.deleted-body,
.deleted-skeleton,
.state-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 56rpx 0;
  text-align: center;
}

.deleted-mark,
.deleted-skeleton__mark {
  display: flex;
  width: 180rpx;
  height: 180rpx;
  align-items: center;
  justify-content: center;
  border-radius: 90rpx;
}

.deleted-mark image {
  width: 180rpx;
  height: 180rpx;
}

.deleted-title {
  display: block;
  margin-top: 48rpx;
  color: var(--deleted-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.25;
}

.deleted-copy {
  display: block;
  margin-top: 20rpx;
  color: var(--deleted-copy);
  font-size: 26rpx;
  line-height: 1.5;
}

.deleted-action,
.state-card__retry {
  display: flex;
  width: 100%;
  height: 88rpx;
  margin-top: 48rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--deleted-action);
  color: var(--deleted-action-text);
  font-size: 28rpx;
  font-weight: 700;
  line-height: 88rpx;
}

.state-card__copy {
  color: var(--deleted-copy);
  font-size: 26rpx;
  line-height: 1.45;
}

.state-card__retry {
  color: var(--deleted-error);
}

.deleted-skeleton__mark {
  border-color: transparent;
  background: var(--deleted-skeleton);
}

.deleted-skeleton__line {
  width: 360rpx;
  height: 28rpx;
  margin-top: 48rpx;
  border-radius: 999rpx;
  background: var(--deleted-skeleton);
}

.deleted-skeleton__line--short {
  width: 240rpx;
  margin-top: 20rpx;
}
</style>

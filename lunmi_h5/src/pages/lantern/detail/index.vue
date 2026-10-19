<template>
  <PageTransition ref="page_transition" class="detail-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="detail-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t(page_title) }}</text>
          <view class="header-line" />
        </view>
        <view
          v-if="can_delete"
          class="header-action"
          role="button"
          :aria-label="$t('Delete lantern')"
          @click="open_delete"
        >
          <image src="/static/icon/post_details_del.png" mode="aspectFit" />
        </view>
      </view>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content-scroll__inner">
          <LanternDetailSkeleton v-if="is_loading && !lantern" />
          <view v-else-if="load_error && !lantern" class="state-card" role="alert">
            <text class="state-card__copy">{{ $t(load_error) }}</text>
            <view class="state-card__retry" role="button" @click="load_detail">{{ $t('Try again') }}</view>
          </view>
          <view v-else-if="lantern" class="detail-body">
            <image
              class="detail-scene"
              src="/static/icon/lantern_detail_scene.png"
              mode="aspectFill"
            />
            <view class="content-panel">
              <view class="status-badge">
                <text>{{ $t(status_label) }}</text>
              </view>
              <text class="detail-title">{{ detail_title }}</text>
              <view class="detail-copy">
                <text>{{ lantern.content }}</text>
              </view>
              <view v-if="is_caught" class="source-row">
                <UserAvatar
                  v-if="avatar_url"
                  class="source-avatar"
                  :source="avatar_url"
                />
                <view v-else class="source-avatar source-avatar--fallback">
                  <image src="/static/icon/lantern_release_avatar.png" mode="aspectFit" />
                </view>
                <view class="source-copy">
                  <text class="source-name">{{ owner_label }}</text>
                  <text class="source-meta">{{ $t(scoop_time_label) }}</text>
                </view>
              </view>
              <view class="timeline-row">
                <view class="timeline-dot timeline-dot--gold" />
                <text class="timeline-label">{{ $t('Released') }}</text>
                <text class="timeline-value">{{ $t(released_label) }}</text>
              </view>
              <view class="timeline-row">
                <view class="timeline-dot" :class="{ 'timeline-dot--gold': is_scooped }" />
                <text class="timeline-label">{{ $t(second_timeline_label) }}</text>
                <text class="timeline-value">{{ $t(second_timeline_value) }}</text>
              </view>
              <view v-if="reply" class="reply-card">
                <text class="reply-kicker">{{ $t('YOUR REPLY') }}</text>
                <text class="reply-copy">{{ reply.content }}</text>
              </view>
              <view class="notice-card">
                <image src="/static/icon/lantern_detail_notice.png" mode="aspectFit" />
                <text>{{ $t(notice_text) }}</text>
              </view>
              <view v-if="load_error" class="inline-error" role="alert">
                <text>{{ $t(load_error) }}</text>
                <view role="button" @click="load_detail">{{ $t('Try again') }}</view>
              </view>
            </view>
          </view>
          <view v-else class="state-card">
            <text class="state-card__copy">{{ $t('This lantern is no longer available.') }}</text>
          </view>
        </view>
      </scroll-view>
      <view
        v-if="can_continue"
        class="continue-button"
        role="button"
        :aria-label="$t('Continue to reply')"
        @click="open_reply"
      >
        <text>{{ $t('Continue') }}</text>
        <image src="/static/icon/release_reply_button_right_flower.png" mode="aspectFit" />
      </view>
    </view>
    <BottomSafeArea />
    <DeleteConfirmDialog
      :visible="is_delete_visible"
      :title="$t(DELETE_COPY.lantern.title)"
      :copy="$t(DELETE_COPY.lantern.copy)"
      :error="delete_error"
      :pending="is_deleting"
      @cancel="close_delete"
      @confirm="confirm_delete"
    />
    <SuccessToast :message="$t(success_toast)" @dismiss="success_toast = ''" />
  </PageTransition>
</template>

<script setup>
import { t } from '@/utils/i18n'
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectUserBaseInfo } from '@/api/common'
import { deleteLmLanternById, selectLmLanternPage } from '@/api/lantern'
import { selectLmLanternReplyPage, selectLmLanternScoopPage } from '@/api/scoop'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import SuccessToast from '@/components/SuccessToast.vue'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import LanternDetailSkeleton from '@/components/LanternDetailSkeleton.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { SUCCESS_TOAST } from '@/utils/successToast'
import { storeGlobal } from '@/stores/store'
import {
  HOME_PAGE_PATH,
  build_lantern_reply_url,
  build_select_reply_params,
  build_select_scoop_params,
  format_lantern_date,
  is_caught_lantern_mode,
  lantern_owner_label,
  lantern_status_label,
  lantern_title_from_content,
  map_lantern_record,
  map_reply_record,
  map_scoop_record,
  read_lantern_records,
  read_page_records,
  read_route_lantern_id
} from '@/utils/lanternDetailPresentation'
import {
  build_select_lantern_params,
  is_release_flow_detail,
  normalize_lantern_source_page,
  read_route_lantern_type
} from '@/utils/releaseLanternPresentation'
import {
  DELETE_COPY,
  DELETE_OBJECT,
  build_deleted_result_url,
  can_delete_owned_object
} from '@/utils/deleteConfirmPresentation'
import { map_user_base_profile, to_user_id_param } from '@/utils/profilePresentation'

const account_store = storeGlobal()
const page_transition = ref(null)
const lantern_id = ref('')
const source_page = ref(HOME_PAGE_PATH)
const release_lantern_type = ref('')
const return_home_on_back = ref(false)
const is_caught = ref(false)
const lantern = ref(null)
const scoop = ref(null)
const reply = ref(null)
const is_loading = ref(true)
const load_error = ref('')
const success_toast = ref('')
const is_delete_visible = ref(false)
const is_deleting = ref(false)
const delete_error = ref('')
const owner_name = ref('')
const avatar_url = ref('')
const is_page_active = ref(true)
let request_context = {}
let delete_context = {}
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--detail-title': theme.colors.text.title,
  '--detail-secondary': theme.colors.text.secondary,
  '--detail-tertiary': theme.colors.text.tertiary,
  '--detail-surface': theme.colors.surface.card,
  '--detail-border': theme.colors.surface.border,
  '--detail-header-surface': theme.colors.lantern_detail.header_surface,
  '--detail-line': theme.colors.lantern_detail.title_line,
  '--detail-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--detail-badge-background': theme.colors.lantern_detail.badge_background,
  '--detail-badge-text': theme.colors.status.coin,
  '--detail-scene-fade': theme.colors.lantern_detail.scene_fade,
  '--detail-timeline-muted': theme.colors.lantern_detail.timeline_muted,
  '--detail-skeleton': theme.colors.lantern_detail.skeleton,
  '--detail-error': theme.colors.status.info,
  '--detail-error-background': theme.colors.surface.scrim_soft,
  '--detail-continue-background': theme.colors.button.primary,
  '--detail-continue-text': theme.colors.button.text,
  '--detail-continue-inset': theme.colors.release_sheet.button_inset,
  '--detail-danger': theme.colors.dialog.danger.background
}

const page_title = computed(() => (t(is_caught.value ? 'Caught lantern' : 'Released lantern')))
const status_label = computed(() => lantern_status_label(lantern.value?.lantern_status))
const detail_title = computed(() => {
  if (release_lantern_type.value) return t(release_lantern_type.value)
  return lantern_title_from_content(
    lantern.value?.content,
    is_caught.value ? 'Caught lantern' : 'Released lantern'
  )
})
const owner_label = computed(() => owner_name.value || t(lantern_owner_label(lantern.value)))
const released_label = computed(() => format_lantern_date(lantern.value?.released_at || lantern.value?.created_date))
const is_scooped = computed(() => Boolean(lantern.value?.scooped_at || scoop.value?.scooped_at || lantern.value?.lantern_status === 'scooped'))
const second_timeline_label = computed(() => {
  if (is_caught.value) return 'Caught'
  return is_scooped.value ? 'Scooped' : 'Still drifting'
})
const second_timeline_value = computed(() => {
  if (is_caught.value) return format_lantern_date(scoop.value?.scooped_at || lantern.value?.scooped_at)
  return is_scooped.value ? format_lantern_date(lantern.value?.scooped_at) : 'Now'
})
const scoop_time_label = computed(() => {
  const date_label = format_lantern_date(scoop.value?.scooped_at || lantern.value?.scooped_at)
  return date_label === '—' ? 'Caught just now' : `Caught ${date_label}`
})
const notice_text = computed(() => {
  if (is_caught.value && reply.value) return 'You already sent your one reply. It cannot be edited.'
  if (is_caught.value && scoop.value) return 'Send one reply to keep this lantern with you.'
  if (is_caught.value) return 'This catch is no longer available.'
  if (is_scooped.value) return 'Someone caught this lantern. You will hear if they write back.'
  return 'No one has picked this up yet. You will be told the moment someone does.'
})
const can_continue = computed(() => (
  is_caught.value && Boolean(lantern.value) && Boolean(scoop.value) && !reply.value && !is_loading.value
))
const can_delete = computed(() => (
  !is_caught.value
  && Boolean(lantern.value)
  && !is_loading.value
  && can_delete_owned_object(lantern.value?.owner_user_id, account_store.userId)
))

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const open_delete = () => {
  if (!can_delete.value || is_deleting.value) return
  delete_error.value = ''
  is_delete_visible.value = true
}

const close_delete = () => {
  if (is_deleting.value) return
  is_delete_visible.value = false
  delete_error.value = ''
}

const confirm_delete = async () => {
  const id = lantern.value?.lantern_id
  if (!id || is_deleting.value) return
  is_deleting.value = true
  delete_error.value = ''
  delete_context.cancel?.()
  delete_context = {}
  const result = await deleteLmLanternById(id, delete_context)
  is_deleting.value = false
  if (!is_page_active.value) return
  if (!result?.success) {
    delete_error.value = result?.error || 'Unable to delete this lantern.'
    return
  }
  is_delete_visible.value = false
  const url = build_deleted_result_url({
    object_type: DELETE_OBJECT.LANTERN,
    object_id: id,
    source_page: source_page.value || HOME_PAGE_PATH,
    return_page: source_page.value || HOME_PAGE_PATH
  })
  const started = page_transition.value?.navigate_forward({
    url,
    fail: () => go_back()
  })
  if (!started) go_back()
}

const go_back = () => {
  if (is_delete_visible.value) {
    close_delete()
    return
  }
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const previous_route = `/${pages.at(-2)?.route || ''}`
  // Release replaces the animation page, leaving the original Home underneath.
  // Pop back to that instance so the scene is not destroyed and loaded again.
  if (return_home_on_back.value && previous_route !== HOME_PAGE_PATH) {
    page_transition.value?.navigate_relaunch({ url: HOME_PAGE_PATH, immediate: true })
    return
  }
  if (page_stack_length() > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        page_transition.value?.navigate_relaunch({
          url: source_page.value || HOME_PAGE_PATH,
          immediate: return_home_on_back.value
        })
      }
    })
    if (!started) {
      allow_route_back = false
      page_transition.value?.navigate_relaunch({
        url: source_page.value || HOME_PAGE_PATH,
        immediate: return_home_on_back.value
      })
    }
    return
  }
  page_transition.value?.navigate_relaunch({
    url: source_page.value || HOME_PAGE_PATH,
    immediate: return_home_on_back.value
  })
}

const open_reply = () => {
  if (!can_continue.value) return
  const target_user_id = lantern.value?.owner_user_id
  if (target_user_id === '' || target_user_id == null) {
    load_error.value = 'Reply is not available yet.'
    return
  }
  const started = page_transition.value?.navigate_forward({
    url: build_lantern_reply_url({
      lantern_id: lantern.value.lantern_id,
      target_user_id,
      source_page: source_page.value || HOME_PAGE_PATH
    }),
    fail: () => {
      load_error.value = 'Reply is not available yet.'
    }
  })
  if (!started) load_error.value = 'Reply is not available yet.'
}

const load_caught_extras = async (current_lantern_id) => {
  const scooper_user_id = account_store.userId
  if (!scooper_user_id) {
    scoop.value = null
    reply.value = null
    return
  }
  const scoop_result = await selectLmLanternScoopPage(
    build_select_scoop_params({
      lantern_id: current_lantern_id,
      scooper_user_id
    }),
    request_context
  )
  if (!is_page_active.value) return
  if (!scoop_result?.success) {
    load_error.value = scoop_result?.error || 'Unable to load this catch.'
    return
  }
  scoop.value = map_scoop_record(read_page_records(scoop_result.data)[0])
  if (!scoop.value?.lantern_scoop_id) {
    reply.value = null
    return
  }
  const reply_result = await selectLmLanternReplyPage(
    build_select_reply_params({ lantern_scoop_id: scoop.value.lantern_scoop_id }),
    request_context
  )
  if (!is_page_active.value) return
  if (!reply_result?.success) {
    load_error.value = reply_result?.error || 'Unable to load this reply.'
    return
  }
  reply.value = map_reply_record(read_page_records(reply_result.data)[0])
}

const load_owner_profile = async (mapped) => {
  owner_name.value = ''
  avatar_url.value = ''
  if (!mapped?.anonymous_display) {
    const owner_user_id = to_user_id_param(mapped?.owner_user_id)
    if (owner_user_id != null) {
      const profile_result = await selectUserBaseInfo({ userId: owner_user_id }, request_context)
      if (!is_page_active.value) return
      if (profile_result?.success) {
        const profile = map_user_base_profile(profile_result.data)
        owner_name.value = profile.username
        avatar_url.value = profile.avatar_url
      }
    }
  }
}

// feedback_mode: region_loading — skeleton covers the detail body while the header stays.
const load_detail = async () => {
  if (!is_page_active.value) return
  if (!lantern_id.value) {
    lantern.value = null
    load_error.value = 'Lantern ID is missing.'
    is_loading.value = false
    return
  }
  is_loading.value = true
  load_error.value = ''
  request_context.cancel?.()
  request_context = {}
  try {
    const result = await selectLmLanternPage(
      build_select_lantern_params({ lantern_id: lantern_id.value }),
      request_context
    )
    if (!is_page_active.value) return
    if (!result?.success) {
      load_error.value = result?.error || 'Unable to load this lantern.'
      return
    }
    lantern.value = map_lantern_record(read_lantern_records(result.data)[0])
    if (!lantern.value || lantern.value.deleted) {
      lantern.value = null
      load_error.value = 'This lantern is no longer available.'
      return
    }
    scoop.value = null
    reply.value = null
    owner_name.value = ''
    avatar_url.value = ''
    if (is_caught.value) {
      await load_caught_extras(lantern.value.lantern_id)
      await load_owner_profile(lantern.value)
    }
  } catch (error) {
    if (!is_page_active.value) return
    load_error.value = error?.message || 'Unable to load this lantern.'
  } finally {
    if (is_page_active.value) is_loading.value = false
  }
}

onLoad((options = {}) => {
  lantern_id.value = read_route_lantern_id(options)
  source_page.value = normalize_lantern_source_page(options?.sourcePage)
  release_lantern_type.value = read_route_lantern_type(options)
  return_home_on_back.value = is_release_flow_detail(options)
  is_caught.value = is_caught_lantern_mode(options)
  if (`${options.released || ''}` === '1') success_toast.value = SUCCESS_TOAST.lantern
  load_detail()
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  request_context.cancel?.()
  delete_context.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.detail-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.detail-header {
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
  flex: 1;
  margin-left: 24rpx;
}

.header-title {
  display: block;
  color: var(--detail-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--detail-line);
  box-shadow: 0 0 18rpx var(--detail-line-shadow);
}

.header-action {
  display: flex;
width: 72rpx;
height: 72rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  margin-left: 16rpx;
  border-radius: 36rpx;
}

.header-action image {
width: 72rpx;
height: 72rpx;
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  min-height: 100%;
  padding-bottom: 32rpx;
}

.detail-scene {
  display: block;
  width: calc(100% - 72rpx);
  height: 480rpx;
  margin: 24rpx 36rpx 0;
  border-radius: 32rpx;
}

.content-panel {
  padding: 28rpx 36rpx 40rpx;
  background: var(--detail-scene-fade);
}

.status-badge {
  display: inline-flex;
  height: 58rpx;
  align-items: center;
  padding: 0 26rpx;
  border-radius: 999rpx;
  background: var(--detail-badge-background);
  color: var(--detail-badge-text);
  font-size: 22rpx;
  font-weight: 700;
}

.detail-title {
  display: block;
  margin-top: 24rpx;
  overflow: hidden;
  color: var(--detail-title);
  font-size: 46rpx;
  font-weight: 700;
  line-height: 56rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-copy {
  margin-top: 24rpx;
  padding: 48rpx 40rpx;
  border: 1px solid var(--detail-border);
  border-radius: 46rpx;
  background: var(--detail-surface);
  color: var(--detail-title);
  font-size: 28rpx;
  line-height: 48rpx;
}

.source-row {
  display: flex;
  margin-top: 28rpx;
  align-items: center;
}

.source-avatar {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--detail-border);
  border-radius: 32rpx;
  background: var(--detail-surface);
}

.source-avatar--fallback {
  overflow: hidden;
}

.source-avatar--fallback image {
  width: 30rpx;
  height: 30rpx;
}

.source-copy {
  min-width: 0;
  margin-left: 16rpx;
}

.source-name {
  display: block;
  color: var(--detail-title);
  font-size: 24rpx;
  font-weight: 700;
}

.source-meta {
  display: block;
  margin-top: 4rpx;
  color: var(--detail-timeline-muted);
  font-size: 20rpx;
}

.timeline-row {
  display: flex;
  height: 32rpx;
  margin-top: 32rpx;
  align-items: center;
}

.timeline-dot {
  width: 20rpx;
  height: 20rpx;
  margin-right: 24rpx;
  border-radius: 10rpx;
  background: var(--detail-timeline-muted);
}

.timeline-dot--gold {
  background: var(--detail-badge-text);
}

.timeline-label {
  color: var(--detail-title);
  font-size: 26rpx;
  font-weight: 700;
}

.timeline-value {
  margin-left: auto;
  color: var(--detail-secondary);
  font-size: 24rpx;
}

.reply-card {
  margin-top: 36rpx;
  padding: 32rpx 34rpx;
  border: 1px solid var(--detail-border);
  border-radius: 32rpx;
  background: var(--detail-surface);
}

.reply-kicker {
  display: block;
  color: var(--detail-badge-text);
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.reply-copy {
  display: block;
  margin-top: 12rpx;
  color: var(--detail-title);
  font-size: 26rpx;
  line-height: 40rpx;
}

.notice-card {
  display: flex;
  min-height: 130rpx;
  margin-top: 36rpx;
  padding: 28rpx 38rpx;
  align-items: center;
  border: 1px solid var(--detail-border);
  border-radius: 38rpx;
  background: var(--detail-surface);
  color: var(--detail-timeline-muted);
  font-size: 22rpx;
  line-height: 36rpx;
}

.notice-card image {
  width: 32rpx;
  height: 32rpx;
  margin-right: 18rpx;
  flex: none;
}

.inline-error {
  display: flex;
  margin-top: 24rpx;
  padding: 20rpx 24rpx;
  align-items: center;
  justify-content: space-between;
  border-radius: 20rpx;
  background: var(--detail-error-background);
  color: var(--detail-title);
  font-size: 22rpx;
}

.inline-error view {
  margin-left: 16rpx;
  color: var(--detail-error);
  font-weight: 700;
}

.state-card {
  display: flex;
  margin: 80rpx 36rpx 0;
  padding: 32rpx;
  align-items: center;
  justify-content: space-between;
  border-radius: 28rpx;
  background: var(--detail-error-background);
}

.state-card__copy {
  min-width: 0;
  flex: 1;
  color: var(--detail-title);
  font-size: 26rpx;
  line-height: 36rpx;
}

.state-card__retry {
  margin-left: 24rpx;
  color: var(--detail-error);
  font-size: 26rpx;
  font-weight: 700;
}

.continue-button {
  display: flex;
  height: 112rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 8rpx 36rpx 16rpx;
  border-radius: 999rpx;
  background: var(--detail-continue-background);
  box-shadow: inset 0 2rpx 0 var(--detail-continue-inset);
  color: var(--detail-continue-text);
  font-size: 32rpx;
  font-weight: 700;
}

.continue-button image {
  width: 92rpx;
  height: 64rpx;
  margin-left: 8rpx;
}
</style>

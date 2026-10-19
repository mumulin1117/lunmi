<template>
  <PageTransition ref="page_transition" class="scoop-page" :style="theme_style">
    <AmbientScene class="scoop-scene" scene="home" />
    <LanternRitual kind="scoop" :state="load_error ? 'error' : (is_empty ? 'empty' : (is_catch_ready ? 'complete' : 'waiting'))" @complete="finish_caught_scoop_flow" />
    <view class="scoop-shade" aria-hidden="true" />
    <TopSafeArea />
    <view class="scoop-stage">
      <view
        v-if="!is_catch_ready"
        class="scoop-pill"
        role="status"
        aria-live="polite"
      >
        <view class="scoop-dot" />
        <text>{{ $t(pill_label) }}</text>
      </view>
      <view v-if="load_error" class="scoop-error" role="alert">
        <text class="scoop-error__copy">{{ $t(load_error) }}</text>
        <view
          class="scoop-error__retry"
          role="button"
          :aria-disabled="is_scooping"
          @click="retry_search"
        >
          {{ $t('Try again') }}
        </view>
      </view>
      <view
        class="skip-button"
        role="button"
        :aria-label="$t('Skip scooping')"
        @click="skip_scoop"
      >
        <text>{{ $t('Skip') }}</text>
        <image src="/static/icon/release_skip.png" mode="aspectFit" />
      </view>
    </view>
    <view
      v-if="is_empty"
      class="empty-layer"
      @click="skip_scoop"
    >
      <view class="empty-card" @click.stop>
        <text class="empty-title">{{ $t(empty_title) }}</text>
        <text class="empty-copy">{{ $t(empty_copy) }}</text>
        <view class="empty-actions">
          <view class="empty-button empty-button--secondary" role="button" @click="skip_scoop">
            {{ $t('Back home') }}
          </view>
          <view class="empty-button empty-button--primary" role="button" @click="retry_search">
            {{ $t('Try again') }}
          </view>
        </view>
      </view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onUnload } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { addLmLanternScoop } from '@/api/scoop'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import AmbientScene from '@/components/AmbientScene.vue'
import LanternRitual from '@/components/LanternRitual.vue'
import { storeGlobal } from '@/stores/store'
import { save_pending_caught_lantern } from '@/utils/caughtLanternPendingStorage'
import { normalize_lantern_source_page } from '@/utils/releaseLanternPresentation'
import {
  HOME_PAGE_PATH,
  NO_LANTERN_COPY,
  NO_LANTERN_TITLE,
  build_caught_owner_snapshot,
  map_caught_lantern_result
} from '@/utils/scoopLanternPresentation'

const page_transition = ref(null)
const source_page = ref(HOME_PAGE_PATH)
const load_error = ref('')
const is_scooping = ref(false)
const is_empty = ref(false)
const is_page_active = ref(true)
const is_leaving = ref(false)
const pending_lantern_id = ref('')
const pending_scoop_id = ref('')
const is_catch_ready = ref(false)
const pending_caught_lantern = ref(null)
let is_opening_caught_home = false
let ceremony_finished = false
const empty_title = NO_LANTERN_TITLE
const empty_copy = NO_LANTERN_COPY
let request_context = { cancel() {} }
let allow_route_back = false
const caught_result = ref(null)

const begin_requests = () => {
  const contexts = []
  request_context = {
    cancel: () => {
      contexts.forEach((context) => context.cancel?.())
    }
  }
  return () => {
    const context = {}
    contexts.push(context)
    return context
  }
}

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--scoop-shade': theme.colors.home.scene_shade,
  '--scoop-pill-background': theme.colors.release_flow.pill_background,
  '--scoop-pill-border': theme.colors.surface.border,
  '--scoop-info': theme.colors.status.info,
  '--scoop-title': theme.colors.text.title,
  '--scoop-secondary': theme.colors.text.secondary,
  '--scoop-ghost-background': theme.colors.button.ghost.background,
  '--scoop-ghost-border': theme.colors.button.ghost.border,
  '--scoop-ghost-text': theme.colors.button.ghost.text,
  '--scoop-error-background': theme.colors.release_flow.error_background,
  '--scoop-retry': theme.colors.status.info,
  '--scoop-dialog-background': theme.colors.dialog.background,
  '--scoop-dialog-border': theme.colors.dialog.border,
  '--scoop-scrim': theme.colors.surface.scrim,
  '--scoop-primary': theme.colors.button.primary,
  '--scoop-primary-text': theme.colors.button.text,
  '--scoop-cancel-background': theme.colors.dialog.cancel.background,
  '--scoop-cancel-border': theme.colors.dialog.cancel.border,
  '--scoop-cancel-text': theme.colors.dialog.cancel.text
}

const pill_label = computed(() => {
  if (is_empty.value) return 'Nothing new'
  if (load_error.value) return 'Search paused'
  return 'Finding...'
})

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const go_home = () => {
  if (page_stack_length() > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        page_transition.value?.navigate_relaunch({ url: source_page.value || HOME_PAGE_PATH })
      }
    })
    if (!started) {
      allow_route_back = false
      page_transition.value?.navigate_relaunch({ url: source_page.value || HOME_PAGE_PATH })
    }
    return
  }
  page_transition.value?.navigate_relaunch({ url: source_page.value || HOME_PAGE_PATH })
}

const save_scoop_handoff_ids = () => {
  const account_store = storeGlobal()
  const user_id = account_store.userId
  const lantern_id = pending_lantern_id.value
  const lantern_scoop_id = pending_scoop_id.value
  if (!user_id || !lantern_id || !lantern_scoop_id) return false
  const lantern = pending_caught_lantern.value
  return save_pending_caught_lantern({
    user_id,
    lantern_id,
    lantern_scoop_id,
    anonymous_display: lantern?.anonymous_display,
    owner_user_id: lantern?.owner_user_id || '',
    caught_data: caught_result.value
  })
}

const finish_caught_scoop_flow = () => {
  if (
    !is_page_active.value
    || is_leaving.value
    || !is_catch_ready.value
    || load_error.value
    || is_empty.value
    || ceremony_finished
    || is_opening_caught_home
  ) return
  if (`${caught_result.value?.scoop.scooper_user_id}` !== `${storeGlobal().userId}`) {
    is_catch_ready.value = false
    load_error.value = 'Please sign in before opening this lantern.'
    return
  }
  ceremony_finished = true
  if (is_scooping.value || !pending_lantern_id.value || !pending_scoop_id.value) return
  void open_caught_home(pending_lantern_id.value, pending_scoop_id.value)
}

const restore_caught_return_failure = () => {
  if (!is_page_active.value) return
  allow_route_back = false
  is_leaving.value = false
  ceremony_finished = false
  is_catch_ready.value = false
  load_error.value = 'The caught lantern could not be opened.'
}

const relaunch_caught_home = () => {
  if (!is_page_active.value) return
  const started = page_transition.value?.navigate_relaunch({
    url: HOME_PAGE_PATH,
    immediate: true,
    fail: restore_caught_return_failure
  })
  if (!started) restore_caught_return_failure()
}

const return_to_caught_home = () => {
  if (!is_page_active.value || is_leaving.value) return
  is_leaving.value = true
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const previous_page = pages[pages.length - 2]
  if (previous_page && `/${previous_page.route}` === HOME_PAGE_PATH) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      immediate: true,
      complete: () => { allow_route_back = false },
      fail: () => {
        allow_route_back = false
        relaunch_caught_home()
      }
    })
    if (!started) {
      allow_route_back = false
      relaunch_caught_home()
    }
    return
  }
  relaunch_caught_home()
}

// Keep the caught lantern visible until direct navigation reveals its content card.
const open_caught_home = async (lantern_id, lantern_scoop_id) => {
  if (!is_page_active.value || is_leaving.value || is_opening_caught_home) return
  if (!lantern_id || !lantern_scoop_id) {
    restore_caught_return_failure()
    return
  }
  const account_store = storeGlobal()
  if (!account_store.userId || `${caught_result.value?.scoop.scooper_user_id}` !== `${account_store.userId}`) {
    restore_caught_return_failure()
    load_error.value = 'Please sign in before opening this lantern.'
    return
  }
  is_opening_caught_home = true
  const current_user_id = account_store.userId
  try {
    save_scoop_handoff_ids()
    const owner_snapshot = build_caught_owner_snapshot(caught_result.value?.lantern, caught_result.value?.owner_profile)
    if (!is_page_active.value || is_leaving.value) return
    if (`${account_store.userId}` !== `${current_user_id}`) {
      restore_caught_return_failure()
      return
    }
    const owner = owner_snapshot || {}
    const saved = save_pending_caught_lantern({
      user_id: account_store.userId,
      lantern_id,
      lantern_scoop_id,
      anonymous_display: owner.anonymous_display,
      owner_user_id: owner.owner_user_id,
      owner_user_name: owner.owner_user_name,
      owner_avatar_url: owner.owner_avatar_url,
      caught_data: caught_result.value
    })
    if (!saved) {
      restore_caught_return_failure()
      return
    }
    return_to_caught_home()
  } catch (error) {
    if (!is_page_active.value || is_leaving.value) return
    load_error.value = error?.message || 'The caught lantern could not be opened.'
    ceremony_finished = false
    is_catch_ready.value = false
  } finally {
    is_opening_caught_home = false
  }
}

const skip_scoop = () => {
  if (!is_page_active.value || is_leaving.value) return
  if (is_catch_ready.value && !is_scooping.value) {
    finish_caught_scoop_flow()
    return
  }
  is_leaving.value = true
  is_empty.value = false
  request_context.cancel?.()
  go_home()
}

const retry_search = () => {
  if (is_scooping.value) return
  is_empty.value = false
  if (caught_result.value && pending_lantern_id.value && pending_scoop_id.value
    && `${caught_result.value.scoop.scooper_user_id}` === `${storeGlobal().userId}`) {
    load_error.value = ''
    ceremony_finished = false
    is_catch_ready.value = true
    return
  }
  pending_lantern_id.value = ''
  pending_scoop_id.value = ''
  pending_caught_lantern.value = null
  start_scoop()
}

// feedback_mode: control_pending — searching stays separate from a confirmed catch.
const start_scoop = async () => {
  if (!is_page_active.value || is_scooping.value || is_leaving.value) return
  const account_store = storeGlobal()
  if (!account_store.userId) {
    load_error.value = 'Please sign in before scooping a lantern.'
    return
  }
  is_scooping.value = true
  is_catch_ready.value = false
  ceremony_finished = false
  load_error.value = ''
  is_empty.value = false
  caught_result.value = null
  pending_caught_lantern.value = null
  pending_lantern_id.value = ''
  pending_scoop_id.value = ''
  request_context.cancel?.()
  const track_request = begin_requests()
  const current_user_id = `${account_store.userId}`
  try {
    const created = await addLmLanternScoop({}, track_request())
    if (!is_page_active.value || is_leaving.value || `${account_store.userId}` !== current_user_id) return
    if (!created?.success) {
      load_error.value = created?.error || 'Unable to catch a lantern.'
      return
    }
    if (created.data == null) {
      is_empty.value = true
      return
    }
    const caught = map_caught_lantern_result(created.data)
    if (!caught || `${caught.scoop.scooper_user_id}` !== current_user_id) {
      load_error.value = 'The caught lantern data is incomplete.'
      return
    }
    caught_result.value = caught
    pending_caught_lantern.value = caught.lantern
    pending_lantern_id.value = caught.lantern.lantern_id
    pending_scoop_id.value = caught.scoop.lantern_scoop_id
    if (!save_scoop_handoff_ids()) {
      load_error.value = 'The caught lantern could not be opened.'
      return
    }
    is_catch_ready.value = true
  } catch (error) {
    if (!is_page_active.value || is_leaving.value) return
    load_error.value = error?.message || 'Unable to catch a lantern.'
  } finally {
    if (is_page_active.value) {
      is_scooping.value = false
      if (load_error.value || is_empty.value || `${account_store.userId}` !== current_user_id) {
        is_catch_ready.value = false
      } else if (ceremony_finished && caught_result.value && !is_leaving.value) {
        void open_caught_home(pending_lantern_id.value, pending_scoop_id.value)
      }
    }
  }
}

onLoad((options = {}) => {
  source_page.value = normalize_lantern_source_page(options?.sourcePage)
  start_scoop()
})

onBackPress((event = {}) => {
  if (allow_route_back || event.from === 'navigateBack') return false
  skip_scoop()
  return true
})

const dispose = () => {
  is_page_active.value = false
  request_context.cancel?.()
}
onUnload(dispose)
onBeforeUnmount(dispose)
</script>

<style scoped lang="scss">
.scoop-page {
  position: relative;
  background: var(--page-background);
}

.scoop-scene {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.scoop-shade {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--scoop-shade);
}

.scoop-stage {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 34rpx 32rpx;
}

.scoop-pill {
  display: flex;
  width: 280rpx;
  height: 96rpx;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--scoop-pill-border);
  border-radius: 999rpx;
  background: var(--scoop-pill-background);
  color: var(--scoop-title);
  font-size: 28rpx;
  font-weight: 700;
}

.scoop-dot {
  width: 16rpx;
  height: 16rpx;
  margin-right: 16rpx;
  border-radius: 50%;
  background: var(--scoop-info);
  box-shadow: 0 0 10rpx var(--scoop-info);
}

.scoop-error {
  display: flex;
  width: 100%;
  margin-top: 48rpx;
  padding: 28rpx 32rpx;
  align-items: center;
  justify-content: space-between;
  border-radius: 24rpx;
  background: var(--scoop-error-background);
}

.scoop-error__copy {
  min-width: 0;
  flex: 1;
  color: var(--scoop-title);
  font-size: 24rpx;
  line-height: 34rpx;
}

.scoop-error__retry {
  margin-left: 24rpx;
  color: var(--scoop-retry);
  font-size: 24rpx;
  font-weight: 700;
}

.skip-button {
  display: flex;
  width: 162rpx;
  height: 81rpx;
  margin-top: auto;
  margin-left: auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--scoop-ghost-border);
  border-radius: 999rpx;
  background: var(--scoop-ghost-background);
  color: var(--scoop-ghost-text);
  font-size: 26rpx;
  font-weight: 700;
}

.skip-button image {
  width: 28rpx;
  height: 28rpx;
  margin-left: 10rpx;
}

.empty-layer {
  position: absolute;
  z-index: 4;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: var(--scoop-scrim);
}

.empty-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 620rpx;
  padding: 44rpx 36rpx 36rpx;
  border: 1px solid var(--scoop-dialog-border);
  border-radius: 36rpx;
  background: var(--scoop-dialog-background);
}

.empty-title {
  display: block;
  color: var(--scoop-title);
  font-size: 40rpx;
  font-weight: 800;
}

.empty-copy {
  display: block;
  margin-top: 18rpx;
  color: var(--scoop-secondary);
  font-size: 26rpx;
  line-height: 40rpx;
}

.empty-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 36rpx;
}

.empty-button {
  display: flex;
  height: 88rpx;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  font-size: 25rpx;
  font-weight: 800;
  line-height: 88rpx;
  text-align: center;
}

.empty-button--secondary {
  border: 1px solid var(--scoop-cancel-border);
  background: var(--scoop-cancel-background);
  color: var(--scoop-cancel-text);
}

.empty-button--primary {
  background: var(--scoop-primary);
  color: var(--scoop-primary-text);
}

</style>

<template>
  <PageTransition ref="page_transition" class="home-page" :style="theme_style">
    <AmbientScene class="home-scene" scene="home" />
    <view class="home-shade" aria-hidden="true" />
    <TopSafeArea />
    <view class="home-toolbar">
      <view class="scope-pill">
        <view
          class="scope-option"
          :class="{ 'scope-option--active': feed_scope === 'all' }"
          role="button"
          :aria-label="$t('Show all lanterns')"
          :aria-pressed="feed_scope === 'all'"
          @click="choose_all"
        >
          <text>{{ $t('All') }}</text>
        </view>
        <view
          class="scope-option"
          :class="{ 'scope-option--active': feed_scope === 'nearby' }"
          role="button"
          :aria-label="$t('Show nearby lanterns')"
          :aria-pressed="feed_scope === 'nearby'"
          @click="choose_nearby"
        >
          <text>{{ $t('Nearby') }}</text>
        </view>
      </view>
      <view class="toolbar-action toolbar-action--posts" role="button" :aria-label="$t('Open posts')" @click="open_posts">
        <image class="toolbar-action__icon" src="/static/icon/index_post.png" mode="aspectFit" />
      </view>
      <view class="toolbar-action" role="button" :aria-label="$t('Open notifications')" @click="open_notifications">
        <image class="toolbar-action__icon" src="/static/icon/index_notice.png" mode="aspectFit" />
      </view>
    </view>
    <scroll-view class="home-scroll" scroll-y :show-scrollbar="false">
      <view class="home-scroll__inner">
        <view class="room-card" role="button" :aria-label="$t('Open voice rooms')" @click="open_voice_rooms">
          <view class="room-card__icon">
            <image src="/static/icon/lantern_home_voice.png" mode="aspectFit" />
          </view>
          <view class="room-card__copy">
            <text class="room-card__title">{{ $t('Late-night Voice Rooms') }}</text>
            <text class="room-card__subtitle">{{ $t('Join a quiet room, or just listen') }}</text>
          </view>
          <view class="live-badge">
            <view class="live-badge__dot" />
            <text>{{ $t('LIVE') }}</text>
          </view>
        </view>
        <view class="feature-row">
          <view class="feature-card" role="button" :aria-label="$t('Release a lantern')" @click="open_release">
            <image class="feature-card__bg" src="/static/icon/lantern_home_release_bg.png" mode="aspectFill" />
            <text class="feature-badge">{{ $t('LANTERN POST') }}</text>
            <HomeFeatureArt class="feature-art" kind="release" />
            <view class="feature-overlay">
              <text class="feature-title">{{ $t('Release') }}</text>
              <view class="feature-meta">
                <text class="feature-caption">{{ $t('Send a lantern') }}</text>
                <image class="feature-arrow" src="/static/icon/lantern_home_arrow.png" mode="aspectFit" />
              </view>
            </view>
          </view>
          <view class="feature-card" role="button" :aria-label="$t('Scoop a lantern')" @click="open_scoop">
            <image class="feature-card__bg" src="/static/icon/lantern_home_scoop_bg.png" mode="aspectFill" />
            <text class="feature-badge feature-badge--tonight">{{ $t('TONIGHT\'S PICK') }}</text>
            <HomeFeatureArt class="feature-art" kind="scoop" />
            <view class="feature-overlay">
              <text class="feature-title">{{ $t('Scoop') }}</text>
              <view class="feature-meta">
                <text class="feature-caption">{{ $t('Catch a lantern') }}</text>
                <LanternHomeSkeleton v-if="is_loading" />
                <text v-else-if="scoop_remaining !== null" class="scoop-count">{{ $t(scoop_remaining) }} {{ $t('LEFT') }}</text>
              </view>
            </view>
          </view>
        </view>
        <text v-if="load_error && scoop_remaining !== null" class="home-inline-error">{{ $t(load_error) }}</text>
        <text v-if="action_message" class="home-inline-error">{{ $t(action_message) }}</text>
        <view v-if="load_error && scoop_remaining === null" class="home-error" role="alert">
          <text class="home-error__title">{{ $t('Unable to load the lantern home') }}</text>
          <text class="home-error__copy">{{ $t(load_error) }}</text>
          <view class="home-error__retry" role="button" @click="load_home">{{ $t('Try again') }}</view>
        </view>
      </view>
    </scroll-view>
    <ReleaseLanternSheet
      ref="release_sheet"
      :visible="is_release_visible"
      :bottom-offset="home_sheet_bottom_offset"
      @update:visible="is_release_visible = $event"
      @released="on_lantern_released"
      @request-photos="open_photos_permission"
      @buy-coins="open_buy_coins_from_release"
    />
    <PurchaseScoopAttemptsConfirmDialog
      :visible="is_purchase_visible"
      :busy="is_purchasing"
      :error-message="purchase_error"
      @cancel="close_purchase"
      @confirm="confirm_purchase"
    />
    <InsufficientBalanceConfirmDialog
      :visible="is_balance_visible"
      @cancel="close_balance"
      @buy="buy_coins_from_balance"
    />
    <CaughtLanternSheet
      :visible="is_caught_visible"
      :caught-data="caught_data"
      :lantern-id="caught_lantern_id"
      :lantern-scoop-id="caught_scoop_id"
      :cached-owner-user-id="caught_owner_user_id"
      :cached-owner-name="caught_owner_name"
      :cached-owner-avatar-url="caught_owner_avatar_url"
      :cached-owner-anonymous="caught_owner_anonymous"
      bottom-offset="0rpx"
      @close="close_caught"
      @reply="reply_to_caught"
      @report="open_caught_report"
    />
    <teleport to="body">
      <ReportUserSheet
        :visible="is_caught_report_visible"
        :target-name="caught_report_name"
        :target-user-id="caught_report_user_id"
        bottom-offset="0rpx"
        @update:visible="is_caught_report_visible = $event"
      />
    </teleport>
    <PermissionRequestOverlay
      :visible="is_permission_request_visible"
      :permission-key="permission_request_key"
      @update:visible="is_permission_request_visible = $event"
      @granted="on_permission_granted"
      @denied="on_permission_denied"
    />
    <view class="main-tabbar-spacer" aria-hidden="true" />
  </PageTransition>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onHide, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import AmbientScene from '@/components/AmbientScene.vue'
import HomeFeatureArt from '@/components/HomeFeatureArt.vue'
import { addUserBalanceRecord, selectUserBalance, updateUserBalance } from '@/api/common'
import { saveLmUserModuleData, selectLmUserModuleDataPage } from '@/api/userModule'
import CaughtLanternSheet from '@/components/CaughtLanternSheet.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import InsufficientBalanceConfirmDialog from '@/components/InsufficientBalanceConfirmDialog.vue'
import LanternHomeSkeleton from '@/components/LanternHomeSkeleton.vue'
import PageTransition from '@/components/PageTransition.vue'
import PermissionRequestOverlay from '@/components/PermissionRequestOverlay.vue'
import PurchaseScoopAttemptsConfirmDialog from '@/components/PurchaseScoopAttemptsConfirmDialog.vue'
import ReleaseLanternSheet from '@/components/ReleaseLanternSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { storeGlobal } from '@/stores/store'
import { read_balance_after_update } from '@/utils/coinPurchasePresentation'
import { read_coin_balance } from '@/utils/myProfilePresentation'
import { build_lantern_reply_url } from '@/utils/lanternDetailPresentation'
import {
  SCOOP_ATTEMPT_COIN_COST,
  build_persist_purchased_scoop_remaining_params,
  build_scoop_attempt_purchase_record_params,
  can_afford_scoop_attempt,
  map_attempt_record,
  plan_scoop_attempt_purchase_consumption,
  scoop_remaining_after_purchase
} from '@/utils/lanternHomePresentation'
import { build_lantern_release_url } from '@/utils/releaseLanternPresentation'
import {
  clear_pending_caught_lantern,
  read_pending_caught_lantern,
  save_pending_caught_lantern
} from '@/utils/caughtLanternPendingStorage'
import { read_caught_route } from '@/utils/scoopLanternPresentation'
import { should_open_home_release_sheet } from '@/utils/sentLanternPresentation'

const HOME_PAGE_PATH = '/pages/home/index'
const page_transition = ref(null)
const release_sheet = ref(null)
const feed_scope = ref('all')
const scoop_remaining = ref(null)
const attempt_record = ref(null)
const is_loading = ref(false)
const load_error = ref('')
const action_message = ref('')
const is_release_visible = ref(false)
const is_purchase_visible = ref(false)
const is_balance_visible = ref(false)
const is_purchasing = ref(false)
const purchase_error = ref('')
const pending_scoop_purchase = ref(null)
const is_caught_visible = ref(false)
const caught_data = ref(null)
const caught_lantern_id = ref('')
const caught_scoop_id = ref('')
const caught_owner_user_id = ref('')
const caught_owner_name = ref('')
const caught_owner_avatar_url = ref('')
const caught_owner_anonymous = ref(false)
const is_caught_report_visible = ref(false)
const caught_report_user_id = ref('')
const caught_report_name = ref('')
let open_scoop_after_load = false
let open_release_after_show = false
let caught_query_key = ''
let consumed_caught_route_key = ''
let caught_route_query = null
let caught_open_token = 0
let caught_open_frame = null
let is_home_shown = false
const is_page_active = ref(true)
let purchase_request_context = {}
let scoop_purchase_sync_context = {}
let request_context = null
const is_permission_request_visible = ref(false)
const permission_request_key = ref('')
let permission_request_intent = ''
let release_leave_timer = null
const RELEASE_SHEET_LEAVE_MS = 340
const home_sheet_bottom_offset = 'calc(156rpx + var(--page-safe-bottom))'

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--home-shade': theme.colors.home.scene_shade,
  '--home-room-background': theme.colors.home.room_background,
  '--home-feature-shade': theme.colors.home.feature_shade,
  '--home-border': theme.colors.surface.border,
  '--home-title': theme.colors.text.on_media,
  '--home-subtitle': theme.colors.home.subtitle,
  '--home-scope-background': theme.colors.messages.segment_background,
  '--home-scope-active': theme.colors.messages.segment_active_background,
  '--home-scope-active-text': theme.colors.messages.segment_active_text,
  '--home-scope-text': theme.colors.messages.segment_inactive_text,
  '--home-live': theme.colors.status.success,
  '--home-live-background': theme.colors.home.live_background,
  '--home-live-border': theme.colors.home.live_border,
  '--home-scoop': theme.colors.status.info,
  '--home-scoop-background': theme.colors.home.scoop_background,
  '--home-scoop-border': theme.colors.home.scoop_border,
  '--home-tonight': theme.colors.status.coin,
  '--home-tonight-background': theme.colors.home.tonight_background,
  '--home-tonight-border': theme.colors.home.tonight_border,
  '--home-arrow-background': theme.colors.home.arrow_background,
  '--home-voice-background': theme.colors.home.voice_background,
  '--home-voice-border': theme.colors.home.voice_border,
  '--home-error': theme.colors.status.danger,
  '--home-skeleton': theme.colors.home.skeleton,
  '--home-tabbar': theme.colors.tabbar.background
}

const source_query = (path) => `${path}?sourcePage=${encodeURIComponent(HOME_PAGE_PATH)}`

const load_home = async () => {
  if (!is_page_active.value) return
  request_context?.cancel?.()
  const current_request = {}
  request_context = current_request
  is_loading.value = true
  load_error.value = ''
  action_message.value = ''
  try {
    const account_store = storeGlobal()
    const params = { moduleType: 1 }
    if (account_store.userId) params.userId = account_store.userId
    const result = await selectLmUserModuleDataPage(params, current_request)
    if (!is_page_active.value || request_context !== current_request) return
    if (!result.success) {
      load_error.value = result.error || 'Unable to load scoop attempts.'
      return
    }
    const mapped = map_attempt_record(result.data)
    attempt_record.value = mapped
    scoop_remaining.value = mapped.scoop_remaining
    if (open_scoop_after_load) {
      open_scoop_after_load = false
      open_scoop()
    }
  } catch (error) {
    if (is_page_active.value && request_context === current_request) {
      load_error.value = error?.message || 'Unable to load scoop attempts.'
    }
  } finally {
    if (is_page_active.value && request_context === current_request) is_loading.value = false
  }
}

const choose_all = () => {
  feed_scope.value = 'all'
  action_message.value = ''
}

const choose_nearby = () => {
  if (feed_scope.value === 'nearby') return
  action_message.value = ''
  const account_store = storeGlobal()
  if (account_store.getAuthRecord('location')) {
    feed_scope.value = 'nearby'
    return
  }
  permission_request_intent = 'nearby'
  permission_request_key.value = 'location'
  is_permission_request_visible.value = true
}

const on_permission_granted = () => {
  is_permission_request_visible.value = false
  if (permission_request_intent === 'nearby') feed_scope.value = 'nearby'
  if (permission_request_intent === 'photos') {
    is_release_visible.value = true
    nextTick(() => {
      release_sheet.value?.choose_photo()
    })
  }
  permission_request_intent = ''
}

const on_permission_denied = () => {
  is_permission_request_visible.value = false
  if (permission_request_intent === 'photos') is_release_visible.value = true
  permission_request_intent = ''
}

const open_posts = () => {
  page_transition.value?.navigate_forward({ url: source_query('/pages/community/index') })
}

const open_notifications = () => {
  page_transition.value?.navigate_forward({ url: source_query('/pages/messages/notice') })
}

const open_voice_rooms = () => {
  page_transition.value?.navigate_forward({ url: source_query('/pages/live-room/list') })
}

// feedback_mode: immediate — open the themed release sheet on the home tab.
const open_release = () => {
  is_release_visible.value = true
}

const schedule_release_sheet_from_route = (query = {}) => {
  if (should_open_home_release_sheet(query)) open_release_after_show = true
}

const open_scheduled_release_sheet = () => {
  if (!open_release_after_show) return
  open_release_after_show = false
  nextTick(() => open_release())
}

const on_lantern_released = ({ lantern_id, lantern_type } = {}) => {
  is_release_visible.value = false
  clearTimeout(release_leave_timer)
  release_leave_timer = setTimeout(() => {
    release_leave_timer = null
    if (!lantern_id) return
    page_transition.value?.navigate_forward({
      url: build_lantern_release_url({
        lantern_id,
        lantern_type,
        source_page: HOME_PAGE_PATH
      })
    })
  }, RELEASE_SHEET_LEAVE_MS)
}

const open_photos_permission = () => {
  permission_request_intent = 'photos'
  permission_request_key.value = 'photos'
  is_permission_request_visible.value = true
}

const open_buy_coins = () => {
  page_transition.value?.navigate_forward({ url: source_query('/pages/coins/index') })
}

const open_buy_coins_from_release = () => {
  is_release_visible.value = false
  clearTimeout(release_leave_timer)
  release_leave_timer = setTimeout(() => {
    release_leave_timer = null
    open_buy_coins()
  }, RELEASE_SHEET_LEAVE_MS)
}

const go_scooping = (extra_query = '') => {
  const started = page_transition.value?.navigate_forward({
    url: `${source_query('/pages/lantern/scoop/index')}&mode=scooping&feedScope=${feed_scope.value}${extra_query}`,
    immediate: true,
    fail: () => { action_message.value = 'Scooping is unavailable right now.' }
  })
  if (!started) action_message.value = 'Scooping is unavailable right now.'
}

const close_purchase = () => {
  if (is_purchasing.value) return
  is_purchase_visible.value = false
  purchase_error.value = ''
}

const close_balance = () => {
  is_balance_visible.value = false
}

const buy_coins_from_balance = () => {
  is_balance_visible.value = false
  open_buy_coins()
}

const settle_scoop_purchase_balance = async (account_store, coin_balance, request_context) => {
  const consumption = plan_scoop_attempt_purchase_consumption({
    cached_balance: coin_balance,
    scoop_cost: SCOOP_ATTEMPT_COIN_COST
  })
  const balance_result = await updateUserBalance(
    consumption.update_balance_params,
    request_context
  )
  if (!balance_result?.success) {
    return {
      success: false,
      error: balance_result?.error || 'Unable to update your coin balance.'
    }
  }
  const latest_balance = read_balance_after_update(balance_result, consumption.balance_after)
  if (latest_balance === null) {
    return {
      success: false,
      error: 'Unable to update your coin balance.'
    }
  }
  const record_result = await addUserBalanceRecord(
    build_scoop_attempt_purchase_record_params({
      user_id: account_store.userId,
      scoop_cost: SCOOP_ATTEMPT_COIN_COST,
      balance_after: latest_balance
    }),
    request_context
  )
  if (!record_result?.success) {
    return {
      success: false,
      error: record_result?.error || 'Unable to save this coin record.'
    }
  }
  account_store.setBalance(latest_balance)
  account_store.updateUserInfo({ userBalance: latest_balance })
  return { success: true, error: '' }
}

const persist_purchased_scoop_remaining = async (next_remaining, user_id) => {
  scoop_purchase_sync_context.cancel?.()
  const sync_context = {}
  scoop_purchase_sync_context = sync_context
  try {
    const save_result = await saveLmUserModuleData(
      build_persist_purchased_scoop_remaining_params({
        attempt_record: attempt_record.value,
        user_id,
        scoop_remaining: next_remaining
      }),
      sync_context
    )
    if (!is_page_active.value || `${storeGlobal().userId}` !== `${user_id}`) return false
    if (!save_result?.success || save_result.data === false) {
      action_message.value = save_result?.error || 'Unable to save scoop attempts.'
      return false
    }
    const saved_id = save_result.data?.userModuleDataId
    attempt_record.value = {
      ...(attempt_record.value || {}),
      user_module_data_id: saved_id != null && `${saved_id}` !== ''
        ? saved_id
        : attempt_record.value?.user_module_data_id,
      scoop_remaining: next_remaining,
      wish_find_remaining: attempt_record.value?.wish_find_remaining || 0,
      user_id: user_id || attempt_record.value?.user_id || ''
    }
    scoop_remaining.value = next_remaining
    return true
  } catch (error) {
    if (!is_page_active.value) return
    action_message.value = error?.message || 'Unable to save scoop attempts.'
    return false
  }
}

const open_scoop = () => {
  if (scoop_remaining.value === null || is_purchasing.value) return
  action_message.value = ''
  purchase_error.value = ''
  if (scoop_remaining.value < 1) {
    is_balance_visible.value = false
    is_purchase_visible.value = true
    return
  }
  go_scooping()
}

const complete_scoop_attempt_purchase = async () => {
  const purchase = pending_scoop_purchase.value
  if (!purchase || `${storeGlobal().userId}` !== purchase.user_id) return
  const saved = await persist_purchased_scoop_remaining(purchase.scoop_remaining, purchase.user_id)
  if (!is_page_active.value) return
  if (!saved) {
    purchase_error.value = action_message.value || 'Unable to save scoop attempts.'
    return
  }
  pending_scoop_purchase.value = null
  is_purchase_visible.value = false
  go_scooping()
}

// feedback_mode: control_pending — keep purchase controls disabled without a loading overlay.
const confirm_purchase = async () => {
  if (is_purchasing.value || !is_page_active.value) return
  const account_store = storeGlobal()
  if (!account_store.userId) {
    purchase_error.value = 'Please sign in before buying a scoop.'
    return
  }
  is_purchasing.value = true
  purchase_error.value = ''
  purchase_request_context.cancel?.()
  const balance_context = {}
  const wallet_context = {}
  purchase_request_context = {
    cancel: () => {
      balance_context.cancel?.()
      wallet_context.cancel?.()
    }
  }
  try {
    if (pending_scoop_purchase.value?.user_id === `${account_store.userId}`) {
      await complete_scoop_attempt_purchase()
      return
    }
    const balance_result = await selectUserBalance({}, balance_context)
    if (!is_page_active.value) return
    if (!balance_result?.success) {
      purchase_error.value = balance_result?.error || 'Unable to check your coins.'
      return
    }
    const coin_balance = read_coin_balance(balance_result.data)
    account_store.setBalance(coin_balance)
    if (!can_afford_scoop_attempt(coin_balance, SCOOP_ATTEMPT_COIN_COST)) {
      is_purchase_visible.value = false
      is_balance_visible.value = true
      return
    }
    const settled = await settle_scoop_purchase_balance(account_store, coin_balance, wallet_context)
    if (!is_page_active.value) return
    if (!settled.success) {
      purchase_error.value = settled.error
      return
    }
    pending_scoop_purchase.value = {
      user_id: `${account_store.userId}`,
      scoop_remaining: scoop_remaining_after_purchase(scoop_remaining.value)
    }
    await complete_scoop_attempt_purchase()
  } catch (error) {
    if (is_page_active.value) {
      purchase_error.value = error?.message || 'Unable to buy a scoop attempt.'
    }
  } finally {
    if (is_page_active.value) is_purchasing.value = false
  }
}

const merge_caught_query = (options, search = '') => {
  if (!search) return options
  const query = search.startsWith('?') ? search.slice(1) : search
  if (!query) return options
  const params = new URLSearchParams(query)
  if (!options.caughtLanternId && params.get('caughtLanternId')) {
    options.caughtLanternId = params.get('caughtLanternId')
  }
  if (!options.lanternScoopId && params.get('lanternScoopId')) {
    options.lanternScoopId = params.get('lanternScoopId')
  }
  return options
}

const read_route_options = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const current = pages[pages.length - 1]
  let options = {
    ...(current?.options || {}),
    ...(current?.$page?.options || {})
  }
  if (typeof window === 'undefined') return options
  options = merge_caught_query(options, window.location.search || '')
  const hash = window.location.hash || ''
  const query_index = hash.indexOf('?')
  if (query_index >= 0) {
    options = merge_caught_query(options, hash.slice(query_index))
  }
  return options
}

const reset_caught_owner_cache = () => {
  caught_data.value = null
  caught_owner_user_id.value = ''
  caught_owner_name.value = ''
  caught_owner_avatar_url.value = ''
  caught_owner_anonymous.value = false
}

const apply_caught_owner_cache = (pending = null) => {
  caught_data.value = pending?.caught_data || null
  if (caught_data.value) {
    scoop_remaining.value = caught_data.value.scoop_remaining
    if (attempt_record.value) {
      attempt_record.value = { ...attempt_record.value, scoop_remaining: caught_data.value.scoop_remaining }
    }
  }
  if (!pending) {
    reset_caught_owner_cache()
    return
  }
  caught_owner_user_id.value = pending.owner_user_id || ''
  caught_owner_name.value = pending.owner_user_name || ''
  caught_owner_avatar_url.value = pending.owner_avatar_url || ''
  caught_owner_anonymous.value = Boolean(pending.anonymous_display)
}

const cancel_caught_open = () => {
  caught_open_token += 1
  if (caught_open_frame !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(caught_open_frame)
  }
  caught_open_frame = null
}

const open_caught_after_home_paint = (user_id, key) => {
  cancel_caught_open()
  const open_token = caught_open_token
  const is_current = () => (
    is_page_active.value
    && is_home_shown
    && caught_open_token === open_token
    && `${storeGlobal().userId}` === `${user_id}`
  )
  const reveal = () => {
    if (!is_current()) return
    is_caught_visible.value = true
    const pending = read_pending_caught_lantern(user_id)
    if (pending && `${pending.lantern_id}:${pending.lantern_scoop_id}` === key) {
      clear_pending_caught_lantern()
    }
  }
  const reveal_after_paint = () => {
    caught_open_frame = null
    reveal()
  }
  nextTick(() => {
    if (!is_current()) return
    if (typeof requestAnimationFrame !== 'function') {
      reveal()
      return
    }
    // onShow restores Home; two frames let it paint before the sheet enters.
    caught_open_frame = requestAnimationFrame(() => {
      caught_open_frame = null
      if (!is_current()) return
      caught_open_frame = requestAnimationFrame(reveal_after_paint)
    })
  })
}

const open_caught_sheet = (route_query = null) => {
  const account_store = storeGlobal()
  if (!account_store.userId) return false
  const from_route = read_caught_route(route_query || read_route_options())
  const route_key = from_route.lantern_id && from_route.lantern_scoop_id
    ? `${from_route.lantern_id}:${from_route.lantern_scoop_id}`
    : ''
  const has_new_route = Boolean(route_key && route_key !== consumed_caught_route_key)
  let pending = read_pending_caught_lantern(account_store.userId)
  if (
    !pending
    && has_new_route
  ) {
    save_pending_caught_lantern({
      user_id: account_store.userId,
      lantern_id: from_route.lantern_id,
      lantern_scoop_id: from_route.lantern_scoop_id
    })
    pending = read_pending_caught_lantern(account_store.userId)
  }
  const lantern_id = pending?.lantern_id || (has_new_route ? from_route.lantern_id : '')
  const lantern_scoop_id = pending?.lantern_scoop_id || (has_new_route ? from_route.lantern_scoop_id : '')
  if (!lantern_id || !lantern_scoop_id) return false
  consumed_caught_route_key = route_key
  const key = `${lantern_id}:${lantern_scoop_id}`
  if (key === caught_query_key && is_caught_visible.value) return true
  caught_query_key = key
  apply_caught_owner_cache(pending)
  caught_lantern_id.value = lantern_id
  caught_scoop_id.value = lantern_scoop_id
  is_caught_visible.value = false
  open_caught_after_home_paint(account_store.userId, key)
  return true
}

const close_caught = () => {
  cancel_caught_open()
  is_caught_visible.value = false
  is_caught_report_visible.value = false
  caught_query_key = ''
  reset_caught_owner_cache()
}

const open_caught_report = ({ target_user_id, target_name }) => {
  caught_report_user_id.value = target_user_id || ''
  caught_report_name.value = target_name || ''
  is_caught_report_visible.value = true
}

const reply_to_caught = ({ lantern_id, target_user_id }) => {
  cancel_caught_open()
  is_caught_visible.value = false
  page_transition.value?.navigate_forward({
    url: build_lantern_reply_url({
      lantern_id,
      target_user_id,
      source_page: HOME_PAGE_PATH
    })
  })
}

onBackPress(() => {
  if (is_purchasing.value) return true
  if (is_permission_request_visible.value) {
    is_permission_request_visible.value = false
    permission_request_intent = ''
    return true
  }
  if (is_caught_report_visible.value) {
    is_caught_report_visible.value = false
    return true
  }
  if (is_caught_visible.value) {
    close_caught()
    return true
  }
  if (is_balance_visible.value) {
    close_balance()
    return true
  }
  if (is_purchase_visible.value) {
    close_purchase()
    return true
  }
  return false
})

onLoad((query = {}) => {
  schedule_release_sheet_from_route(query)
  if (`${query.scoop || ''}` === '1') open_scoop_after_load = true
  caught_route_query = query
})

onShow(() => {
  is_home_shown = true
  const is_opening_caught = open_caught_sheet(caught_route_query)
  caught_route_query = null
  open_scheduled_release_sheet()
  if (scoop_remaining.value === null || (!is_opening_caught && !is_caught_visible.value)) load_home()
})

onHide(() => {
  is_home_shown = false
  cancel_caught_open()
})

onBeforeUnmount(() => {
  is_page_active.value = false
  is_home_shown = false
  cancel_caught_open()
  request_context?.cancel?.()
  purchase_request_context.cancel?.()
  scoop_purchase_sync_context.cancel?.()
  clearTimeout(release_leave_timer)
})
</script>

<style scoped lang="scss">
.home-page {
  position: relative;
  background: var(--page-background);
}

.home-scene {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.home-shade {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--home-shade);
}

.home-toolbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  padding: 16rpx 32rpx 0;
}

.scope-pill {
  display: flex;
  width: 312rpx;
  height: 76rpx;
  align-items: center;
  padding: 0 8rpx;
  border: 1px solid var(--home-border);
  border-radius: 999rpx;
  background: var(--home-scope-background);
}

.scope-option {
  display: flex;
  height: 60rpx;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  color: var(--home-scope-text);
  font-size: 26rpx;
  font-weight: 700;
}

.scope-option--active {
  background: var(--home-scope-active);
  color: var(--home-scope-active-text);
}

.toolbar-action {
  width: 80rpx;
  height: 80rpx;
  margin-left: 18rpx;
}

.toolbar-action--posts {
  margin-left: auto;
}

.toolbar-action__icon {
  width: 80rpx;
  height: 80rpx;
}

.home-scroll {
  position: relative;
  z-index: 2;
  height: 0;
  min-height: 0;
  flex: 1;
}

.home-scroll__inner {
  display: flex;
  min-height: calc(100% + 2rpx);
  box-sizing: border-box;
  flex-direction: column;
  justify-content: flex-end;
  padding: 24rpx 32rpx;
}

.room-card {
  display: flex;
  height: 132rpx;
  align-items: center;
  padding: 0 28rpx;
  border: 1px solid var(--home-border);
  border-radius: 40rpx;
  background: var(--home-room-background);
  backdrop-filter: blur(10px);
}

.room-card__icon {
  display: flex;
  width: 80rpx;
  height: 80rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--home-voice-border);
  border-radius: 26rpx;
  background: var(--home-voice-background);
}

.room-card__icon image {
  width: 38rpx;
  height: 38rpx;
}

.room-card__copy {
  min-width: 0;
  flex: 1;
  margin-left: 24rpx;
}

.room-card__title {
  display: block;
  overflow: hidden;
  color: var(--home-title);
  font-size: 28rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-card__subtitle {
  display: block;
  margin-top: 6rpx;
  overflow: hidden;
  color: var(--home-subtitle);
  font-size: 22rpx;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-badge {
  display: flex;
  height: 52rpx;
  flex: none;
  align-items: center;
  margin-left: 16rpx;
  padding: 0 16rpx;
  border: 1px solid var(--home-live-border);
  border-radius: 999rpx;
  background: var(--home-live-background);
  color: var(--home-live);
  font-size: 20rpx;
  font-weight: 700;
  animation: live-badge-breathe 2s ease-in-out infinite;
}

.live-badge__dot {
  position: relative;
  flex-shrink: 0;
  width: 12rpx;
  height: 12rpx;
  margin-right: 8rpx;
  border-radius: 50%;
  background: var(--home-live);
  animation: live-dot-blink 1.5s ease-in-out infinite;
}

/* 从圆点向外扩散的光圈 */
.live-badge__dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--home-live);
  border-radius: 50%;
  animation: live-dot-ripple 1.5s ease-out infinite;
}

@keyframes live-dot-blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

@keyframes live-dot-ripple {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

@keyframes live-badge-breathe {
  0%, 100% {
    border-color: var(--home-live-border);
  }
  50% {
    border-color: var(--home-live);
  }
}

.feature-row {
  display: flex;
  margin-top: 24rpx;
  gap: 32rpx;
}

.feature-card {
  position: relative;
  height: 508rpx;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  border-radius: 52rpx;
}

.feature-card__bg {
  width: 100%;
  height: 100%;
  backdrop-filter: blur(10px);
}

.feature-art {
  position: absolute;
  width: 245rpx;
  height: 245rpx;
  left: 38rpx;
  top: 90rpx;
}

.feature-badge {
  position: absolute;
  top: 28rpx;
  left: 24rpx;
  padding: 8rpx 14rpx;
  border: 1px solid var(--home-border);
  border-radius: 14rpx;
  color: var(--home-title);
  font-size: 18rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.feature-badge--tonight {
  border-color: var(--home-tonight-border);
  background: var(--home-tonight-background);
  color: var(--home-tonight);
}

.feature-overlay {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 48rpx 28rpx 28rpx;
  background: var(--home-feature-shade);
}

.feature-title {
  display: block;
  color: var(--home-title);
  font-size: 40rpx;
  font-weight: 700;
}

.feature-meta {
  display: flex;
  height: 44rpx;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.feature-caption {
  color: var(--home-subtitle);
  font-size: 22rpx;
  font-weight: 400;
}

.feature-arrow {
  width: 44rpx;
  height: 44rpx;
  padding: 10rpx;
  border-radius: 22rpx;
  background: var(--home-arrow-background);
  box-sizing: border-box;
}

.scoop-count {
  padding: 8rpx 12rpx;
  border: 1px solid var(--home-scoop-border);
  border-radius: 14rpx;
  background: var(--home-scoop-background);
  color: var(--home-scoop);
  font-size: 18rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.home-error {
  padding: 32rpx;
  border: 1px solid var(--home-border);
  border-radius: 32rpx;
  background: var(--home-tabbar);
  text-align: center;
}

.home-error__title {
  display: block;
  color: var(--home-title);
  font-size: 30rpx;
  font-weight: 700;
}

.home-error__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--home-subtitle);
  font-size: 24rpx;
  line-height: 34rpx;
}

.home-error__retry {
  margin-top: 24rpx;
  color: var(--home-scoop);
  font-size: 28rpx;
  font-weight: 700;
}

.home-inline-error {
  margin-top: 16rpx;
  color: var(--home-error);
  font-size: 24rpx;
  line-height: 34rpx;
  text-align: center;
}

</style>

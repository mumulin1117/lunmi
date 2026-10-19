<template>
  <view class="wish-tree-root">
    <PageTransition ref="page_transition" class="wish-page" :style="theme_style">
      <AmbientScene class="wish-scene" scene="wish" />
      <view class="wish-shade" aria-hidden="true" />
      <TopSafeArea />
      <view class="wish-heading">
        <image class="wish-heading__mark" src="/static/icon/wish_tree_title.png" mode="aspectFit" />
        <text class="wish-heading__title">{{ $t('Wish Tree') }}</text>
      </view>
      <view class="wish-tag">
        <text>{{ $t('Your wishes light up the world.') }}</text>
      </view>
      <scroll-view class="wish-scroll" scroll-y :show-scrollbar="false">
        <view class="wish-scroll__inner">
          <view class="wish-stat">
            <WishTreeSkeleton v-if="is_loading" variant="stat" />
            <text v-else class="wish-stat__count">{{ $t(wish_count_label) }}</text>
            <view class="wish-stat__label">
              <image src="/static/icon/wish_tree_lit.png" mode="aspectFit" />
              <text>{{ $t('Wishes lit') }}</text>
            </view>
          </view>
          <view class="feature-row">
            <view class="feature-card" role="button" :aria-label="$t('Make a wish')" @click="open_wish">
              <image class="feature-card__bg" src="/static/icon/wish_tree_lantern.png" mode="aspectFill" />
              <text v-if="day_label" class="feature-badge">{{ $t(day_label) }}</text>
              <WishLanternArt class="feature-art-inner" />
              <view class="feature-overlay">
                <text class="feature-title">{{ $t('Wish') }}</text>
                <view class="feature-meta">
                  <text class="feature-caption">{{ $t('Make a wish') }}</text>
                  <image class="feature-arrow" src="/static/icon/lantern_home_arrow.png" mode="aspectFit" />
                </view>
              </view>
            </view>
            <view class="feature-card" role="button" :aria-label="$t('Find a wish')" @click="open_find">
              <image class="feature-card__bg" src="/static/icon/wish_tree_find_card.png" mode="aspectFill" />
              <view class="find-badges">
                <text class="feature-badge">{{ $t('BLESS ONLY') }}</text>
                <WishTreeSkeleton v-if="is_loading" variant="find" />
                <text v-else-if="find_remaining !== null" class="find-count">{{ $t(find_remaining) }} {{ $t('LEFT') }}</text>
              </view>
              <image class="feature-art" src="/static/icon/wish_tree_find_tree.png" mode="aspectFill" />
              <view class="feature-overlay">
                <text class="feature-title">{{ $t('Find') }}</text>
                <view class="feature-meta">
                  <text class="feature-caption" style="color: #D3C6F5;">{{ $t('Find a wish') }}</text>
                </view>
              </view>
            </view>
          </view>
          <text v-if="load_error && wish_count_label !== ''" class="wish-inline-error">{{ $t(load_error) }}</text>
          <text v-if="action_message" class="wish-inline-error">{{ $t(action_message) }}</text>
          <view v-if="load_error && wish_count_label === ''" class="wish-error" role="alert">
            <text class="wish-error__title">{{ $t('Unable to load the wish tree') }}</text>
            <text class="wish-error__copy">{{ $t(load_error) }}</text>
            <view class="wish-error__retry" role="button" @click="load_tree">{{ $t('Try again') }}</view>
          </view>
        </view>
      </scroll-view>
      <view class="main-tabbar-spacer" aria-hidden="true" />
      <WishSheet
        :visible="is_wish_open"
        @update:visible="is_wish_open = $event"
        @published="open_wishing"
        @buy="open_coins"
      />
      <WishPublishedSuccessDialog
        :visible="is_wish_success_visible"
        @dismiss="is_wish_success_visible = false"
      />
      <PurchaseScoopAttemptsConfirmDialog
        variant="wish_find"
        :visible="is_purchase_visible"
        :error-message="purchase_error"
        :coin-cost="WISH_FIND_ATTEMPT_COIN_COST"
        :attempt-pack="WISH_FIND_ATTEMPT_PACK"
        @cancel="close_purchase"
        @confirm="confirm_purchase"
      />
      <InsufficientBalanceConfirmDialog
        :visible="is_balance_visible"
        @cancel="close_balance"
        @buy="buy_coins_from_balance"
      />
    </PageTransition>
    <FoundWishSheet
      :visible="Boolean(found_wish_id)"
      :wish-id="found_wish_id"
      @update:visible="close_found_wish"
      @open-profile="open_found_profile"
    />
  </view>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import AmbientScene from '@/components/AmbientScene.vue'
import WishLanternArt from '@/components/WishLanternArt.vue'
import { addUserBalanceRecord, selectUserBalance, updateUserBalance } from '@/api/common'
import { saveLmUserModuleData, selectLmUserModuleDataPage } from '@/api/userModule'
import { selectLmWishBranchConfigPage, selectLmWishPage } from '@/api/wish'
import FoundWishSheet from '@/components/FoundWishSheet.vue'
import InsufficientBalanceConfirmDialog from '@/components/InsufficientBalanceConfirmDialog.vue'
import PageTransition from '@/components/PageTransition.vue'
import PurchaseScoopAttemptsConfirmDialog from '@/components/PurchaseScoopAttemptsConfirmDialog.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import WishPublishedSuccessDialog from '@/components/WishPublishedSuccessDialog.vue'
import WishSheet from '@/components/WishSheet.vue'
import WishTreeSkeleton from '@/components/WishTreeSkeleton.vue'
import { storeGlobal } from '@/stores/store'
import { read_balance_after_update } from '@/utils/coinPurchasePresentation'
import {
  WISH_FIND_ATTEMPT_COIN_COST,
  WISH_FIND_ATTEMPT_PACK,
  build_consume_wish_find_attempt_params,
  build_persist_purchased_wish_find_remaining_params,
  build_wish_find_attempt_purchase_record_params,
  can_afford_wish_find_attempt,
  map_attempt_record,
  plan_wish_find_attempt_purchase_consumption,
  wish_find_remaining_after_purchase_start
} from '@/utils/lanternHomePresentation'
import { read_coin_balance } from '@/utils/myProfilePresentation'
import { read_branch_day_label, read_wish_tree } from '@/utils/wishTreePresentation'
import { build_wishing_url } from '@/utils/wishSheetPresentation'
import { build_profile_page_url } from '@/utils/communityUserPresentation'
import {
  has_found_wish_random_detail,
  read_pending_found_wish_id
} from '@/utils/foundWishRandomCacheStorage'
import { build_finding_url, read_found_wish_id } from '@/utils/wishFindingPresentation'

const TREE_PAGE_PATH = '/pages/wish/tree/index'
const page_transition = ref(null)
const wish_count_label = ref('')
const day_label = ref('')
const is_loading = ref(false)
const load_error = ref('')
const action_message = ref('')
const is_wish_open = ref(false)
const is_wish_success_visible = ref(false)
const celebrate_wish = ref(false)
const found_wish_id = ref('')
const find_remaining = ref(null)
const attempt_record = ref(null)
const is_purchase_visible = ref(false)
const is_balance_visible = ref(false)
const is_find_purchase_syncing = ref(false)
const is_find_consuming = ref(false)
const purchase_error = ref('')
const is_page_active = ref(true)
let request_contexts = []
let find_purchase_sync_context = {}
let purchase_request_context = {}

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--wish-shade': theme.colors.home.scene_shade,
  '--wish-title': theme.colors.text.on_media,
  '--wish-subtitle': theme.colors.home.subtitle,
  '--wish-muted': theme.colors.text.secondary,
  '--wish-border': theme.colors.surface.border,
  '--wish-tag': theme.colors.surface.deep,
  '--wish-stat': theme.colors.tabbar.background,
  '--wish-shade-card': theme.colors.home.feature_shade,
  '--wish-count': theme.colors.status.info,
  '--wish-count-background': theme.colors.home.scoop_background,
  '--wish-count-border': theme.colors.home.scoop_border,
  '--wish-arrow': theme.colors.home.arrow_background,
  '--wish-error': theme.colors.status.danger,
  '--wish-skeleton': theme.colors.home.skeleton
}

const source_query = (path) => `${path}?sourcePage=${encodeURIComponent(TREE_PAGE_PATH)}`

const load_tree = async () => {
  if (!is_page_active.value) return
  request_contexts.forEach((item) => item.cancel?.())
  const contexts = [{}, {}, {}]
  request_contexts = contexts
  is_loading.value = true
  load_error.value = ''
  action_message.value = ''
  try {
    const account_store = storeGlobal()
    const module_params = { moduleType: 1 }
    if (account_store.userId) module_params.userId = account_store.userId
    const [wish_result, branch_result, module_result] = await Promise.all([
      selectLmWishPage({ current: 1, size: 1 }, contexts[0]),
      selectLmWishBranchConfigPage({ current: 1, size: 20, isActive: 1 }, contexts[1]),
      selectLmUserModuleDataPage(module_params, contexts[2])
    ])
    if (!is_page_active.value || request_contexts !== contexts) return
    if (!wish_result.success || !branch_result.success || !module_result.success) {
      load_error.value = wish_result.error || branch_result.error || module_result.error || 'Unable to load the wish tree.'
      return
    }
    const wish_tree = read_wish_tree(wish_result.data)
    wish_count_label.value = wish_tree.wish_count_label
    day_label.value = read_branch_day_label(branch_result.data)
    const mapped_attempts = map_attempt_record(module_result.data)
    attempt_record.value = mapped_attempts
    find_remaining.value = mapped_attempts.wish_find_remaining
  } catch (error) {
    if (is_page_active.value && request_contexts === contexts) {
      load_error.value = error?.message || 'Unable to load the wish tree.'
    }
  } finally {
    if (is_page_active.value && request_contexts === contexts) {
      is_loading.value = false
    }
  }
}

const open_wish = () => {
  action_message.value = ''
  is_wish_open.value = true
}

const open_wishing = (wish_id) => {
  page_transition.value?.navigate_forward({
    url: build_wishing_url({ wish_id, source_page: TREE_PAGE_PATH }),
    fail: () => {
      action_message.value = 'The wish was published, but the next step is unavailable.'
    }
  })
}

const open_coins = () => {
  page_transition.value?.navigate_forward({
    url: source_query('/pages/coins/index'),
    fail: () => {
      action_message.value = 'Coin purchase is unavailable.'
    }
  })
}

const go_finding = () => {
  const started = page_transition.value?.navigate_forward({
    url: build_finding_url(),
    fail: () => {
      action_message.value = 'Finding a wish is unavailable.'
    }
  })
  if (!started) action_message.value = 'Finding a wish is unavailable.'
}

const consume_find_attempt_and_go = async (request_context = {}) => {
  const record = attempt_record.value
  if (!record?.user_module_data_id) {
    action_message.value = 'Unable to start finding a wish right now.'
    return false
  }
  const next_remaining = Math.max(0, (find_remaining.value || 0) - 1)
  const save_result = await saveLmUserModuleData(
    build_consume_wish_find_attempt_params({
      user_module_data_id: record.user_module_data_id,
      next_wish_find_remaining: next_remaining
    }),
    request_context
  )
  if (!is_page_active.value) return false
  if (!save_result?.success) {
    action_message.value = save_result?.error || 'Unable to update find attempts.'
    return false
  }
  find_remaining.value = next_remaining
  attempt_record.value = {
    ...record,
    wish_find_remaining: next_remaining
  }
  go_finding()
  return true
}

const close_purchase = () => {
  is_purchase_visible.value = false
  purchase_error.value = ''
}

const apply_find_purchase_remaining = (next_remaining, user_id) => {
  find_remaining.value = next_remaining
  if (attempt_record.value) {
    attempt_record.value = {
      ...attempt_record.value,
      wish_find_remaining: next_remaining
    }
    return
  }
  attempt_record.value = {
    user_module_data_id: '',
    scoop_remaining: 0,
    wish_find_remaining: next_remaining,
    user_id
  }
}

const close_balance = () => {
  is_balance_visible.value = false
}

const buy_coins_from_balance = () => {
  is_balance_visible.value = false
  open_coins()
}

const settle_find_purchase_balance = async (account_store, coin_balance, request_context) => {
  const consumption = plan_wish_find_attempt_purchase_consumption({
    cached_balance: coin_balance,
    find_cost: WISH_FIND_ATTEMPT_COIN_COST
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
    build_wish_find_attempt_purchase_record_params({
      user_id: account_store.userId,
      find_cost: WISH_FIND_ATTEMPT_COIN_COST,
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

const persist_purchased_find_remaining = async (next_remaining, user_id) => {
  find_purchase_sync_context.cancel?.()
  const sync_context = {}
  find_purchase_sync_context = sync_context
  try {
    const save_result = await saveLmUserModuleData(
      build_persist_purchased_wish_find_remaining_params({
        attempt_record: attempt_record.value,
        user_id,
        wish_find_remaining: next_remaining
      }),
      sync_context
    )
    if (!is_page_active.value) return
    if (!save_result?.success) {
      action_message.value = save_result?.error || 'Unable to save find attempts.'
      return
    }
    const saved_id = save_result.data?.userModuleDataId
    attempt_record.value = {
      ...(attempt_record.value || {}),
      user_module_data_id: saved_id != null && `${saved_id}` !== ''
        ? saved_id
        : attempt_record.value?.user_module_data_id,
      wish_find_remaining: next_remaining,
      scoop_remaining: attempt_record.value?.scoop_remaining || 0,
      user_id: user_id || attempt_record.value?.user_id || ''
    }
    find_remaining.value = next_remaining
  } catch (error) {
    if (!is_page_active.value) return
    action_message.value = error?.message || 'Unable to save find attempts.'
  }
}

const open_find = async () => {
  if (find_remaining.value === null || is_find_consuming.value) return
  action_message.value = ''
  purchase_error.value = ''
  if (find_remaining.value < 1) {
    is_balance_visible.value = false
    is_purchase_visible.value = true
    return
  }
  is_find_consuming.value = true
  try {
    await consume_find_attempt_and_go()
  } finally {
    if (is_page_active.value) is_find_consuming.value = false
  }
}

const confirm_purchase = async () => {
  if (is_find_purchase_syncing.value || !is_page_active.value) return
  const account_store = storeGlobal()
  if (!account_store.userId) {
    purchase_error.value = 'Please sign in before buying a find.'
    return
  }
  purchase_error.value = ''
  purchase_request_context.cancel?.()
  const balance_context = {}
  const balance_result = await selectUserBalance({}, balance_context)
  if (!is_page_active.value) return
  if (!balance_result?.success) {
    purchase_error.value = balance_result?.error || 'Unable to check your coins.'
    return
  }
  const coin_balance = read_coin_balance(balance_result.data)
  account_store.setBalance(coin_balance)
  if (!can_afford_wish_find_attempt(coin_balance, WISH_FIND_ATTEMPT_COIN_COST)) {
    is_purchase_visible.value = false
    is_balance_visible.value = true
    return
  }

  const previous_remaining = find_remaining.value
  const previous_record = attempt_record.value ? { ...attempt_record.value } : null
  const next_remaining = wish_find_remaining_after_purchase_start(find_remaining.value)
  is_purchase_visible.value = false
  apply_find_purchase_remaining(next_remaining, account_store.userId)
  go_finding()

  is_find_purchase_syncing.value = true
  const wallet_context = {}
  purchase_request_context = {
    cancel: () => {
      balance_context.cancel?.()
      wallet_context.cancel?.()
    }
  }
  try {
    const settled = await settle_find_purchase_balance(account_store, coin_balance, wallet_context)
    if (!settled.success) {
      find_remaining.value = previous_remaining
      attempt_record.value = previous_record
      return
    }
    await persist_purchased_find_remaining(next_remaining, account_store.userId)
  } catch {
    find_remaining.value = previous_remaining
    attempt_record.value = previous_record
  } finally {
    if (is_page_active.value) is_find_purchase_syncing.value = false
  }
}

const close_found_wish = (visible) => {
  if (visible === false) found_wish_id.value = ''
}

const open_found_profile = (user_id) => {
  if (!user_id) return
  const started = page_transition.value?.navigate_forward({
    url: build_profile_page_url(user_id, TREE_PAGE_PATH),
    fail: () => {
      action_message.value = 'This profile cannot be opened.'
    }
  })
  if (!started) action_message.value = 'This profile cannot be opened.'
}

const read_current_route_query = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const current = pages[pages.length - 1]
  return current?.options || current?.$page?.options || {}
}

let consumed_found_route_id = ''

const schedule_open_found_wish = () => {
  const account_store = storeGlobal()
  const from_route = read_found_wish_id(read_current_route_query())
  const from_cache = account_store.userId
    ? read_pending_found_wish_id(account_store.userId)
    : ''
  const next_id = from_cache || (from_route !== consumed_found_route_id ? from_route : '')
  if (!next_id) return
  consumed_found_route_id = from_route

  found_wish_id.value = ''
  const open_sheet = () => {
    if (!is_page_active.value) return
    found_wish_id.value = next_id
  }

  nextTick(open_sheet)
}

const should_skip_tree_reload_for_found_cache = () => {
  const account_store = storeGlobal()
  if (!account_store.userId) return false
  const found = found_wish_id.value || read_pending_found_wish_id(account_store.userId)
  if (!found) return false
  return has_found_wish_random_detail({
    expected_user_id: account_store.userId,
    wish_id: found
  })
}

onLoad((query = {}) => {
  celebrate_wish.value = `${query.wishPublished || ''}` === '1'
  if (`${query.compose || ''}` === '1') is_wish_open.value = true
})

onShow(() => {
  if (celebrate_wish.value) {
    is_wish_success_visible.value = true
    celebrate_wish.value = false
  }
  schedule_open_found_wish()
  if (!should_skip_tree_reload_for_found_cache()) load_tree()
})

onBackPress(() => {
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

onBeforeUnmount(() => {
  is_page_active.value = false
  request_contexts.forEach((item) => item.cancel?.())
  find_purchase_sync_context.cancel?.()
  purchase_request_context.cancel?.()
})
</script>

<style scoped lang="scss">
.wish-tree-root {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.wish-page {
  position: relative;
  background: var(--page-background);
}

.wish-scene {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.wish-shade {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--wish-shade);
}

.wish-heading {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  padding: 12rpx 32rpx 0;
}

.wish-heading__mark {
  width: 48rpx;
  height: 60rpx;
  margin-right: 12rpx;
}

.wish-heading__title {
  color: var(--wish-title);
  font-size: 46rpx;
  font-weight: 700;
}

.wish-tag {
  position: relative;
  z-index: 2;
  align-self: flex-start;
  margin: 16rpx 32rpx 0;
  padding-left: 26rpx;
  border: 1px solid var(--wish-border);
  border-radius: 999rpx;
  background: var(--wish-tag);
  color: var(--wish-subtitle);
  width: 352rpx;
  height: 60rpx;
  background: rgba(10,16,34,0.55);
  border: 2rpx solid rgba(198,178,255,0.22);
  font-weight: 400;
  font-size: 21rpx;
  color: #BFD4E8;
  line-height: 60rpx;
}

.wish-scroll {
  position: relative;
  z-index: 2;
  height: 0;
  min-height: 0;
  flex: 1;
}

.wish-scroll__inner {
  display: flex;
  min-height: calc(100% + 2rpx);
  box-sizing: border-box;
  flex-direction: column;
  justify-content: flex-end;
  padding: 24rpx 32rpx;
}

.wish-stat {
  padding: 28rpx 32rpx;
  border: 1px solid var(--wish-border);
  border-radius: 40rpx;
  background: var(--wish-stat);
  backdrop-filter: blur(10px);

  background: rgba(10,16,34,0.6);
  box-shadow: 0rpx 20rpx 52rpx 0rpx rgba(0,0,0,0.4);
  border-radius: 40rpx 40rpx 40rpx 40rpx;
  border: 2rpx solid rgba(198,178,255,0.22);
}

.wish-stat__count {
  display: block;
  color: var(--wish-title);
  font-size: 60rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.wish-stat__label {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
  color: var(--wish-muted);
  font-size: 24rpx;
  font-weight: 500;
}

.wish-stat__label image {
  width: 26rpx;
  height: 26rpx;
  margin-right: 8rpx;
}

.feature-row {
  display: flex;
  margin-top: 24rpx;
  gap: 32rpx;
}

.feature-card {
  position: relative;
  height: 424rpx;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  border-radius: 52rpx;
  backdrop-filter: blur(10px);
}

.feature-card__bg {
  width: 100%;
  height: 100%;
}
.feature-art-inner{
  position: absolute;
  top: 10rpx;
  left: 45rpx;
  width: 354rpx;
  height: 350rpx;
}
.feature-art {
  position: absolute;
  top: 90rpx;
  left: 105rpx;
  width: 245rpx;
  height: 245rpx;
}

.feature-badge {
  padding: 8rpx 14rpx;
  border: 1px solid var(--wish-border);
  border-radius: 14rpx;
  color: var(--wish-title);
  font-size: 18rpx;
  font-weight: 700;
  letter-spacing: 1rpx;

  background: rgba(10,8,26,0.34);
  border-radius: 14rpx 14rpx 14rpx 14rpx;
  border: 2rpx solid rgba(198,178,255,0.22);
  font-weight: bold;
  font-size: 18rpx;
  color: #D8C8FA;
  padding: 14rpx 20rpx 12rpx 20rpx;

}

.feature-card > .feature-badge {
  position: absolute;
  top: 28rpx;
  left: 24rpx;
}

.find-badges {
  position: absolute;
  z-index: 1;
  top: 28rpx;
  right: 16rpx;
  left: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.find-count {
  padding: 8rpx 12rpx;
  border: 1px solid var(--wish-count-border);
  border-radius: 14rpx;
  background: var(--wish-count-background);
  color: var(--wish-count);
  letter-spacing: 1rpx;
  font-weight: bold;
  font-size: 18rpx;
  color: #C4A9F2;
}

.feature-overlay {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 48rpx 28rpx 28rpx;
  background: var(--wish-shade-card);
}

.feature-title {
  display: block;
  color: var(--wish-title);
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
  color: var(--wish-subtitle);
  font-weight: 400;
  font-size: 23rpx;
  color: #F3E6D0;
}

.feature-arrow {
  width: 44rpx;
  height: 44rpx;
  padding: 10rpx;
  border-radius: 22rpx;
  background: var(--wish-arrow);
  box-sizing: border-box;
}

.wish-error {
  padding: 32rpx;
  border: 1px solid var(--wish-border);
  border-radius: 32rpx;
  background: var(--wish-stat);
  text-align: center;
  
}

.wish-error__title {
  display: block;
  color: var(--wish-title);
  font-size: 30rpx;
  font-weight: 700;
}

.wish-error__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--wish-subtitle);
  font-size: 24rpx;
  line-height: 34rpx;
}

.wish-error__retry {
  margin-top: 24rpx;
  color: var(--wish-count);
  font-size: 28rpx;
  font-weight: 700;
}

.wish-inline-error {
  margin-top: 16rpx;
  color: var(--wish-error);
  font-size: 24rpx;
  line-height: 34rpx;
  text-align: center;
}

</style>

<template>
  <PageTransition ref="page_transition" class="coins-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="coins-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Buy coins') }}</text>
          <view class="header-line" aria-hidden="true" />
        </view>
      </view>
      <scroll-view class="coins-scroll" scroll-y :show-scrollbar="false">
        <view class="coins-scroll__inner">
          <view class="balance-block">
            <image class="balance-coin" src="/static/icon/coin.png" mode="aspectFit" />
            <text class="balance-value">{{ $t(balance_label) }}</text>
            <view class="balance-refresh" role="button" @click="load_user_balance">{{ $t('Refresh balance') }}</view>
          </view>
          <DiscoverDataLoading v-if="is_coin_packages_loading" />
          <view v-else-if="coin_packages_error" class="package-error" role="alert">
            <text class="package-error__copy">{{ $t(coin_packages_error) }}</text>
            <view class="package-error__retry" role="button" @click="refresh_coin_packages">{{ $t('Try again') }}</view>
          </view>
          <view v-else class="package-list">
            <view
              v-for="item in coin_packages"
              :key="item.package_id"
              class="coin-package"
              :class="{ 'coin-package--selected': selected_package_id === item.package_id, 'coin-package--unavailable': item.is_available === false }"
              role="radio"
              :aria-checked="selected_package_id === item.package_id"
              :aria-disabled="item.is_available === false || is_purchase_loading"
              @click="select_package(item)"
            >
              <view class="package-amount">
                <image class="package-coin" src="/static/icon/coin.png" mode="aspectFit" />
                <text class="package-count">{{ $t(format_coin_count(item.coin_count)) }}</text>
              </view>
              <view class="package-price">{{ $t(item.price_text) }}</view>
            </view>
          </view>
        </view>
      </scroll-view>
      <view class="coins-footer">
        <view
          class="purchase-button"
          :class="{ 'purchase-button--disabled': !selected_package || is_purchase_loading }"
          role="button"
          :aria-disabled="!selected_package || is_purchase_loading"
          @click="purchase_selected_package"
        >
          <text>{{ $t(purchase_label) }}</text>
        </view>
      </view>
    </view>
    <BottomSafeArea />
    <AccountActionLoading v-if="is_purchase_loading" action="purchase" />
    <SuccessToast :message="$t(success_toast)" @dismiss="success_toast = ''" />
  </PageTransition>
</template>

<script setup>
import { t } from '@/utils/i18n'

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import AccountActionLoading from '@/components/AccountActionLoading.vue'
import SuccessToast from '@/components/SuccessToast.vue'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import DiscoverDataLoading from '@/components/DiscoverDataLoading.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { storeGlobal } from '@/stores/store'
import { SUCCESS_TOAST } from '@/utils/successToast'
import { request_ios_coin_purchase, request_ios_coin_products } from '@/utils/iapBridge'
import { refresh_account_coin_balance, refresh_credited_purchase, sync_ios_purchase_session } from '@/utils/coinPurchaseSync'
import { load_coin_package_config } from '@/utils/coinPackageConfig'

const HOME_PAGE_PATH = '/pages/home/index'
const page_transition = ref(null)
const account_store = storeGlobal()
const coin_packages = ref([])
const selected_package_id = ref('')
const is_purchase_loading = ref(false)
const current_coin_balance = computed(() => Number(account_store.balance || 0))
const is_coin_packages_loading = ref(false)
const coin_packages_error = ref('')
const success_toast = ref('')
const source_page = ref(HOME_PAGE_PATH)
let is_unmounted = false
let allow_route_back = false

const selected_package = computed(() => (
  coin_packages.value.find((item) => item.package_id === selected_package_id.value) || null
))

const balance_label = computed(() => format_coin_count(current_coin_balance.value))

const purchase_label = computed(() => {
  if (!selected_package.value) return 'Select a coin package'
  return `Buy ${selected_package.value.price_text}`
})

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--coins-title': theme.colors.text.title,
  '--coins-secondary': theme.colors.text.secondary,
  '--coins-coin': theme.colors.status.coin,
  '--coins-header-back': theme.colors.buy_coins.header_back,
  '--coins-header-border': theme.colors.surface.border,
  '--coins-line': theme.colors.lantern_detail.title_line,
  '--coins-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--coins-package-background': theme.colors.buy_coins.package_background,
  '--coins-package-border': theme.colors.buy_coins.package_border,
  '--coins-package-selected': theme.colors.buy_coins.package_selected,
  '--coins-package-selected-text': theme.colors.buy_coins.package_selected_text,
  '--coins-price-chip': theme.colors.buy_coins.price_chip,
  '--coins-price-chip-selected': theme.colors.buy_coins.price_chip_selected,
  '--coins-refresh-background': theme.colors.buy_coins.balance_refresh_background,
  '--coins-refresh-border': theme.colors.buy_coins.balance_refresh_border,
  '--coins-purchase-button': theme.colors.buy_coins.purchase_button,
  '--coins-purchase-button-text': theme.colors.buy_coins.purchase_button_text,
  '--coins-error': theme.colors.status.info,
  background: theme.colors.page.background
}

const format_coin_count = (value) => Number(value || 0).toLocaleString('en-US')

const normalize_source_page = (value) => {
  const candidate = `${value || ''}`.trim()
  if (!candidate.startsWith('/pages/') || candidate.includes('..')) return HOME_PAGE_PATH
  return candidate
}

const load_user_balance = async () => {
  await refresh_account_coin_balance()
}

const select_default_package = () => {
  if (selected_package_id.value || !coin_packages.value.length) return
  selected_package_id.value = coin_packages.value.find((item) => item.is_available !== false)?.package_id || ''
}

const select_package = (item) => {
  if (!is_purchase_loading.value && item?.package_id && item.is_available !== false) {
    selected_package_id.value = item.package_id
  }
}

const refresh_coin_packages = async () => {
  if (is_coin_packages_loading.value) return
  selected_package_id.value = ''
  is_coin_packages_loading.value = true
  coin_packages_error.value = ''
  try {
    const config = await load_coin_package_config()
    const products = await request_ios_coin_products(config.coin_packages)
    const packages = config.coin_packages.map((item) => {
      const product = products?.find((product) => product.productId === item.product_id)
      return products ? { ...item, is_available: product?.available === true, price_text: product?.displayPrice || item.price_text } : item
    })
    if (!is_unmounted) {
      coin_packages.value = packages
      select_default_package()
    }
  } catch (error) {
    if (!is_unmounted) {
      coin_packages_error.value = error?.message || 'Unable to load coin packages.'
    }
  } finally {
    if (!is_unmounted) is_coin_packages_loading.value = false
  }
}

const show_message = (title) => {
  if (typeof uni !== 'undefined' && uni.showToast) {
    uni.showToast({ title: t(title), icon: 'none' })
  }
}

const go_back = () => {
  if (getCurrentPages().length > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        page_transition.value?.navigate_relaunch({ url: source_page.value })
      }
    })
    if (!started) {
      allow_route_back = false
      page_transition.value?.navigate_relaunch({ url: source_page.value })
    }
    return
  }
  page_transition.value?.navigate_relaunch({ url: source_page.value })
}

const purchase_selected_package = async () => {
  if (!selected_package.value || is_purchase_loading.value) return
  const current_user = account_store.userInfo
  if (!current_user?.userId) {
    show_message('Please log in to buy coins.')
    return
  }
  is_purchase_loading.value = true
  const package_item = selected_package.value
  const user_id = `${current_user.userId}`
  try {
    sync_ios_purchase_session()
    const purchase_result = await request_ios_coin_purchase({
      user_id: current_user.userId,
      package_id: package_item.package_id,
      product_id: package_item.product_id
    })
    const refreshed = await refresh_credited_purchase(purchase_result)
    if (is_unmounted || `${account_store.userId || ''}` !== user_id) return
    if (!refreshed) {
      show_message('Coins were credited. Unable to refresh your balance. Please try again.')
      return
    }
    success_toast.value = SUCCESS_TOAST.recharge
  } catch (error) {
    if (!is_unmounted && `${account_store.userId || ''}` === user_id) show_message(error?.message || 'Purchase failed. Please try again.')
  } finally {
    is_purchase_loading.value = false
  }
}

onLoad((query = {}) => {
  source_page.value = normalize_source_page(query.sourcePage)
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onMounted(() => {
  void refresh_coin_packages()
})

onShow(() => { void load_user_balance() })

onBeforeUnmount(() => {
  is_unmounted = true
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.coins-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.coins-header {
  display: flex;
  flex: none;
  align-items: center;
  padding: 8rpx 32rpx 0;
}

.back-button {
  @include page_back.button;
}

.header-copy {
  min-width: 0;
  margin-left: 20rpx;
}

.header-title {
  display: block;
  color: var(--coins-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 48rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 8rpx;
  border-radius: 999rpx;
  background: var(--coins-line);
  box-shadow: 0 0 18rpx var(--coins-line-shadow);
}

.coins-scroll {
  min-height: 0;
  flex: 1;
  height: 0;
}

.coins-scroll__inner {
  box-sizing: border-box;
  min-height: calc(100% + 2rpx);
  padding: 12rpx 32rpx 24rpx;
}

.balance-block {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 8rpx 0 12rpx;
}

.balance-coin {
  width: 200rpx;
  height: 200rpx;
}

.balance-value {
  margin-top: 8rpx;
  color: var(--coins-title);
  font-size: 72rpx;
  font-weight: 800;
  line-height: 1;
}

.balance-refresh {
  margin-top: 24rpx;
  padding: 14rpx 32rpx;
  border: 1px solid var(--coins-refresh-border);
  border-radius: 999rpx;
  background: var(--coins-refresh-background);
  color: var(--coins-coin);
  font-size: 24rpx;
  font-weight: 600;
  line-height: 34rpx;
}

.package-list {
  display: flex;
  margin-top: 36rpx;
  gap: 20rpx;
  flex-direction: column;
}

.package-error {
  display: flex;
  min-height: 320rpx;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.package-error__copy {
  color: var(--coins-secondary);
  font-size: 24rpx;
  line-height: 36rpx;
  text-align: center;
}

.package-error__retry {
  margin-top: 28rpx;
  padding: 0 36rpx;
  border-radius: 999rpx;
  background: var(--coins-purchase-button);
  color: var(--coins-purchase-button-text);
  font-size: 26rpx;
  font-weight: 800;
  line-height: 76rpx;
}

.coin-package {
  display: flex;
  min-height: 120rpx;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx 0 28rpx;
  border: 1px solid var(--coins-package-border);
  border-radius: 32rpx;
  background: var(--coins-package-background);
  color: var(--coins-title);
}

.coin-package--selected {
  border-color: transparent;
  background: var(--coins-package-selected);
  color: var(--coins-package-selected-text);
}

.package-amount {
  display: flex;
  min-width: 0;
  align-items: center;
  flex: 1;
}

.package-coin {
  width: 72rpx;
  height: 72rpx;
  flex: none;
}

.package-count {
  margin-left: 20rpx;
  color: inherit;
  font-size: 36rpx;
  font-weight: 800;
}

.package-price {
  display: flex;
  min-width: 148rpx;
  height: 72rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: var(--coins-price-chip);
  color: var(--coins-coin);
  font-size: 28rpx;
  font-weight: 800;
}

.coin-package--selected .package-price {
  background: var(--coins-price-chip-selected);
  color: var(--coins-coin);
}

.coins-footer {
  flex: none;
  padding: 12rpx 32rpx 16rpx;
}

.purchase-button {
  display: flex;
  width: 100%;
  height: 104rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--coins-purchase-button);
  color: var(--coins-purchase-button-text);
  font-size: 34rpx;
  font-weight: 800;
}

.purchase-button--disabled {
  opacity: .5;
  pointer-events: none;
}
</style>

<style scoped>
.coin-package--unavailable { opacity: 0.45; }
</style>

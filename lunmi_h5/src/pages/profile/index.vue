<template>
  <PageTransition ref="page_transition" class="profile-page" :style="theme_style">
    <ProfileHeroHeader
      :avatar_url="profile.avatar_url"
      :username="profile.username"
      :location="profile.location"
      :cover_pending="is_loading && !has_profile"
      @open-settings="open_settings"
      @open-edit="open_edit"
    />
    <scroll-view class="profile-scroll" scroll-y :show-scrollbar="false">
      <view class="profile-scroll__inner">
        <MyProfileSkeleton v-if="is_loading" />
        <view v-else-if="load_error && !has_profile" class="profile-error" role="alert">
          <text class="profile-error__title">{{ $t('Unable to load your profile') }}</text>
          <text class="profile-error__copy">{{ $t(load_error) }}</text>
          <view class="profile-error__retry" role="button" @click="load_profile">{{ $t('Try again') }}</view>
        </view>
        <template v-else>
          <view class="coin-card" role="button" :aria-label="$t('Buy lantern coins')" @click="open_coins">
            <view class="coin-card__body">
              <image class="coin-card__mark" src="/static/icon/coin.png" mode="aspectFill" />
              <view class="coin-card__copy">
                <text class="coin-card__amount">{{ $t(coin_label) }}</text>
                <text class="coin-card__caption">{{ $t('Lantern Coins') }}</text>
              </view>
              <image class="coin-card__buy" src="/static/icon/profile_glod_buy.png" mode="aspectFit" />
            </view>
          </view>
          <view class="stat-grid">
            <view class="stat-card" role="button" :aria-label="$t('Open lanterns sent')" @click="open_sent">
              <image src="/static/icon/profile_lanterns_sent.png" mode="aspectFit" />
              <view>
                <text class="stat-card__value">{{ $t(counts.lanterns_sent) }}</text>
                <text class="stat-card__label">{{ $t('Lanterns sent') }}</text>
              </view>
            </view>
            <view class="stat-card" role="button" :aria-label="$t('Open lanterns caught')" @click="open_caught">
              <image src="/static/icon/profile_lanterns_caught.png" mode="aspectFit" />
              <view>
                <text class="stat-card__value">{{ $t(counts.lanterns_caught) }}</text>
                <text class="stat-card__label">{{ $t('Lanterns caught') }}</text>
              </view>
            </view>
            <view class="stat-card" role="button" :aria-label="$t('Open wishes hung')" @click="open_wishes">
              <image src="/static/icon/profile_wish_hang.png" mode="aspectFit" />
              <view>
                <text class="stat-card__value">{{ $t(counts.wishes_hung) }}</text>
                <text class="stat-card__label">{{ $t('Wishes hung') }}</text>
              </view>
            </view>
            <view class="stat-card" role="button" :aria-label="$t('Open rooms joined')" @click="open_rooms">
              <image src="/static/icon/profile_room_joined.png" mode="aspectFit" />
              <view>
                <text class="stat-card__value">{{ $t(counts.rooms_joined) }}</text>
                <text class="stat-card__label">{{ $t('Rooms joined') }}</text>
              </view>
            </view>
          </view>
          <text v-if="load_error" class="profile-inline-error">{{ $t(load_error) }}</text>
        </template>
      </view>
    </scroll-view>
    <view class="main-tabbar-spacer" aria-hidden="true" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectUserInfo } from '@/api/common'
import { refresh_account_coin_balance } from '@/utils/coinPurchaseSync'
import { selectLmLanternPage } from '@/api/lantern'
import { selectMessageList } from '@/api/message'
import { selectLmLanternScoopPage } from '@/api/scoop'
import { selectLmWishPage } from '@/api/wish'
import MyProfileSkeleton from '@/components/MyProfileSkeleton.vue'
import PageTransition from '@/components/PageTransition.vue'
import ProfileHeroHeader from '@/components/ProfileHeroHeader.vue'
import { storeGlobal } from '@/stores/store'
import { map_message_conversations } from '@/utils/messagePresentation'
import { MAIN_TAB_UNREAD_EVENT } from '@/utils/mainTabNavigation'
import {
  format_profile_count,
  read_profile_counts
} from '@/utils/myProfilePresentation'
import { map_public_user_profile, to_user_id_param } from '@/utils/profilePresentation'

const PROFILE_PAGE_PATH = '/pages/profile/index'
const page_transition = ref(null)
const profile = ref({})
const coin_balance = computed(() => Number(storeGlobal().balance || 0))
const counts = ref({
  lanterns_sent: 0,
  lanterns_caught: 0,
  wishes_hung: 0,
  rooms_joined: 0
})
const unread_chat_count = ref(0)
const is_loading = ref(false)
const load_error = ref('')
const is_page_active = ref(true)
let request_contexts = []

const has_profile = computed(() => Boolean(profile.value.user_id))
const coin_label = computed(() => format_profile_count(coin_balance.value))
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--profile-shade': theme.colors.profile.hero_shade,
  '--profile-title': theme.colors.text.on_media,
  '--profile-muted': theme.colors.text.secondary,
  '--profile-card': theme.colors.surface.card,
  '--profile-border': theme.colors.surface.border,
  '--profile-coin-text': theme.colors.profile.coin_text,
  '--profile-coin-muted': theme.colors.profile.coin_muted,
  '--profile-error': theme.colors.status.danger,
  '--profile-retry': theme.colors.status.info,
  '--profile-skeleton': theme.colors.home.skeleton
}

const source_query = (path, extra = '') => {
  const glue = path.includes('?') ? '&' : '?'
  return `${path}${glue}sourcePage=${encodeURIComponent(PROFILE_PAGE_PATH)}${extra}`
}

const empty_page = () => ({ total: 0, records: [] })

const load_profile = async ({ refresh_stats = true } = {}) => {
  if (!is_page_active.value) return
  const account_store = storeGlobal()
  const user_id = to_user_id_param(account_store.userId)
  request_contexts.forEach((item) => item.cancel?.())
  const contexts = [{}, {}, {}, {}, {}, {}]
  request_contexts = contexts
  is_loading.value = true
  load_error.value = ''
  try {
    if (user_id === null) {
      load_error.value = 'No active user session.'
      return
    }
    const [
      info_result,
      balance_refreshed,
      lantern_result,
      scoop_result,
      wish_result,
      message_result
    ] = await Promise.all([
      selectUserInfo({ userId: user_id }, contexts[0]),
      refresh_account_coin_balance(contexts[1]),
      refresh_stats
        ? selectLmLanternPage({ ownerUserId: user_id, current: 1, size: 1 }, contexts[2])
        : Promise.resolve({ success: true, data: empty_page() }),
      refresh_stats
        ? selectLmLanternScoopPage({ scooperUserId: user_id, current: 1, size: 1 }, contexts[3])
        : Promise.resolve({ success: true, data: empty_page() }),
      refresh_stats
        ? selectLmWishPage({ ownerUserId: user_id, current: 1, size: 1 }, contexts[4])
        : Promise.resolve({ success: true, data: empty_page() }),
      selectMessageList({}, contexts[5])
    ])
    if (!is_page_active.value || request_contexts !== contexts || to_user_id_param(account_store.userId) !== user_id) return
    if (!info_result.success) {
      load_error.value = info_result.error || 'Unable to load your profile.'
      return
    }
    profile.value = map_public_user_profile(info_result.data || {})
    account_store.updateUserInfo({
      userName: info_result.data?.userName,
      userImgUrl: info_result.data?.userImgUrl,
      userBrief: info_result.data?.userBrief
    })
    if (!balance_refreshed && !load_error.value) {
      load_error.value = 'Unable to load lantern coins.'
    }
    if (refresh_stats) {
      counts.value = read_profile_counts({
        lantern_page: lantern_result.success ? lantern_result.data : empty_page(),
        scoop_page: scoop_result.success ? scoop_result.data : empty_page(),
        wish_page: wish_result.success ? wish_result.data : empty_page()
      })
      if (!lantern_result.success || !scoop_result.success || !wish_result.success) {
        load_error.value = lantern_result.error || scoop_result.error || wish_result.error || load_error.value
      }
    }
    if (message_result.success) {
      unread_chat_count.value = map_message_conversations(message_result.data, {
        current_user_id: account_store.userId
      }).filter((item) => item.has_unread).length
      uni.$emit(MAIN_TAB_UNREAD_EVENT, {
        page_path: PROFILE_PAGE_PATH,
        user_id: account_store.userId,
        unread_count: unread_chat_count.value
      })
    }
  } catch (error) {
    if (is_page_active.value && request_contexts === contexts) {
      load_error.value = error?.message || 'Unable to load your profile.'
    }
  } finally {
    if (is_page_active.value && request_contexts === contexts) is_loading.value = false
  }
}

const open_settings = () => {
  page_transition.value?.navigate_forward({ url: source_query('/pages/profile/settings') })
}

const open_edit = () => {
  page_transition.value?.navigate_forward({ url: source_query('/pages/profile/edit') })
}

const open_coins = () => {
  page_transition.value?.navigate_forward({ url: source_query('/pages/coins/index') })
}

const open_sent = () => {
  page_transition.value?.navigate_forward({ url: source_query('/pages/lantern/mine/index') })
}

const open_caught = () => {
  page_transition.value?.navigate_forward({ url: source_query('/pages/lantern/scooped/index') })
}

const open_wishes = () => {
  page_transition.value?.navigate_forward({ url: source_query('/pages/wish/mine/index') })
}

const open_rooms = () => {
  page_transition.value?.navigate_forward({
    url: source_query('/pages/live-room/list', '&joinedOnly=true')
  })
}

onShow(() => {
  void load_profile({ refresh_stats: !has_profile.value })
})

onBeforeUnmount(() => {
  is_page_active.value = false
  request_contexts.forEach((item) => item.cancel?.())
})
</script>

<style scoped lang="scss">
.profile-page {
  background: var(--page-background);
}

.profile-scroll {
  position: relative;
  z-index: 2;
  height: 0;
  min-height: 0;
  flex: 1;
}

.profile-scroll__inner {
  min-height: calc(100% + 2rpx);
  box-sizing: border-box;
  padding: 12rpx 32rpx 24rpx;
}

.coin-card {
  position: relative;
  width: 678rpx;
  height: 156rpx;
  overflow: hidden;
  border-radius: 44rpx;
  background: url('/static/icon/profile_glod_bg.png') -40rpx -9rpx / 840rpx 233rpx no-repeat;
}

.coin-card__body {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  padding: 0 28rpx 0 32rpx;
  gap: 20rpx;
}

.coin-card__mark {
  width: 96rpx;
  height: 96rpx;
  min-width: 96rpx;
  flex: none;
  overflow: hidden;
  border-radius: 48rpx;
}

.coin-card__mark-art {
  width: 517rpx;
  height: 96rpx;
  margin-left: -377rpx;
}

.coin-card__copy {
  min-width: 0;
  flex: 1;
}

.coin-card__amount {
  display: block;
  color: var(--profile-coin-text);
  font-size: 48rpx;
  font-weight: 800;
}

.coin-card__caption {
  display: block;
  margin-top: 4rpx;
  color: var(--profile-coin-muted);
  font-size: 22rpx;
  font-weight: 600;
}

.coin-card__buy {
  width: 148rpx;
  height: 64rpx;
  flex: none;
}

.stat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 24rpx;
}

.stat-card {
  display: flex;
  width: calc(50% - 10rpx);
  box-sizing: border-box;
  align-items: center;
  padding: 24rpx;
  border: 1px solid var(--profile-border);
  border-radius: 32rpx;
  background: var(--profile-card);
}

.stat-card image {
  width: 56rpx;
  height: 56rpx;
  margin-right: 16rpx;
}

.stat-card__value {
  display: block;
  color: var(--profile-title);
  font-size: 36rpx;
  font-weight: 800;
}

.stat-card__label {
  display: block;
  margin-top: 4rpx;
  color: var(--profile-muted);
  font-size: 22rpx;
}

.profile-error {
  padding: 48rpx 24rpx;
  text-align: center;
}

.profile-error__title {
  display: block;
  color: var(--profile-title);
  font-size: 30rpx;
  font-weight: 700;
}

.profile-error__copy {
  display: block;
  margin-top: 12rpx;
  color: var(--profile-muted);
  font-size: 24rpx;
  line-height: 34rpx;
}

.profile-error__retry {
  margin-top: 24rpx;
  color: var(--profile-retry);
  font-size: 28rpx;
  font-weight: 700;
}

.profile-inline-error {
  margin-top: 16rpx;
  color: var(--profile-error);
  font-size: 24rpx;
  line-height: 34rpx;
  text-align: center;
}

</style>

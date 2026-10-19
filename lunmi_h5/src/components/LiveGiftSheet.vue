<template>
  <transition name="sheet-slide">
    <view
      v-if="visible"
      class="sheet-layer"
      :style="sheet_style"
    >
      <view class="sheet-scrim" @click="close" @touchmove.stop />
      <view class="sheet-panel" @click.stop="close_menus">
        <view class="recipient-row">
          <view
            class="recipient-chip"
            :class="{ 'recipient-chip--active': recipientMode === 'all' }"
            role="button"
            :aria-label="$t('Send to all hosts')"
            @click.stop="select_all_hosts"
          >
            <view class="recipient-avatars" aria-hidden="true">
              <UserAvatar
                v-for="user in preview_users"
                :key="`all-${user.userId}`"
                class="recipient-avatars__item"
                :source="user.userImgUrl"
              />
            </view>
            <text class="recipient-chip__label">{{ $t('All hosts') }}</text>
          </view>
          <view
            v-if="users.length"
            class="recipient-chip recipient-chip--user"
            :class="{ 'recipient-chip--active': recipientMode === 'user' }"
            role="button"
            :aria-expanded="showUserMenu"
            :aria-label="$t('Choose a host')"
            @click.stop="toggle_user_menu"
          >
            <UserAvatar class="recipient-chip__avatar" :source="selected_user?.userImgUrl" />
            <text class="recipient-chip__name">{{ selected_user?.userName || $t('Select host') }}</text>
            <ArrowDown class="recipient-chip__caret" aria-hidden="true" />
          </view>
        </view>
        <view
          v-if="showUserMenu"
          class="user-menu"
          @click.stop
        >
          <scroll-view class="user-menu__list" scroll-y :show-scrollbar="false">
            <view
              v-for="user in users"
              :key="user.userId"
              class="user-menu__item"
              :class="{ 'user-menu__item--active': `${selectedUserId}` === `${user.userId}` }"
              role="button"
              @click="select_user(user)"
            >
              <UserAvatar class="user-menu__avatar" :source="user.userImgUrl" />
              <text class="user-menu__name">{{ user.userName || $t('Guest') }}</text>
            </view>
          </scroll-view>
        </view>
        <scroll-view class="gift-scroll" scroll-y :show-scrollbar="false">
          <view v-if="isLoading && !gifts.length" class="gift-grid" :aria-label="$t('Loading gifts')">
            <view
              v-for="item in skeleton_count"
              :key="`gift-skeleton-${item}`"
              class="gift-card gift-card--skeleton"
            >
              <view class="skeleton-block skeleton-block--image">
                <MediaShimmer :label="$t('Loading gift')" />
              </view>
              <view class="skeleton-block skeleton-block--name">
                <MediaShimmer :label="$t('Loading gift name')" />
              </view>
            </view>
          </view>
          <view v-else-if="gifts.length" class="gift-grid">
            <view
              v-for="gift in gifts"
              :key="gift.giftConfigId || gift.gitfName || gift.ribbonCall"
              class="gift-card"
              :class="{ 'gift-card--selected': is_selected_gift(gift) }"
              role="button"
              @click="select_gift(gift)"
            >
              <image
                class="gift-card__image"
                :src="gift_image(gift)"
                mode="aspectFit"
              />
              <text class="gift-card__name">{{ gift_name(gift) }}</text>
              <view class="gift-card__price">
                <image class="gift-card__coin" src="/static/assets/coin.png" mode="aspectFit" />
                <text>{{ $t(gift_price(gift)) }}</text>
              </view>
            </view>
          </view>
          <view v-else-if="loadError" class="empty-state">
            <text>{{ $t(loadError) }}</text>
            <view class="empty-state__retry" role="button" @click="emit('retry')">{{ $t('Try again') }}</view>
          </view>
          <view v-else class="empty-state">
            <text>{{ $t('No gifts are available.') }}</text>
          </view>
        </scroll-view>
        <view class="gift-footer">
          <view
            class="balance-chip"
            role="button"
            :aria-label="$t('Open coin recharge')"
            @click="emit('recharge')"
          >
            <image class="balance-chip__coin" src="/static/assets/coin.png" mode="aspectFit" />
            <text class="balance-chip__value">{{ $t(Number(balance || 0)) }}</text>
            <ArrowRight class="balance-chip__arrow" aria-hidden="true" />
          </view>
          <view class="send-group">
            <view
              class="qty-chip"
              role="button"
              :aria-expanded="showQtyMenu"
              :aria-label="$t('Gift quantity')"
              @click.stop="toggle_qty_menu"
            >
              <text>{{ $t(giftNum) }}</text>
              <ArrowDown class="qty-chip__caret" aria-hidden="true" />
            </view>
            <view
              class="send-button"
              :class="{ 'send-button--disabled': isSending }"
              role="button"
              :aria-disabled="isSending"
              @click="submit"
            >
              <text>{{ $t(isSending ? 'Sending' : 'Send') }}</text>
            </view>
          </view>
          <view
            v-if="showQtyMenu"
            class="qty-menu"
            @click.stop
          >
            <view
              v-for="item in quantity_options"
              :key="item"
              class="qty-menu__item"
              :class="{ 'qty-menu__item--active': giftNum === item }"
              role="button"
              @click="select_quantity(item)"
            >
              <text>{{ $t(item) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import MediaShimmer from '@/components/MediaShimmer.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { gift_catalog_key, gift_display_name, gift_price_value, gift_thumb_url } from '@/utils/giftEffect'

const props = defineProps({
  visible: { type: Boolean, default: false },
  gifts: { type: Array, default: () => [] },
  users: { type: Array, default: () => [] },
  balance: { type: [Number, String], default: 0 },
  isLoading: { type: Boolean, default: false },
  loadError: { type: String, default: '' },
  isSending: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible', 'retry', 'send', 'recharge'])
const skeleton_count = 8
const quantity_options = [1, 10, 66, 188]
const selectedGiftId = ref('')
const recipientMode = ref('user')
const selectedUserId = ref('')
const giftNum = ref(1)
const showUserMenu = ref(false)
const showQtyMenu = ref(false)
const sheet_style = computed(() => ({
  '--live-text': theme.colors.voice_room.text,
  '--live-text-muted': theme.colors.voice_room.text_muted,
  '--live-text-soft': theme.colors.voice_room.text_soft,
  '--live-yellow': theme.colors.voice_room.yellow,
  '--live-gift-panel': theme.colors.voice_room.gift_panel_background,
  '--live-gift-chip': theme.colors.voice_room.gift_chip_background,
  '--live-gift-dropdown': theme.colors.voice_room.gift_dropdown_background,
  '--live-gift-menu-active': theme.colors.voice_room.gift_menu_active,
  '--live-gift-selected': theme.colors.voice_room.gift_selected_border,
  '--live-gift-send': theme.colors.voice_room.gift_send_background,
  '--live-gift-send-text': theme.colors.voice_room.gift_send_text,
  '--live-gift-shadow': theme.colors.surface.shadow,
  '--media-loading-surface': theme.colors.voice_room.seat_surface,
  '--media-loading-shine': theme.colors.voice_room.seat_surface_light,
  '--sheet-bottom-offset': '0rpx',
  '--sheet-panel-safe-bottom': 'var(--page-safe-bottom)'
}))
const preview_users = computed(() => props.users.slice(0, 3))
const selected_user = computed(() => (
  props.users.find((user) => `${user.userId}` === `${selectedUserId.value}`) || props.users[0] || null
))
const selected_gift = computed(() => (
  props.gifts.find((gift) => gift_key(gift) === selectedGiftId.value) || props.gifts[0] || null
))
const gift_key = (gift) => gift_catalog_key(gift)
const gift_name = (gift) => gift_display_name(gift)
const gift_image = (gift) => gift_thumb_url(gift)
const gift_price = (gift) => gift_price_value(gift)
const is_selected_gift = (gift) => gift_key(gift) === gift_key(selected_gift.value)
const close_menus = () => {
  showUserMenu.value = false
  showQtyMenu.value = false
}
const close = () => {
  close_menus()
  emit('update:visible', false)
}
const sync_defaults = () => {
  if (!selectedUserId.value && props.users[0]?.userId) selectedUserId.value = props.users[0].userId
  if (selectedUserId.value && !props.users.some((user) => `${user.userId}` === `${selectedUserId.value}`)) {
    selectedUserId.value = props.users[0]?.userId || ''
  }
  if (!selectedGiftId.value && props.gifts[0]) selectedGiftId.value = gift_key(props.gifts[0])
  if (selectedGiftId.value && !props.gifts.some((gift) => gift_key(gift) === selectedGiftId.value)) {
    selectedGiftId.value = props.gifts[0] ? gift_key(props.gifts[0]) : ''
  }
}
const select_all_hosts = () => {
  recipientMode.value = 'all'
  showUserMenu.value = false
}
const toggle_user_menu = () => {
  showQtyMenu.value = false
  showUserMenu.value = !showUserMenu.value
}
const select_user = (user) => {
  if (!user?.userId) return
  selectedUserId.value = user.userId
  recipientMode.value = 'user'
  showUserMenu.value = false
}
const select_gift = (gift) => {
  selectedGiftId.value = gift_key(gift)
  close_menus()
}
const toggle_qty_menu = () => {
  showUserMenu.value = false
  showQtyMenu.value = !showQtyMenu.value
}
const select_quantity = (value) => {
  giftNum.value = Number(value) || 1
  showQtyMenu.value = false
}
const submit = () => {
  if (props.isSending) return
  const gift = selected_gift.value
  if (!gift) return
  const receivers = recipientMode.value === 'all'
    ? props.users.filter((user) => user?.userId)
    : (selected_user.value ? [selected_user.value] : [])
  emit('send', {
    gift,
    receivers,
    giftNum: giftNum.value
  })
}
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      close_menus()
      return
    }
    recipientMode.value = props.users.length > 1 ? 'user' : 'all'
    giftNum.value = 1
    sync_defaults()
  }
)
watch(
  () => [props.users, props.gifts],
  () => {
    if (props.visible) sync_defaults()
  }
)
</script>

<style scoped lang="scss">
.sheet-layer {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: flex;
  box-sizing: border-box;
  justify-content: flex-end;
  padding-bottom: var(--sheet-bottom-offset);
  flex-direction: column;
}

.sheet-scrim {
  position: absolute;
  inset: 0;
}

.sheet-panel {
  position: relative;
  display: flex;
  width: 100%;
  height: 780rpx;
  overflow: hidden;
  box-sizing: border-box;
  padding: 28rpx 24rpx calc(24rpx + var(--sheet-panel-safe-bottom));
  border-radius: 36rpx 36rpx 0 0;
  background: var(--live-gift-panel);
  color: var(--live-text);
  flex-direction: column;
  flex: none;
  will-change: transform;
}

.recipient-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  gap: 16rpx;
  flex: none;
}

.recipient-chip {
  display: flex;
  min-width: 0;
  height: 72rpx;
  align-items: center;
  padding: 0 22rpx 0 12rpx;
  border: 1px solid transparent;
  border-radius: 999rpx;
  background: var(--live-gift-chip);
  gap: 12rpx;
}

.recipient-chip--user {
  max-width: 360rpx;
  margin-left: auto;
}

.recipient-chip--active {
  border-color: var(--live-gift-selected);
}

.recipient-avatars {
  display: flex;
  align-items: center;
  flex: none;
}

.recipient-avatars__item {
  width: 44rpx;
  height: 44rpx;
  margin-left: -12rpx;
  border: 1px solid var(--live-text);
  border-radius: 50%;
  flex: none;
}

.recipient-avatars__item:first-child {
  margin-left: 0;
}

.recipient-chip__avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  flex: none;
}

.recipient-chip__label,
.recipient-chip__name {
  overflow: hidden;
  color: var(--live-text);
  font-size: 24rpx;
  font-weight: 700;
  line-height: 32rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipient-chip__name {
  flex: 1;
}

.recipient-chip__caret,
.qty-chip__caret,
.balance-chip__arrow {
  width: 22rpx;
  height: 22rpx;
  color: var(--live-text-muted);
  flex: none;
}

.user-menu {
  position: absolute;
  z-index: 8;
  top: 112rpx;
  right: 24rpx;
  width: 360rpx;
  max-height: 420rpx;
  overflow: hidden;
  border-radius: 24rpx;
  background: var(--live-gift-dropdown);
  box-shadow: 0 18rpx 48rpx var(--live-gift-shadow);
}

.user-menu__list {
  max-height: 420rpx;
}

.user-menu__item {
  display: flex;
  align-items: center;
  padding: 18rpx 20rpx;
  gap: 14rpx;
}

.user-menu__item--active {
  background: var(--live-gift-menu-active);
}

.user-menu__avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  flex: none;
}

.user-menu__name {
  overflow: hidden;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 34rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.gift-scroll {
  min-height: 0;
  flex: 1;
}

.gift-grid {
  display: grid;
  padding: 8rpx 4rpx 16rpx;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16rpx;
}

.gift-card {
  display: flex;
  min-height: 236rpx;
  align-items: center;
  padding: 16rpx 8rpx 14rpx;
  border: 2px solid transparent;
  border-radius: 24rpx;
  flex-direction: column;
}

.gift-card--selected {
  border-color: var(--live-gift-selected);
}

.gift-card--skeleton {
  position: relative;
  overflow: hidden;
}

.gift-card__image {
  width: 112rpx;
  height: 112rpx;
}

.gift-card__name {
  display: block;
  max-width: 100%;
  margin-top: 10rpx;
  overflow: hidden;
  color: var(--live-text);
  font-size: 22rpx;
  line-height: 30rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gift-card__price {
  display: flex;
  align-items: center;
  margin-top: 6rpx;
  color: var(--live-yellow);
  font-size: 20rpx;
  line-height: 28rpx;
  gap: 4rpx;
}

.gift-card__coin {
  width: 22rpx;
  height: 22rpx;
}

.skeleton-block {
  position: relative;
  overflow: hidden;
  border-radius: 16rpx;
}

.skeleton-block--image {
  width: 112rpx;
  height: 112rpx;
}

.skeleton-block--name {
  width: 88rpx;
  height: 24rpx;
  margin-top: 16rpx;
}

.empty-state {
  display: flex;
  padding: 80rpx 24rpx;
  align-items: center;
  flex-direction: column;
  color: var(--live-text-muted);
  font-size: 26rpx;
  line-height: 38rpx;
  gap: 16rpx;
}

.empty-state__retry {
  color: var(--live-text);
  font-weight: 700;
}

.gift-footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
  gap: 16rpx;
  flex: none;
}

.balance-chip,
.send-group,
.qty-chip,
.send-button {
  display: flex;
  align-items: center;
}

.balance-chip {
  min-width: 0;
  height: 64rpx;
  padding: 0 8rpx 0 4rpx;
  gap: 8rpx;
}

.balance-chip__coin {
  width: 36rpx;
  height: 36rpx;
}

.balance-chip__value {
  color: var(--live-text);
  font-size: 30rpx;
  font-weight: 800;
  line-height: 40rpx;
}

.send-group {
  gap: 12rpx;
  flex: none;
}

.qty-chip {
  height: 72rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: var(--live-gift-chip);
  font-size: 26rpx;
  font-weight: 700;
  gap: 8rpx;
}

.send-button {
  height: 72rpx;
  padding: 0 42rpx;
  border-radius: 999rpx;
  background: var(--live-gift-send);
  color: var(--live-gift-send-text);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 72rpx;
  text-align: center;
}

.send-button--disabled {
  opacity: .5;
  pointer-events: none;
}

.qty-menu {
  position: absolute;
  z-index: 8;
  right: 168rpx;
  bottom: 88rpx;
  min-width: 120rpx;
  overflow: hidden;
  border-radius: 20rpx;
  background: var(--live-gift-dropdown);
}

.qty-menu__item {
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 34rpx;
  text-align: center;
}

.qty-menu__item--active {
  color: var(--live-gift-send-text);
  background: var(--live-gift-selected);
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: opacity .28s ease;
}

.sheet-slide-enter-active .sheet-panel,
.sheet-slide-leave-active .sheet-panel {
  transition: transform .34s cubic-bezier(.32, .72, 0, 1);
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  opacity: 0;
}

.sheet-slide-enter-from .sheet-panel,
.sheet-slide-leave-to .sheet-panel {
  transform: translateY(calc(100% + var(--sheet-bottom-offset)));
}
</style>

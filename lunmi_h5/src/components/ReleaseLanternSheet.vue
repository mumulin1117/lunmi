<template>
  <teleport to="body">
    <transition name="sheet-slide">
      <view
        v-if="visible"
        class="sheet-layer"
        :style="sheet_style"
      >
        <view class="sheet-scrim" @click="close" />
        <view class="sheet-panel" @click.stop>
          <view class="sheet-handle" aria-hidden="true" />
          <view class="sheet-header">
            <view class="user-row">
              <UserAvatar class="user-avatar" :source="avatar_url" />
              <view class="user-copy">
                <text class="user-name">{{ display_name_is_placeholder ? $t(display_name) : display_name }}</text>
                <text class="user-subtitle">{{ $t('Shown without your name') }}</text>
              </view>
              <view class="close-button" role="button" :aria-label="$t('Close')" @click="close">
                <image src="/static/icon/release_lantern_fork.png" mode="aspectFit" />
              </view>
            </view>
          </view>
          <scroll-view class="sheet-scroll" scroll-y :show-scrollbar="false">
            <view class="sheet-scroll__inner">
              <view class="type-row" role="radiogroup" :aria-label="$t('Lantern type')">
                <view
                  v-for="lantern_type in lantern_types"
                  :key="lantern_type"
                  class="type-chip"
                  :class="{
                  'type-chip--active': selected_type === lantern_type,
                  'type-chip--gratitude': lantern_type === 'Gratitude' && selected_type !== lantern_type
                  }"
                  role="radio"
                  :aria-checked="selected_type === lantern_type"
                  @click="select_type(lantern_type)"
                >
                  <text>{{ $t(lantern_type) }}</text>
                </view>
              </view>
              <view class="message-box">
                <textarea
                  v-model="message"
                  maxlength="500"
                  :placeholder="$t('Say it here...')"
                  placeholder-class="message-placeholder"
                  :disabled="is_busy"
                />
                <image class="message-mark" src="/static/icon/lantern_release_flower.png" mode="aspectFit" />
              </view>
              <view
                class="photo-row"
                role="button"
                :aria-label="$t(photo ? 'Change photo' : 'Add a photo')"
                :aria-disabled="is_busy"
                @click="choose_photo"
              >
                <image
                  v-if="photo?.preview_url"
                  class="photo-preview"
                  :src="photo.preview_url"
                  mode="aspectFill"
                />
                <image
                  v-else
                  class="photo-icon"
                  src="/static/icon/release_lantern_photo.png"
                  mode="aspectFit"
                />
                <view class="photo-copy">
                  <text>{{ $t(photo ? 'Change photo' : 'Add a photo') }}</text>
                  <text>{{ $t(is_uploading ? 'Uploading...' : (photo ? 'Photo attached' : 'Optional')) }}</text>
                </view>
                <image class="photo-add" src="/static/icon/release_lantern_add.png" mode="aspectFit" />
              </view>
              <view class="boost-row">
                <image class="boost-mark" src="/static/icon/coin.png" mode="aspectFit" />
                <view class="boost-copy">
                  <text>{{ $t(boost_cost) }} {{ $t('Boost') }}</text>
                  <text>{{ $t('Optional · helps more people find it, never a reply') }}</text>
                </view>
                <view
                  class="boost-toggle"
                  :class="{ 'boost-toggle--on': boost_enabled }"
                  role="switch"
                  :aria-label="$t('Boost this lantern')"
                  :aria-checked="boost_enabled"
                  :aria-disabled="is_busy"
                  @click="toggle_boost"
                >
                  <view class="boost-toggle__knob" />
                </view>
              </view>
              <text v-if="form_error" class="form-error" role="alert">{{ $t(form_error) }}</text>
              <view
                class="release-button"
                :class="{ 'release-button--disabled': !can_release }"
                role="button"
                :aria-disabled="!can_release"
                :aria-busy="is_releasing"
                @click="submit_lantern"
              >
                <text>{{ $t(is_releasing ? 'Releasing...' : 'Release') }}</text>
                <image src="/static/icon/lantern_release_flower.png" mode="aspectFit" />
              </view>
            </view>
          </scroll-view>
        </view>
        <InsufficientBalanceConfirmDialog
          :visible="is_balance_visible"
          :coin-cost="boost_cost"
          :copy="$t(boost_balance_copy)"
          @cancel="close_balance_dialog"
          @buy="buy_coins"
        />
      </view>
    </transition>
  </teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { addUserBalanceRecord, updateUserBalance } from '@/api/common'
import { addLmLantern, addLmLanternMedia } from '@/api/lantern'
import { addLmMediaAsset } from '@/api/mediaAsset'
import { uploadImageFile } from '@/api/media'
import InsufficientBalanceConfirmDialog from '@/components/InsufficientBalanceConfirmDialog.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import { choose_local_image, release_local_image_preview } from '@/utils/localImagePicker'
import { read_balance_after_update } from '@/utils/coinPurchasePresentation'
import { read_coin_balance } from '@/utils/myProfilePresentation'
import {
  BOOST_COIN_COST,
  LANTERN_TYPES,
  build_add_lantern_media_params,
  build_add_lantern_params,
  build_add_media_asset_params,
  build_lantern_boost_record_params,
  plan_lantern_boost_consumption,
  can_afford_boost,
  map_release_sheet_session,
  read_lantern_id,
  read_media_asset_id
} from '@/utils/releaseLanternPresentation'

const props = defineProps({
  visible: { type: Boolean, default: false },
  bottomOffset: { type: String, default: 'auto' }
})

const emit = defineEmits(['update:visible', 'released', 'request-photos', 'buy-coins'])

const lantern_types = LANTERN_TYPES
const boost_cost = BOOST_COIN_COST
const selected_type = ref(LANTERN_TYPES[0])
const message = ref('')
const photo = ref(null)
const boost_enabled = ref(false)
const display_name = ref('')
const display_name_is_placeholder = ref(false)
const avatar_url = ref('')
const city_name = ref('')
const coin_balance = ref(0)
const form_error = ref('')
const is_balance_visible = ref(false)
const is_uploading = ref(false)
const is_releasing = ref(false)
const is_sheet_active = ref(true)
let upload_request_context = {}
let release_request_context = {}

const is_busy = computed(() => is_uploading.value || is_releasing.value)
const can_release = computed(() => Boolean(message.value.trim() && !is_busy.value))

const boost_balance_copy = computed(() => (
  `You need ${boost_cost} coins to boost this lantern. Boost stays off until you have enough balance.`
))

const resolved_bottom_offset = computed(() => {
  if (props.bottomOffset === 'auto') return '0rpx'
  return props.bottomOffset
})

const sheet_style = computed(() => ({
  '--page-background': theme.colors.page.background,
  '--sheet-background': theme.colors.release_sheet.background,
  '--sheet-shadow': theme.colors.release_sheet.shadow,
  '--sheet-handle': theme.colors.release_sheet.handle,
  '--sheet-orb-left': theme.colors.release_sheet.orb_left,
  '--sheet-orb-right': theme.colors.release_sheet.orb_right,
  '--sheet-tag-active': theme.colors.release_sheet.tag_active,
  '--sheet-tag-active-text': theme.colors.release_sheet.tag_active_text,
  '--sheet-tag-active-shadow': theme.colors.release_sheet.tag_active_shadow,
  '--sheet-input-inset': theme.colors.release_sheet.input_inset,
  '--sheet-subtitle': theme.colors.release_sheet.subtitle,
  '--title-color': theme.colors.text.title,
  '--secondary-color': theme.colors.text.secondary,
  '--surface-color': theme.colors.surface.card,
  '--surface-border': theme.colors.surface.border,
  '--tag-background': theme.colors.button_change.default.background,
  '--tag-text': theme.colors.button_change.default.text,
  '--tag-border': theme.colors.button_change.default.border,
  '--accent-color': theme.colors.button.primary,
  '--accent-text-color': theme.colors.button.text,
  '--danger-color': theme.colors.status.danger,
  '--scrim-color': theme.colors.surface.scrim,
  '--coin-color': theme.colors.status.coin,
  '--sheet-gold': theme.colors.status.coin,
  '--button-inset': theme.colors.release_sheet.button_inset,
  '--switch-on': theme.colors.status.info,
  '--switch-off': theme.colors.button_change.default.background,
  '--sheet-bottom-offset': resolved_bottom_offset.value,
  '--sheet-panel-safe-bottom': resolved_bottom_offset.value === '0rpx'
    ? 'var(--page-safe-bottom)'
    : '0rpx'
}))

const clear_photo = () => {
  release_local_image_preview(photo.value?.preview_url)
  photo.value = null
}

const reset_form = () => {
  selected_type.value = LANTERN_TYPES[0]
  message.value = ''
  boost_enabled.value = false
  form_error.value = ''
  is_balance_visible.value = false
  clear_photo()
}

const close = () => {
  if (is_releasing.value) return
  reset_form()
  emit('update:visible', false)
}

// feedback_mode: immediate
const select_type = (lantern_type) => {
  if (is_busy.value) return
  selected_type.value = lantern_type
}

const apply_boost_balance_cache = (account_store, balance_after) => {
  const balance = read_coin_balance(balance_after)
  account_store.setBalance(balance)
  account_store.updateUserInfo({ userBalance: balance })
  coin_balance.value = balance
}

const settle_lantern_boost = async (account_store, request_context) => {
  const consumption = plan_lantern_boost_consumption({
    cached_balance: account_store.balance,
    boost_cost
  })
  const balance_result = await updateUserBalance(
    consumption.update_balance_params,
    request_context
  )
  if (!balance_result.success) {
    return {
      success: false,
      error: balance_result.error || 'Unable to update your coin balance.'
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
    build_lantern_boost_record_params({
      user_id: account_store.userId,
      boost_cost,
      balance_after: latest_balance
    }),
    request_context
  )
  if (!record_result.success) {
    return {
      success: false,
      error: record_result.error || 'Unable to save this coin record.'
    }
  }
  apply_boost_balance_cache(account_store, latest_balance)
  return { success: true, error: '' }
}

// feedback_mode: immediate
const close_balance_dialog = () => {
  is_balance_visible.value = false
}

const buy_coins = () => {
  is_balance_visible.value = false
  emit('update:visible', false)
  emit('buy-coins')
}

const toggle_boost = () => {
  if (is_busy.value) return
  form_error.value = ''
  if (boost_enabled.value) {
    boost_enabled.value = false
    return
  }
  if (!can_afford_boost(coin_balance.value, boost_cost)) {
    is_balance_visible.value = true
    return
  }
  boost_enabled.value = true
}

const sync_sheet_from_session = () => {
  const account_store = storeGlobal()
  form_error.value = ''
  is_balance_visible.value = false
  if (!account_store.userId) {
    display_name.value = ''
    display_name_is_placeholder.value = false
    avatar_url.value = ''
    city_name.value = ''
    coin_balance.value = 0
    return
  }
  const session = map_release_sheet_session(account_store.userInfo, account_store.balance)
  display_name.value = session.display_name
  display_name_is_placeholder.value = session.display_name_is_placeholder
  avatar_url.value = session.avatar_url
  city_name.value = session.city_name
  coin_balance.value = session.coin_balance
}

// feedback_mode: control_pending
const choose_photo = async () => {
  if (is_busy.value) return
  form_error.value = ''
  is_uploading.value = true
  upload_request_context.cancel?.()
  upload_request_context = {}
  try {
    const chosen = await choose_local_image()
    if (!is_sheet_active.value) {
      release_local_image_preview(chosen.preview_url)
      return
    }
    const upload_result = await uploadImageFile({
      file: chosen.blob,
      request_context: upload_request_context
    })
    if (!is_sheet_active.value) {
      release_local_image_preview(chosen.preview_url)
      return
    }
    if (!upload_result.success) {
      release_local_image_preview(chosen.preview_url)
      form_error.value = upload_result.error || 'Unable to upload this photo.'
      return
    }
    const image_url = `${upload_result.data?.image_url || ''}`.trim()
    if (!image_url) {
      release_local_image_preview(chosen.preview_url)
      form_error.value = 'Unable to upload this photo.'
      return
    }
    clear_photo()
    photo.value = {
      preview_url: chosen.preview_url,
      image_url,
      mime_type: chosen.blob?.type || '',
      file_size: chosen.blob?.size || 0
    }
  } catch (error) {
    if (!is_sheet_active.value) return
    if (/cancel/i.test(error?.message || '')) return
    if (/permission are required/i.test(error?.message || '')) {
      emit('request-photos')
      return
    }
    form_error.value = error?.message || 'Unable to choose a photo.'
  } finally {
    if (is_sheet_active.value) is_uploading.value = false
  }
}

// feedback_mode: page_action_loading
const submit_lantern = async () => {
  if (!can_release.value) return
  const content = message.value.trim()
  const lantern_label = selected_type.value
  if (!content) {
    form_error.value = 'Say something before releasing your lantern.'
    return
  }
  if (is_uploading.value) {
    form_error.value = 'Wait for the photo to finish uploading.'
    return
  }
  const account_store = storeGlobal()
  if (!account_store.userId) {
    form_error.value = 'Please sign in before releasing a lantern.'
    return
  }
  if (boost_enabled.value && !can_afford_boost(coin_balance.value, boost_cost)) {
    is_balance_visible.value = true
    return
  }
  const release_user_id = `${account_store.userId}`
  form_error.value = ''
  is_releasing.value = true
  release_request_context.cancel?.()
  release_request_context = {}
  try {
    let media_asset_id = ''
    if (photo.value?.image_url) {
      const asset_result = await addLmMediaAsset(
        build_add_media_asset_params({
          image_url: photo.value.image_url,
          owner_user_id: account_store.userId,
          mime_type: photo.value.mime_type,
          file_size: photo.value.file_size
        }),
        release_request_context
      )
      if (!is_sheet_active.value || `${account_store.userId}` !== release_user_id) return
      if (!asset_result.success) {
        form_error.value = asset_result.error || 'Unable to attach this photo.'
        return
      }
      media_asset_id = read_media_asset_id(asset_result.data)
      if (media_asset_id === '') {
        form_error.value = 'Unable to attach this photo.'
        return
      }
    }
    const lantern_result = await addLmLantern(
      build_add_lantern_params({
        content,
        lantern_label,
        owner_user_id: account_store.userId,
        city_name: city_name.value
      }),
      release_request_context
    )
    if (!is_sheet_active.value || `${account_store.userId}` !== release_user_id) return
    if (!lantern_result.success) {
      form_error.value = lantern_result.error || 'Unable to release this lantern.'
      return
    }
    const lantern_id = read_lantern_id(lantern_result.data)
    if (lantern_id === '') {
      form_error.value = 'Unable to release this lantern.'
      return
    }
    if (media_asset_id !== '') {
      const media_result = await addLmLanternMedia(
        build_add_lantern_media_params({
          lantern_id,
          media_asset_id
        }),
        release_request_context
      )
      if (!is_sheet_active.value || `${account_store.userId}` !== release_user_id) return
      if (!media_result.success) {
        form_error.value = media_result.error || 'Unable to attach this photo.'
        return
      }
    }
    if (boost_enabled.value) {
      const boost_result = await settle_lantern_boost(account_store, release_request_context)
      if (!is_sheet_active.value || `${account_store.userId}` !== release_user_id) return
      if (!boost_result.success) {
        form_error.value = boost_result.error
          || 'Your lantern was released, but the boost payment could not be completed.'
        return
      }
    }
    reset_form()
    emit('update:visible', false)
    emit('released', {
      lantern_id,
      lantern_type: lantern_label
    })
  } catch (error) {
    if (is_sheet_active.value) {
      form_error.value = error?.message || 'Unable to release this lantern.'
    }
  } finally {
    if (is_sheet_active.value) is_releasing.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      sync_sheet_from_session()
      return
    }
    upload_request_context.cancel?.()
    release_request_context.cancel?.()
  }
)

onBeforeUnmount(() => {
  is_sheet_active.value = false
  upload_request_context.cancel?.()
  release_request_context.cancel?.()
  clear_photo()
})

defineExpose({ choose_photo })
</script>

<style scoped lang="scss">
.sheet-layer {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: flex;
  box-sizing: border-box;
  align-items: flex-end;
}

.sheet-scrim {
  position: absolute;
  inset: 0;
  background: var(--scrim-color);
}

.sheet-panel {
  position: relative;
  z-index: 1;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  max-height: 1280rpx;
  padding: 24rpx 0 calc(36rpx + var(--sheet-panel-safe-bottom));
  overflow: hidden;
  border: 1px solid var(--surface-border);
  border-radius: 54rpx 54rpx 0 0;
  background: var(--sheet-background);
  box-shadow: 0 -4rpx 80rpx var(--sheet-shadow);
  flex-direction: column;
  will-change: transform;
}

.sheet-header {
  box-sizing: border-box;
  width: 100%;
  padding: 0 36rpx;
  flex: none;
}

.sheet-scroll {
  box-sizing: border-box;
  width: 100%;
  max-height: 1040rpx;
  flex: 1;
  min-height: 360rpx;
}

.sheet-scroll__inner {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  min-height: calc(100% + 2rpx);
  padding: 0 36rpx;
}

.sheet-handle {
  width: 84rpx;
  height: 8rpx;
  margin: 4rpx auto 0;
  border-radius: 999rpx;
  background: var(--sheet-handle);
  flex: none;
}

.user-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  margin-top: 20rpx;
}

.user-copy {
  min-width: 0;
  margin-left: 20rpx;
  flex: 1;
}

.user-name {
  display: block;
  overflow: hidden;
  color: var(--title-color);
  font-size: 34rpx;
  font-weight: 800;
  line-height: 42rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-subtitle {
  display: block;
  margin-top: 4rpx;
  color: var(--sheet-subtitle);
  font-size: 22rpx;
  line-height: 30rpx;
}

.user-avatar {
  width: 88rpx;
  height: 88rpx;
  overflow: hidden;
  border: 1px solid var(--surface-border);
  border-radius: 50%;
  flex: none;
}

.close-button {
  width: 64rpx;
  height: 64rpx;
  margin-left: 16rpx;
  flex: none;
}

.close-button image {
  width: 64rpx;
  height: 64rpx;
}

.type-row {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  margin-top: 28rpx;
  gap: 16rpx;
}

.type-chip {
  display: flex;
  min-width: 148rpx;
  height: 76rpx;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  border: 1px solid var(--tag-border);
  border-radius: 999rpx;
  background: var(--tag-background);
  color: var(--tag-text);
  font-size: 26rpx;
  font-weight: 700;
}

.type-chip--active {
  border-color: transparent;
  background: var(--sheet-tag-active);
  box-shadow: 0 0 32rpx var(--sheet-tag-active-shadow);
  color: var(--sheet-tag-active-text);
}

.type-chip--gratitude {
  border-color: var(--sheet-gold);
  color: var(--sheet-gold);
}

.message-box {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 250rpx;
  margin-top: 28rpx;
  padding: 28rpx 32rpx;
  border: 1px solid var(--surface-border);
  border-radius: 40rpx;
  background: var(--surface-color);
  box-shadow: inset 0 0 48rpx 2rpx var(--sheet-input-inset);
}

.message-mark {
  position: absolute;
  right: 24rpx;
  bottom: 16rpx;
  width: 72rpx;
  height: 52rpx;
  opacity: .45;
  pointer-events: none;
}

.message-box textarea {
  width: 100%;
  height: 194rpx;
  color: var(--title-color);
  font-size: 28rpx;
  line-height: 44rpx;
}

.message-placeholder {
  color: var(--secondary-color);
}

.photo-row,
.boost-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
}

.photo-row {
  box-sizing: border-box;
  width: 100%;
  min-height: 142rpx;
  padding: 0 28rpx;
  border: 1px dashed var(--surface-border);
  border-radius: 40rpx;
  background: var(--surface-color);
}

.photo-icon,
.photo-preview {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  flex: none;
}

.photo-preview {
  overflow: hidden;
}

.photo-copy {
  display: flex;
  min-width: 0;
  margin-left: 20rpx;
  flex: 1;
  flex-direction: column;
}

.photo-copy text:first-child {
  color: var(--title-color);
  font-size: 30rpx;
  font-weight: 800;
}

.photo-copy text:last-child {
  margin-top: 4rpx;
  color: var(--sheet-subtitle);
  font-size: 22rpx;
  line-height: 30rpx;
}

.photo-add {
  width: 36rpx;
  height: 36rpx;
  flex: none;
}

.boost-row {
  box-sizing: border-box;
  min-height: 128rpx;
  padding: 20rpx 28rpx;
  border: 1px solid var(--surface-border);
  border-radius: 40rpx;
  background: var(--surface-color);
}

.boost-mark {
  width: 72rpx;
  height: 72rpx;
  flex: none;
}

.boost-toggle {
  position: relative;
  width: 88rpx;
  height: 48rpx;
  margin-left: 16rpx;
  border-radius: 999rpx;
  background: var(--switch-off);
  flex: none;
}

.boost-toggle--on {
  background: var(--switch-on);
}

.boost-toggle__knob {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--title-color);
}

.boost-toggle--on .boost-toggle__knob {
  left: 44rpx;
}

.boost-copy {
  display: flex;
  min-width: 0;
  margin-left: 16rpx;
  flex: 1;
  flex-direction: column;
}

.boost-copy text:first-child {
  color: var(--title-color);
  font-size: 30rpx;
  font-weight: 800;
}

.boost-copy text:last-child {
  margin-top: 6rpx;
  color: var(--sheet-subtitle);
  font-size: 22rpx;
  line-height: 30rpx;
}

.form-error {
  display: block;
  margin-top: 16rpx;
  color: var(--danger-color);
  font-size: 22rpx;
  line-height: 32rpx;
}

.release-button {
  position: relative;
  display: flex;
  height: 120rpx;
  margin-top: 28rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--accent-color);
  box-shadow: inset 0 2rpx 0 var(--button-inset);
  color: var(--accent-text-color);
  font-size: 34rpx;
  font-weight: 800;
  margin-bottom: var(--page-safe-bottom);;
}

.release-button image {
  position: absolute;
  right: 28rpx;
  width: 92rpx;
  height: 64rpx;
}

.release-button--disabled {
  opacity: .54;
  pointer-events: none;
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
  transform: translateY(100%);
}
</style>

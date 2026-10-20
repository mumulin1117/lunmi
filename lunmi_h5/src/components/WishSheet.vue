<template>
  <transition name="wish-sheet-slide">
    <view v-if="visible" class="wish-sheet" :style="theme_style" @touchmove.stop.prevent>
      <view class="wish-sheet__scrim" @click="close" />
      <view class="wish-sheet__panel">
        <view class="wish-sheet__handle" />
        <view class="wish-sheet__user">
          <UserAvatar class="wish-sheet__avatar" :source="avatar_url" />
          <view class="wish-sheet__identity">
            <text class="wish-sheet__name">{{ display_name }}</text>
            <text class="wish-sheet__anonymous">{{ $t('Shown without your name') }}</text>
          </view>
          <image class="wish-sheet__close" role="button" :aria-label="$t('Close wish')" :aria-disabled="is_publishing" @click="close" src="/static/icon/wish_close.png" mode="aspectFit" />
        </view>
        <scroll-view scroll-y class="wish-sheet__body">
          <view v-if="is_loading" class="wish-sheet__skeleton" aria-hidden="true">
            <view class="wish-sheet__skeleton-line" />
            <view class="wish-sheet__skeleton-line wish-sheet__skeleton-line--short" />
          </view>
          <view v-else-if="load_error" class="wish-sheet__alert" role="alert">
            <text>{{ $t(load_error) }}</text>
            <view role="button" @click="load_sheet">{{ $t('Try again') }}</view>
          </view>
          <template v-else>
            <view class="wish-field">
              <textarea
                v-model="wish_text"
                class="wish-field__input"
                maxlength="500"
                :placeholder="$t('What do you wish for?')"
                :placeholder-style="placeholder_style"
                :disabled="is_publishing"
              />
              <image class="wish-field__flower" src="/static/icon/wish_tree_lantern_inner.png" mode="aspectFit" />
            </view>
            <view class="photo-row" role="button" :aria-label="$t(photo_url ? 'Replace photo' : 'Add a photo')" @click="choose_photo">
              <image v-if="photo_url" class="photo-row__preview" :src="photo_url" mode="aspectFill" />
              <view v-else class="photo-row__icon" aria-hidden="true">
                <image src="/static/icon/release_lantern_photo.png" mode="aspectFit" />
              </view>
              <view class="photo-row__copy">
                <text class="photo-row__title">{{ $t(photo_url ? 'Photo added' : 'Add a photo') }}</text>
                <text class="photo-row__hint">{{ $t(is_uploading ? 'Uploading...' : 'Optional') }}</text>
              </view>
              <image v-if="!photo_url" class="photo-row__add" src="/static/icon/release_lantern_add.png" mode="aspectFit" />
              <view v-else class="photo-row__remove" role="button" :aria-label="$t('Remove photo')" @click.stop="clear_photo">
                <image src="/static/icon/post_details_del.png" mode="aspectFit" />
              </view>
            </view>
            <view class="branch-card">
              <image class="branch-card__art" src="/static/icon/wish_release_left.png" mode="aspectFill" />
              <view class="branch-card__body">
                <view class="branch-card__head">
                  <text>{{ $t('Branch height') }}</text>
                  <view class="branch-card__balance">
                    <image src="/static/icon/coin.png" mode="aspectFit" />
                    <text>{{ $t(balance_label) }}</text>
                  </view>
                </view>
                <view
                  v-for="option in branch_options"
                  :key="option.branch_level"
                  class="branch-option"
                  :class="{ 'branch-option--selected': selected_level === option.branch_level }"
                  role="radio"
                  :aria-checked="selected_level === option.branch_level"
                  @click="select_branch(option.branch_level)"
                >
                  <view class="branch-option__mark" />
                  <text class="branch-option__name">{{ $t(branch_label(option.branch_level)) }}</text>
                  <text class="branch-option__days">{{ $t(branch_visibility_label(option)) }}</text>
                  <view class="branch-option__cost">
                    <image v-if="option.coin_cost > 0" src="/static/icon/coin.png" mode="aspectFit" />
                    <text>{{ $t(branch_option_cost_label(option)) }}</text>
                  </view>
                </view>
                <text class="branch-card__note">{{ $t(BRANCH_NOTE) }}</text>
              </view>
            </view>
            <view class="reply-row" role="switch" :aria-checked="reply_enabled" :aria-label="$t('Let people reply')" @click="toggle_reply">
              <view class="reply-row__icon" aria-hidden="true">
                <image src="/static/icon/publish_comment.png" mode="aspectFit" />
              </view>
              <view class="reply-row__copy">
                <text class="reply-row__title">{{ $t('Let people reply') }}</text>
                <text class="reply-row__hint">{{ $t(reply_enabled ? 'Replies open' : 'Replies closed') }}</text>
              </view>
              <view class="reply-switch" :class="{ 'reply-switch--on': reply_enabled }">
                <view class="reply-switch__thumb" />
              </view>
            </view>
            <text class="wish-sheet__note">{{ $t(WISH_COST_NOTE) }}</text>
          </template>
        </scroll-view>
        <text v-if="form_error" class="wish-sheet__error" role="alert">{{ $t(form_error) }}</text>
        <view
          class="publish-button"
          role="button"
          :aria-disabled="is_publishing || is_loading"
          :aria-busy="is_publishing"
          @click="publish_wish"
        >
          <text>{{ $t(is_publishing ? 'Publishing wish...' : 'Publish') }}</text>
          <image src="/static/icon/wish_tree_lantern_inner.png" mode="aspectFit" />
        </view>
      </view>
      <InsufficientBalanceConfirmDialog
        :visible="is_balance_visible"
        :coin-cost="selected_cost"
        :copy="$t(balance_copy)"
        @cancel="is_balance_visible = false"
        @buy="buy_coins"
      />
    </view>
  </transition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import { remember_ritual } from '@/utils/ritualHandoff'
import { selectUserBalance } from '@/api/common'
import { uploadImageFile } from '@/api/media'
import { addLmWish, selectLmWishBranchConfigPage } from '@/api/wish'
import InsufficientBalanceConfirmDialog from '@/components/InsufficientBalanceConfirmDialog.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import { choose_local_image, release_local_image_preview } from '@/utils/localImagePicker'
import { read_coin_balance } from '@/utils/myProfilePresentation'
import {
  BRANCH_NOTE,
  WISH_COST_NOTE,
  branch_label,
  branch_option_cost_label,
  branch_visibility_label,
  build_wish_params,
  can_afford_branch,
  default_branch_level,
  filter_wish_sheet_branch_options,
  map_branch_options,
  read_created_wish_id
} from '@/utils/wishSheetPresentation'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible', 'published', 'buy'])
const account_store = storeGlobal()
const wish_text = ref('')
const photo_url = ref('')
const photo_preview = ref('')
const reply_enabled = ref(true)
const branch_options = ref([])
const selected_level = ref('')
const coin_balance = ref(0)
const is_loading = ref(false)
const is_uploading = ref(false)
const is_publishing = ref(false)
const is_balance_visible = ref(false)
const load_error = ref('')
const form_error = ref('')
let branch_context = {}
let balance_context = {}
let publish_context = {}
let is_disposed = false
let upload_context = {}
let load_generation = 0

const placeholder_style = `color: ${theme.colors.text.secondary}`
const theme_style = {
  '--wish-sheet': theme.colors.voice_room.sheet_surface,
  '--wish-title': theme.colors.text.title,
  '--wish-muted': theme.colors.text.secondary,
  '--wish-line': theme.colors.surface.border,
  '--wish-fill': theme.colors.surface.card,
  '--wish-scrim': theme.colors.surface.scrim,
  '--wish-shadow': theme.colors.surface.shadow,
  '--wish-coin': theme.colors.status.coin,
  '--wish-accent': theme.colors.status.info,
  '--wish-danger': theme.colors.status.danger,
  '--wish-publish': theme.colors.button.primary,
  '--wish-publish-text': theme.colors.button.text,
  '--wish-selected': theme.colors.button_change.active.background,
  '--wish-selected-text': theme.colors.button_change.active.text
}
const display_name = computed(() => `${account_store.userInfo?.userName || ''}`.trim() || 'You')
const avatar_url = computed(() => `${account_store.userInfo?.userImgUrl || ''}`)
const balance_label = computed(() => `${coin_balance.value}`)
const selected_branch = computed(() => (
  branch_options.value.find((item) => item.branch_level === selected_level.value) || null
))
const selected_cost = computed(() => Number(selected_branch.value?.coin_cost) || 0)
const balance_copy = computed(() => `You need ${selected_cost.value} coins for this branch. The wish stays unsent.`)

const close = () => {
  if (is_publishing.value) return
  emit('update:visible', false)
}
const select_branch = (level) => {
  if (is_publishing.value) return
  selected_level.value = level
  form_error.value = ''
}
const toggle_reply = () => {
  if (is_publishing.value) return
  reply_enabled.value = !reply_enabled.value
}
const clear_photo = () => {
  if (is_publishing.value || is_uploading.value) return
  release_local_image_preview(photo_preview.value)
  photo_preview.value = ''
  photo_url.value = ''
}
const choose_photo = async () => {
  if (is_publishing.value || is_uploading.value) return
  form_error.value = ''
  try {
    const chosen = await choose_local_image()
    is_uploading.value = true
    const upload_result = await uploadImageFile({
      file: chosen.blob,
      request_context: upload_context
    })
    if (!upload_result?.success) {
      form_error.value = upload_result?.error || 'Unable to upload this photo.'
      return
    }
    release_local_image_preview(photo_preview.value)
    photo_preview.value = chosen.preview_url || ''
    photo_url.value = upload_result.data?.image_url || ''
  } catch (error) {
    if (/cancelled/i.test(error?.message || '')) return
    if (error?.message) form_error.value = error.message
  } finally {
    is_uploading.value = false
  }
}
const load_sheet = async () => {
  const generation = ++load_generation
  is_loading.value = true
  load_error.value = ''
  branch_context.cancel?.()
  balance_context.cancel?.()
  branch_context = {}
  balance_context = {}
  const [branch_result, balance_result] = await Promise.all([
    selectLmWishBranchConfigPage({ current: 1, size: 20, isActive: 1 }, branch_context),
    selectUserBalance({}, balance_context)
  ])
  if (generation !== load_generation) return
  is_loading.value = false
  if (!branch_result?.success) {
    load_error.value = branch_result?.error || 'Unable to load branch heights.'
    return
  }
  branch_options.value = filter_wish_sheet_branch_options(map_branch_options(branch_result.data))
  selected_level.value = default_branch_level(branch_options.value)
  if (!branch_options.value.length) {
    load_error.value = 'Branch heights are not available yet.'
    return
  }
  if (!balance_result?.success) {
    load_error.value = balance_result?.error || 'Unable to check your coins.'
    return
  }
  coin_balance.value = read_coin_balance(balance_result.data)
}
const publish_wish = async () => {
  if (is_publishing.value || is_loading.value || is_uploading.value) return
  form_error.value = ''
  if (!account_store.userId) {
    form_error.value = 'Please sign in before making a wish.'
    return
  }
  if (!wish_text.value.trim()) {
    form_error.value = 'Write a wish before publishing.'
    return
  }
  if (!selected_branch.value) {
    form_error.value = 'Choose a branch height.'
    return
  }
  if (is_uploading.value) {
    form_error.value = 'Wait for the photo upload to finish.'
    return
  }
  if (!can_afford_branch(coin_balance.value, selected_cost.value)) {
    is_balance_visible.value = true
    return
  }
  is_publishing.value = true
  publish_context.cancel?.()
  publish_context = {}
  const context = publish_context
  const user_id = `${account_store.userId}`
  const branch_level = selected_level.value
  let result
  try {
    result = await addLmWish(build_wish_params({
      owner_user_id: account_store.userId,
      content: wish_text.value,
      branch: selected_branch.value,
      reply_enabled: reply_enabled.value,
      published_at: new Date(),
      img_url: photo_url.value
    }), context)
  } catch (error) {
    result = { success: false, error: error?.message || 'Unable to publish this wish.' }
  } finally {
    if (!is_disposed && context === publish_context) is_publishing.value = false
  }
  if (is_disposed || !props.visible || context !== publish_context || user_id !== `${account_store.userId}`) return
  if (!result?.success) {
    form_error.value = result?.error || 'Unable to publish this wish.'
    return
  }
  const wish_id = read_created_wish_id(result.data)
  if (!wish_id) {
    form_error.value = 'The wish was published, but it cannot be opened.'
    return
  }
  remember_ritual('wish', user_id, wish_id, branch_level)
  emit('update:visible', false)
  emit('published', wish_id)
}
const buy_coins = () => {
  is_balance_visible.value = false
  emit('buy')
}
const reset_form = () => {
  wish_text.value = ''
  reply_enabled.value = true
  form_error.value = ''
  load_error.value = ''
  is_balance_visible.value = false
  clear_photo()
}

watch(() => props.visible, (visible) => {
  if (!visible) return
  reset_form()
  load_sheet()
})
onBeforeUnmount(() => {
  is_disposed = true
  load_generation += 1
  branch_context.cancel?.()
  balance_context.cancel?.()
  publish_context.cancel?.()
  upload_context.cancel?.()
  release_local_image_preview(photo_preview.value)
})
</script>

<style scoped lang="scss">
.wish-sheet {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: flex;
  align-items: flex-end;
  color: var(--wish-title);
}

.wish-sheet__scrim {
  position: absolute;
  inset: 0;
  background: var(--wish-scrim);
}

.wish-sheet__panel {
  position: relative;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 90vh;
  max-height: 90vh;
  flex-direction: column;
  padding: 16rpx 28rpx calc(24rpx + var(--page-safe-bottom));
  border-radius: 48rpx 48rpx 0 0;
  background: var(--wish-sheet);
  box-shadow: 0 -18rpx 60rpx var(--wish-shadow);
}

.wish-sheet__handle {
  width: 72rpx;
  height: 8rpx;
  margin: 0 auto 24rpx;
  border-radius: 999rpx;
  background: var(--wish-line);
}

.wish-sheet__user {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.wish-sheet__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 44rpx;
}

.wish-sheet__identity {
  flex: 1;
  min-width: 0;
}

.wish-sheet__name,
.wish-sheet__anonymous {
  display: block;
}

.wish-sheet__name {
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.2;
}

.wish-sheet__anonymous {
  margin-top: 4rpx;
  color: var(--wish-muted);
  font-size: 22rpx;
}

.wish-sheet__close {
  display: flex;
  width: 72rpx;
  height: 72rpx;
  flex: 0 0 72rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--wish-fill);
  color: var(--wish-title);
}

.wish-sheet__close-icon {
  width: 28rpx;
  height: 28rpx;
}

.wish-sheet__body {
  min-height: 0;
  flex: 1;
  margin-top: 20rpx;
}

.wish-field,
.photo-row,
.reply-row {
  box-sizing: border-box;
  border: 1px solid var(--wish-line);
  border-radius: 28rpx;
  background: var(--wish-fill);
}

.wish-field {
  position: relative;
  padding: 38rpx 32rpx;
  height: 236rpx;

}

.wish-field__input {
  width: 100%;
  height: 140rpx;
  color: var(--wish-title);
  font-size: 28rpx;
  line-height: 1.4;
}

.wish-field__flower {
  position: absolute;
  right: 16rpx;
  bottom: 12rpx;
  width: 128rpx;
  height: 88rpx;
  opacity: 0.34;
}

.photo-row,
.reply-row {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
  padding: 18rpx 20rpx;
  gap: 16rpx;
}

.photo-row {
  border-style: dashed;
  height: 116rpx;
  background: rgba(20,14,44,0.7);
  border-radius: 40rpx 40rpx 40rpx 40rpx;
  border: 2rpx dashed  rgba(198,178,255,0.34);
}

.photo-row__icon,
.reply-row__icon {
  display: flex;
width: 68rpx;
height: 68rpx;
  flex: 0 0 68rpx;
  align-items: center;
  justify-content: center;
  // border-radius: 20rpx;
  // background: var(--wish-sheet);
}

.photo-row__icon image,
.reply-row__icon image,

.photo-row__remove image {
width: 68rpx;
height: 68rpx;
}

.photo-row__add{
  width: 32rpx;
  height: 32rpx;
}

.photo-row__preview {
  width: 72rpx;
  height: 72rpx;
  flex: 0 0 72rpx;
  border-radius: 16rpx;
}

.photo-row__copy,
.reply-row__copy {
  flex: 1;
  min-width: 0;
}

.photo-row__title,
.photo-row__hint,
.reply-row__title,
.reply-row__hint {
  display: block;
}

.photo-row__title,
.reply-row__title {
  font-size: 28rpx;
  font-weight: 700;
}

.photo-row__hint,
.reply-row__hint {
  margin-top: 4rpx;
  color: var(--wish-muted);
  font-size: 22rpx;
}

.branch-card {
  display: flex;
  margin-top: 16rpx;
  overflow: hidden;
  border: 1px solid var(--wish-line);
  border-radius: 28rpx;
  background: var(--wish-fill);
  height: 476rpx;
  background: rgba(30,24,62,0.6);
  border-radius: 40rpx 40rpx 40rpx 40rpx;
  border: 2rpx solid rgba(198,178,255,0.22);
  padding: 30rpx;
}

.branch-card__art {
  width: 212rpx;
  // height: 400rpx;
  background: linear-gradient( 180deg, rgba(21,15,44,0.18) 0%, rgba(21,15,44,0.44) 58%, rgba(15,10,32,0.8) 100%);
  border-radius: 40rpx;
  margin-right: 24rpx;
}

.branch-card__body {
  flex: 1;
  min-width: 0;
  padding: 16rpx;
}

.branch-card__head,
.branch-option,
.branch-option__cost,
.branch-card__balance {
  display: flex;
  align-items: center;
}

.branch-card__head {
  justify-content: space-between;
  font-size: 26rpx;
  font-weight: 700;
}

.branch-card__balance {
  color: var(--wish-coin);
  font-size: 24rpx;
  gap: 6rpx;
}

.branch-card__balance image,
.branch-option__cost image {
  width: 24rpx;
  height: 24rpx;
}

.branch-option {
  margin-top: 12rpx;
  padding: 0 16rpx;
  border: 1px solid var(--wish-line);
  border-radius: 18rpx;
  gap: 10rpx;
  width: 334rpx;
  height: 72rpx;
  background: #1C1540;
  border-radius: 22rpx 22rpx 22rpx 22rpx;
  border: 2rpx solid rgba(198,178,255,0.16);
  color: #A9B2D4;

}

.branch-option--selected {
  background: rgba(196,169,242,0.18);
  border-radius: 22rpx 22rpx 22rpx 22rpx;
  border: 2rpx solid #8E9AC4;
  color: #FFFFFF;
}

.branch-option__mark {
  width: 22rpx;
  height: 4rpx;
  border-radius: 999rpx;
  background: currentColor;
}

.branch-option__name {
  font-size: 26rpx;
  font-weight: 700;
}

.branch-option__days {
  color: var(--wish-muted);
  font-size: 22rpx;
}

.branch-option--selected .branch-option__days {
  color: #8E9AC4;
}

.branch-option__cost {
  margin-left: auto;
  color: var(--wish-coin);
  font-size: 22rpx;
  font-weight: 700;
  gap: 6rpx;
}

.branch-option--selected .branch-option__cost {
  color: #8E9AC4;
}

.branch-card__note,
.wish-sheet__note {
  display: block;
  color: var(--wish-muted);
  font-size: 22rpx;
  line-height: 1.45;
}

.branch-card__note {
  margin-top: 14rpx;
  
}

.wish-sheet__note {
  margin: 16rpx 4rpx 8rpx;
}

.reply-switch {
  position: relative;
  width: 84rpx;
  height: 48rpx;
  flex: 0 0 84rpx;
  border-radius: 999rpx;
  background: var(--wish-line);
}

.reply-switch__thumb {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--wish-title);
}

.reply-switch--on {
  background: var(--wish-accent);
}

.reply-switch--on .reply-switch__thumb {
  left: 40rpx;
}

.wish-sheet__error,
.wish-sheet__alert {
  color: var(--wish-danger);
  font-size: 22rpx;
  line-height: 1.4;
}

.wish-sheet__error {
  display: block;
  margin-top: 12rpx;
}

.wish-sheet__alert {
  padding: 24rpx 8rpx;
}

.wish-sheet__alert view {
  margin-top: 16rpx;
  color: var(--wish-accent);
}

.wish-sheet__skeleton-line {
  height: 28rpx;
  margin-top: 20rpx;
  border-radius: 999rpx;
  background: var(--wish-fill);
}

.wish-sheet__skeleton-line--short {
  width: 60%;
}

.publish-button {
  display: flex;
  height: 116rpx;
  margin-top: 16rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--wish-publish);
  color: var(--wish-publish-text);
  font-size: 35rpx;
  font-weight: bold;
  line-height: 116rpx;
  position: relative;
}

.publish-button image {
  position: absolute;
  width: 148rpx;
  height: 104rpx;
  opacity: 0.42;
  right: 12rpx;
  top: 18rpx;
}

.wish-sheet-slide-enter-active,
.wish-sheet-slide-leave-active {
  transition: opacity .28s ease;
}

.wish-sheet-slide-enter-active .wish-sheet__panel,
.wish-sheet-slide-leave-active .wish-sheet__panel {
  transition: transform .32s cubic-bezier(.22, .8, .25, 1);
}

.wish-sheet-slide-enter-from,
.wish-sheet-slide-leave-to {
  opacity: 0;
}

.wish-sheet-slide-enter-from .wish-sheet__panel,
.wish-sheet-slide-leave-to .wish-sheet__panel {
  transform: translateY(100%);
}
</style>

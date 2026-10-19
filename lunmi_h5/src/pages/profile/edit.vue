<template>
  <PageTransition ref="page_transition" class="edit-page" :style="theme_style">
    <TopSafeArea />
    <view class="edit-header">
      <image class="edit-header__back" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
      <view class="edit-header__copy">
        <text class="edit-header__title">{{ $t('Edit profile') }}</text>
        <image class="edit-header__line" src="/static/icon/lantern_detail.title_line.png" mode="scaleToFill" />
      </view>
    </view>
    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
      <view class="content-scroll__inner">
        <ProfileEditSkeleton v-if="is_loading" />
        <view v-else-if="load_error" class="edit-state">
          <text class="edit-state__title">{{ $t('Profile unavailable') }}</text>
          <text class="edit-state__copy">{{ $t(load_error) }}</text>
          <view class="edit-state__retry" role="button" :aria-label="$t('Try again')" @click="load_profile">{{ $t('Try again') }}</view>
        </view>
        <template v-else>
          <view class="identity-card">
            <view
              class="avatar-editor"
              role="button"
              :aria-label="$t('Change profile photo')"
              :aria-disabled="is_busy"
              @click="choose_avatar"
            >
              <UserAvatar class="avatar-editor__photo" :source="avatar_source" />
              <view class="avatar-editor__camera" aria-hidden="true">
                <Camera class="avatar-editor__camera-icon" />
              </view>
            </view>
            <text class="identity-card__name">{{ display_name }}</text>
          </view>
          <input
            v-model="form.username"
            class="edit-field"
            maxlength="30"
            :placeholder="$t('Username')"
            :placeholder-style="placeholder_style"
            :disabled="is_busy"
            @input="vibrate_on_keyboard_input"
          />
          <input
            v-model="form.city"
            class="edit-field"
            maxlength="64"
            :placeholder="$t('City')"
            :placeholder-style="placeholder_style"
            :disabled="is_busy"
            @input="vibrate_on_keyboard_input"
          />
          <textarea
            v-model="form.bio"
            class="edit-field edit-field--bio"
            maxlength="160"
            :placeholder="$t('Bio')"
            :placeholder-style="placeholder_style"
            :disabled="is_busy"
            @input="vibrate_on_keyboard_input"
          />
          <text v-if="form_error" class="edit-error">{{ $t(form_error) }}</text>
          <view
            class="save-button"
            :class="{ 'save-button--disabled': is_busy }"
            role="button"
            :aria-disabled="is_busy"
            :aria-label="$t('Save')"
            @click="save_profile"
          >
            {{ $t('Save') }}
          </view>
        </template>
      </view>
    </scroll-view>
    <BottomSafeArea />
    <ProfileSavingLoading v-if="is_saving" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Camera } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import { selectUserInfo } from '@/api/common'
import { updateUser } from '@/api/auth'
import { uploadImageFile } from '@/api/media'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import ProfileEditSkeleton from '@/components/ProfileEditSkeleton.vue'
import ProfileSavingLoading from '@/components/ProfileSavingLoading.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import { vibrate_on_keyboard_input } from '@/utils/keyboardVibration'
import { choose_local_image, release_local_image_preview } from '@/utils/localImagePicker'
import {
  build_profile_update_params,
  map_edit_profile,
  validate_profile_username
} from '@/utils/editProfilePresentation'

const PROFILE_PAGE = '/pages/profile/index'
const account_store = storeGlobal()
const page_transition = ref(null)
const form = reactive({
  username: '',
  city: '',
  bio: '',
  email: '',
  avatar_url: ''
})
const avatar_preview_url = ref('')
const form_error = ref('')
const load_error = ref('')
const is_loading = ref(true)
const is_saving = ref(false)
const is_uploading = ref(false)
const is_page_active = ref(false)
const load_request_context = {}
const upload_request_context = {}
const save_request_context = {}
let load_token = 0

const is_busy = computed(() => is_saving.value || is_uploading.value)
const avatar_source = computed(() => avatar_preview_url.value || form.avatar_url || '/static/logo.png')
const display_name = computed(() => form.username.trim() || 'Username')
const placeholder_style = computed(() => `color: ${theme.colors.text.tertiary};`)
const theme_style = {
  '--edit-page-background': theme.colors.page.background,
  '--edit-title': theme.colors.text.title,
  '--edit-secondary': theme.colors.text.secondary,
  '--edit-tertiary': theme.colors.text.tertiary,
  '--edit-card': theme.colors.surface.card,
  '--edit-border': theme.colors.surface.border,
  '--edit-accent': theme.colors.button.primary,
  '--edit-accent-text': theme.colors.button.text,
  '--edit-danger': theme.colors.status.danger,
  '--edit-skeleton': theme.colors.surface.deep,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const read_source_page = () => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const source = `${current?.options?.sourcePage || current?.$page?.options?.sourcePage || ''}`.trim()
  return source.startsWith('/pages/') ? source : PROFILE_PAGE
}

const clear_avatar_preview = () => {
  release_local_image_preview(avatar_preview_url.value)
  avatar_preview_url.value = ''
}

const apply_profile = (profile) => {
  form.username = profile.username
  form.city = profile.city
  form.bio = profile.bio
  form.email = profile.email
  form.avatar_url = profile.avatar_url
}

const load_profile = async () => {
  const user_id = account_store.userId
  if (!user_id) {
    load_error.value = 'No active user session.'
    is_loading.value = false
    return
  }
  const token = ++load_token
  is_loading.value = true
  load_error.value = ''
  try {
    const result = await selectUserInfo({ userId: user_id }, load_request_context)
    if (!is_page_active.value || token !== load_token) return
    if (!result.success) {
      load_error.value = result.error || 'Unable to load your profile.'
      return
    }
    apply_profile(map_edit_profile(result.data || {}))
  } catch (error) {
    if (is_page_active.value && token === load_token) {
      load_error.value = error?.message || 'Unable to load your profile.'
    }
  } finally {
    if (is_page_active.value && token === load_token) is_loading.value = false
  }
}

const go_back = () => {
  if (is_saving.value) return
  if (page_transition.value?.navigate_back()) return
  uni.reLaunch({ url: read_source_page() })
}

const choose_avatar = async () => {
  if (is_busy.value || is_loading.value || load_error.value) return
  form_error.value = ''
  try {
    const selected_image = await choose_local_image()
    clear_avatar_preview()
    avatar_preview_url.value = selected_image.preview_url
    is_uploading.value = true
    const result = await uploadImageFile({
      file: selected_image.blob,
      request_context: upload_request_context
    })
    if (!is_page_active.value) return
    if (!result.success) {
      clear_avatar_preview()
      form_error.value = result.error || 'Unable to upload this image.'
      return
    }
    const image_url = `${result.data?.image_url || ''}`.trim()
    if (!image_url) {
      clear_avatar_preview()
      form_error.value = 'Unable to upload this image.'
      return
    }
    clear_avatar_preview()
    form.avatar_url = image_url
  } catch (error) {
    if (!is_page_active.value) return
    if (/cancel/i.test(error?.message || '')) return
    clear_avatar_preview()
    form_error.value = error?.message || 'Unable to use this image.'
  } finally {
    if (is_page_active.value) is_uploading.value = false
  }
}

// feedback_mode: page_action_loading — ProfileSavingLoading follows the profile update.
const save_profile = async () => {
  if (is_busy.value || is_loading.value || load_error.value) return
  form_error.value = ''
  const username_error = validate_profile_username(form.username)
  if (username_error) {
    form_error.value = username_error
    return
  }
  if (!account_store.userId) {
    form_error.value = 'No active user session.'
    return
  }
  is_saving.value = true
  try {
    const params = build_profile_update_params(form)
    const result = await updateUser(params, save_request_context)
    if (!is_page_active.value) return
    if (result.data?.cancelled) return
    if (!result.success) {
      form_error.value = result.error || 'Unable to save your profile.'
      return
    }
    account_store.updateUserInfo(result.data || params)
    if (page_transition.value?.navigate_back()) return
    uni.reLaunch({ url: PROFILE_PAGE })
  } finally {
    if (is_page_active.value) is_saving.value = false
  }
}

onMounted(() => {
  is_page_active.value = true
  load_profile()
})

onBeforeUnmount(() => {
  is_page_active.value = false
  load_token += 1
  load_request_context.cancel?.()
  upload_request_context.cancel?.()
  save_request_context.cancel?.()
  clear_avatar_preview()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.edit-page {
  background: var(--edit-page-background);
  color: var(--edit-title);
}

.edit-header {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  align-items: center;
  padding: 12rpx 32rpx 8rpx;
  flex: none;
}

.edit-header__back {
  @include page_back.button;
}

.edit-header__copy {
  min-width: 0;
  margin-left: 16rpx;
}

.edit-header__title {
  display: block;
  color: var(--edit-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 48rpx;
}

.edit-header__line {
  display: block;
  width: 72rpx;
  height: 8rpx;
  margin-top: 8rpx;
}

.content-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.content-scroll__inner {
  box-sizing: border-box;
  padding: 28rpx 32rpx 48rpx;
}

.identity-card,
.edit-field {
  box-sizing: border-box;
  width: 100%;
  border: 2rpx solid var(--edit-border);
  border-radius: 28rpx;
  background: var(--edit-card);
}

.identity-card {
  display: flex;
  align-items: center;
  min-height: 160rpx;
  padding: 24rpx;
}

.avatar-editor {
  position: relative;
  width: 112rpx;
  height: 112rpx;
  flex: none;
}

.avatar-editor__photo {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  overflow: hidden;
}

.avatar-editor__camera {
  position: absolute;
  right: -4rpx;
  bottom: -4rpx;
  display: flex;
  width: 44rpx;
  height: 44rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--edit-accent);
}

.avatar-editor__camera-icon {
  width: 24rpx;
  height: 24rpx;
  color: var(--edit-accent-text);
}

.identity-card__name {
  min-width: 0;
  margin-left: 24rpx;
  overflow: hidden;
  color: var(--edit-title);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 40rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-field {
  display: block;
  height: 96rpx;
  margin-top: 24rpx;
  padding: 0 28rpx;
  color: var(--edit-title);
  font-size: 28rpx;
  line-height: 96rpx;
}

.edit-field--bio {
  height: 220rpx;
  padding-top: 24rpx;
  line-height: 40rpx;
}

.edit-error,
.edit-state__copy {
  display: block;
  margin-top: 16rpx;
  color: var(--edit-danger);
  font-size: 24rpx;
  line-height: 34rpx;
}

.save-button {
  display: flex;
  height: 96rpx;
  margin-top: 48rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--edit-accent);
  color: var(--edit-accent-text);
  font-size: 32rpx;
  font-weight: 700;
}

.save-button--disabled {
  opacity: 0.6;
}

.edit-state {
  padding: 80rpx 12rpx;
  text-align: center;
}

.edit-state__title {
  display: block;
  color: var(--edit-title);
  font-size: 32rpx;
  font-weight: 700;
}

.edit-state__copy {
  color: var(--edit-secondary);
}

.edit-state__retry {
  display: inline-flex;
  height: 72rpx;
  margin-top: 28rpx;
  padding: 0 32rpx;
  align-items: center;
  border-radius: 999rpx;
  background: var(--edit-accent);
  color: var(--edit-accent-text);
  font-size: 28rpx;
  font-weight: 700;
}
</style>

<template>
  <PageTransition ref="page_transition" class="setup-page" :style="theme_style">
    <TopSafeArea />
    <view class="setup-header">
      <image class="setup-header__back" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
      <text class="setup-header__step">3/3</text>
    </view>
    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
      <view class="content-scroll__inner">
        <text class="setup-title">{{ $t('Add your photo') }}</text>
        <view
          class="avatar-editor"
          :class="{ 'avatar-editor--empty': !avatar_has_loaded }"
          role="button"
          :aria-label="$t('Choose profile photo')"
          :aria-disabled="is_busy"
          @click="choose_avatar"
        >
          <image
            v-if="avatar_source"
            :key="avatar_source"
            class="avatar-editor__photo"
            :class="{ 'avatar-editor__photo--loaded': avatar_has_loaded }"
            :src="avatar_source"
            mode="aspectFill"
            @load="avatar_has_loaded = true"
            @error="avatar_has_loaded = false"
          />
          <view
            v-if="!avatar_has_loaded"
            class="avatar-editor__placeholder"
            aria-hidden="true"
          />
          <view class="avatar-editor__camera">
            <image class="avatar-editor__camera-icon" src="/static/icon/profile_setup_camera.png" mode="aspectFit" />
          </view>
        </view>
        <view class="setup-field" :class="{ 'setup-field--invalid': username_error }">
          <image class="setup-field__icon" src="/static/icon/signup_user_design.png" mode="aspectFit" />
          <input
            v-model="username"
            class="setup-input"
            maxlength="30"
            :placeholder="$t('Username')"
            placeholder-class="setup-placeholder"
            @input="username_error = ''"
          />
        </view>
        <text v-if="username_error" class="setup-error">{{ $t(username_error) }}</text>
        <view class="setup-field">
          <image class="setup-field__icon" src="/static/icon/profile_setup_city.png" mode="aspectFit" />
          <input
            v-model="city"
            class="setup-input"
            maxlength="80"
            :placeholder="$t('City')"
            placeholder-class="setup-placeholder"
          />
        </view>
        <view class="setup-bio">
          <textarea
            v-model="bio"
            class="setup-bio__input"
            maxlength="160"
            :placeholder="$t('Bio')"
            placeholder-class="setup-placeholder"
          />
        </view>
        <text v-if="form_error" class="setup-error">{{ $t(form_error) }}</text>
      </view>
    </scroll-view>
    <!-- SetupActionBar 接管底部安全区，因此不渲染 BottomSafeArea。 -->
    <SetupActionBar :disabled="is_busy" @skip="skip_setup" @save="save_profile" />
    <ProfileSavingLoading v-if="is_saving" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBackPress } from '@dcloudio/uni-app'
import { updateUser } from '@/api/auth'
import { uploadImageFile } from '@/api/media'
import theme from '@/config/theme.json'
import { DEFAULT_AVATAR_URL } from '@/config/user'
import PageTransition from '@/components/PageTransition.vue'
import ProfileSavingLoading from '@/components/ProfileSavingLoading.vue'
import SetupActionBar from '@/components/SetupActionBar.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { storeGlobal } from '@/stores/store'
import { choose_local_image, release_local_image_preview } from '@/utils/localImagePicker'

const HOME_PAGE_PATH = '/pages/home/index'
const LOGIN_PAGE_PATH = '/pages/login/index'

const page_transition = ref(null)
const account_store = storeGlobal()
const username = ref('')
const city = ref('')
const bio = ref('')
const avatar_url = ref('')
const avatar_preview_url = ref('')
const avatar_has_loaded = ref(false)
const username_error = ref('')
const form_error = ref('')
const is_uploading = ref(false)
const is_saving = ref(false)
const is_page_active = ref(true)
const upload_request_context = {}
const save_request_context = {}
let allow_route_back = false

const theme_style = {
  '--setup-page-background': theme.colors.page.background,
  '--setup-title-color': theme.colors.text.title,
  '--setup-field-background': theme.colors.surface.card,
  '--setup-field-border': theme.colors.surface.border,
  '--setup-field-text': theme.colors.text.title,
  '--setup-placeholder-color': theme.colors.text.secondary,
  '--setup-error-color': theme.colors.status.danger,
  '--setup-step-color': theme.colors.status.info,
  '--setup-step-background': theme.colors.surface.card_strong,
  '--setup-avatar-background': theme.colors.surface.card,
  '--setup-avatar-outline': theme.colors.surface.outline,
  '--setup-avatar-glow': 'rgba(161, 129, 255, 0.16)',
  '--setup-avatar-person': '#405e7c',
  '--setup-camera-background': theme.colors.button.primary,
  '--setup-button-background': theme.colors.button.primary,
  '--setup-button-text': theme.colors.button.text,
  '--setup-ghost-background': theme.colors.button.ghost.background,
  '--setup-ghost-border': theme.colors.button.ghost.border,
  '--setup-ghost-text': theme.colors.button.ghost.text
}

const is_busy = computed(() => is_uploading.value || is_saving.value)
const avatar_source = computed(() => `${avatar_preview_url.value || avatar_url.value}`.trim() || DEFAULT_AVATAR_URL)

watch(avatar_source, () => {
  avatar_has_loaded.value = false
}, { flush: 'sync' })

const load_profile = () => {
  const current_user = account_store.userInfo || {}
  username.value = `${current_user.userName || ''}`
  bio.value = `${current_user.userBrief || ''}`
  avatar_url.value = `${current_user.userImgUrl || ''}`
}

const go_back = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
      }
    })
    if (!started) allow_route_back = false
    return
  }
  page_transition.value?.navigate_relaunch({ url: LOGIN_PAGE_PATH })
}

const open_home = () => {
  page_transition.value?.navigate_relaunch({ url: HOME_PAGE_PATH })
}

// feedback_mode: navigation — skip does not write the profile.
const skip_setup = () => {
  if (is_busy.value) return
  open_home()
}

const choose_avatar = async () => {
  if (is_busy.value) return
  form_error.value = ''
  try {
    const selected_image = await choose_local_image()
    if (!is_page_active.value) return
    release_local_image_preview(avatar_preview_url.value)
    avatar_preview_url.value = selected_image.preview_url
    is_uploading.value = true
    const result = await uploadImageFile({
      file: selected_image.blob,
      request_context: upload_request_context
    })
    if (!is_page_active.value || !result?.success) return
    const image_url = `${result.data?.image_url || ''}`.trim()
    if (!image_url) return
    avatar_url.value = image_url
  } catch (error) {
    if (!is_page_active.value) return
    if (/cancel/i.test(error?.message || '')) return
    form_error.value = error?.message || 'Unable to use this image.'
  } finally {
    if (is_page_active.value) is_uploading.value = false
  }
}

// feedback_mode: page_action_loading — ProfileSavingLoading follows the profile request.
const save_profile = async () => {
  if (is_busy.value) return
  username_error.value = ''
  form_error.value = ''
  if (username.value.trim().length < 2) {
    username_error.value = 'Username must contain at least 2 characters.'
    return
  }
  if (!account_store.userId) {
    form_error.value = 'No active user session.'
    return
  }
  is_saving.value = true
  try {
    const current_user = account_store.userInfo || {}
    const params = {
      userName: username.value.trim(),
      userEmail: `${current_user.userEmail || ''}`.trim().toLowerCase(),
      userBrief: bio.value.trim(),
      userImgUrl: avatar_url.value.trim()
    }
    const result = await updateUser(params, save_request_context)
    if (!is_page_active.value || !result?.success) return
    account_store.updateUserInfo(result.data || params)
    open_home()
  } finally {
    if (is_page_active.value) is_saving.value = false
  }
}

onMounted(load_profile)

onBackPress(() => {
  if (allow_route_back) return false
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  upload_request_context.cancel?.()
  save_request_context.cancel?.()
  release_local_image_preview(avatar_preview_url.value)
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.setup-page {
  background: var(--setup-page-background);
  color: var(--setup-title-color);
}

.setup-header {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 32rpx 0;
  flex: none;
}

.setup-header__back {
  @include page_back.button;
}

.setup-header__step {
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: var(--setup-step-background);
  color: var(--setup-step-color);
  font-size: 26rpx;
  font-weight: 800;
  line-height: 36rpx;
}

.content-scroll {
  box-sizing: border-box;
  width: 100%;
  height: 0;
  min-height: 0;
  flex: 1;
}

.content-scroll__inner {
  display: flex;
  box-sizing: border-box;
  min-height: calc(100% + 2rpx);
  flex-direction: column;
  padding: 28rpx 40rpx 32rpx;
}

.setup-title {
  color: var(--setup-title-color);
  font-size: 56rpx;
  font-weight: 800;
  line-height: 68rpx;
}

.avatar-editor {
  position: relative;
  display: flex;
  box-sizing: border-box;
  width: 340rpx;
  height: 340rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 48rpx auto 12rpx;
  border-radius: 50%;
  background: var(--setup-avatar-background);
}

.avatar-editor--empty {
  border: 1px solid var(--setup-avatar-outline);
  box-shadow: 0 0 36rpx var(--setup-avatar-glow), inset 0 0 4rpx var(--setup-avatar-glow);
}

.avatar-editor__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  opacity: 0;
}

.avatar-editor__photo--loaded {
  opacity: 1;
}

.avatar-editor__placeholder {
  width: 96rpx;
  height: 96rpx;
  flex: none;
  background: var(--setup-avatar-person);
  -webkit-mask: url('/static/icon/profile_setup_person.svg') center / contain no-repeat;
  mask: url('/static/icon/profile_setup_person.svg') center / contain no-repeat;
}

.avatar-editor__camera {
  position: absolute;
  z-index: 1;
  right: 20rpx;
  bottom: 20rpx;
  display: flex;
  width: 80rpx;
  height: 80rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--setup-camera-background);
}

.avatar-editor__camera-icon {
  width: 36rpx;
  height: 36rpx;
}

.setup-field,
.setup-bio {
  display: flex;
  box-sizing: border-box;
  align-items: center;
  margin-top: 24rpx;
  padding: 0 32rpx;
  border: 1px solid var(--setup-field-border);
  border-radius: 32rpx;
  background: var(--setup-field-background);
}

.setup-field {
  height: 104rpx;
  border-radius: 999rpx;
}

.setup-field--invalid {
  border-color: var(--setup-error-color);
}

.setup-field__icon {
  width: 40rpx;
  height: 40rpx;
  flex: none;
}

.setup-input {
  width: 0;
  height: 104rpx;
  min-width: 0;
  margin-left: 20rpx;
  color: var(--setup-field-text);
  font-size: 30rpx;
  flex: 1;
}

.setup-bio {
  height: 180rpx;
  align-items: flex-start;
  padding-top: 24rpx;
  padding-bottom: 24rpx;
}

.setup-bio__input {
  width: 100%;
  height: 132rpx;
  color: var(--setup-field-text);
  font-size: 30rpx;
}

:deep(.setup-placeholder) {
  color: var(--setup-placeholder-color);
}

.setup-error {
  display: block;
  margin-top: 8rpx;
  padding: 0 24rpx;
  color: var(--setup-error-color);
  font-size: 24rpx;
  font-weight: 600;
  line-height: 34rpx;
}
</style>

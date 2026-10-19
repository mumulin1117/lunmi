<template>
  <PageTransition ref="page_transition" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="page-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="page_transition?.navigate_back()" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <text class="page-title">{{ $t('Start a live room') }}</text>
        <view class="header-spacer" />
      </view>
      <scroll-view class="form-scroll" scroll-y :show-scrollbar="false">
        <view class="form-card">
          <text class="section-label">{{ $t('Room details') }}</text>
          <text class="field-label">{{ $t('Room type') }}</text>
          <view class="privacy-options">
            <view
              v-for="option in room_type_options"
              :key="option.value"
              class="privacy-option"
              :class="{ 'privacy-option--selected': form.liveClassify === option.value }"
              role="button"
              @click="form.liveClassify = option.value"
            >
              <view class="privacy-radio">
                <view v-if="form.liveClassify === option.value" class="privacy-radio__dot" />
              </view>
              <view class="privacy-copy">
                <text class="privacy-title">{{ $t(option.title) }}</text>
                <text class="privacy-caption">{{ option.caption }}</text>
              </view>
            </view>
          </view>
          <text class="field-label">{{ $t('Title') }}</text>
          <input v-model="form.liveTitle" class="text-input" maxlength="60" :placeholder="$t('Give your room a title')" />
          <text class="field-label">{{ $t('Announcement') }}</text>
          <textarea v-model="form.liveLocation" class="textarea-input" maxlength="120" :placeholder="$t('Tell people what you are talking about')" />
          <text class="section-label section-label--spaced">{{ $t('Who can join?') }}</text>
          <view class="privacy-options">
            <view
              v-for="option in privacy_options"
              :key="option.value"
              class="privacy-option"
              :class="{ 'privacy-option--selected': form.livePrivateType === option.value }"
              role="button"
              @click="form.livePrivateType = option.value"
            >
              <view class="privacy-radio">
                <view v-if="form.livePrivateType === option.value" class="privacy-radio__dot" />
              </view>
              <view class="privacy-copy">
                <text class="privacy-title">{{ $t(option.title) }}</text>
                <text class="privacy-caption">{{ option.caption }}</text>
              </view>
            </view>
          </view>
          <view v-if="form.livePrivateType === 2" class="password-row">
            <text class="field-label">{{ $t('Room password') }}</text>
            <input v-model="form.livePassword" class="text-input" type="number" maxlength="8" :placeholder="$t('Enter a password')" />
          </view>
          <text v-if="form_error" class="form-error" role="alert">{{ $t(form_error) }}</text>
        </view>
      </scroll-view>
      <view class="action-bar">
        <view
          class="start-button"
          :class="{ 'start-button--disabled': !can_submit || is_submitting }"
          role="button"
          :aria-disabled="!can_submit || is_submitting"
          @click="create_room"
        >
          <text>{{ $t(is_submitting ? 'Opening room…' : 'Open room') }}</text>
        </view>
      </view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { computed, ref } from 'vue'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { addLive } from '@/api/live'
import { storeGlobal } from '@/stores/store'
import { LIVE_CLASSIFY_VIDEO, LIVE_CLASSIFY_VOICE, live_room_page_url } from '@/utils/liveRoomRoute'

const page_transition = ref(null)
const account_store = storeGlobal()
const is_submitting = ref(false)
const form_error = ref('')
const form = ref({
  liveTitle: '',
  liveLocation: '',
  livePrivateType: 1,
  livePassword: '',
  liveClassify: LIVE_CLASSIFY_VOICE
})
const room_type_options = Object.freeze([
  { value: LIVE_CLASSIFY_VOICE, title: 'Voice room', caption: 'Talk with guests on mic seats' },
  { value: LIVE_CLASSIFY_VIDEO, title: 'Video live', caption: 'Broadcast your camera to the room' }
])
const privacy_options = Object.freeze([
  { value: 1, title: 'Everyone', caption: 'Anyone can discover and join' },
  { value: 2, title: 'Private', caption: 'Only people with the room password' },
  { value: 3, title: 'Followers only', caption: 'Only people who follow you can join' }
])
const can_submit = computed(() => Boolean(
  form.value.liveTitle.trim()
  && (form.value.livePrivateType !== 2 || form.value.livePassword.trim())
  && account_store.hasToken
))
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--surface-color': theme.colors.surface.card,
  '--surface-strong': theme.colors.surface.card_strong,
  '--surface-border': theme.colors.surface.border,
  '--title-color': theme.colors.text.title,
  '--secondary-color': theme.colors.text.secondary,
  '--tertiary-color': theme.colors.text.tertiary,
  '--accent-color': theme.colors.button.primary,
  '--accent-text-color': theme.colors.button.text,
  '--danger-color': theme.colors.status.danger
}

const create_room = async () => {
  if (!can_submit.value || is_submitting.value) return
  is_submitting.value = true
  form_error.value = ''
  const result = await addLive({
    liveTitle: form.value.liveTitle.trim(),
    liveLocation: form.value.liveLocation.trim(),
    livePrivateType: form.value.livePrivateType,
    livePassword: form.value.livePrivateType === 2 ? form.value.livePassword.trim() : '',
    liveClassify: form.value.liveClassify,
    liveTime: new Date().toISOString(),
    liveUserNum: 0,
    userName: account_store.userInfo?.userName || '',
    userImgUrl: account_store.userInfo?.userImgUrl || ''
  })
  is_submitting.value = false
  if (!result?.success || !result.data) {
    form_error.value = result?.error || 'Unable to open the room.'
    return
  }
  page_transition.value?.navigate_forward({
    url: live_room_page_url({
      live_id: result.data,
      live_classify: form.value.liveClassify
    })
  })
}
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.page-content { display: flex; min-height: 0; flex: 1; overflow: hidden; flex-direction: column; background: var(--page-background); color: var(--title-color); }
.page-header { display: flex; height: 112rpx; align-items: center; justify-content: space-between; padding: 0 32rpx; flex: none; }

.back-button {
  @include page_back.button;
}
.header-spacer { width: 80rpx; }
.page-title { font-size: 34rpx; font-weight: 800; }
.form-scroll { min-height: 0; flex: 1; }
.form-card { padding: 20rpx 36rpx 48rpx; }
.section-label { display: block; margin-bottom: 24rpx; color: var(--title-color); font-size: 28rpx; font-weight: 800; }
.section-label--spaced { margin-top: 44rpx; }
.field-label { display: block; margin: 18rpx 0 12rpx; color: var(--secondary-color); font-size: 23rpx; font-weight: 700; }
.text-input, .textarea-input { width: 100%; border: 1px solid var(--surface-border); border-radius: 22rpx; background: var(--surface-color); color: var(--title-color); box-sizing: border-box; font-size: 27rpx; }
.text-input { height: 84rpx; padding: 0 24rpx; }
.textarea-input { min-height: 168rpx; padding: 20rpx 24rpx; line-height: 38rpx; }
.privacy-options { display: flex; flex-direction: column; gap: 14rpx; }
.privacy-option { display: flex; align-items: center; padding: 20rpx; border: 1px solid var(--surface-border); border-radius: 22rpx; background: var(--surface-color); }
.privacy-option--selected { border-color: var(--accent-color); background: color-mix(in srgb, var(--accent-color) 10%, var(--surface-color)); }
.privacy-radio { display: flex; width: 34rpx; height: 34rpx; align-items: center; justify-content: center; border: 2px solid var(--secondary-color); border-radius: 50%; flex: none; }
.privacy-option--selected .privacy-radio { border-color: var(--accent-color); }
.privacy-radio__dot { width: 18rpx; height: 18rpx; border-radius: 50%; background: var(--accent-color); }
.privacy-copy { display: flex; margin-left: 18rpx; flex-direction: column; }
.privacy-title { font-size: 27rpx; font-weight: 700; }
.privacy-caption { margin-top: 4rpx; color: var(--secondary-color); font-size: 21rpx; }
.form-error { display: block; margin-top: 22rpx; color: var(--danger-color); font-size: 23rpx; }
.action-bar { padding: 18rpx 36rpx 24rpx; flex: none; }
.start-button { display: flex; height: 92rpx; align-items: center; justify-content: center; border-radius: 999rpx; background: var(--accent-color); color: var(--accent-text-color); font-size: 29rpx; font-weight: 800; }
.start-button--disabled { opacity: .45; }
</style>

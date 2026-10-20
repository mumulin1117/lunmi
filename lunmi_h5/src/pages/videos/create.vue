<template>
  <PageTransition ref="page_transition" :style="theme_style">
    <TopSafeArea />
    <view class="page-content clip-page">
      <view class="clip-header">
        <image class="back-entry" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <text class="clip-title">{{ $t('Post Clip') }}</text>
        <view class="header-spacer" aria-hidden="true" />
      </view>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="clip-content content-scroll__inner">
          <view
            class="video-picker"
            :class="{ 'video-picker--selected': Boolean(video_preview_url) }"
          >
            <template v-if="video_preview_url">
              <PostMedia
                class="video-preview"
                :media-url="video_preview_url"
                content-type="video"
                :poster="video_cover_url"
                media-id="videos-create-video"
                playable
              />
              <view
                class="remove-video"
                role="button"
                :aria-label="$t('Remove selected video')"
                @click.stop="remove_video"
              >
                <Close class="remove-video__icon" />
              </view>
              <view v-if="is_video_processing" class="video-processing" :aria-label="$t('Preparing video')">
                <view class="video-processing__spinner" />
              </view>
            </template>
            <view
              v-else
              class="video-picker__empty"
              role="button"
              :aria-label="$t('Choose a video')"
              @click="choose_video"
            >
              <view class="add-video-icon" aria-hidden="true">
                <view class="add-video-icon__horizontal" />
                <view class="add-video-icon__vertical" />
              </view>
            </view>
          </view>
          <text class="content-title">{{ $t('Content') }}</text>
          <view class="content-card">
            <textarea
              v-model="content"
              class="content-input"
              maxlength="500"
              :placeholder="$t('Say Something')"
              placeholder-class="content-placeholder"
              :disabled="is_video_processing || is_publishing"
              @input="clear_feedback"
            />
            <view
              class="confirm-button"
              :class="{ 'confirm-button--disabled': !can_confirm }"
              role="button"
              :aria-disabled="!can_confirm"
              @click="confirm_draft"
            >
              {{ $t(is_publishing ? 'Publishing...' : 'Confirm') }}
            </view>
          </view>
          <text v-if="feedback_message" class="feedback-message" role="status">{{ $t(feedback_message) }}</text>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <PostPublishLoading v-if="is_publishing && !is_login_redirect_loading" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { onHide } from '@dcloudio/uni-app'
import { Close } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import PostMedia from '@/components/PostMedia.vue'
import PostPublishLoading from '@/components/PostPublishLoading.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { addDynamic } from '@/api/dynamic'
import { read_created_post_id } from '@/utils/createPostPresentation.js'
import { uploadVideoFile } from '@/api/media'
import { stop_active_media } from '@/utils/mediaPlayback'
import { create_video_second_cover_blob } from '@/utils/videoCover'
import { is_login_redirect_loading } from '@/utils/routeGuard'
import { ensure_ios_permissions } from '@/utils/iosPermissionBridge'

const page_transition = ref(null)
const content = ref('')
const selected_video_file = shallowRef(null)
const video_preview_url = ref('')
const video_cover_url = ref('')
const is_video_processing = ref(false)
const is_video_uploading = ref(false)
const uploaded_media = ref(null)
const is_publishing = ref(false)
const feedback_message = ref('')
const publish_request_context = {}
let selection_request_id = 0
let is_unmounted = false

const can_confirm = computed(() => Boolean(
  selected_video_file.value
  && video_preview_url.value
  && content.value.trim()
  && uploaded_media.value?.video_url
  && !is_video_processing.value
  && !is_video_uploading.value
  && !is_publishing.value
))
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--surface-color': theme.colors.surface.card,
  '--title-color': theme.colors.text.title,
  '--secondary-color': theme.colors.text.secondary,
  '--tertiary-color': theme.colors.text.tertiary,
  '--accent-color': theme.colors.button.primary,
  '--accent-text': theme.colors.button.text,
  '--scrim-color': theme.colors.surface.scrim,
  '--loading-track': theme.colors.surface.highlight,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const revoke_object_url = (url = '') => {
  if (String(url).startsWith('blob:') && typeof URL !== 'undefined') URL.revokeObjectURL(url)
}
const clear_feedback = () => {
  feedback_message.value = ''
}
const clear_video_urls = () => {
  stop_active_media()
  revoke_object_url(video_preview_url.value)
  revoke_object_url(video_cover_url.value)
  video_preview_url.value = ''
  video_cover_url.value = ''
}
const remove_video = () => {
  if (is_publishing.value || is_video_uploading.value) return
  selection_request_id += 1
  selected_video_file.value = null
  uploaded_media.value = null
  is_video_processing.value = false
  clear_video_urls()
  clear_feedback()
}
const is_video_file = (file) => {
  if (file?.type?.startsWith('video/')) return true
  const extension = `${file?.name || ''}`.split('.').pop().toLowerCase()
  return ['mp4', 'mov', 'm4v', 'webm', 'ogg'].includes(extension)
}
const set_browser_video = async (file) => {
  if (!file || !is_video_file(file)) {
    feedback_message.value = 'Choose a valid video file.'
    return
  }
  const request_id = ++selection_request_id
  clear_video_urls()
  selected_video_file.value = file
  video_preview_url.value = URL.createObjectURL(file)
  is_video_processing.value = true
  is_video_uploading.value = true
  uploaded_media.value = null
  clear_feedback()
  try {
    const cover_blob = await create_video_second_cover_blob(file)
    if (request_id !== selection_request_id) return
    video_cover_url.value = URL.createObjectURL(cover_blob)
  } catch {
    if (request_id !== selection_request_id) return
    video_cover_url.value = ''
  } finally {
    if (request_id === selection_request_id) is_video_processing.value = false
  }
  if (request_id !== selection_request_id) return
  const result = await uploadVideoFile({ file, filePath: video_preview_url.value, request_context: publish_request_context })
  if (request_id !== selection_request_id) return
  if (result.success) uploaded_media.value = result.data
  else feedback_message.value = result.error
  is_video_uploading.value = false
}
const choose_browser_video = () => {
  const picker = document.createElement('input')
  picker.type = 'file'
  picker.accept = 'video/*'
  picker.addEventListener('change', async () => {
    await set_browser_video(picker.files?.[0])
    picker.remove()
  }, { once: true })
  picker.click()
}
const choose_native_video = async () => {
  const permission = await ensure_ios_permissions(['photo_library', 'camera'], {
    reason: 'Allow this app to access photos and camera for video posts.'
  })
  if (!permission.granted && !permission.unavailable) {
    feedback_message.value = 'Photo library and camera permission are required to choose a video.'
    return
  }
  uni.chooseVideo({
    sourceType: ['album', 'camera'],
    compressed: true,
    success: (result) => {
      if (is_unmounted) return
      selection_request_id += 1
      const request_id = selection_request_id
      clear_video_urls()
      selected_video_file.value = result.tempFile || result.tempFilePath || null
      video_preview_url.value = result.tempFilePath || ''
      video_cover_url.value = result.thumbTempFilePath || ''
      clear_feedback()
      is_video_uploading.value = true
      uploaded_media.value = null
      void uploadVideoFile({ file: result.tempFile, filePath: result.tempFilePath, request_context: publish_request_context }).then((upload_result) => {
        if (is_unmounted || request_id !== selection_request_id) return
        if (upload_result.success) uploaded_media.value = upload_result.data
        else feedback_message.value = upload_result.error
        is_video_uploading.value = false
      })
    },
    fail: (error) => {
      if (String(error?.errMsg || '').includes('cancel')) return
      feedback_message.value = 'Unable to choose this video.'
    }
  })
}
const choose_video = () => {
  if (is_video_processing.value || is_video_uploading.value || is_publishing.value) return
  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    choose_browser_video()
    return
  }
  void choose_native_video()
}
const confirm_draft = async () => {
  if (!can_confirm.value) return
  clear_feedback()
  is_publishing.value = true
  try {
    const result = await addDynamic({
      dynamicClassify: 2,
      dynamicContent: content.value.trim(),
      dynamicType: 3,
      fileTimes: Math.max(0, Math.round(Number(uploaded_media.value.duration_seconds) || 0)),
      imgList: [uploaded_media.value.video_url],
      videoImgUrl: uploaded_media.value.cover_url
    }, publish_request_context)
    if (is_unmounted) return
    if (!result.success) {
      if (result.error !== 'Request cancelled.') feedback_message.value = result.error
      return
    }
    selected_video_file.value = null
    clear_video_urls()
    page_transition.value?.navigate_replace({
      url: `/pages/publish/success?source=videos&content_type=video&dynamic_id=${encodeURIComponent(read_created_post_id(result.data))}`
    })
  } finally {
    if (!is_unmounted) is_publishing.value = false
  }
}
const go_back = () => page_transition.value?.navigate_back()

watch(is_login_redirect_loading, (is_redirecting) => {
  if (!is_redirecting) return
  is_publishing.value = false
  is_video_processing.value = false
  stop_active_media()
})

onHide(() => stop_active_media())
onBeforeUnmount(() => {
  is_unmounted = true
  selection_request_id += 1
  publish_request_context.cancel?.()
  clear_video_urls()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.clip-page {
  display: flex;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.clip-header {
  position: relative;
  display: grid;
  min-height: 104rpx;
  align-items: center;
  padding: 0 30rpx 12rpx;
  grid-template-columns: 80rpx 1fr 80rpx;
}

.back-entry {
  @include page_back.button;
}

.clip-title {
  font-size: 42rpx;
  font-style: italic;
  font-weight: 900;
  text-align: center;
}

.header-spacer {
  width: 80rpx;
  height: 64rpx;
}

.clip-content {
  box-sizing: border-box;
  padding: 16rpx 30rpx calc(50rpx + var(--page-safe-bottom));
}

.video-picker {
  position: relative;
  width: 100%;
  height: 914rpx;
  overflow: hidden;
  border-radius: 32rpx;
  background: var(--surface-color);
}

.video-picker--selected {
  background: #000000;
}

.video-picker__empty {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.add-video-icon {
  position: relative;
  width: 148rpx;
  height: 148rpx;
}

.add-video-icon__horizontal,
.add-video-icon__vertical {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 999rpx;
  background: linear-gradient(135deg, rgba(1, 255, 224, .25), rgba(244, 92, 219, .24));
  transform: translate(-50%, -50%);
}

.add-video-icon__horizontal {
  width: 148rpx;
  height: 30rpx;
}

.add-video-icon__vertical {
  width: 30rpx;
  height: 148rpx;
}

.video-preview {
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.remove-video {
  position: absolute;
  z-index: 4;
  top: 18rpx;
  right: 18rpx;
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #000000;
  color: #FFFFFF;
}

.remove-video__icon {
  width: 36rpx;
  height: 36rpx;
}

.video-processing {
  position: absolute;
  z-index: 3;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, .48);
}

.video-processing__spinner {
  width: 54rpx;
  height: 54rpx;
  border: 6rpx solid var(--loading-track);
  border-top-color: var(--accent-color);
  border-right-color: var(--accent-color);
  border-radius: 50%;
  animation: video-processing-spin .72s linear infinite;
}

.content-title {
  display: block;
  margin: 30rpx 2rpx 20rpx;
  font-size: 38rpx;
  font-weight: 900;
}

.content-card {
  box-sizing: border-box;
  min-height: 380rpx;
  padding: 32rpx 0 28rpx;
  border-radius: 32rpx;
  background: var(--surface-color);
}

.content-input {
  box-sizing: border-box;
  width: 100%;
  height: 150rpx;
  padding: 10rpx 50rpx;
  color: var(--title-color);
  font-size: 28rpx;
  line-height: 1.5;
}

.content-placeholder {
  color: var(--tertiary-color);
}

.confirm-button {
  display: flex;
  height: 128rpx;
  margin-top: 18rpx;
  align-items: center;
  justify-content: center;
  border-radius: 64rpx;
  background: var(--accent-color);
  color: var(--accent-text);
  font-size: 36rpx;
  font-weight: 900;
}

.confirm-button--disabled {
  color: var(--secondary-color);
  opacity: .52;
  pointer-events: none;
}

.feedback-message {
  display: block;
  margin-top: 20rpx;
  color: var(--secondary-color);
  font-size: 23rpx;
  text-align: center;
}

@keyframes video-processing-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

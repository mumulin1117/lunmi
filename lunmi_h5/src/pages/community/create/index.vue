<template>
  <PageTransition ref="page_transition" class="create-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="create-header">
        <image class="back-button" role="button" :aria-label="$t('Back to wall')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('New post') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content-scroll__inner">
          <view class="media-tabs" role="tablist">
            <view
              class="media-tab"
              :class="{ 'media-tab--active': media_kind === 'image' }"
              role="tab"
              :aria-selected="media_kind === 'image'"
              @click="switch_media_kind('image')"
            >
              {{ $t('PHOTO') }}
            </view>
            <view
              class="media-tab"
              :class="{ 'media-tab--active': media_kind === 'video' }"
              role="tab"
              :aria-selected="media_kind === 'video'"
              @click="switch_media_kind('video')"
            >
              {{ $t('VIDEO') }}
            </view>
          </view>
          <view
            class="media-card"
            role="button"
            :aria-label="$t(selected_media ? 'Selected media' : upload_prompt(media_kind))"
            @click="choose_media"
          >
            <image
              v-if="!selected_media"
              class="media-card__scene"
              src="/static/icon/post_create_post.png"
              mode="scaleToFill"
            />
            <image
              v-else-if="selected_media.media_kind === 'image'"
              class="media-card__preview"
              :src="selected_media.preview_url"
              mode="aspectFill"
            />
            <video
              v-else
              class="media-card__preview"
              :src="selected_media.preview_url"
              :poster="selected_media.cover_url"
              object-fit="cover"
              :controls="false"
              :show-center-play-btn="false"
            />
            <text v-if="!selected_media && !is_uploading" class="upload-label">{{ $t(upload_prompt(media_kind)) }}</text>
            <view v-if="is_uploading" class="upload-pending">
              <text>{{ $t('Uploading...') }}</text>
            </view>
            <view
              v-if="selected_media && !is_uploading"
              class="remove-media"
              role="button"
              :aria-label="$t('Remove media')"
              @click.stop="remove_media"
            >
              <image src="/static/icon/post_details_del.png" mode="aspectFit" />
            </view>
          </view>
          <view class="caption-box">
            <textarea
              v-model="caption"
              maxlength="1000"
              :placeholder="$t('Say something...')"
              :placeholder-style="placeholder_style"
              :disabled="is_publishing"
              :aria-label="$t('Post caption')"
            />
          </view>
          <text v-if="form_error" class="form-error" role="alert">{{ $t(form_error) }}</text>
          <view
            class="publish-button"
            role="button"
            :aria-label="$t('Publish')"
            :aria-disabled="!can_publish"
            @click="publish_post"
          >
            <text>{{ $t('Publish') }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <PostPublishLoading v-if="is_publishing" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { addDynamic } from '@/api/dynamic'
import { uploadImageFile, uploadVideoFile } from '@/api/media'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import PostPublishLoading from '@/components/PostPublishLoading.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { choose_local_image, release_local_image_preview } from '@/utils/localImagePicker'
import { ensure_ios_permissions } from '@/utils/iosPermissionBridge'
import {
  build_image_post_params,
  build_publish_success_url,
  build_video_post_params,
  read_created_post_id,
  upload_prompt
} from '@/utils/createPostPresentation.js'
import { WALL_PAGE_PATH, read_wall_source } from '@/utils/wallPresentation.js'

const page_transition = ref(null)
const source_page = ref(WALL_PAGE_PATH)
const media_kind = ref('image')
const selected_media = ref(null)
const caption = ref('')
const is_uploading = ref(false)
const is_publishing = ref(false)
const form_error = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
const placeholder_style = `color:${theme.colors.text.tertiary};font-size:30rpx;`
let upload_context = { cancel() {} }
let publish_context = { cancel() {} }
let selection_id = 0
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--create-title': theme.colors.text.title,
  '--create-copy': theme.colors.text.secondary,
  '--create-muted': theme.colors.text.tertiary,
  '--create-border': theme.colors.surface.border,
  '--create-surface': theme.colors.surface.card,
  '--create-accent': theme.colors.status.info,
  '--create-tab': theme.colors.voice_room.gift_send_background,
  '--create-tab-text': theme.colors.text.inverse,
  '--create-header-surface': theme.colors.lantern_detail.header_surface,
  '--create-line': theme.colors.lantern_detail.title_line,
  '--create-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--create-button': theme.colors.button.primary,
  '--create-button-text': theme.colors.button.text,
  '--create-scrim': theme.colors.surface.scrim_soft,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const can_publish = computed(() => Boolean(
  caption.value.trim()
  && selected_media.value?.uploaded_url
  && !is_uploading.value
  && !is_publishing.value
))

const begin_upload = () => {
  upload_context.cancel?.()
  upload_context = { cancel() {} }
  return upload_context
}

const release_media = () => {
  release_local_image_preview(selected_media.value?.preview_url)
  release_local_image_preview(selected_media.value?.cover_url)
  selected_media.value = null
}

const remove_media = () => {
  if (is_uploading.value || is_publishing.value) return
  selection_id += 1
  upload_context.cancel?.()
  release_media()
  is_uploading.value = false
}

const switch_media_kind = (next_kind) => {
  if (is_uploading.value || is_publishing.value || media_kind.value === next_kind) return
  remove_media()
  media_kind.value = next_kind
  form_error.value = ''
}

const remember_upload = (request_id, preview_url, upload_result, cover_url = '', duration_seconds = 0) => {
  if (!is_page_active.value || request_id !== selection_id) {
    release_local_image_preview(preview_url)
    return
  }
  if (!upload_result?.success) {
    release_local_image_preview(preview_url)
    form_error.value = upload_result?.error && upload_result.error !== 'Request cancelled.'
      ? upload_result.error
      : ''
    is_uploading.value = false
    return
  }
  const uploaded_url = media_kind.value === 'video'
    ? upload_result.data.video_url
    : upload_result.data.image_url
  selected_media.value = {
    media_kind: media_kind.value,
    preview_url,
    uploaded_url,
    cover_url: cover_url || upload_result.data.cover_url || '',
    duration_seconds: duration_seconds || upload_result.data.duration_seconds || 0
  }
  is_uploading.value = false
}

const choose_image = async () => {
  const request_id = selection_id
  form_error.value = ''
  try {
    const chosen = await choose_local_image()
    if (!is_page_active.value || request_id !== selection_id) {
      release_local_image_preview(chosen.preview_url)
      return
    }
    const context = begin_upload()
    is_uploading.value = true
    const upload_result = await uploadImageFile({
      file: chosen.blob,
      filePath: chosen.preview_url,
      request_context: context
    })
    remember_upload(request_id, chosen.preview_url, upload_result)
  } catch (error) {
    if (!is_page_active.value || request_id !== selection_id) return
    if (!/cancelled/i.test(error?.message || '')) {
      form_error.value = error?.message || 'Unable to choose an image.'
    }
    is_uploading.value = false
  }
}

const upload_chosen_video = async (request_id, chosen) => {
  if (!is_page_active.value || request_id !== selection_id) {
    release_local_image_preview(chosen.preview_url)
    return
  }
  const context = begin_upload()
  is_uploading.value = true
  const upload_result = await uploadVideoFile({
    file: chosen.file,
    filePath: chosen.preview_url,
    request_context: context
  })
  remember_upload(
    request_id,
    chosen.preview_url,
    upload_result,
    chosen.cover_url,
    chosen.duration_seconds
  )
}

const choose_browser_video = (request_id) => {
  const picker = document.createElement('input')
  picker.type = 'file'
  picker.accept = 'video/*'
  picker.addEventListener('change', () => {
    const file = picker.files?.[0]
    picker.remove()
    if (!file || !is_page_active.value || request_id !== selection_id) return
    void upload_chosen_video(request_id, {
      file,
      preview_url: URL.createObjectURL(file),
      cover_url: '',
      duration_seconds: 0
    })
  }, { once: true })
  picker.click()
}

const choose_native_video = (request_id) => {
  uni.chooseVideo({
    sourceType: ['album', 'camera'],
    compressed: true,
    maxDuration: 60,
    success: (result) => {
      if (!is_page_active.value || request_id !== selection_id) return
      void upload_chosen_video(request_id, {
        file: result?.tempFile || null,
        preview_url: result?.tempFilePath || '',
        cover_url: result?.thumbTempFilePath || '',
        duration_seconds: Number(result?.duration) || 0
      })
    },
    fail: (error) => {
      if (!is_page_active.value || request_id !== selection_id) return
      if (/cancel/i.test(error?.errMsg || '')) return
      form_error.value = 'Unable to choose a video.'
    }
  })
}

const choose_video = async () => {
  const request_id = selection_id
  const permission = await ensure_ios_permissions(['photo_library', 'camera'], {
    reason: 'Allow this app to access photos and camera for video posts.'
  })
  if (!is_page_active.value || request_id !== selection_id) return
  if (!permission.granted && !permission.unavailable) {
    form_error.value = 'Photo library and camera permission are required to choose a video.'
    return
  }
  form_error.value = ''
  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    choose_browser_video(request_id)
    return
  }
  choose_native_video(request_id)
}

const choose_media = () => {
  if (is_uploading.value || is_publishing.value || selected_media.value || is_leaving.value) return
  selection_id += 1
  if (media_kind.value === 'video') {
    void choose_video()
    return
  }
  void choose_image()
}

const publish_post = async () => {
  if (is_publishing.value || is_leaving.value) return
  if (is_uploading.value) {
    form_error.value = 'Wait until the upload finishes.'
    return
  }
  if (!caption.value.trim() || !selected_media.value?.uploaded_url) {
    form_error.value = media_kind.value === 'video'
      ? 'Add a video and say something before publishing.'
      : 'Add a photo and say something before publishing.'
    return
  }
  is_publishing.value = true
  form_error.value = ''
  publish_context.cancel?.()
  publish_context = { cancel() {} }
  const trimmed = caption.value.trim()
  const payload = selected_media.value.media_kind === 'video'
    ? build_video_post_params({
      caption: trimmed,
      video_url: selected_media.value.uploaded_url,
      cover_url: selected_media.value.cover_url,
      duration_seconds: selected_media.value.duration_seconds
    })
    : build_image_post_params({
      caption: trimmed,
      image_url: selected_media.value.uploaded_url
    })
  const result = await addDynamic(payload, publish_context)
  if (!is_page_active.value) return
  if (!result?.success) {
    if (result?.error !== 'Request cancelled.') {
      form_error.value = result?.error || 'Unable to publish this post.'
    }
    is_publishing.value = false
    return
  }
  const post_id = read_created_post_id(result.data)
  release_media()
  is_leaving.value = true
  page_transition.value?.navigate_replace({
    url: build_publish_success_url({
      media_kind: media_kind.value,
      post_id,
      source_page: source_page.value
    })
  })
}

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value || is_publishing.value) return
  is_leaving.value = true
  selection_id += 1
  upload_context.cancel?.()
  const fallback = source_page.value || WALL_PAGE_PATH
  if (page_stack_length() > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        is_leaving.value = false
        page_transition.value?.navigate_relaunch({ url: fallback })
      }
    })
    if (!started) {
      allow_route_back = false
      is_leaving.value = false
      page_transition.value?.navigate_relaunch({ url: fallback })
    }
    return
  }
  page_transition.value?.navigate_relaunch({ url: fallback })
}

onLoad((query) => {
  source_page.value = read_wall_source(query?.sourcePage)
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  selection_id += 1
  upload_context.cancel?.()
  publish_context.cancel?.()
  release_media()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.create-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.create-header {
  display: flex;
  height: 80rpx;
  flex: none;
  align-items: center;
  padding: 0 36rpx;
}

.back-button {
  @include page_back.button;
}

.header-copy {
  margin-left: 24rpx;
}

.header-title {
  display: block;
  color: var(--create-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--create-line);
  box-shadow: 0 0 18rpx var(--create-line-shadow);
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  padding: 28rpx 36rpx 40rpx;
}

.media-tabs {
  display: flex;
  height: 88rpx;
  gap: 20rpx;
}

.media-tab {
  display: flex;
  height: 88rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  background: rgba(30,24,62,0.6);
  border-radius: 22rpx 22rpx 22rpx 22rpx;
  border: 2rpx solid rgba(122,214,255,0.26);
  font-weight: 400;
  font-size: 24rpx;
  color: #8E9AC4;
  letter-spacing: 1px;
}

.media-tab--active {
  background: linear-gradient( 93deg, rgba(255,143,196,0.34) 0%, rgba(200,123,255,0.3) 100%);
  box-shadow: 0rpx 0rpx 36rpx 0rpx rgba(200,123,255,0.24);
  border: 2rpx solid rgba(196,120,255,0.7);
  color: #FFD3EC;
}

.media-card {
  position: relative;
  height: 0;
  margin-top: 28rpx;
  padding-top: 79.65%;
  overflow: hidden;
}

.media-card__scene,
.media-card__preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.upload-label {
  position: absolute;
  z-index: 2;
  top: 62%;
  right: 0;
  left: 0;
  color: var(--create-accent);
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 3rpx;
  text-align: center;
}

.upload-pending,
.remove-media {
  position: absolute;
  z-index: 3;
}

.upload-pending {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--create-scrim);
}

.upload-pending text {
  color: var(--create-title);
  font-size: 28rpx;
  font-weight: 700;
}

.remove-media {
  top: 20rpx;
  right: 20rpx;
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
}

.remove-media image {
  width: 48rpx;
  height: 48rpx;
}

.caption-box {
  height: 220rpx;
  margin-top: 28rpx;
  padding: 28rpx 28rpx 0;
  border: 1px solid var(--create-border);
  border-radius: 32rpx;
  background: var(--create-surface);
}

.caption-box textarea {
  width: 100%;
  height: 160rpx;
  color: var(--create-title);
  font-size: 30rpx;
  line-height: 42rpx;
}

.form-error {
  display: block;
  margin-top: 16rpx;
  color: var(--create-copy);
  font-size: 24rpx;
  line-height: 34rpx;
}

.publish-button {
  display: flex;
  height: 108rpx;
  margin-top: 28rpx;
  align-items: center;
  justify-content: center;
  border-radius: 54rpx;
  background: var(--create-button);
}

.publish-button text {
  color: var(--create-button-text);
  font-size: 32rpx;
  font-weight: 700;
}
</style>

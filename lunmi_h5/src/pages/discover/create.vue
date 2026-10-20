<template>
  <PageTransition ref="page_transition" :style="theme_style">
    <TopSafeArea />
    <view class="page-content create-post-page">
      <SecondaryPageHeader :title="$t('Post')" class="about-header" />
      <scroll-view class="content-scroll create-scroll" scroll-y :show-scrollbar="false">
        <view class="content-scroll__inner create-scroll__inner">
          <view class="image-grid">
            <view v-for="slot_index in 3" :key="slot_index" class="image-slot">
              <template v-if="selected_images[slot_index - 1]">
                <image class="image-preview" :src="selected_images[slot_index - 1].preview_url" mode="aspectFill" />
                <view class="remove-image" role="button" :aria-label="$t('Remove image')" @click="remove_image(slot_index - 1)">
                  <image class="remove-image__icon" src="/static/icon/post_details_del.png" mode="aspectFit" />
                </view>
              </template>
              <view
                v-else
                class="pick-image"
                :class="{
                'pick-image--disabled': voice_draft,
                'pick-image--pending': pending_slot === slot_index - 1
                }"
                role="button"
                :aria-label="$t(`Choose image ${slot_index}`)"
                :aria-disabled="pending_slot >= 0 || Boolean(voice_draft)"
                @click="choose_image(slot_index - 1)"
              >
                <image class="camera-card" src="/static/icon/release_lantern_photo.png" mode="aspectFill" />
              </view>
            </view>
          </view>
          <text class="content-label">{{ $t('Content') }}</text>
          <view class="content-field">
            <textarea
              v-model="content"
              class="content-input"
              maxlength="1000"
              :placeholder="$t('Say Something')"
              :placeholder-style="placeholder_style"
              :aria-label="$t('Post content')"
            />
            <text class="content-count">{{ content.length }}/1000</text>
          </view>
          <view
            v-if="!voice_draft"
            class="record-entry"
            :class="{ 'record-entry--disabled': selected_images.length > 0 || is_uploading }"
            role="button"
            :aria-disabled="selected_images.length > 0 || is_uploading"
            @click="open_recorder"
          >
            <view v-if="is_uploading && !selected_images.length" class="record-entry__spinner" :aria-label="$t('Uploading recording')" />
            <text v-else class="record-entry__icon">🎙</text>
            <text>{{ $t(is_uploading && !selected_images.length ? 'Uploading recording…' : 'Recording') }}</text>
          </view>
          <view v-else class="voice-draft">
            <text class="voice-icon">▮▮▮</text>
            <text class="voice-duration">{{ $t(voice_duration) }}{{ $t('s') }}</text>
            <text class="remove-voice" role="button" @click="remove_voice">✕</text>
          </view>
          <text v-if="form_error" class="form-error" role="alert">{{ $t(form_error) }}</text>
        </view>
      </scroll-view>
      <view class="publish-actions">
        <view
          class="confirm-button"
          :class="{ 'confirm-button--disabled': !can_submit || is_publishing }"
          role="button"
          :aria-label="$t('Confirm post')"
          :aria-disabled="!can_submit || is_publishing"
          @click="publish_post"
        >
          <text>{{ $t('Confirm') }}</text>
        </view>
      </view>
    </view>
    <BottomSafeArea />
    <PostPublishLoading v-if="is_publishing && !is_login_redirect_loading" />
    <DiscoverRecordingSheet :visible="recorder_open" @close="close_recorder" @recorded="handle_recorded" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import DiscoverRecordingSheet from '@/components/DiscoverRecordingSheet.vue'
import PageTransition from '@/components/PageTransition.vue'
import PostPublishLoading from '@/components/PostPublishLoading.vue'
import SecondaryPageHeader from '@/components/SecondaryPageHeader.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { addDynamic } from '@/api/dynamic'
import { read_created_post_id } from '@/utils/createPostPresentation.js'
import { choose_local_image, release_local_image_preview } from '@/utils/localImagePicker'
import { is_login_redirect_loading } from '@/utils/routeGuard'
import { uploadAudioFile, uploadImageFile } from '@/api/media'

const page_transition = ref(null)
const selected_images = ref([])
const content = ref('')
const form_error = ref('')
const pending_slot = ref(-1)
const is_publishing = ref(false)
const is_uploading = ref(false)
const uploaded_urls = computed(() => selected_images.value.map((image) => image.uploaded_url).filter(Boolean))
const recorder_open = ref(false)
const voice_draft = ref(null)
const voice_duration = ref(0)
const publish_request_context = {}
let is_unmounted = false

const can_submit = computed(() => {
  const has_voice = Boolean(voice_draft.value?.url)
  const has_images = Boolean(
    selected_images.value.length
    && uploaded_urls.value.length === selected_images.value.length
  )
  return Boolean(
    content.value.trim()
    && (has_voice || has_images)
    && (!has_voice || selected_images.value.length === 0)
    && !is_uploading.value
    && pending_slot.value < 0
    && !is_publishing.value
  )
})
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--surface-color': theme.colors.surface.card,
  '--surface-strong': theme.colors.surface.card_strong,
  '--surface-border': theme.colors.surface.border,
  '--surface-deep': theme.colors.surface.deep,
  '--title-color': theme.colors.text.title,
  '--secondary-color': theme.colors.text.secondary,
  '--tertiary-color': theme.colors.text.tertiary,
  '--accent-color': theme.colors.button.primary,
  '--danger-color': theme.colors.status.danger
}
const placeholder_style = `color:${theme.colors.text.tertiary};font-size:28rpx;`

const choose_image = async (slot_index) => {
  if (pending_slot.value >= 0 || is_publishing.value || is_uploading.value || voice_draft.value || selected_images.value.length >= 3) return
  pending_slot.value = slot_index
  form_error.value = ''
  try {
    const selected_image = await choose_local_image()
    if (is_unmounted) {
      release_local_image_preview(selected_image.preview_url)
      return
    }
    const next_images = [...selected_images.value]
    next_images.splice(Math.min(slot_index, next_images.length), 0, selected_image)
    selected_images.value = next_images.slice(0, 3)
    is_uploading.value = true
    const upload_result = await uploadImageFile({ file: selected_image.blob, request_context: publish_request_context })
    if (is_unmounted) return
    if (upload_result.success) {
      const image = selected_images.value.find((item) => item.preview_url === selected_image.preview_url)
      if (image) image.uploaded_url = upload_result.data.image_url
    } else form_error.value = upload_result.error
  } catch (error) {
    if (!is_unmounted && !/cancelled/i.test(error?.message || '')) form_error.value = error?.message || 'Unable to choose an image.'
  } finally {
    if (!is_unmounted) {
      pending_slot.value = -1
      is_uploading.value = false
    }
  }
}

const remove_image = (image_index) => {
  if (is_publishing.value || is_uploading.value) return
  const next_images = [...selected_images.value]
  const [removed_image] = next_images.splice(image_index, 1)
  release_local_image_preview(removed_image?.preview_url)
  selected_images.value = next_images
}

const finish_publish = () => {
  if (is_unmounted) return
  is_publishing.value = false
}

const publish_post = async () => {
  if (!can_submit.value || is_publishing.value || is_uploading.value || uploaded_urls.value.length !== selected_images.value.length) return
  form_error.value = ''
  is_publishing.value = true
  try {
    const payload = voice_draft.value?.url
      ? {
          dynamicClassify: 1,
          dynamicContent: content.value.trim(),
          dynamicType: 2,
          fileTimes: voice_duration.value,
          imgList: [],
          videoImgUrl: voice_draft.value.url
        }
      : {
          dynamicClassify: 1,
          dynamicContent: content.value.trim(),
          dynamicType: 1,
          imgList: uploaded_urls.value
        }
    const result = await addDynamic(payload, publish_request_context)
    if (is_unmounted) return
    if (!result?.success) {
      form_error.value = result?.error || 'Unable to publish this post.'
      return
    }
    selected_images.value.forEach((image) => release_local_image_preview(image.preview_url))
    selected_images.value = []
    voice_draft.value = null
    voice_duration.value = 0
    content.value = ''
    page_transition.value?.navigate_replace({
      url: `/pages/publish/success?source=discover&content_type=${payload.dynamicType === 2 ? 'audio' : 'image'}&dynamic_id=${encodeURIComponent(read_created_post_id(result.data))}`
    })
  } finally {
    finish_publish()
  }
}
const open_recorder = () => {
  if (selected_images.value.length || is_uploading.value || is_publishing.value) {
    form_error.value = is_uploading.value ? 'Please wait for the media upload to finish.' : 'Remove images before recording a voice post.'
    return
  }
  form_error.value = ''
  recorder_open.value = true
}
const close_recorder = () => { recorder_open.value = false }
const handle_recorded = async ({ blob, duration_seconds }) => {
  if (!(blob instanceof Blob) || !blob.size || is_unmounted) return
  is_uploading.value = true
  form_error.value = ''
  try {
    const result = await uploadAudioFile({ file: blob, request_context: publish_request_context })
    if (is_unmounted) return
    if (!result.success) {
      form_error.value = result.error
      return
    }
    voice_draft.value = { url: result.data.audio_url }
    voice_duration.value = Math.max(1, Math.min(60, Math.round(Number(duration_seconds) || 0)))
  } catch (error) {
    if (!is_unmounted) form_error.value = error?.message || 'Unable to upload the recording.'
  } finally {
    if (!is_unmounted) is_uploading.value = false
  }
}
const remove_voice = () => {
  if (is_publishing.value || is_uploading.value) return
  voice_draft.value = null
  voice_duration.value = 0
}

watch(is_login_redirect_loading, (is_redirecting) => {
  if (!is_redirecting) return
  is_publishing.value = false
})

onBeforeUnmount(() => {
  is_unmounted = true
  publish_request_context.cancel?.()
  selected_images.value.forEach((image) => release_local_image_preview(image.preview_url))
})
</script>

<style scoped lang="scss">
.create-post-page {
  background: transparent;
}

.create-scroll {
  background: transparent;
}

.create-scroll__inner {
  box-sizing: border-box;
  min-height: 100%;
  padding: 10rpx 30rpx 46rpx;
}

.image-grid {
  display: grid;
  gap: 10rpx;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.image-slot,
.pick-image,
.camera-card,
.image-preview {
  width: 100%;
  height: 172rpx;
}

.image-slot {
  position: relative;
  overflow: hidden;
  border-radius: 24rpx;
  background: var(--surface-color);
}

.pick-image {
  opacity: 1;
}

.pick-image--pending {
  opacity: 0.5;
}

.pick-image--disabled,
.record-entry--disabled {
  opacity: 0.5;
}

.camera-card,
.image-preview {
  display: block;
}

.remove-image {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  display: flex;
  width: 48rpx;
  height: 48rpx;
  align-items: center;
  justify-content: center;
}

.remove-image__icon {
  width: 48rpx;
  height: 48rpx;
}

.content-label {
  display: block;
  margin-top: 44rpx;
  color: var(--title-color);
  font-size: 36rpx;
  font-weight: 700 !important;
  line-height: 48rpx;
}

.content-field {
  position: relative;
  box-sizing: border-box;
  height: 380rpx;
  margin-top: 20rpx;
  padding: 34rpx 42rpx 52rpx;
  border-radius: 28rpx;
  background: var(--surface-strong);
}

.content-input {
  width: 100%;
  height: 100%;
  color: var(--title-color);
  font-size: 29rpx;
  line-height: 42rpx;
}

.content-count {
  position: absolute;
  right: 28rpx;
  bottom: 18rpx;
  color: var(--tertiary-color);
  font-size: 21rpx;
}

.record-entry,
.voice-draft {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 96rpx;
  margin-top: 24rpx;
  padding: 0 34rpx;
  align-items: center;
  border-radius: 50rpx;
  background: var(--surface-strong);
  color: var(--title-color);
  font-size: 31rpx;
  font-weight: 700;
}

.record-entry__icon {
  width: 36rpx;
  height: 44rpx;
  margin-right: 20rpx;
}

.record-entry__spinner {
  box-sizing: border-box;
  width: 32rpx;
  height: 32rpx;
  margin-right: 24rpx;
  border: 4rpx solid var(--surface-border);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: record-entry-spin 720ms linear infinite;
}

@keyframes record-entry-spin {
  to {
    transform: rotate(360deg);
  }
}

.voice-icon {
  width: 44rpx;
  height: 44rpx;
  margin-right: 16rpx;
}

.voice-duration {
  flex: 1;
}

.remove-voice {
  display: flex;
  width: 58rpx;
  height: 58rpx;
  align-items: center;
  justify-content: center;
}

.remove-voice__icon {
  width: 54rpx;
  height: 54rpx;
}

.form-error {
  display: block;
  margin: 16rpx 20rpx 0;
  color: var(--danger-color);
  font-size: 23rpx;
  line-height: 34rpx;
  text-align: center;
}

.publish-actions {
  box-sizing: border-box;
  padding: 18rpx 30rpx 26rpx;
  flex: 0 0 auto;
}

.confirm-button {
  display: flex;
  width: 100%;
  height: 94rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50rpx;
  background: var(--accent-color);
  color: var(--title-color);
  font-size: 32rpx;
  font-weight: 700;
}

.confirm-button--disabled {
  color: var(--secondary-color);
  opacity: 0.54;
}
.about-header :deep(.header-copy) {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
</style>

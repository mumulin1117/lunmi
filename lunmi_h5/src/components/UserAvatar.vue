<template>
  <view class="user-avatar" v-bind="$attrs" :style="avatar_style">
    <image
      v-if="display_source"
      class="user-avatar__image"
      :src="display_source"
      :mode="mode"
      :lazy-load="false"
      @load="handle_load"
      @error="handle_error"
    />
    <view v-if="is_loading" class="user-avatar__loading">
      <MediaShimmer class="user-avatar__shimmer" :label="$t('Loading avatar')" />
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { DEFAULT_AVATAR_URL } from '@/config/user'
import MediaShimmer from '@/components/MediaShimmer.vue'
import { resolve_post_media_url, revoke_post_media_url } from '@/utils/postMediaStorage'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  source: { type: String, default: '' },
  fallback: { type: String, default: DEFAULT_AVATAR_URL },
  mode: { type: String, default: 'aspectFill' }
})

const resolved_source = ref('')
const has_error = ref(false)
const is_image_ready = ref(false)
const avatar_style = {
  '--avatar-surface': theme.colors.surface.card_strong,
  '--media-loading-surface': theme.colors.surface.media_shimmer,
  '--media-loading-shine': theme.colors.surface.media_shimmer_shine
}
let current_object_url = ''
let source_request_id = 0
let fallback_visible = false
const display_source = computed(() => {
  if (fallback_visible || has_error.value || !props.source) return props.fallback
  return resolved_source.value
})
const is_loading = computed(() => Boolean(display_source.value) && !is_image_ready.value)

const refresh_source = async () => {
  const request_id = ++source_request_id
  revoke_post_media_url(current_object_url)
  current_object_url = ''
  resolved_source.value = ''
  has_error.value = false
  is_image_ready.value = false
  fallback_visible = !props.source
  if (!props.source) return
  let source = ''
  try {
    source = await resolve_post_media_url(props.source)
  } catch {
    source = ''
  }
  if (request_id !== source_request_id) {
    revoke_post_media_url(source)
    return
  }
  if (!source) {
    has_error.value = true
    return
  }
  current_object_url = source
  resolved_source.value = source
}

const handle_load = () => { is_image_ready.value = true }
const handle_error = () => {
  if (!fallback_visible && !has_error.value) {
    fallback_visible = true
    has_error.value = true
    is_image_ready.value = false
    return
  }
  has_error.value = true
  is_image_ready.value = true
}

watch(() => props.source, refresh_source, { immediate: true })
onBeforeUnmount(() => {
  source_request_id += 1
  revoke_post_media_url(current_object_url)
})
</script>

<style scoped lang="scss">
.user-avatar {
  position: relative;
  display: block;
  overflow: hidden;
  background: var(--avatar-surface);
}

.user-avatar__image {
  display: block;
  width: 100%;
  height: 100%;
}

.user-avatar__loading {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--media-loading-surface);
}

.user-avatar__shimmer {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

</style>

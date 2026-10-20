<template>
  <view class="profile-hero" :style="hero_style">
    <view class="profile-hero__cover-wrap">
      <image
        v-if="display_cover"
        class="profile-hero__cover"
        :src="display_cover"
        mode="aspectFill"
        :lazy-load="false"
        @load="handle_cover_load"
        @error="handle_cover_error"
      />
      <view v-else-if="!is_cover_loading" class="profile-hero__cover profile-hero__cover--empty" />
    </view>
    <view v-if="is_cover_loading" class="profile-hero__loading">
      <MediaShimmer class="profile-hero__shimmer" :label="$t('Loading profile cover')" />
    </view>
    <view class="profile-hero__shade" :class="{ 'profile-hero__shade--loading': is_cover_loading }" />
    <view class="profile-hero__content">
      <view class="profile-hero__toolbar">
        <view class="profile-hero__spacer" />
        <image
          class="profile-hero__settings"
          src="/static/icon/profile_setting.png"
          mode="aspectFit"
          role="button"
          :aria-label="$t('Open settings')"
          @click="emit('open-settings')"
        />
      </view>
      <view class="profile-hero__identity">
        <view class="profile-hero__copy">
          <text class="profile-hero__name">{{ username || $t('Your profile') }}</text>
          <view v-if="location" class="profile-hero__location">
            <image src="/static/icon/profile_location.png" mode="aspectFit" />
            <text>{{ location }}</text>
          </view>
        </view>
        <image
          class="profile-hero__edit"
          src="/static/icon/profile_edit.png"
          mode="aspectFit"
          role="button"
          :aria-label="$t('Edit profile')"
          @click="emit('open-edit')"
        />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { DEFAULT_AVATAR_URL } from '@/config/user'
import MediaShimmer from '@/components/MediaShimmer.vue'
import { resolve_post_media_url, revoke_post_media_url } from '@/utils/postMediaStorage'

const props = defineProps({
  avatar_url: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  cover_pending: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['open-settings', 'open-edit'])

const resolved_cover = ref('')
const has_cover_error = ref(false)
const is_cover_ready = ref(false)
let cover_request_id = 0
let current_object_url = ''

const hero_style = {
  '--profile-card': theme.colors.surface.card,
  '--media-loading-surface': theme.colors.surface.media_shimmer,
  '--media-loading-shine': theme.colors.surface.media_shimmer_shine
}

const display_cover = computed(() => {
  if (has_cover_error.value || !`${props.avatar_url || ''}`.trim()) return DEFAULT_AVATAR_URL
  return resolved_cover.value
})

const is_cover_loading = computed(() => {
  if (props.cover_pending) return true
  if (!props.avatar_url || has_cover_error.value) return false
  return !is_cover_ready.value
})

const refresh_cover = async () => {
  const request_id = ++cover_request_id
  revoke_post_media_url(current_object_url)
  current_object_url = ''
  resolved_cover.value = ''
  has_cover_error.value = false
  is_cover_ready.value = false
  if (!props.avatar_url) return
  let source = ''
  try {
    source = await resolve_post_media_url(props.avatar_url)
  } catch {
    source = ''
  }
  if (request_id !== cover_request_id) {
    revoke_post_media_url(source)
    return
  }
  if (!source) {
    has_cover_error.value = true
    return
  }
  current_object_url = source
  resolved_cover.value = source
}

const handle_cover_load = () => {
  is_cover_ready.value = true
}

const handle_cover_error = () => {
  has_cover_error.value = true
  is_cover_ready.value = true
}

watch(() => props.avatar_url, refresh_cover, { immediate: true })

onBeforeUnmount(() => {
  cover_request_id += 1
  revoke_post_media_url(current_object_url)
})
</script>

<style scoped lang="scss">
.profile-hero {
  position: relative;
  box-sizing: border-box;
  height: 620rpx;
  flex: none;
  overflow: hidden;
}

.profile-hero__cover-wrap {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: hidden;
}

.profile-hero__cover {
  display: block;
  width: 100%;
  height: 100%;
}

.profile-hero__cover--empty {
  background: var(--profile-card);
}

.profile-hero__loading {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.profile-hero__shimmer {
  width: 100%;
  height: 100%;
}

.profile-hero__shade {
  position: absolute;
  z-index: 2;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--profile-shade);
}

.profile-hero__shade--loading {
  background: transparent;
}

.profile-hero__content {
  position: relative;
  z-index: 2;
  display: flex;
  box-sizing: border-box;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--page-safe-top) 32rpx 32rpx;
}

.profile-hero__toolbar {
  display: flex;
  align-items: center;
}

.profile-hero__spacer {
  flex: 1;
}

.profile-hero__settings {
  width: 72rpx;
  height: 72rpx;
}

.profile-hero__identity {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.profile-hero__name {
  display: block;
  color: var(--profile-title);
  font-size: 48rpx;
  font-weight: 800;
}

.profile-hero__location {
  display: flex;
  align-items: center;
  margin-top: 10rpx;
  color: var(--profile-muted);
  font-size: 24rpx;
}

.profile-hero__location image {
  width: 28rpx;
  height: 28rpx;
  margin-right: 8rpx;
}

.profile-hero__edit {
  width: 88rpx;
  height: 88rpx;
  flex: none;
}
</style>

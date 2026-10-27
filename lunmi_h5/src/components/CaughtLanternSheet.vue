<template>
  <teleport to="body">
    <transition name="caught-sheet-slide" :duration="{ enter: 560, leave: 320 }" appear @after-leave="after_close">
      <view
        v-if="visible"
        class="sheet-layer"
        :style="sheet_style"
        @click="close"
      >
        <view class="sheet-scrim" />
        <view class="sheet-panel" @click.stop>
          <ResultSheetToolbar @close="close" />
          <scroll-view class="sheet-scroll" scroll-y :show-scrollbar="false">
            <view class="sheet-scroll__inner">
              <view v-if="is_loading && !lantern && !has_owner_preview" class="sheet-skeleton" aria-hidden="true">
                <view class="sheet-skeleton__line sheet-skeleton__line--name" />
                <view class="sheet-skeleton__photo" />
                <view class="sheet-skeleton__line" />
              </view>
              <view v-else-if="load_error && !lantern && !has_owner_preview" class="sheet-error" role="alert">
                <text>{{ $t(load_error) }}</text>
                <view class="sheet-error__retry" role="button" @click="load_caught">{{ $t('Try again') }}</view>
              </view>
              <template v-else-if="lantern || has_owner_preview">
                <view class="caught-head">
                  <UserAvatar
                    v-if="show_owner_avatar"
                    class="caught-avatar"
                    :source="avatar_url"
                  />
                  <view v-else class="caught-avatar caught-avatar--fallback">
                    <image src="/static/icon/lantern_release_avatar.png" mode="aspectFit" />
                  </view>
                  <view class="caught-user">
                    <text class="caught-name">{{ owner_label }}</text>
                    <view class="caught-place">
                      <image src="/static/icon/profile_location.png" mode="aspectFit" />
                      <text>{{ $t(place_label) }}</text>
                    </view>
                  </view>
                  <view v-if="lantern_label" class="caught-tag">
                    <text>{{ $t(lantern_label) }}</text>
                  </view>
                  <view
                    v-if="can_report"
                    class="sheet-report"
                    role="button"
                    :aria-label="$t('Report lantern')"
                    @click="open_report"
                  >
                    <image src="/static/icon/vertical_more.png" mode="aspectFit" />
                  </view>
                </view>
                <image
                  class="caught-photo"
                  src="/static/icon/lantern_detail_scene.png"
                  mode="aspectFill"
                />
                <view v-if="lantern" class="caught-copy">
                  <text>{{ lantern.content || $t('A lantern with no written note.') }}</text>
                </view>
                <view v-else-if="is_loading" class="caught-copy caught-copy--loading" aria-hidden="true">
                  <view class="sheet-skeleton__line" />
                  <view class="sheet-skeleton__line sheet-skeleton__line--short" />
                </view>
                <view v-if="lantern" class="caught-notice">
                  <image src="/static/icon/reply_comment.png" mode="aspectFit" />
                  <text>{{ $t(notice_text) }}</text>
                </view>
                <text v-if="load_error" class="caught-inline-error" role="alert">{{ $t(load_error) }}</text>
              </template>
            </view>
          </scroll-view>
          <view
            v-if="lantern || has_owner_preview"
            class="reply-button"
            :class="{ 'reply-button--disabled': is_loading || !lantern }"
            role="button"
            :aria-disabled="is_loading || !lantern"
            @click="reply"
          >
            <text>{{ $t(reply_label) }}</text>
            <image src="/static/icon/release_reply_button_right_flower.png" mode="aspectFit" />
          </view>
        </view>
      </view>
    </transition>
  </teleport>
</template>

<script setup>
import { t } from '@/utils/i18n'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { selectUserBaseInfo } from '@/api/common'
import { selectLmLanternPage } from '@/api/lantern'
import { selectLmLanternReplyPage, selectLmLanternScoopPage } from '@/api/scoop'
import UserAvatar from '@/components/UserAvatar.vue'
import ResultSheetToolbar from '@/components/ResultSheetToolbar.vue'
import { storeGlobal } from '@/stores/store'
import {
  build_select_reply_params,
  lantern_owner_label,
  map_lantern_record,
  map_reply_record,
  read_lantern_records,
  read_page_records
} from '@/utils/lanternDetailPresentation'
import { map_user_base_profile, to_user_id_param } from '@/utils/profilePresentation'
import {
  CAUGHT_REPLIED_NOTICE,
  CAUGHT_REPLY_NOTICE,
  build_select_user_scoops_params,
  caught_place_label,
  match_created_scoop
} from '@/utils/scoopLanternPresentation'
import { build_select_lantern_params } from '@/utils/releaseLanternPresentation'

const props = defineProps({
  visible: { type: Boolean, default: false },
  lanternId: { type: [String, Number], default: '' },
  lanternScoopId: { type: [String, Number], default: '' },
  cachedOwnerUserId: { type: [String, Number], default: '' },
  cachedOwnerName: { type: String, default: '' },
  cachedOwnerAvatarUrl: { type: String, default: '' },
  cachedOwnerAnonymous: { type: Boolean, default: false },
  caughtData: { type: Object, default: null },
  bottomOffset: { type: String, default: '0px' }
})

const emit = defineEmits(['close', 'after-close', 'reply', 'report'])

const lantern = ref(null)
const scoop = ref(null)
const reply_record = ref(null)
const avatar_url = ref('')
const owner_name = ref('')
const is_loading = ref(false)
const load_error = ref('')
const is_sheet_active = ref(true)
let request_context = { cancel() {} }
let load_token = 0

const sheet_style = computed(() => ({
  '--sheet-bottom-offset': props.bottomOffset,
  '--sheet-panel-safe-bottom': 'var(--page-safe-bottom)',
  '--sheet-background': theme.colors.release_sheet.background,
  '--sheet-shadow': theme.colors.release_sheet.shadow,
  '--sheet-scrim': theme.colors.surface.scrim,
  '--sheet-handle': theme.colors.release_sheet.handle,
  '--sheet-border': theme.colors.surface.border,
  '--sheet-title': theme.colors.text.title,
  '--sheet-secondary': theme.colors.release_sheet.subtitle,
  '--sheet-copy': theme.colors.text.title,
  '--sheet-card': theme.colors.surface.card,
  '--sheet-tag': theme.colors.status.coin,
  '--sheet-tag-border': theme.colors.home.tonight_border,
  '--sheet-info': theme.colors.status.info,
  '--sheet-button': theme.colors.button.primary,
  '--sheet-button-text': theme.colors.button.text,
  '--sheet-inset': theme.colors.release_sheet.button_inset,
  '--sheet-skeleton': theme.colors.home.skeleton
}))

const owner_is_anonymous = computed(() => {
  if (lantern.value) return lantern.value.anonymous_display
  return props.cachedOwnerAnonymous
})
const has_owner_preview = computed(() => (
  owner_is_anonymous.value
  || Boolean(`${props.cachedOwnerUserId || ''}`.trim())
  || Boolean(owner_name.value)
))
const resolved_owner_user_id = computed(() => (
  `${lantern.value?.owner_user_id || props.cachedOwnerUserId || ''}`.trim()
))
const owner_label = computed(() => {
  if (owner_name.value) return owner_name.value
  if (lantern.value) return t(lantern_owner_label(lantern.value))
  if (props.cachedOwnerAnonymous) return t(lantern_owner_label({ anonymous_display: true }))
  if (props.cachedOwnerName) return props.cachedOwnerName
  return t(lantern_owner_label(null))
})
const lantern_label = computed(() => lantern.value?.lantern_label || '')
const place_label = computed(() => caught_place_label(
  lantern.value?.release_city_name,
  scoop.value?.scooped_at || lantern.value?.scooped_at
))
const notice_text = computed(() => (reply_record.value ? CAUGHT_REPLIED_NOTICE : CAUGHT_REPLY_NOTICE))
const reply_label = computed(() => (reply_record.value ? 'View reply' : 'Reply once'))
const show_owner_avatar = computed(() => !owner_is_anonymous.value)
const can_report = computed(() => (
  show_owner_avatar.value && resolved_owner_user_id.value !== ''
))
const has_cached_owner_profile = computed(() => (
  !props.cachedOwnerAnonymous
  && Boolean(`${props.cachedOwnerUserId || ''}`.trim())
  && Boolean(props.cachedOwnerName || props.cachedOwnerAvatarUrl)
))

const sync_owner_from_cache = () => {
  if (props.cachedOwnerAnonymous) {
    owner_name.value = ''
    avatar_url.value = ''
    return
  }
  owner_name.value = `${props.cachedOwnerName || ''}`.trim()
  avatar_url.value = `${props.cachedOwnerAvatarUrl || ''}`.trim()
}

const begin_requests = () => {
  const contexts = []
  request_context = {
    cancel: () => {
      contexts.forEach((context) => context.cancel?.())
    }
  }
  return () => {
    const context = {}
    contexts.push(context)
    return context
  }
}

const close = () => {
  load_token += 1
  request_context.cancel?.()
  emit('close')
}

const after_close = () => {
  if (!props.visible) emit('after-close')
}

const reply = () => {
  if (!lantern.value || is_loading.value) return
  emit('reply', {
    lantern_id: lantern.value.lantern_id,
    target_user_id: resolved_owner_user_id.value
  })
}

const open_report = () => {
  if (!can_report.value) return
  emit('report', {
    target_user_id: resolved_owner_user_id.value,
    target_name: owner_label.value
  })
}

// feedback_mode: region_loading — sheet skeleton follows the scoop and lantern queries.
const load_caught = async () => {
  if (!is_sheet_active.value || !props.visible) return
  const token = ++load_token
  const is_current = () => is_sheet_active.value && props.visible && load_token === token
  request_context.cancel?.()
  const caught = props.caughtData
  if (caught && `${caught.lantern?.lantern_id}` === `${props.lanternId}`
    && `${caught.scoop?.lantern_scoop_id}` === `${props.lanternScoopId}`) {
    lantern.value = caught.lantern
    scoop.value = caught.scoop
    reply_record.value = caught.reply_record
    if (!caught.lantern.anonymous_display) {
      owner_name.value = caught.owner_profile?.username || ''
      avatar_url.value = caught.owner_profile?.avatar_url || ''
    }
    is_loading.value = false
    load_error.value = ''
    return
  }
  if (!props.lanternId || !props.lanternScoopId) {
    load_error.value = 'This lantern could not be found.'
    return
  }
  const account_store = storeGlobal()
  is_loading.value = true
  load_error.value = ''
  const track_request = begin_requests()
  try {
    const [scoop_result, lantern_result] = await Promise.all([
      selectLmLanternScoopPage(build_select_user_scoops_params({
        scooper_user_id: account_store.userId,
        lantern_id: props.lanternId,
        size: 20
      }), track_request()),
      selectLmLanternPage(build_select_lantern_params({
        lantern_id: props.lanternId
      }), track_request())
    ])
    if (!is_current()) return
    if (!scoop_result?.success) {
      load_error.value = scoop_result?.error || 'Unable to load this lantern.'
      return
    }
    if (!lantern_result?.success) {
      load_error.value = lantern_result?.error || 'Unable to load this lantern.'
      return
    }
    const matched = read_page_records(scoop_result.data)
      .map((record) => match_created_scoop({ records: [record] }, props.lanternId))
      .find((item) => item && `${item.lantern_scoop_id}` === `${props.lanternScoopId}`)
    const lantern_record = map_lantern_record(read_lantern_records(lantern_result.data)[0])
    if (!matched || !lantern_record || lantern_record.deleted) {
      load_error.value = 'This lantern is no longer available.'
      lantern.value = null
      return
    }
    scoop.value = matched
    lantern.value = lantern_record
    const reply_result = await selectLmLanternReplyPage(
      build_select_reply_params({ lantern_scoop_id: matched.lantern_scoop_id }),
      track_request()
    )
    if (!is_current()) return
    if (reply_result?.success) {
      reply_record.value = map_reply_record(read_page_records(reply_result.data)[0])
    } else {
      reply_record.value = null
      load_error.value = reply_result?.error || 'Unable to check the reply.'
    }
    if (!lantern_record.anonymous_display && !has_cached_owner_profile.value) {
      const owner_user_id = to_user_id_param(lantern_record.owner_user_id)
      if (owner_user_id != null) {
        const profile_result = await selectUserBaseInfo({
          userId: owner_user_id
        }, track_request())
        if (!is_current()) return
        if (profile_result?.success) {
          const profile = map_user_base_profile(profile_result.data)
          owner_name.value = profile.username
          avatar_url.value = profile.avatar_url
        }
      }
    } else if (lantern_record.anonymous_display) {
      owner_name.value = ''
      avatar_url.value = ''
    }
  } catch (error) {
    if (!is_current()) return
    load_error.value = error?.message || 'Unable to load this lantern.'
  } finally {
    if (is_current()) is_loading.value = false
  }
}

watch(
  () => [props.visible, props.lanternId, props.lanternScoopId],
  ([visible]) => {
    if (!visible) {
      load_token += 1
      request_context.cancel?.()
      return
    }
    lantern.value = null
    scoop.value = null
    reply_record.value = null
    sync_owner_from_cache()
    load_caught()
  }
)

onBeforeUnmount(() => {
  is_sheet_active.value = false
  load_token += 1
  request_context.cancel?.()
})
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

.sheet-panel {
  --dismiss-handle: var(--sheet-handle);
  --dismiss-ink: var(--sheet-title);
  --dismiss-fill: var(--sheet-card);
  --dismiss-border: var(--sheet-border);
  position: relative;
  z-index: 1;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  // Preserve the previous top edge: 86% of the safe viewport plus its bottom inset.
  height: calc(86% + var(--sheet-panel-safe-bottom) * 0.14);
  max-height: calc(86% + var(--sheet-panel-safe-bottom) * 0.14);
  padding: 18rpx 0 calc(28rpx + var(--sheet-panel-safe-bottom));
  overflow: hidden;
  border: 1px solid var(--sheet-border);
  border-radius: 54rpx 54rpx 0 0;
  background: var(--sheet-background);
  box-shadow: 0 -4rpx 80rpx var(--sheet-shadow);
  flex-direction: column;
  will-change: transform;
}

.sheet-scrim {
  position: absolute;
  inset: 0;
  background: var(--sheet-scrim);
}

.sheet-report {
  display: flex;
  width: 40rpx;
  height: 72rpx;
  margin-left: 20rpx;
  align-items: center;
  justify-content: center;
  flex: none;
}

.sheet-report image {
  width: 40rpx;
  height: 40rpx;
}

.sheet-scroll {
  box-sizing: border-box;
  width: 100%;
  height: 0;
  min-height: 0;
  flex: 1;
}

.sheet-scroll__inner {
  box-sizing: border-box;
  min-height: calc(100% + 2rpx);
  padding: 12rpx 32rpx 8rpx;
}

.caught-head {
  display: flex;
  align-items: center;
}

.caught-avatar {
  width: 84rpx;
  height: 84rpx;
  flex: none;
  border-radius: 50%;
  overflow: hidden;
}

.caught-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sheet-border);
  background: var(--sheet-card);
}

.caught-avatar--fallback image {
  width: 36rpx;
  height: 36rpx;
}

.caught-user {
  min-width: 0;
  flex: 1;
  margin-left: 18rpx;
}

.caught-name {
  display: block;
  overflow: hidden;
  color: var(--sheet-title);
  font-size: 34rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.caught-place {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.caught-place image {
  width: 22rpx;
  height: 22rpx;
  margin-right: 8rpx;
  flex: none;
}

.caught-place text {
  overflow: hidden;
  color: var(--sheet-secondary);
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.caught-tag {
  margin-left: 16rpx;
  padding: 10rpx 18rpx;
  border: 1px solid var(--sheet-tag-border);
  border-radius: 999rpx;
  color: var(--sheet-tag);
  font-size: 22rpx;
  font-weight: 700;
  flex: none;
}

.caught-photo {
  width: 100%;
  height: 280rpx;
  margin-top: 28rpx;
  border-radius: 28rpx;
}

.caught-copy {
  margin-top: 22rpx;
  padding: 28rpx 26rpx;
  border: 1px solid var(--sheet-border);
  border-radius: 28rpx;
  background: var(--sheet-card);
}

.caught-copy text {
  color: var(--sheet-copy);
  font-size: 28rpx;
  line-height: 44rpx;
}

.caught-notice {
  display: flex;
  align-items: center;
  margin-top: 18rpx;
  padding: 22rpx 24rpx;
  border: 1px solid var(--sheet-border);
  border-radius: 24rpx;
  background: var(--sheet-card);
}

.caught-notice image {
  width: 36rpx;
  height: 36rpx;
  margin-right: 16rpx;
  flex: none;
}

.caught-notice text {
  color: var(--sheet-secondary);
  font-size: 22rpx;
  line-height: 32rpx;
}

.caught-inline-error {
  display: block;
  margin-top: 16rpx;
  color: var(--sheet-info);
  font-size: 22rpx;
}

.reply-button {
  display: flex;
  height: 96rpx;
  margin: 18rpx 32rpx 0;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--sheet-button);
  box-shadow: inset 0 1px 0 var(--sheet-inset);
  color: var(--sheet-button-text);
  font-size: 32rpx;
  font-weight: 800;
  flex: none;
}

.reply-button image {
  width: 72rpx;
  height: 52rpx;
  margin-left: 12rpx;
}

.reply-button--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.sheet-error {
  padding: 48rpx 12rpx;
  color: var(--sheet-title);
  font-size: 26rpx;
  line-height: 38rpx;
  text-align: center;
}

.sheet-error__retry {
  margin-top: 20rpx;
  color: var(--sheet-info);
  font-weight: 800;
}

.sheet-skeleton__line {
  height: 28rpx;
  margin-top: 18rpx;
  border-radius: 14rpx;
  background: var(--sheet-skeleton);
}

.sheet-skeleton__line--name {
  width: 46%;
  height: 36rpx;
  margin-top: 12rpx;
}

.sheet-skeleton__line--short {
  width: 72%;
  margin-top: 14rpx;
}

.caught-copy--loading {
  min-height: 120rpx;
}

.sheet-skeleton__photo {
  height: 280rpx;
  margin-top: 28rpx;
  border-radius: 28rpx;
  background: var(--sheet-skeleton);
}

.caught-sheet-slide-enter-active .sheet-panel {
  animation: caught-sheet-rise 0.56s cubic-bezier(0.25, 0.1, 0.25, 1) both;
}

.caught-sheet-slide-enter-active .sheet-scrim,
.caught-sheet-slide-leave-active .sheet-scrim {
  transition: opacity .28s ease;
}

.caught-sheet-slide-enter-from .sheet-scrim,
.caught-sheet-slide-leave-to .sheet-scrim {
  opacity: 0;
}

.caught-sheet-slide-leave-active .sheet-panel {
  transition: transform .32s cubic-bezier(.4, 0, 1, 1);
}

.caught-sheet-slide-leave-to .sheet-panel {
  transform: translate3d(0, calc(100% + var(--sheet-bottom-offset)), 0);
}

.caught-sheet-slide-leave-active {
  pointer-events: none;
}

@keyframes caught-sheet-rise {
  from {
    opacity: 0;
    transform: translateY(calc(100% + var(--sheet-bottom-offset)));
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .caught-sheet-slide-enter-active .sheet-panel {
    animation: none;
  }

  .caught-sheet-slide-enter-active,
  .caught-sheet-slide-leave-active {
    transition: opacity .12s ease;
  }

  .caught-sheet-slide-enter-from,
  .caught-sheet-slide-leave-to {
    opacity: 0;
  }

  .caught-sheet-slide-enter-active .sheet-scrim,
  .caught-sheet-slide-leave-active .sheet-scrim,
  .caught-sheet-slide-leave-active .sheet-panel {
    transition: none;
  }

  .caught-sheet-slide-leave-to .sheet-panel {
    transform: none;
  }
}
</style>

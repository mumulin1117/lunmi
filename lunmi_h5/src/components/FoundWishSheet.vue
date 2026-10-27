<template>
  <transition name="found-sheet-slide" :duration="{ enter: 360, leave: 320 }" @after-leave="finish_leave">
    <view v-if="visible" class="found-sheet" :style="theme_style">
      <view class="found-sheet__scrim" @click="close" />
      <view class="found-sheet__panel" @click.stop>
        <ResultSheetToolbar @close="close" />
        <scroll-view :key="wish?.wish_id || wishId" class="found-sheet__scroll" scroll-y :scroll-into-view="reply_scroll_target" :show-scrollbar="false">
          <view class="found-sheet__inner">
            <view v-if="is_loading && !wish" class="found-skeleton" aria-hidden="true">
              <view class="found-skeleton__head" />
              <view class="found-skeleton__photo" />
              <view class="found-skeleton__line" />
              <view class="found-skeleton__line found-skeleton__line--short" />
            </view>
            <view v-else-if="load_error && !wish" class="found-error" role="alert">
              <text>{{ $t(load_error) }}</text>
              <view class="found-error__retry" role="button" @click="load_sheet">{{ $t('Try again') }}</view>
            </view>
            <template v-else-if="wish">
              <view class="found-head">
                <view class="found-author" role="button" :aria-label="wish.owner_profile.author_name_is_placeholder ? $t(author_name) : author_name" @click="open_author">
                  <UserAvatar v-if="avatar_url" class="found-avatar" :source="avatar_url" />
                  <view v-else class="found-avatar found-avatar--empty" aria-hidden="true" />
                  <view class="found-identity">
                    <text class="found-name">{{ wish.owner_profile.author_name_is_placeholder ? $t(author_name) : author_name }}</text>
                    <view v-if="place_line" class="found-place">
                      <image src="/static/icon/profile_location.png" mode="aspectFit" />
                      <text>{{ $t(place_line) }}</text>
                    </view>
                  </view>
                </view>
                <view
                  v-if="can_report_author"
                  class="found-more"
                  role="button"
                  :aria-label="$t('More about this wish')"
                  @click="open_report(wish.owner_user_id, author_name)"
                >
                  <image src="/static/icon/vertical_more.png" mode="aspectFit" />
                </view>
              </view>
              <view class="found-photo">
                <view v-if="show_cover_shimmer" class="found-photo__loading">
                  <MediaShimmer class="found-photo__shimmer" :label="$t('Loading wish photo')" />
                </view>
                <image class="found-photo__image" :src="wish_photo" mode="aspectFill" @load="on_photo_load" @error="on_photo_error" />
              </view>
              <view class="found-copy">
                <text>{{ wish.content || $t('This wish has no written note.') }}</text>
              </view>
              <view class="found-meta">
                <view class="found-waiting">
                  <image src="/static/icon/small_start.png" mode="aspectFit" />
                  <text class="found-waiting__count">{{ $t(wish.blessing_count) }}</text>
                  <text class="found-waiting__time">{{ $t(waiting_line) }}</text>
                </view>
                <text v-if="wish.branch_label" class="found-branch">{{ $t(wish.branch_label) }}</text>
              </view>
              <view class="found-replies-label">
                <text>{{ $t('REPLIES ·') }} {{ $t(reply_total) }}</text>
              </view>
              <view v-if="reply_error" class="found-reply-error" role="alert">
                <text>{{ $t(reply_error) }}</text>
                <view role="button" @click="load_sheet">{{ $t('Try again') }}</view>
              </view>
              <view v-else-if="replies.length === 0" class="found-reply-empty">
                <text>{{ $t('No replies yet.') }}</text>
              </view>
              <view v-for="reply in replies" :key="reply.reply_id" class="found-reply">
                <UserAvatar v-if="reply.avatar_url" class="found-reply__avatar" :source="reply.avatar_url" />
                <view v-else class="found-reply__avatar found-reply__avatar--empty" aria-hidden="true" />
                <view class="found-reply__body">
                  <text class="found-reply__name">{{ reply.user_name || $t('Someone') }}</text>
                  <text class="found-reply__copy">{{ reply.content }}</text>
                </view>
                <view
                  v-if="can_delete_reply(reply)"
                  class="found-reply__more"
                  :class="{ 'found-reply__more--pending': Boolean(deleting_reply_id) }"
                  role="button"
                  :aria-label="$t(deleting_reply_id === reply.reply_id ? 'Deleting reply' : 'Delete reply')"
                  :aria-disabled="Boolean(deleting_reply_id)"
                  @click.stop="delete_reply(reply)"
                >
                  <image src="/static/icon/post_details_del.png" mode="aspectFit" />
                </view>
                <view
                  v-else-if="can_report_reply(reply)"
                  class="found-reply__more"
                  role="button"
                  :aria-label="$t(`More about ${reply.user_name || $t('this reply')}`)"
                  @click="open_report(reply.user_id, reply.user_name)"
                >
                  <image src="/static/icon/vertical_more.png" mode="aspectFit" />
                </view>
              </view>
              <view id="found-wish-replies-end" />
            </template>
          </view>
        </scroll-view>
        <text v-if="action_error" class="found-action-error" role="alert">{{ $t(action_error) }}</text>
        <view v-if="wish" class="found-composer">
          <view
            class="bless-button"
            :class="{ 'bless-button--pending': is_blessing, 'bless-button--sent': already_blessed }"
            role="button"
            :aria-label="$t('Bless')"
            :aria-disabled="is_blessing || already_blessed"
            @click="bless_wish"
          >
            <image src="/static/icon/signup_lotus.png" mode="aspectFit" />
            <text>{{ $t(already_blessed && !is_blessing ? 'Blessed' : 'Bless') }}</text>
          </view>
          <input
            v-model="reply_draft"
            class="reply-input"
            type="text"
            maxlength="200"
            :placeholder="$t('Reply...')"
            :placeholder-style="placeholder_style"
            :disabled="!wish.reply_enabled"
            confirm-type="send"
            @confirm="send_reply"
          />
          <view
            class="send-button"
            role="button"
            :aria-label="$t('Send reply')"
            :aria-disabled="is_replying || !wish.reply_enabled"
            @click="send_reply"
          >
            <image src="/static/icon/send_wish_comment_button.png" mode="aspectFit" />
          </view>
        </view>
        <BottomSafeArea />
      </view>
      <ReportUserSheet
        :visible="is_report_open"
        :target-name="report_name"
        :target-user-id="report_user_id"
        @update:visible="is_report_open = $event"
      />
    </view>
  </transition>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { addLmWishBlessing, addLmWishReply, deleteLmWishReply } from '@/api/wish'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import ResultSheetToolbar from '@/components/ResultSheetToolbar.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import MediaShimmer from '@/components/MediaShimmer.vue'
import { storeGlobal } from '@/stores/store'
import { WISH_DETAIL_COVER } from '@/utils/wishDetailPresentation'
import { can_delete_owned_object } from '@/utils/deleteConfirmPresentation'
import {
  clear_found_wish_random_detail,
  read_found_wish_random_detail,
  remove_found_wish_cached_reply
} from '@/utils/foundWishRandomCacheStorage'
import {
  REPLY_MAX_LENGTH,
  build_blessing_params,
  build_reply_params,
  format_place_line,
  map_found_replies_from_random_detail,
  map_found_wish,
  read_created_reply_id
} from '@/utils/foundWishPresentation'

const props = defineProps({
  visible: { type: Boolean, default: false },
  wishId: { type: String, default: '' }
})
const emit = defineEmits(['update:visible', 'open-profile'])

const wish = ref(null)
const replies = ref([])
const reply_draft = ref('')
const reply_scroll_target = ref('')
const load_error = ref('')
const reply_error = ref('')
const action_error = ref('')
const is_loading = ref(false)
const is_blessing = ref(false)
const is_replying = ref(false)
const deleting_reply_id = ref('')
const already_blessed = ref(false)
const blessings_ready = ref(false)
const is_report_open = ref(false)
const report_user_id = ref('')
const report_name = ref('')
const is_sheet_active = ref(true)
const is_photo_loading = ref(false)
const photo_error = ref(false)
let write_contexts = []
let load_token = 0
let reply_delete_context = null
let reply_send_context = null

const theme_style = {
  '--found-scrim': theme.colors.surface.scrim,
  '--found-panel': theme.colors.dialog.background,
  '--found-border': theme.colors.surface.border,
  '--found-title': theme.colors.text.title,
  '--found-copy': theme.colors.text.secondary,
  '--found-muted': theme.colors.text.tertiary,
  '--found-handle': theme.colors.surface.outline,
  '--found-photo': theme.colors.surface.card,
  '--found-copy-surface': theme.colors.surface.card_soft,
  '--found-branch': theme.colors.status.coin,
  '--found-bless': theme.colors.button.primary,
  '--found-bless-text': theme.colors.button.text,
  '--found-input': theme.colors.surface.deep,
  '--found-skeleton': theme.colors.surface.card,
  '--found-error': theme.colors.status.info,
  '--media-loading-surface': theme.colors.surface.media_shimmer,
  '--media-loading-shine': theme.colors.surface.media_shimmer_shine
}

const placeholder_style = `color: ${theme.colors.text.secondary}`
const account_store = storeGlobal()
const author_name = computed(() => wish.value?.owner_profile.author_name || '')
const avatar_url = computed(() => wish.value?.owner_profile.avatar_url || '')
const location_label = computed(() => wish.value?.owner_profile.location_label || '')
const place_line = computed(() => format_place_line(
  location_label.value,
  wish.value?.published_label || ''
))
const waiting_line = computed(() => ['waiting', wish.value?.days_left_label].filter(Boolean).join(' · '))
const reply_total = computed(() => Math.max(replies.value.length, wish.value?.reply_count || 0))
const cover_img_url = computed(() => `${wish.value?.img_url || ''}`.trim())
const wish_photo = computed(() => {
  if (!cover_img_url.value || photo_error.value) return WISH_DETAIL_COVER
  return cover_img_url.value
})
const show_cover_shimmer = computed(() => (
  Boolean(cover_img_url.value) && !photo_error.value && is_photo_loading.value
))
watch(cover_img_url, (url) => {
  photo_error.value = false
  is_photo_loading.value = Boolean(url)
})
const on_photo_load = () => { is_photo_loading.value = false }
const on_photo_error = () => {
  if (cover_img_url.value) photo_error.value = true
  is_photo_loading.value = false
}
const can_report_author = computed(() => (
  Boolean(wish.value?.owner_user_id)
  && `${wish.value.owner_user_id}` !== `${account_store.userId || ''}`
))

const can_report_reply = (reply) => (
  Boolean(reply?.user_id)
  && !reply.is_local
  && `${reply.user_id}` !== `${account_store.userId || ''}`
)

const can_delete_reply = (reply) => (
  Boolean(reply?.reply_id)
  && !reply.is_local
  && can_delete_owned_object(reply.user_id, account_store.userId)
)

const cancel_load = () => {
  load_token += 1
}

const reset_sheet = () => {
  reply_send_context?.cancel?.()
  reply_send_context = null
  is_replying.value = false
  reply_scroll_target.value = ''
  reply_delete_context?.cancel?.()
  reply_delete_context = null
  deleting_reply_id.value = ''
  wish.value = null
  replies.value = []
  reply_draft.value = ''
  load_error.value = ''
  reply_error.value = ''
  action_error.value = ''
  is_loading.value = false
  already_blessed.value = false
  blessings_ready.value = false
  is_report_open.value = false
  report_user_id.value = ''
  report_name.value = ''
  photo_error.value = false
  is_photo_loading.value = false
}

const close = () => {
  if (is_blessing.value || deleting_reply_id.value) return
  cancel_load()
  is_report_open.value = false
  clear_found_wish_random_detail()
  emit('update:visible', false)
}

const finish_leave = () => {
  if (!is_sheet_active.value || props.visible) return
  reset_sheet()
}

const open_author = () => {
  if (!wish.value?.owner_user_id) return
  emit('open-profile', wish.value.owner_user_id)
}

const open_report = (user_id, name) => {
  if (!user_id) return
  report_user_id.value = `${user_id}`
  report_name.value = `${name || ''}`.trim() || 'this user'
  is_report_open.value = true
}

const apply_random_detail = (detail, token) => {
  if (!is_sheet_active.value || !props.visible || load_token !== token) return false
  const mapped = map_found_wish(detail)
  if (!mapped || mapped.wish_id !== props.wishId) return false
  wish.value = mapped
  replies.value = map_found_replies_from_random_detail(detail)
  reply_error.value = ''
  already_blessed.value = false
  blessings_ready.value = true
  action_error.value = ''
  return true
}

const load_sheet = () => {
  if (!props.visible || !props.wishId || !is_sheet_active.value) return
  cancel_load()
  const token = load_token + 1
  load_token = token
  is_loading.value = !wish.value
  load_error.value = ''
  reply_error.value = ''
  action_error.value = ''
  try {
    const cached_detail = read_found_wish_random_detail({
      expected_user_id: account_store.userId,
      wish_id: props.wishId
    })
    if (cached_detail) {
      const applied = apply_random_detail(cached_detail, token)
      if (!applied) {
        load_error.value = 'This wish is no longer available.'
        wish.value = null
        clear_found_wish_random_detail()
        return
      }
      return
    }
    load_error.value = 'The found wish is unavailable. Please find a wish again.'
    wish.value = null
  } catch (error) {
    if (!is_sheet_active.value || !props.visible || load_token !== token) return
    load_error.value = error?.message || 'Unable to load this wish.'
    wish.value = null
  } finally {
    if (is_sheet_active.value && load_token === token) is_loading.value = false
  }
}

const bless_wish = async () => {
  if (is_blessing.value || !wish.value) return
  if (!account_store.userId) {
    action_error.value = 'Sign in to bless this wish.'
    return
  }
  if (!blessings_ready.value) {
    action_error.value = 'Unable to check blessings.'
    return
  }
  if (already_blessed.value) return
  const target_id = wish.value.wish_id
  const previous_count = wish.value.blessing_count
  wish.value = { ...wish.value, blessing_count: previous_count + 1 }
  already_blessed.value = true
  is_blessing.value = true
  action_error.value = ''
  const context = {}
  write_contexts.push(context)
  const result = await addLmWishBlessing(build_blessing_params({
    user_id: account_store.userId,
    wish_id: wish.value.wish_id,
    created_date: new Date().toISOString()
  }), context)
  is_blessing.value = false
  if (!is_sheet_active.value || !props.visible || wish.value?.wish_id !== target_id) return
  if (!result?.success) {
    wish.value = wish.value ? { ...wish.value, blessing_count: previous_count } : wish.value
    already_blessed.value = false
    action_error.value = result?.error || 'Unable to bless this wish.'
    return
  }
}

const delete_reply = async (reply) => {
  if (!is_sheet_active.value || !props.visible || !wish.value || deleting_reply_id.value || !can_delete_reply(reply)) return
  if (!replies.value.some((item) => item.reply_id === reply.reply_id && can_delete_reply(item))) return
  const target_wish_id = wish.value.wish_id
  const target_reply_id = reply.reply_id
  const current_user_id = account_store.userId
  const context = {}
  reply_delete_context = context
  deleting_reply_id.value = target_reply_id
  action_error.value = ''
  try {
    const result = await deleteLmWishReply({ wishReplyId: target_reply_id }, context)
    const same_account = `${account_store.userId}` === `${current_user_id}`
    if (result?.success && result.data === true && same_account) {
      remove_found_wish_cached_reply({ user_id: current_user_id, wish_id: target_wish_id, reply_id: target_reply_id })
    }
    if (!is_sheet_active.value || !props.visible || wish.value?.wish_id !== target_wish_id || !same_account) return
    if (!result?.success || result.data !== true) {
      action_error.value = result?.error || 'Unable to delete this reply.'
      return
    }
    const was_visible = replies.value.some((item) => item.reply_id === target_reply_id)
    replies.value = replies.value.filter((item) => item.reply_id !== target_reply_id)
    if (was_visible) wish.value = { ...wish.value, reply_count: Math.max(0, wish.value.reply_count - 1) }
  } catch (error) {
    if (is_sheet_active.value && props.visible && wish.value?.wish_id === target_wish_id) {
      action_error.value = error?.message || 'Unable to delete this reply.'
    }
  } finally {
    if (reply_delete_context === context) {
      reply_delete_context = null
      deleting_reply_id.value = ''
    }
  }
}

// feedback_mode: control_pending — show the reply in this sheet before the API completes.
const send_reply = async () => {
  if (!is_sheet_active.value || !props.visible || is_replying.value || !wish.value) return
  if (!wish.value.reply_enabled) {
    action_error.value = 'Replies are closed for this wish.'
    return
  }
  const content = reply_draft.value.trim().slice(0, REPLY_MAX_LENGTH)
  if (!content) return
  if (!account_store.userId) {
    action_error.value = 'Sign in to reply.'
    return
  }
  const temp_id = `local-${Date.now()}`
  const target_wish_id = wish.value.wish_id
  const current_user_id = account_store.userId
  const context = {}
  reply_send_context = context
  const is_current = () => (
    is_sheet_active.value
    && props.visible
    && reply_send_context === context
    && wish.value?.wish_id === target_wish_id
    && `${account_store.userId}` === `${current_user_id}`
  )
  const previous_count = wish.value.reply_count
  const optimistic = {
    reply_id: temp_id,
    user_id: `${account_store.userId}`,
    user_name: `${account_store.userInfo?.userName || ''}`.trim() || 'You',
    avatar_url: `${account_store.userInfo?.userImgUrl || ''}`,
    content,
    is_local: true
  }
  replies.value = [...replies.value, optimistic]
  wish.value = { ...wish.value, reply_count: previous_count + 1 }
  reply_draft.value = ''
  is_replying.value = true
  action_error.value = ''
  reply_scroll_target.value = ''
  nextTick(() => {
    if (is_sheet_active.value && props.visible && wish.value?.wish_id === target_wish_id) {
      reply_scroll_target.value = 'found-wish-replies-end'
    }
  })
  const rollback_reply = (error) => {
    if (!is_current()) return
    const was_visible = replies.value.some((item) => item.reply_id === temp_id)
    replies.value = replies.value.filter((item) => item.reply_id !== temp_id)
    if (was_visible) wish.value = { ...wish.value, reply_count: Math.max(0, wish.value.reply_count - 1) }
    if (!reply_draft.value) reply_draft.value = content
    action_error.value = error || 'Unable to send this reply.'
  }
  try {
    const result = await addLmWishReply(build_reply_params({
      user_id: current_user_id,
      wish_id: target_wish_id,
      content,
      created_date: new Date().toISOString()
    }), context)
    if (!is_current()) return
    if (!result?.success) {
      rollback_reply(result?.error)
      return
    }
    const reply_id = read_created_reply_id(result.data)
    if (reply_id) {
      replies.value = replies.value.map((item) => (
        item.reply_id === temp_id ? { ...item, reply_id, is_local: false } : item
      ))
    }
  } catch (error) {
    rollback_reply(error?.message)
  } finally {
    if (reply_send_context === context) {
      reply_send_context = null
      is_replying.value = false
    }
  }
}

watch(
  () => [props.visible, props.wishId],
  ([visible, wish_id], previous = []) => {
    if (!visible) {
      cancel_load()
      reply_send_context?.cancel?.()
      reply_send_context = null
      reply_delete_context?.cancel?.()
      reply_delete_context = null
      return
    }
    if (!previous[0] || previous[1] !== wish_id) reset_sheet()
    load_sheet()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  is_sheet_active.value = false
  cancel_load()
  write_contexts.forEach((item) => item.cancel?.())
  reply_send_context?.cancel?.()
  reply_send_context = null
  reply_delete_context?.cancel?.()
})
</script>

<style scoped lang="scss">
.found-sheet {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: flex;
  align-items: flex-end;
}

.found-sheet__scrim {
  position: absolute;
  inset: 0;
  background: var(--found-scrim);
  opacity: 1;
}

.found-sheet__panel {
  --dismiss-handle: var(--found-handle);
  --dismiss-ink: var(--found-title);
  --dismiss-fill: var(--found-photo);
  --dismiss-border: var(--found-border);
  position: relative;
  z-index: 1;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 92%;
  max-height: 92%;
  overflow: hidden;
  flex-direction: column;
  padding: 16rpx 28rpx 12rpx;
  border: 1px solid var(--found-border);
  border-bottom: 0px;
  border-radius: 40rpx 40rpx 0 0;
  background: var(--found-panel);
  transform: translate3d(0, 0, 0);
}

.found-sheet__scroll {
  height: 0;
  min-height: 0;
  flex: 1;
}

.found-sheet__inner {
  box-sizing: border-box;
  min-height: calc(100% + 2rpx);
  padding-bottom: 16rpx;
}

.found-skeleton__head,
.found-skeleton__line,
.found-skeleton__photo {
  border-radius: 24rpx;
  background: var(--found-skeleton);
}

.found-skeleton__head {
  width: 70%;
  height: 88rpx;
}

.found-skeleton__photo {
  height: 280rpx;
  margin-top: 24rpx;
}

.found-skeleton__line {
  height: 32rpx;
  margin-top: 20rpx;
}

.found-skeleton__line--short {
  width: 46%;
}

.found-error,
.found-reply-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--found-title);
  font-size: 26rpx;
  line-height: 1.4;
}

.found-error__retry,
.found-reply-error view {
  margin-left: 24rpx;
  color: var(--found-error);
  font-size: 26rpx;
  font-weight: 700;
}

.found-head {
  display: flex;
  align-items: center;
}

.found-author {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
}

.found-avatar,
.found-reply__avatar {
  width: 84rpx;
  height: 84rpx;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
}

.found-avatar--empty,
.found-reply__avatar--empty {
  background: var(--found-skeleton);
}

.found-identity {
  min-width: 0;
  margin-left: 18rpx;
}

.found-name,
.found-reply__name {
  display: block;
  color: var(--found-title);
  font-size: 32rpx;
  font-weight: 700;
}

.found-place {
  display: flex;
  margin-top: 6rpx;
  align-items: center;
}

.found-place image {
  width: 24rpx;
  height: 24rpx;
  margin-right: 8rpx;
}

.found-place text {
  color: var(--found-muted);
  font-size: 22rpx;
}

.found-more,
.found-reply__more {
  display: flex;
  width: 56rpx;
  height: 60rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.found-more image,
.found-reply__more image {
  width: 56rpx;
  height: 60rpx;
}

.found-reply__more--pending { opacity: 0.5; }

.found-photo {
  position: relative;
  width: 100%;
  height: 300rpx;
  margin-top: 24rpx;
  border-radius: 28rpx;
  overflow: hidden;
  background: var(--found-photo);
}

.found-photo__image {
  display: block;
  width: 100%;
  height: 100%;
}

.found-photo__loading {
  position: absolute;
  z-index: 1;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--media-loading-surface);
}

.found-photo__shimmer {
  width: 100%;
  height: 100%;
}

.found-copy {
  margin-top: 20rpx;
  padding: 28rpx 24rpx;
  border: 1px solid var(--found-border);
  border-radius: 28rpx;
  background: var(--found-copy-surface);
}

.found-copy text {
  color: var(--found-title);
  font-size: 28rpx;
  line-height: 1.45;
}

.found-meta {
  display: flex;
  margin-top: 20rpx;
  align-items: center;
  justify-content: space-between;
}

.found-waiting {
  display: flex;
  align-items: center;
}

.found-waiting image {
  width: 28rpx;
  height: 28rpx;
  margin-right: 10rpx;
}

.found-waiting__count {
  color: var(--found-title);
  font-size: 28rpx;
  font-weight: 700;
}

.found-waiting__time {
  margin-left: 14rpx;
  color: var(--found-muted);
  font-size: 22rpx;
}

.found-branch {
  padding: 6rpx 16rpx;
  border: 1px solid var(--found-branch);
  border-radius: 999rpx;
  color: var(--found-branch);
  font-size: 20rpx;
  font-weight: 700;
}

.found-replies-label {
  margin-top: 28rpx;
  color: var(--found-muted);
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.found-reply-error,
.found-reply-empty {
  margin-top: 16rpx;
}

.found-reply-empty text {
  color: var(--found-copy);
  font-size: 26rpx;
}

.found-reply {
  display: flex;
  margin-top: 20rpx;
  align-items: flex-start;
}

.found-reply__avatar {
  width: 72rpx;
  height: 72rpx;
}

.found-reply__body {
  min-width: 0;
  flex: 1;
  margin-left: 16rpx;
}

.found-reply__name {
  font-size: 28rpx;
}

.found-reply__copy {
  display: block;
  margin-top: 6rpx;
  color: var(--found-copy);
  font-size: 26rpx;
  line-height: 1.4;
}

.found-action-error {
  display: block;
  margin-top: 12rpx;
  color: var(--found-error);
  font-size: 24rpx;
  line-height: 1.4;
}

.found-composer {
  display: flex;
  flex-shrink: 0;
  margin-top: 16rpx;
  align-items: center;
}

.bless-button {
  display: flex;
  height: 84rpx;
  padding: 0 28rpx;
  flex-shrink: 0;
  align-items: center;
  border-radius: 999rpx;
  background: var(--found-bless);
  color: var(--found-bless-text);
  font-size: 28rpx;
  font-weight: 700;
}

.bless-button--pending,
.bless-button--sent {
  opacity: 0.7;
}

.bless-button image {
  width: 36rpx;
  height: 36rpx;
  margin-right: 8rpx;
}

.reply-input {
  height: 84rpx;
  min-width: 0;
  flex: 1;
  margin-left: 16rpx;
  padding: 0 28rpx;
  border: 1px solid var(--found-border);
  border-radius: 999rpx;
  background: var(--found-input);
  color: var(--found-title);
  font-size: 26rpx;
}

.send-button {
  display: flex;
  width: 84rpx;
  height: 84rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.send-button image {
  width: 84rpx;
  height: 84rpx;
}

.found-sheet-slide-enter-active .found-sheet__scrim,
.found-sheet-slide-leave-active .found-sheet__scrim {
  transition: opacity .28s ease;
}

.found-sheet-slide-enter-active .found-sheet__panel {
  transition: transform .36s cubic-bezier(.22, .8, .25, 1);
}

.found-sheet-slide-leave-active {
  pointer-events: none;
}

.found-sheet-slide-leave-active .found-sheet__panel {
  transition: transform .32s cubic-bezier(.4, 0, 1, 1);
}

.found-sheet-slide-enter-from .found-sheet__scrim,
.found-sheet-slide-leave-to .found-sheet__scrim {
  opacity: 0;
}

.found-sheet-slide-enter-from .found-sheet__panel,
.found-sheet-slide-leave-to .found-sheet__panel {
  transform: translate3d(0, 100%, 0);
}

@media (prefers-reduced-motion: reduce) {
  .found-sheet-slide-enter-active,
  .found-sheet-slide-leave-active {
    transition: opacity .12s ease;
  }

  .found-sheet-slide-enter-from,
  .found-sheet-slide-leave-to {
    opacity: 0;
  }

  .found-sheet-slide-enter-active .found-sheet__scrim,
  .found-sheet-slide-leave-active .found-sheet__scrim,
  .found-sheet-slide-enter-active .found-sheet__panel,
  .found-sheet-slide-leave-active .found-sheet__panel {
    transition: none;
  }

  .found-sheet-slide-enter-from .found-sheet__panel,
  .found-sheet-slide-leave-to .found-sheet__panel {
    transform: none;
  }
}
</style>

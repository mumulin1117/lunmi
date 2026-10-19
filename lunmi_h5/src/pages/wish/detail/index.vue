<template>
  <PageTransition ref="page_transition" class="detail-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="detail-header">
        <view class="header-side">
          <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
          <view class="header-copy">
            <text class="header-title">{{ $t('Wish details') }}</text>
            <view class="header-line" />
          </view>
        </view>
        <image
          v-if="can_delete"
          class="delete-button"
          src="/static/icon/post_details_del.png"
          mode="aspectFit"
          role="button"
          :aria-label="$t('Delete wish')"
          :aria-disabled="is_deleting || Boolean(deleting_reply_id)"
          @click="open_delete"
        />
      </view>
      <view v-if="is_loading && !wish" class="detail-state">
        <WishDetailSkeleton />
      </view>
      <view v-else-if="load_error && !wish" class="detail-state detail-state--error" role="alert">
        <text class="detail-error__copy">{{ $t(load_error) }}</text>
        <view class="detail-error__retry" role="button" @click="load_detail">{{ $t('Try again') }}</view>
      </view>
      <scroll-view v-else-if="wish" class="detail-scroll" scroll-y :show-scrollbar="false">
        <view class="detail-scroll__inner">
          <view class="detail-photo">
            <view v-if="show_cover_shimmer" class="detail-photo__loading">
              <MediaShimmer class="detail-photo__shimmer" :label="$t('Loading wish photo')" />
            </view>
            <image
              class="detail-photo__image"
              :src="detail_cover_src"
              mode="aspectFill"
              @load="on_cover_load"
              @error="on_cover_error"
            />
            <text v-if="wish.badge" class="detail-badge">{{ $t(wish.badge) }}</text>
          </view>
          <text class="detail-content">{{ wish.content || $t('A wish with no written note.') }}</text>
          <view class="detail-waiting">
            <image src="/static/icon/small_start.png" mode="aspectFit" />
            <text>{{ $t(wish.waiting_label) }}</text>
          </view>
          <view v-if="came_true" class="detail-true">
            <image src="/static/icon/wish_became_true.png" mode="aspectFit" />
            <text>{{ $t('It came true') }}</text>
          </view>
          <text v-if="outcome_text" class="detail-outcome">{{ $t(outcome_text) }}</text>
          <text v-if="load_error" class="detail-inline-error" role="alert">{{ $t(load_error) }}</text>
          <view class="detail-replies-label">
            <text>{{ $t('REPLIES ·') }} {{ $t(reply_total) }}</text>
            <view class="detail-replies-line" />
          </view>
          <view v-if="reply_error" class="detail-reply-error" role="alert">
            <text>{{ $t(reply_error) }}</text>
            <view role="button" @click="load_detail">{{ $t('Try again') }}</view>
          </view>
          <view v-else-if="replies.length === 0" class="detail-reply-empty">
            <text>{{ $t('No replies yet.') }}</text>
          </view>
          <view v-for="reply in replies" :key="reply.reply_id" class="detail-reply">
            <UserAvatar v-if="reply.avatar_url" class="detail-reply__avatar" :source="reply.avatar_url" />
            <view v-else class="detail-reply__avatar detail-reply__avatar--empty" aria-hidden="true" />
            <view class="detail-reply__body">
              <text class="detail-reply__name">{{ reply.user_name || $t('Someone') }}</text>
              <text class="detail-reply__copy">{{ reply.content }}</text>
            </view>
            <view
              v-if="can_delete_reply(reply)"
              class="detail-reply__more"
              :class="{ 'detail-reply__more--pending': Boolean(deleting_reply_id) }"
              role="button"
              :aria-label="$t(deleting_reply_id === reply.reply_id ? 'Deleting reply' : 'Delete reply')"
              :aria-disabled="Boolean(deleting_reply_id)"
              @click.stop="open_reply_delete(reply)"
            >
              <image src="/static/icon/post_details_del.png" mode="aspectFit" />
            </view>
            <view
              v-else-if="can_report_reply(reply)"
              class="detail-reply__more"
              role="button"
              :aria-label="$t(`More about ${reply.user_name || $t('this reply')}`)"
              @click="open_report(reply)"
            >
              <image src="/static/icon/vertical_more.png" mode="aspectFit" />
            </view>
          </view>
        </view>
      </scroll-view>
      <text v-if="action_error" class="detail-action-error" role="alert">{{ $t(action_error) }}</text>
      <view v-if="wish" class="detail-footer">
        <view class="detail-composer">
          <UserAvatar v-if="self_avatar" class="detail-composer__avatar" :source="self_avatar" />
          <view v-else class="detail-composer__avatar detail-composer__avatar--empty" aria-hidden="true" />
          <input
            v-model="reply_draft"
            class="detail-composer__input"
            type="text"
            :maxlength="REPLY_MAX_LENGTH"
            :placeholder="$t('Join the conversation...')"
            :placeholder-style="placeholder_style"
            :disabled="!wish.reply_enabled || is_replying"
            confirm-type="send"
            @confirm="send_reply"
          />
          <view
            class="detail-composer__send"
            role="button"
            :aria-label="$t('Send reply')"
            :aria-disabled="is_replying || !wish.reply_enabled"
            @click="send_reply"
          >
            <image src="/static/icon/send_wish_comment_button.png" mode="aspectFit" />
          </view>
        </view>
        <view v-if="can_fulfill" class="fulfill-button" role="button" @click="open_fulfill">
          <text>{{ $t('It came true') }}</text>
        </view>
      </view>
    </view>
    <BottomSafeArea />
    <DeleteConfirmDialog
      :visible="is_reply_delete_visible"
      :title="$t('Delete this reply?')"
      :copy="$t('This reply will be removed. The wish stays.')"
      :error="reply_delete_error"
      :pending="Boolean(deleting_reply_id)"
      @cancel="close_reply_delete"
      @confirm="confirm_reply_delete"
    />
    <DeleteConfirmDialog
      :visible="is_delete_visible"
      :title="$t(delete_copy.title)"
      :copy="$t(delete_copy.copy)"
      :error="delete_error"
      :pending="is_deleting"
      @cancel="close_delete"
      @confirm="confirm_delete"
    />
    <ReportUserSheet
      :visible="is_report_open"
      :target-name="report_name"
      :target-user-id="report_user_id"
      @update:visible="is_report_open = $event"
    />
    <SuccessToast :message="$t(success_toast)" @dismiss="success_toast = ''" />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectUserInfo } from '@/api/common'
import {
  addLmWishReply,
  deleteLmWishById,
  deleteLmWishReply,
  selectLmWishOutcomePage,
  selectLmWishPage,
  selectLmWishReplyPage
} from '@/api/wish'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import PageTransition from '@/components/PageTransition.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import SuccessToast from '@/components/SuccessToast.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import MediaShimmer from '@/components/MediaShimmer.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import WishDetailSkeleton from '@/components/WishDetailSkeleton.vue'
import { take_success_toast } from '@/utils/successToast'
import { storeGlobal } from '@/stores/store'
import { remove_found_wish_cached_reply } from '@/utils/foundWishRandomCacheStorage'
import {
  DELETE_COPY,
  DELETE_OBJECT,
  build_delete_wish_params,
  build_deleted_result_url,
  can_delete_owned_object
} from '@/utils/deleteConfirmPresentation'
import {
  REPLY_MAX_LENGTH,
  build_reply_params,
  map_found_replies,
  read_created_reply_id,
  read_wish_record
} from '@/utils/foundWishPresentation'
import { map_public_user_profile } from '@/utils/profilePresentation'
import {
  WISH_DETAIL_COVER,
  build_fulfill_url,
  map_wish_detail,
  read_published_outcome,
  read_wish_detail_query
} from '@/utils/wishDetailPresentation'

const page_transition = ref(null)
const wish_id = ref('')
const source_page = ref('')
const wish = ref(null)
const outcome_text = ref('')
const outcome_ready = ref(false)
const replies = ref([])
const reply_draft = ref('')
const is_loading = ref(true)
const load_error = ref('')
const reply_error = ref('')
const action_error = ref('')
const is_replying = ref(false)
const deleting_reply_id = ref('')
const is_reply_delete_visible = ref(false)
const reply_delete_target = ref(null)
const reply_delete_error = ref('')
const is_delete_visible = ref(false)
const is_deleting = ref(false)
const delete_error = ref('')
const is_report_open = ref(false)
const report_user_id = ref('')
const report_name = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let allow_route_back = false
let load_contexts = []
let load_token = 0
let reply_context = {}
let delete_context = {}
let reply_delete_context = null

const theme_style = {
  '--detail-background': theme.colors.page.background,
  '--detail-title': theme.colors.text.title,
  '--detail-copy': theme.colors.text.secondary,
  '--detail-muted': theme.colors.text.tertiary,
  '--detail-on-media': theme.colors.text.on_media,
  '--detail-border': theme.colors.surface.border,
  '--detail-back': theme.colors.surface.deep,
  '--detail-line': theme.colors.lantern_detail.title_line,
  '--detail-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--detail-card': theme.colors.surface.card,
  '--detail-badge': theme.colors.status.coin,
  '--detail-waiting': theme.colors.status.coin,
  '--detail-true': theme.colors.status.success,
  '--detail-button': theme.colors.button.primary,
  '--detail-button-text': theme.colors.button.text,
  '--detail-skeleton': theme.colors.surface.card,
  '--media-loading-surface': theme.colors.surface.media_shimmer,
  '--media-loading-shine': theme.colors.surface.media_shimmer_shine,
  '--detail-error': theme.colors.status.info,
  '--detail-input': theme.colors.surface.deep,
  background: theme.colors.page.background
}

const placeholder_style = `color: ${theme.colors.text.secondary}`

const cover_img_url = computed(() => `${wish.value?.img_url || ''}`.trim())
const cover_load_failed = ref(false)
const is_cover_loading = ref(false)
const detail_cover_src = computed(() => {
  if (!cover_img_url.value || cover_load_failed.value) return WISH_DETAIL_COVER
  return cover_img_url.value
})
const show_cover_shimmer = computed(() => (
  Boolean(cover_img_url.value) && !cover_load_failed.value && is_cover_loading.value
))

watch(cover_img_url, (url) => {
  cover_load_failed.value = false
  is_cover_loading.value = Boolean(url)
})

const on_cover_load = () => {
  is_cover_loading.value = false
}

const on_cover_error = () => {
  if (cover_img_url.value) cover_load_failed.value = true
  is_cover_loading.value = false
}
const delete_copy = DELETE_COPY[DELETE_OBJECT.WISH]
const account_store = storeGlobal()
const success_toast = ref('')
const has_outcome = ref(false)
const self_avatar = computed(() => `${account_store.userInfo?.userImgUrl || ''}`)
const can_delete = computed(() => can_delete_owned_object(wish.value?.owner_user_id, account_store.userId))
const came_true = computed(() => Boolean(wish.value && (wish.value.is_answered || has_outcome.value)))
const can_fulfill = computed(() => (
  can_delete.value
  && outcome_ready.value
  && !has_outcome.value
  && wish.value?.is_published
  && !wish.value?.is_answered
))
const reply_total = computed(() => Math.max(replies.value.length, wish.value?.reply_count || 0))

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
  load_contexts.forEach((item) => item.cancel?.())
  load_contexts = []
}

const apply_replies = async (items) => {
  const ids = [...new Set(items.map((item) => item.user_id).filter(Boolean))]
  const contexts = ids.map(() => ({}))
  load_contexts = [...load_contexts, ...contexts]
  const profiles = {}
  await Promise.all(ids.map(async (user_id, index) => {
    if (`${user_id}` === `${account_store.userId || ''}`) {
      profiles[user_id] = {
        user_name: `${account_store.userInfo?.userName || ''}`.trim() || 'You',
        avatar_url: self_avatar.value
      }
      return
    }
    const result = await selectUserInfo({ userId: user_id }, contexts[index])
    if (!result?.success) return
    const profile = map_public_user_profile(result.data)
    profiles[user_id] = {
      user_name: profile.username || 'Someone',
      avatar_url: profile.avatar_url
    }
  }))
  return items.map((item) => ({
    ...item,
    user_name: profiles[item.user_id]?.user_name || '',
    avatar_url: profiles[item.user_id]?.avatar_url || ''
  }))
}

const load_detail = async () => {
  if (!is_page_active.value || is_leaving.value || is_deleting.value || deleting_reply_id.value) return
  if (!wish_id.value) {
    wish.value = null
    load_error.value = 'This wish cannot be opened.'
    is_loading.value = false
    return
  }
  cancel_load()
  const token = load_token + 1
  load_token = token
  const contexts = [{}, {}, {}]
  load_contexts = contexts
  if (!wish.value) is_loading.value = true
  load_error.value = ''
  reply_error.value = ''
  const [wish_result, outcome_result, reply_result] = await Promise.all([
    selectLmWishPage({ wishId: wish_id.value, current: 1, size: 1 }, contexts[0]),
    selectLmWishOutcomePage({ wishId: wish_id.value, current: 1, size: 20 }, contexts[1]),
    selectLmWishReplyPage({ wishId: wish_id.value, current: 1, size: 20 }, contexts[2])
  ])
  if (!is_page_active.value || is_leaving.value || load_token !== token) return
  if (!wish_result?.success) {
    if (!wish.value) wish.value = null
    load_error.value = wish_result?.error || 'Unable to load this wish.'
    is_loading.value = false
    return
  }
  const mapped = map_wish_detail(read_wish_record(wish_result.data))
  if (!mapped) {
    wish.value = null
    load_error.value = 'This wish is no longer available.'
    is_loading.value = false
    return
  }
  wish.value = mapped
  if (!outcome_result?.success) {
    outcome_ready.value = false
    has_outcome.value = false
    outcome_text.value = ''
    load_error.value = outcome_result?.error || 'Unable to check whether this wish came true.'
  } else {
    const outcome = read_published_outcome(outcome_result.data)
    outcome_ready.value = true
    has_outcome.value = Boolean(outcome)
    outcome_text.value = outcome?.outcome_text || ''
  }
  if (!reply_result?.success) {
    reply_error.value = reply_result?.error || 'Unable to load replies.'
    replies.value = []
    is_loading.value = false
    return
  }
  const next_replies = await apply_replies(map_found_replies(reply_result.data))
  if (!is_page_active.value || is_leaving.value || load_token !== token) return
  replies.value = next_replies
  is_loading.value = false
}

const open_reply_delete = (reply) => {
  if (!is_page_active.value || is_leaving.value || is_delete_visible.value || is_deleting.value
    || deleting_reply_id.value || !wish.value || !can_delete_reply(reply)) return
  const target = replies.value.find((item) => item.reply_id === reply.reply_id && can_delete_reply(item))
  if (!target) return
  reply_delete_target.value = {
    reply_id: target.reply_id,
    wish_id: wish.value.wish_id,
    user_id: `${account_store.userId}`
  }
  reply_delete_error.value = ''
  is_reply_delete_visible.value = true
}

const close_reply_delete = () => {
  if (deleting_reply_id.value) return
  is_reply_delete_visible.value = false
  reply_delete_target.value = null
  reply_delete_error.value = ''
}

const confirm_reply_delete = async () => {
  const target = reply_delete_target.value
  if (!is_reply_delete_visible.value || !target || wish.value?.wish_id !== target.wish_id
    || `${account_store.userId}` !== target.user_id) return
  const reply = replies.value.find((item) => item.reply_id === target.reply_id)
  if (!is_page_active.value || is_leaving.value || !wish.value || deleting_reply_id.value || !can_delete_reply(reply)) return
  const target_wish_id = wish.value.wish_id
  const target_reply_id = reply.reply_id
  const current_user_id = account_store.userId
  const context = {}
  reply_delete_context = context
  deleting_reply_id.value = target_reply_id
  reply_delete_error.value = ''
  action_error.value = ''
  cancel_load()
  is_loading.value = false
  try {
    const result = await deleteLmWishReply({ wishReplyId: target_reply_id }, context)
    const same_account = `${account_store.userId}` === `${current_user_id}`
    if (result?.success && result.data === true && same_account) {
      remove_found_wish_cached_reply({ user_id: current_user_id, wish_id: target_wish_id, reply_id: target_reply_id })
    }
    if (!is_page_active.value || is_leaving.value || reply_delete_context !== context
      || wish.value?.wish_id !== target_wish_id || !same_account) return
    if (!result?.success || result.data !== true) {
      if (result?.error !== 'Request cancelled.') {
        reply_delete_error.value = result?.error || 'Unable to delete this reply.'
      }
      return
    }
    const was_visible = replies.value.some((item) => item.reply_id === target_reply_id)
    replies.value = replies.value.filter((item) => item.reply_id !== target_reply_id)
    if (was_visible) wish.value = { ...wish.value, reply_count: Math.max(0, wish.value.reply_count - 1) }
    is_reply_delete_visible.value = false
    reply_delete_target.value = null
  } catch (error) {
    if (is_page_active.value && !is_leaving.value && reply_delete_context === context
      && wish.value?.wish_id === target_wish_id && `${account_store.userId}` === `${current_user_id}`) {
      reply_delete_error.value = error?.message || 'Unable to delete this reply.'
    }
  } finally {
    if (reply_delete_context === context) {
      reply_delete_context = null
      deleting_reply_id.value = ''
    }
  }
}

const send_reply = async () => {
  if (is_replying.value || !wish.value) return
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
  const previous_count = wish.value.reply_count
  replies.value = [...replies.value, {
    reply_id: temp_id,
    user_id: `${account_store.userId}`,
    user_name: `${account_store.userInfo?.userName || ''}`.trim() || 'You',
    avatar_url: self_avatar.value,
    content,
    is_local: true
  }]
  wish.value = { ...wish.value, reply_count: previous_count + 1 }
  reply_draft.value = ''
  is_replying.value = true
  action_error.value = ''
  reply_context.cancel?.()
  reply_context = {}
  const result = await addLmWishReply(build_reply_params({
    user_id: account_store.userId,
    wish_id: wish.value.wish_id,
    content,
    created_date: new Date().toISOString()
  }), reply_context)
  is_replying.value = false
  if (!is_page_active.value) return
  if (!result?.success) {
    replies.value = replies.value.filter((item) => item.reply_id !== temp_id)
    wish.value = wish.value ? { ...wish.value, reply_count: Math.max(0, wish.value.reply_count - 1) } : wish.value
    if (!reply_draft.value) reply_draft.value = content
    action_error.value = result?.error || 'Unable to send this reply.'
    return
  }
  const created_id = read_created_reply_id(result.data)
  if (created_id) {
    replies.value = replies.value.map((item) => (
      item.reply_id === temp_id ? { ...item, reply_id: created_id, is_local: false } : item
    ))
  }
}

const open_fulfill = () => {
  if (!can_fulfill.value || is_leaving.value) return
  action_error.value = ''
  const started = page_transition.value?.navigate_forward({
    url: build_fulfill_url(wish.value.wish_id),
    fail: () => {
      action_error.value = 'Telling everyone is unavailable.'
    }
  })
  if (!started) action_error.value = 'Telling everyone is unavailable.'
}

const open_delete = () => {
  if (!is_page_active.value || is_leaving.value || !can_delete.value
    || is_deleting.value || is_reply_delete_visible.value || deleting_reply_id.value) return
  delete_error.value = ''
  is_delete_visible.value = true
}

const close_delete = () => {
  if (is_deleting.value) return
  is_delete_visible.value = false
  delete_error.value = ''
}

const confirm_delete = async () => {
  const id = wish.value?.wish_id
  if (!is_delete_visible.value || !is_page_active.value || is_leaving.value
    || !can_delete.value || !id || is_deleting.value || deleting_reply_id.value) return
  const current_user_id = `${account_store.userId}`
  is_deleting.value = true
  delete_error.value = ''
  delete_context.cancel?.()
  delete_context = {}
  const context = delete_context
  const is_current_request = () => (
    is_page_active.value && !is_leaving.value && delete_context === context
    && wish.value?.wish_id === id && `${account_store.userId}` === current_user_id
  )
  cancel_load()
  is_loading.value = false
  try {
    const result = await deleteLmWishById(build_delete_wish_params(id), context)
    if (!is_current_request()) return
    if (!result?.success || result.data !== true) {
      if (result?.error !== 'Request cancelled.') {
        delete_error.value = result?.error || 'Unable to delete this wish.'
      }
      return
    }
    is_delete_visible.value = false
    const return_page = source_page.value
    const started = page_transition.value?.navigate_forward({
      url: build_deleted_result_url({
        object_type: DELETE_OBJECT.WISH,
        object_id: id,
        source_page: return_page,
        return_page
      }),
      fail: () => go_back()
    })
    if (!started) go_back()
  } catch {
    if (is_current_request()) delete_error.value = 'Unable to delete this wish.'
  } finally {
    if (delete_context === context) is_deleting.value = false
  }
}

const open_report = (reply) => {
  if (!reply?.user_id) return
  report_user_id.value = `${reply.user_id}`
  report_name.value = `${reply.user_name || ''}`.trim() || 'this user'
  is_report_open.value = true
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  if (is_report_open.value) {
    is_report_open.value = false
    return
  }
  if (is_delete_visible.value) {
    close_delete()
    return
  }
  if (is_reply_delete_visible.value) {
    close_reply_delete()
    return
  }
  is_leaving.value = true
  cancel_load()
  reply_context.cancel?.()
  reply_delete_context?.cancel?.()
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        is_leaving.value = false
        page_transition.value?.navigate_relaunch({ url: source_page.value })
      }
    })
    if (!started) {
      allow_route_back = false
      is_leaving.value = false
      action_error.value = 'Unable to go back.'
    }
    return
  }
  const started = page_transition.value?.navigate_relaunch({
    url: source_page.value,
    fail: () => {
      is_leaving.value = false
      action_error.value = 'Unable to go back.'
    }
  })
  if (!started) {
    is_leaving.value = false
    action_error.value = 'Unable to go back.'
  }
}

onLoad((query = {}) => {
  const parsed = read_wish_detail_query(query)
  wish_id.value = parsed.wish_id
  source_page.value = parsed.source_page
})

onShow(() => {
  const queued = take_success_toast()
  if (queued) success_toast.value = queued
  load_detail()
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  cancel_load()
  reply_context.cancel?.()
  delete_context.cancel?.()
  reply_delete_context?.cancel?.()
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.detail-page {
  background: var(--detail-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.detail-header,
.header-side,
.detail-waiting,
.detail-true,
.detail-replies-label,
.detail-reply,
.detail-composer {
  display: flex;
  align-items: center;
}

.detail-header {
  height: 80rpx;
  flex: none;
  justify-content: space-between;
  padding: 0 36rpx;
}

.header-copy {
  min-width: 0;
  margin-left: 24rpx;
}

.back-button {
  @include page_back.button;
}

.header-title {
  display: block;
  color: var(--detail-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--detail-line);
  box-shadow: 0 0 18rpx var(--detail-line-shadow);
}

.delete-button {
  width: 80rpx;
  height: 80rpx;
  flex: none;
}

.detail-state {
  min-height: 0;
  flex: 1;
  padding: 28rpx 36rpx 0;
}

.detail-state--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.detail-error__copy {
  color: var(--detail-title);
  font-size: 28rpx;
  line-height: 1.4;
}

.detail-error__retry,
.detail-reply-error view {
  margin-top: 24rpx;
  color: var(--detail-error);
  font-size: 28rpx;
  font-weight: 700;
}

.detail-scroll {
  min-height: 0;
  flex: 1;
}

.detail-scroll__inner {
  padding: 28rpx 36rpx 24rpx;
}

.detail-photo {
  position: relative;
  overflow: hidden;
  height: 320rpx;
  border-radius: 32rpx;
}

.detail-photo__image {
  display: block;
  width: 100%;
  height: 100%;
}

.detail-photo__loading {
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

.detail-photo__shimmer {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.detail-badge {
  position: absolute;
  z-index: 2;
  top: 20rpx;
  left: 20rpx;
  padding: 8rpx 16rpx;
  border: 1px solid var(--detail-badge);
  border-radius: 999rpx;
  color: var(--detail-badge);
  font-size: 20rpx;
  font-weight: 700;
}

.detail-content {
  display: block;
  margin-top: 28rpx;
  color: var(--detail-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.35;
}

.detail-waiting {
  margin-top: 20rpx;
}

.detail-waiting image,
.detail-true image {
  width: 28rpx;
  height: 28rpx;
  margin-right: 10rpx;
}

.detail-waiting text {
  color: var(--detail-waiting);
  font-size: 26rpx;
  font-weight: 700;
}

.detail-true {
  margin-top: 20rpx;
  color: var(--detail-true);
  font-size: 28rpx;
  font-weight: 700;
}

.detail-outcome {
  display: block;
  margin-top: 12rpx;
  color: var(--detail-copy);
  font-size: 28rpx;
  line-height: 1.45;
}

.detail-inline-error,
.detail-action-error {
  display: block;
  margin-top: 16rpx;
  color: var(--detail-error);
  font-size: 24rpx;
  line-height: 1.4;
}

.detail-action-error {
  padding: 0 36rpx;
}

.detail-replies-label {
  margin-top: 32rpx;
  color: var(--detail-muted);
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.detail-replies-line {
  height: 2rpx;
  min-width: 0;
  flex: 1;
  margin-left: 16rpx;
  background: var(--detail-border);
}

.detail-reply-error,
.detail-reply-empty {
  margin-top: 20rpx;
}

.detail-reply-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--detail-title);
  font-size: 26rpx;
}

.detail-reply-error view {
  margin-top: 0;
  margin-left: 24rpx;
}

.detail-reply-empty text {
  color: var(--detail-copy);
  font-size: 26rpx;
}

.detail-reply {
  margin-top: 20rpx;
  padding: 20rpx;
  align-items: flex-start;
  border-radius: 28rpx;
  background: var(--detail-card);
}

.detail-reply__avatar,
.detail-composer__avatar {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
}

.detail-reply__avatar--empty,
.detail-composer__avatar--empty {
  background: var(--detail-skeleton);
}

.detail-reply__body {
  min-width: 0;
  flex: 1;
  margin-left: 16rpx;
}

.detail-reply__name {
  display: block;
  color: var(--detail-title);
  font-size: 28rpx;
  font-weight: 700;
}

.detail-reply__copy {
  display: block;
  margin-top: 6rpx;
  color: var(--detail-copy);
  font-size: 26rpx;
  line-height: 1.4;
}

.detail-reply__more {
  display: flex;
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.detail-reply__more image {
  width: 48rpx;
  height: 48rpx;
}

.detail-reply__more--pending { opacity: 0.5; }

.detail-footer {
  flex: none;
  padding: 12rpx 36rpx 8rpx;
}

.detail-composer__input {
  height: 84rpx;
  min-width: 0;
  flex: 1;
  margin-left: 16rpx;
  padding: 0 28rpx;
  border: 1px solid var(--detail-border);
  border-radius: 999rpx;
  background: var(--detail-input);
  color: var(--detail-title);
  font-size: 26rpx;
}

.detail-composer__send {
  display: flex;
  width: 84rpx;
  height: 84rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.detail-composer__send image {
  width: 84rpx;
  height: 84rpx;
}

.fulfill-button {
  display: flex;
  height: 96rpx;
  margin-top: 16rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: var(--detail-button);
  color: var(--detail-button-text);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 96rpx;
}
</style>

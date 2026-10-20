<template>
  <PageTransition ref="page_transition" class="rooms-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="rooms-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Voice Rooms') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <scroll-view
        class="content-scroll"
        scroll-y
        :show-scrollbar="false"
        :scroll-top="scroll_top"
        :lower-threshold="160"
        @scroll="record_scroll"
        @scrolltolower="load_more_rooms"
      >
        <view class="content-scroll__inner">
          <view v-if="is_loading && !rooms.length" class="room-grid" aria-hidden="true">
            <view v-for="slot in skeleton_slots" :key="slot" class="room-skeleton" />
          </view>
          <view v-else-if="load_error && !rooms.length" class="state-card" role="alert">
            <text class="state-card__title">{{ $t('Unable to load rooms') }}</text>
            <text class="state-card__copy">{{ $t(load_error) }}</text>
            <view class="state-card__action" role="button" :aria-label="$t('Try again')" @click="load_rooms">
              {{ $t('Try again') }}
            </view>
          </view>
          <view v-else-if="!rooms.length" class="empty-state">
            <image class="empty-state__icon" src="/static/icon/voice_room_empty.png" mode="aspectFit" />
            <text class="empty-state__title">{{ $t('No rooms yet') }}</text>
            <text class="empty-state__copy">{{ $t('Drop into a late-night room and just listen — no one expects you to talk.') }}</text>
            <view
              class="empty-state__action"
              role="button"
              :aria-label="$t('Browse rooms')"
              @click="load_rooms"
            >
              <text>{{ $t('Browse rooms') }}</text>
            </view>
          </view>
          <template v-else>
            <view v-if="load_error" class="inline-error" role="alert">
              <text>{{ $t(load_error) }}</text>
              <view role="button" :aria-label="$t('Try again')" @click="load_rooms">{{ $t('Try again') }}</view>
            </view>
            <view class="room-grid">
              <view
                v-for="room in rooms"
                :key="room.room_id"
                class="room-card"
                role="button"
                :aria-label="$t(`Open ${room.title}`)"
                @click="open_room(room)"
              >
                <image class="room-card__cover" :src="room.cover_src" mode="aspectFill" />
                <view class="room-card__shade" />
                <view v-if="room.is_new" class="room-badge room-badge--new">
                  <text>{{ $t(room.badge_label) }}</text>
                </view>
                <LiveStatusBadge v-else class="room-live-badge" :label="$t(room.badge_label)" />
                <view class="room-count">
                  <image src="/static/icon/voice_room_microphone.png" mode="aspectFit" />
                  <text>{{ $t(room.listener_count) }}</text>
                </view>
                <view class="room-card__body">
                  <UserAvatar
                    class="room-host"
                    :source="room.host_avatar"
                    role="button"
                    :aria-label="$t('View host profile')"
                    :aria-disabled="!can_open_host(room)"
                    @click.stop="open_host_profile(room)"
                  />
                  <text class="room-title">{{ room.title }}</text>
                </view>
                <view v-if="room.room_users.length" class="room-users" :aria-label="$t('Room participants')" @click.stop>
                  <UserAvatar
                    v-for="(participant, index) in room.room_users"
                    :key="`${participant.room_user_id || participant.user_id}-${index}`"
                    class="room-user"
                    :source="participant.avatar_url"
                  />
                </view>
                <image
                  v-if="room.is_mine"
                  class="room-action"
                  src="/static/icon/voice_room_del.png"
                  mode="aspectFit"
                />
                <image
                  v-else
                  class="room-action"
                  src="/static/icon/voice_room_horizontal_more.png"
                  mode="aspectFit"
                  role="button"
                  :aria-label="$t('Report room host')"
                  :aria-disabled="!room.host_id"
                  @click.stop="open_room_report(room)"
                />
              </view>
            </view>
            <text v-if="is_loading_more" class="load-more">{{ $t('Loading more rooms...') }}</text>
          </template>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <ReportUserSheet
      :visible="is_report_visible"
      :target-name="report_target?.user_name || ''"
      :target-user-id="report_target?.user_id || ''"
      bottom-offset="0rpx"
      @update:visible="is_report_visible = $event"
      @submitted="handle_report_submitted"
    />
    <ApiErrorDialog />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectLivePage } from '@/api/live'
import ApiErrorDialog from '@/components/ApiErrorDialog.vue'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import LiveStatusBadge from '@/components/LiveStatusBadge.vue'
import PageTransition from '@/components/PageTransition.vue'
import ReportUserSheet from '@/components/ReportUserSheet.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { storeGlobal } from '@/stores/store'
import { build_profile_page_url } from '@/utils/communityUserPresentation'
import {
  HOME_PAGE_PATH,
  build_select_voice_rooms_params,
  build_voice_room_detail_url,
  build_voice_room_list_url,
  map_voice_rooms,
  read_live_page_has_more,
  read_voice_room_source
} from '@/utils/voiceRoomListPresentation.js'

const page_size = 20
const page_transition = ref(null)
const source_page = ref(HOME_PAGE_PATH)
const rooms = ref([])
const is_loading = ref(true)
const is_loading_more = ref(false)
const load_error = ref('')
const current_page = ref(0)
const has_more = ref(true)
const is_page_active = ref(true)
const is_leaving = ref(false)
const is_report_visible = ref(false)
const report_target = ref(null)
const scroll_top = ref(0)
const skeleton_slots = [1, 2, 3, 4]
let load_context = { cancel() {} }
let allow_route_back = false
let current_scroll_top = 0
let profile_return_snapshot = null

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--room-title': theme.colors.text.title,
  '--room-meta': theme.colors.messages.card_secondary,
  '--room-shade': theme.colors.home.feature_shade,
  '--room-new': theme.colors.status.locked,
  '--room-live-text': theme.colors.text.inverse,
  '--room-count': theme.colors.surface.scrim_soft,
  '--room-header-surface': theme.colors.lantern_detail.header_surface,
  '--room-border': theme.colors.surface.border,
  '--room-line': theme.colors.lantern_detail.title_line,
  '--room-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--room-skeleton': theme.colors.lantern_detail.skeleton,
  '--room-button': theme.colors.button.primary,
  '--room-button-text': theme.colors.button.text,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const begin_load = () => {
  load_context.cancel?.()
  load_context = { cancel() {} }
  return load_context
}

const load_rooms = async ({ refresh = true } = {}) => {
  if (!is_page_active.value) return
  if (!refresh && (is_loading_more.value || !has_more.value)) return
  if (refresh) {
    is_loading.value = !rooms.value.length
    load_error.value = ''
    has_more.value = true
  } else {
    is_loading_more.value = true
  }
  const next_page = refresh ? 1 : current_page.value + 1
  const context = begin_load()
  const result = await selectLivePage(build_select_voice_rooms_params({
    current: next_page,
    size: page_size
  }), context)
  if (!is_page_active.value || context !== load_context) return
  if (!result?.success) {
    if (result?.error !== 'Request cancelled.') {
      load_error.value = result?.error || 'Unable to load rooms.'
    }
  } else {
    const mapped = map_voice_rooms(result.data, { current_user_id: storeGlobal().userId })
    current_page.value = next_page
    has_more.value = read_live_page_has_more(result.data, {
      current: next_page,
      size: page_size,
      count: mapped.length
    })
    rooms.value = refresh ? mapped : [...rooms.value, ...mapped]
    load_error.value = ''
  }
  is_loading.value = false
  is_loading_more.value = false
}

const load_more_rooms = () => {
  void load_rooms({ refresh: false })
}

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  if (is_report_visible.value) {
    is_report_visible.value = false
    return
  }
  is_leaving.value = true
  load_context.cancel?.()
  const fallback = source_page.value || HOME_PAGE_PATH
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

const open_room = (room) => {
  if (!room?.room_id || !is_page_active.value || is_leaving.value || is_report_visible.value || profile_return_snapshot) return
  page_transition.value?.navigate_forward({
    url: build_voice_room_detail_url(room, build_voice_room_list_url(source_page.value))
  })
}

const record_scroll = (event) => {
  current_scroll_top = Math.max(0, Number(event?.detail?.scrollTop) || 0)
}

const can_open_host = (room) => Boolean(
  room?.host_id && room.host_id !== `${storeGlobal().userId || ''}`
)

// feedback_mode: immediate — opening the existing report sheet only changes UI state.
const open_room_report = (room) => {
  if (!is_page_active.value || is_leaving.value || is_report_visible.value || profile_return_snapshot || !can_open_host(room)) return
  report_target.value = { user_id: room.host_id, user_name: room.host_name }
  is_report_visible.value = true
}

const handle_report_submitted = ({ blocked = false } = {}) => {
  if (blocked && is_page_active.value) void load_rooms({ refresh: true })
}

const open_host_profile = (room) => {
  if (!is_page_active.value || is_leaving.value || is_report_visible.value || profile_return_snapshot || !can_open_host(room)) return
  profile_return_snapshot = {
    rooms: rooms.value,
    current_page: current_page.value,
    has_more: has_more.value,
    scroll_top: current_scroll_top
  }
  const started = page_transition.value?.navigate_forward({
    url: build_profile_page_url(room.host_id, build_voice_room_list_url(source_page.value)),
    fail: () => {
      if (!is_page_active.value) return
      profile_return_snapshot = null
      load_error.value = 'Unable to open this profile. Please try again.'
    }
  })
  if (!started) {
    profile_return_snapshot = null
    return
  }
  load_context.cancel?.()
  load_context = { cancel() {} }
  is_loading.value = false
  is_loading_more.value = false
}

onLoad((query) => {
  source_page.value = read_voice_room_source(query?.sourcePage)
})

onShow(() => {
  if (profile_return_snapshot) {
    if (!rooms.value.length) {
      rooms.value = profile_return_snapshot.rooms
      current_page.value = profile_return_snapshot.current_page
      has_more.value = profile_return_snapshot.has_more
    }
    scroll_top.value = profile_return_snapshot.scroll_top
    profile_return_snapshot = null
    return
  }
  void load_rooms({ refresh: true })
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
  load_context.cancel?.()
  profile_return_snapshot = null
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.rooms-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.rooms-header {
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
  color: var(--room-title);
  font-size: 42rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--room-line);
  box-shadow: 0 0 18rpx var(--room-line-shadow);
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  min-height: 100%;
  padding: 28rpx 36rpx 32rpx;
}

.room-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.room-card,
.room-skeleton {
  position: relative;
  box-sizing: border-box;
  width: calc(50% - 12rpx);
  height: 440rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  border: 1px solid var(--room-border);
  border-radius: 40rpx;
}

.room-skeleton {
  background: var(--room-skeleton);
  animation: room-pulse 1.2s ease-in-out infinite;
}

.room-card__cover,
.room-card__shade {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.room-card__shade {
  background: var(--room-shade);
}

.room-badge,
.room-count,
.room-card__body,
.room-users,
.room-action {
  position: absolute;
  z-index: 1;
}

.room-badge,
.room-count {
  display: flex;
  top: 16rpx;
  height: 40rpx;
  align-items: center;
  padding: 0 14rpx;
  border-radius: 20rpx;
}

.room-badge {
  left: 16rpx;
}

.room-live-badge {
  position: absolute;
  z-index: 1;
  top: 16rpx;
  left: 16rpx;
}

.room-badge--new {
  background: var(--room-new);
  color: var(--room-live-text);
}

.room-badge text,
.room-count text {
  font-size: 18rpx;
  font-weight: 700;
}

.room-count {
  right: 16rpx;
  background: var(--room-count);
  color: var(--room-live-text);
}

.room-count image {
  width: 20rpx;
  height: 20rpx;
  margin-right: 6rpx;
}

.room-card__body {
  right: 20rpx;
  bottom: 84rpx;
  left: 20rpx;
}

.room-host {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
}

.room-users {
  display: flex;
  bottom: 24rpx;
  left: 20rpx;
  align-items: center;
}

.room-user {
  box-sizing: border-box;
  width: 40rpx;
  height: 40rpx;
  flex: none;
  border: 1px solid var(--room-border);
  border-radius: 20rpx;
}

.room-user + .room-user {
  margin-left: -12rpx;
}

.room-title {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 16rpx;
  color: var(--room-title);
  font-size: 26rpx;
  font-weight: 700;
  line-height: 34rpx;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.room-action {
  right: 16rpx;
  bottom: 16rpx;
  width: 52rpx;
  height: 52rpx;
}

.empty-state,
.state-card {
  display: flex;
  min-height: 640rpx;
  align-items: center;
  justify-content: center;
  padding: 48rpx 36rpx;
  text-align: center;
  flex-direction: column;
}

.empty-state__icon {
  width: 140rpx;
  height: 140rpx;
}

.empty-state__title,
.state-card__title {
  margin-top: 28rpx;
  color: var(--room-title);
  font-size: 36rpx;
  font-weight: 700;
}

.empty-state__copy,
.state-card__copy {
  margin-top: 16rpx;
  color: var(--room-meta);
  font-size: 26rpx;
  line-height: 38rpx;
}

.empty-state__action,
.state-card__action,
.inline-error view {
  height: 88rpx;
  margin-top: 36rpx;
  padding: 0 48rpx;
  border-radius: 44rpx;
  background: var(--room-button);
  color: var(--room-button-text);
  font-size: 30rpx;
  font-weight: 700;
  line-height: 88rpx;
}

.inline-error {
  margin-bottom: 22rpx;
  color: var(--room-meta);
  font-size: 24rpx;
}

.load-more {
  display: block;
  padding: 12rpx 0 20rpx;
  color: var(--room-meta);
  font-size: 22rpx;
  text-align: center;
}

@keyframes room-pulse {
  0%,
  100% { opacity: 0.45; }
  50% { opacity: 1; }
}

</style>

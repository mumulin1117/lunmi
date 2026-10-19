<template>
  <transition name="sheet-slide">
    <view
      v-if="visible"
      class="sheet-layer"
      :style="sheet_style"
    >
      <view class="sheet-scrim" @click="close" @touchmove.stop />
      <view class="sheet-panel" @click.stop>
        <view class="sheet-tabs" role="tablist" :aria-label="$t('Mic management')">
          <view
            class="sheet-tab"
            :class="{ 'sheet-tab--active': activeTab === 'apply' }"
            role="tab"
            :aria-selected="activeTab === 'apply'"
            @click="emit('update:activeTab', 'apply')"
          >
            <text>{{ $t('Apply list') }}</text>
          </view>
          <view
            class="sheet-tab"
            :class="{ 'sheet-tab--active': activeTab === 'seat' }"
            role="tab"
            :aria-selected="activeTab === 'seat'"
            @click="emit('update:activeTab', 'seat')"
          >
            <text>{{ $t('Available Seat') }}</text>
          </view>
        </view>
        <view v-if="activeTab === 'seat'" class="seat-toolbar">
          <view class="search-field">
            <Search class="search-field__icon" aria-hidden="true" />
            <input
              class="search-field__input"
              :value="searchKeyword"
              confirm-type="search"
              maxlength="40"
              :placeholder="$t('Search ID/name')"
              @input="on_search_input"
              @confirm="emit('search')"
            />
          </view>
          <view
            class="invite-all"
            :class="{ 'invite-all--cooldown': inviteAllSeconds > 0 }"
            role="button"
            :aria-disabled="inviteAllSeconds > 0 || !inviteUsers.length"
            @click="emit('invite-all')"
          >
            <text>{{ $t(inviteAllSeconds > 0 ? `Invite All(${inviteAllSeconds}s)` : 'Invite All') }}</text>
          </view>
        </view>
        <scroll-view class="sheet-list" scroll-y :show-scrollbar="false">
          <template v-if="activeTab === 'apply'">
            <view v-if="applicants.length" class="user-list">
              <view
                v-for="applicant in applicants"
                :key="applicant.userId"
                class="user-row"
              >
                <UserAvatar class="user-row__avatar" :source="applicant.userImgUrl" />
                <text class="user-row__name">{{ applicant.userName || $t('Guest') }}</text>
                <view
                  class="user-row__action user-row__action--allow"
                  role="button"
                  @click="emit('allow', applicant)"
                >
                  <text>{{ $t('Allow') }}</text>
                </view>
                <view
                  class="user-row__action user-row__action--deny"
                  role="button"
                  @click="emit('deny', applicant)"
                >
                  <text>{{ $t('Deny') }}</text>
                </view>
              </view>
            </view>
            <view v-else class="empty-state">
              <text>{{ $t('No mic applications yet.') }}</text>
            </view>
          </template>
          <template v-else>
            <view v-if="isUsersLoading && !inviteUsers.length" class="user-list" :aria-label="$t('Loading users')">
              <view
                v-for="item in skeleton_count"
                :key="`invite-skeleton-${item}`"
                class="user-row user-row--skeleton"
              >
                <view class="skeleton-block skeleton-block--avatar">
                  <MediaShimmer :label="$t('Loading user avatar')" />
                </view>
                <view class="skeleton-block skeleton-block--name">
                  <MediaShimmer :label="$t('Loading user name')" />
                </view>
                <view class="skeleton-block skeleton-block--action">
                  <MediaShimmer :label="$t('Loading invite action')" />
                </view>
              </view>
            </view>
            <view v-else-if="inviteUsers.length" class="user-list">
              <view
                v-for="user in inviteUsers"
                :key="user.userId"
                class="user-row"
              >
                <UserAvatar class="user-row__avatar" :source="user.userImgUrl" />
                <text class="user-row__name">{{ user.userName || $t('Guest') }}</text>
                <view
                  v-if="cooldown_seconds(user) > 0"
                  class="user-row__action user-row__action--cooldown"
                >
                  <text>{{ $t(cooldown_seconds(user)) }}{{ $t('s') }}</text>
                </view>
                <view
                  v-else
                  class="user-row__action user-row__action--allow"
                  role="button"
                  @click="emit('invite', user)"
                >
                  <text>{{ $t('Invite') }}</text>
                </view>
              </view>
            </view>
            <view v-else-if="usersError" class="empty-state">
              <text>{{ $t(usersError) }}</text>
              <view class="empty-state__retry" role="button" @click="emit('search')">{{ $t('Try again') }}</view>
            </view>
            <view v-else class="empty-state">
              <text>{{ $t('No available users to invite.') }}</text>
            </view>
          </template>
        </scroll-view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import MediaShimmer from '@/components/MediaShimmer.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  activeTab: { type: String, default: 'apply' },
  applicants: { type: Array, default: () => [] },
  inviteUsers: { type: Array, default: () => [] },
  searchKeyword: { type: String, default: '' },
  inviteAllSeconds: { type: Number, default: 0 },
  userCooldownSeconds: { type: Object, default: () => ({}) },
  isUsersLoading: { type: Boolean, default: false },
  usersError: { type: String, default: '' }
})
const emit = defineEmits([
  'update:visible',
  'update:activeTab',
  'update:searchKeyword',
  'search',
  'allow',
  'deny',
  'invite',
  'invite-all'
])
const skeleton_count = 4
const sheet_style = computed(() => ({
  '--live-sheet-surface': theme.colors.voice_room.sheet_surface,
  '--live-search-surface': theme.colors.voice_room.search_surface,
  '--live-header-surface': theme.colors.voice_room.header_surface,
  '--live-text': theme.colors.voice_room.text,
  '--live-text-muted': theme.colors.voice_room.text_muted,
  '--live-text-soft': theme.colors.voice_room.text_soft,
  '--live-pink': theme.colors.voice_room.pink,
  '--live-purple': theme.colors.voice_room.purple,
  '--live-button-surface': theme.colors.voice_room.button_surface,
  '--live-deny-surface': theme.colors.voice_room.deny_surface,
  '--live-scrim': theme.colors.surface.scrim,
  '--media-loading-surface': theme.colors.voice_room.seat_surface,
  '--media-loading-shine': theme.colors.voice_room.seat_surface_light,
  '--sheet-bottom-offset': '0rpx',
  '--sheet-panel-safe-bottom': 'var(--page-safe-bottom)'
}))
const cooldown_seconds = (user) => Number(props.userCooldownSeconds[`${user?.userId || ''}`] || 0)
const close = () => emit('update:visible', false)
const on_search_input = (event) => {
  emit('update:searchKeyword', event?.detail?.value ?? event?.target?.value ?? '')
}
</script>

<style scoped lang="scss">
.sheet-layer {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: flex;
  box-sizing: border-box;
  justify-content: flex-end;
  padding-bottom: var(--sheet-bottom-offset);
  flex-direction: column;
}

.sheet-scrim {
  position: absolute;
  inset: 0;
  background: var(--live-scrim);
}

.sheet-panel {
  position: relative;
  display: flex;
  width: 100%;
  height: 70%;
  overflow: hidden;
  box-sizing: border-box;
  padding: 28rpx 28rpx calc(28rpx + var(--sheet-panel-safe-bottom));
  border-radius: 36rpx 36rpx 0 0;
  background: var(--live-sheet-surface);
  color: var(--live-text);
  flex-direction: column;
  flex: none;
  will-change: transform;
}

.sheet-tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  gap: 48rpx;
  flex: none;
}

.sheet-tab {
  position: relative;
  padding-bottom: 12rpx;
  color: var(--live-text-muted);
  font-size: 30rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.sheet-tab--active {
  color: var(--live-text);
}

.sheet-tab--active::after {
  position: absolute;
  right: 24rpx;
  bottom: 0;
  left: 24rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: var(--live-pink);
  content: '';
}

.seat-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 18rpx;
  gap: 16rpx;
  flex: none;
}

.search-field {
  display: flex;
  min-width: 0;
  height: 72rpx;
  align-items: center;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: var(--live-search-surface);
  flex: 1;
  gap: 12rpx;
}

.search-field__icon {
  width: 32rpx;
  height: 32rpx;
  color: var(--live-text-muted);
  flex: none;
}

.search-field__input {
  min-width: 0;
  height: 72rpx;
  color: var(--live-text);
  font-size: 24rpx;
  line-height: 72rpx;
  flex: 1;
}

.invite-all {
  display: flex;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--live-purple);
  font-size: 24rpx;
  font-weight: 700;
  line-height: 34rpx;
  flex: none;
}

.invite-all--cooldown {
  background: var(--live-button-surface);
  color: var(--live-text-muted);
  pointer-events: none;
}

.sheet-list {
  min-height: 0;
  height: 0;
  flex: 1;
}

.user-list {
  display: flex;
  flex-direction: column;
}

.user-row {
  display: flex;
  min-height: 96rpx;
  align-items: center;
  gap: 16rpx;
}

.user-row__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex: none;
}

.user-row__name {
  overflow: hidden;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 40rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.user-row__action {
  display: flex;
  min-width: 120rpx;
  height: 56rpx;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 34rpx;
  flex: none;
}

.user-row__action--allow {
  background: var(--live-pink);
}

.user-row__action--deny,
.user-row__action--cooldown {
  background: var(--live-deny-surface);
  color: var(--live-text-muted);
}

.user-row--skeleton {
  pointer-events: none;
}

.skeleton-block {
  position: relative;
  overflow: hidden;
  border-radius: 999rpx;
}

.skeleton-block--avatar {
  width: 72rpx;
  height: 72rpx;
  flex: none;
}

.skeleton-block--name {
  height: 32rpx;
  flex: 1;
}

.skeleton-block--action {
  width: 120rpx;
  height: 56rpx;
  flex: none;
}

.empty-state {
  display: flex;
  min-height: 240rpx;
  align-items: center;
  justify-content: center;
  color: var(--live-text-muted);
  font-size: 24rpx;
  line-height: 34rpx;
  flex-direction: column;
  gap: 16rpx;
}

.empty-state__retry {
  height: 56rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--live-pink);
  color: var(--live-text);
  font-size: 22rpx;
  font-weight: 700;
  line-height: 56rpx;
  text-align: center;
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: opacity .28s ease;
}

.sheet-slide-enter-active .sheet-panel,
.sheet-slide-leave-active .sheet-panel {
  transition: transform .34s cubic-bezier(.32, .72, 0, 1);
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  opacity: 0;
}

.sheet-slide-enter-from .sheet-panel,
.sheet-slide-leave-to .sheet-panel {
  transform: translateY(calc(100% + var(--sheet-bottom-offset)));
}
</style>

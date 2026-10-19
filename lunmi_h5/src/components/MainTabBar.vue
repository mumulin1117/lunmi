<template>
  <view v-show="is_visible" class="main-tabbar" :style="theme_style" data-main-tab-bar role="navigation" :aria-label="$t('Primary navigation')">
    <text v-if="navigation_error" class="main-tabbar__error" role="alert">{{ $t(navigation_error) }}</text>
    <view
      v-for="item in MAIN_TAB_ITEMS"
      :key="item.path"
      class="main-tab"
      role="button"
      :aria-label="$t(item.label)"
      :aria-current="item.path === current_path ? 'page' : undefined"
      :aria-disabled="is_navigating"
      @click="switch_tab(item)"
    >
      <view class="main-tab__icons">
        <image v-show="item.path === current_path" :src="`/static/icon/tabbar_${item.icon}_active.png`" mode="aspectFit" />
        <image v-show="item.path !== current_path" :src="`/static/icon/tabbar_${item.icon}_unactive.png`" mode="aspectFit" />
      </view>
      <MessageUnreadBadge v-if="item.icon === 'message'" :count="unread_chat_count" />
      <image class="main-tab__line" :class="{ 'main-tab__line--ghost': item.path !== current_path }" src="/static/icon/tabbar_active_line.png" mode="aspectFit" aria-hidden="true" />
    </view>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { selectMessageList } from '@/api/message'
import MessageUnreadBadge from '@/components/MessageUnreadBadge.vue'
import { storeGlobal } from '@/stores/store'
import { map_message_conversations } from '@/utils/messagePresentation'
import { MAIN_TAB_ITEMS, MAIN_TAB_UNREAD_EVENT } from '@/utils/mainTabNavigation'
import { replace_route } from '@/utils/routeTransition'

const instance = getCurrentInstance()
const account_store = storeGlobal()
const current_path = computed(() => instance.proxy.$route?.path || '')
const is_visible = computed(() => MAIN_TAB_ITEMS.some((item) => item.path === current_path.value) && account_store.isLogin)
const unread_chat_count = ref(0)
const is_navigating = ref(false)
const navigation_error = ref('')
let request_context = null
let is_active = true

const theme_style = {
  '--main-tabbar-background': theme.colors.tabbar.background,
  '--main-tabbar-error': theme.colors.status.danger
}

const cancel_request = () => {
  request_context?.cancel?.()
  request_context = null
}

const load_unread_count = async () => {
  // Messages and Profile publish their existing query results, avoiding duplicate queries.
  if (!is_visible.value || current_path.value === '/pages/messages/index'
    || current_path.value === '/pages/profile/index' || !account_store.userId) return
  const user_id = `${account_store.userId}`
  const path = current_path.value
  const context = {}
  request_context = context
  const is_current = () => is_active && request_context === context
    && current_path.value === path && `${account_store.userId}` === user_id && is_visible.value
  try {
    const result = await selectMessageList({}, context)
    if (!is_current() || !result.success) return
    unread_chat_count.value = map_message_conversations(result.data, {
      current_user_id: user_id
    }).filter((item) => item.has_unread).length
  } catch {
    // Keep the displayed count on failure; no local data fallback.
  } finally {
    if (request_context === context) request_context = null
  }
}

const receive_unread_count = (payload) => {
  const event_user_id = `${payload?.user_id || ''}`
  const current_user_id = `${account_store.userId || ''}`
  if (!is_active || !is_visible.value || payload?.page_path !== current_path.value
    || event_user_id !== current_user_id) return
  const count = Number(payload.unread_count)
  if (Number.isFinite(count) && count >= 0) unread_chat_count.value = count
}

uni.$on(MAIN_TAB_UNREAD_EVENT, receive_unread_count)

watch([current_path, () => account_store.userId, () => account_store.isLogin], (values, previous = []) => {
  cancel_request()
  navigation_error.value = ''
  if (values[1] !== previous[1] || !values[2]) {
    unread_chat_count.value = 0
    is_navigating.value = false
  }
  void load_unread_count()
}, { immediate: true })

const switch_tab = (item) => {
  if (!is_visible.value || is_navigating.value || item.path === current_path.value) return
  navigation_error.value = ''
  is_navigating.value = true
  replace_route({
    url: item.path,
    immediate: true,
    fail: () => {
      if (is_active) navigation_error.value = 'Unable to open this page. Please try again.'
    },
    complete: () => {
      if (is_active) is_navigating.value = false
    }
  })
}

onBeforeUnmount(() => {
  is_active = false
  cancel_request()
  uni.$off(MAIN_TAB_UNREAD_EVENT, receive_unread_count)
})
</script>

<style scoped lang="scss">
.main-tabbar {
  position: fixed;
  z-index: 100;
  right: 24rpx;
  bottom: 0;
  left: 24rpx;
  display: flex;
  box-sizing: content-box;
  height: 156rpx;
  align-items: center;
  justify-content: space-around;
  padding-bottom: var(--page-safe-bottom);
  border-radius: 52rpx;
  background: var(--main-tabbar-background);
}

.main-tabbar__error {
  position: absolute;
  right: 0;
  bottom: calc(100% + 16rpx);
  left: 0;
  color: var(--main-tabbar-error);
  font-size: 24rpx;
  text-align: center;
}

.main-tab {
  position: relative;
  display: flex;
  width: 88rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.main-tab__icons,
.main-tab__icons image {
  width: 60rpx;
  height: 60rpx;
}

.main-tab__line {
  width: 52rpx;
  height: 8rpx;
}

.main-tab__line--ghost { visibility: hidden; }
</style>

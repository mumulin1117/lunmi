<template>
  <view v-if="unread_count > 0" class="message-unread-badge" :style="theme_style">
    <text>{{ $t(unread_count) }}</text>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectMessageList } from '@/api/message'
import { storeGlobal } from '@/stores/store'
import { map_message_conversations } from '@/utils/messagePresentation'

// Pages with an existing message query supply its count to avoid a second request.
const props = defineProps({
  count: { type: Number, default: null }
})
const account_store = storeGlobal()
const fetched_count = ref(null)
let request_context = null
let is_mounted = false
let is_page_visible = true
let is_component_active = true

const theme_style = {
  '--badge-background': theme.colors.messages.unread_background,
  '--badge-text': theme.colors.messages.unread_text
}
const unread_count = computed(() => {
  if (!account_store.userId) return 0
  const count = Number(props.count ?? fetched_count.value)
  return Number.isFinite(count) && count > 0 ? count : 0
})

const cancel_request = () => {
  request_context?.cancel?.()
  request_context = null
}

const load_unread_count = async () => {
  if (!is_mounted || !is_component_active || !is_page_visible || props.count !== null
    || !account_store.userId || request_context) return
  const user_id = `${account_store.userId}`
  const context = {}
  request_context = context
  const is_current_request = () => (
    is_component_active && is_page_visible && request_context === context
    && `${account_store.userId}` === user_id && props.count === null
  )
  try {
    const result = await selectMessageList({}, context)
    if (!is_current_request() || !result?.success) return
    fetched_count.value = map_message_conversations(result.data, {
      current_user_id: user_id
    }).filter((item) => item.has_unread).length
  } catch {
    if (is_current_request()) fetched_count.value = null
  } finally {
    if (request_context === context) request_context = null
  }
}

watch(() => account_store.userId, () => {
  cancel_request()
  fetched_count.value = null
  void load_unread_count()
})

onMounted(() => {
  is_mounted = true
  void load_unread_count()
})
// uni-app dispatches onShow/onHide on the owning page, not on this child component.
let page_instance = getCurrentInstance()
while (page_instance?.parent && page_instance.proxy?.$mpType !== 'page') {
  page_instance = page_instance.parent
}
onShow(() => {
  is_page_visible = true
  void load_unread_count()
}, page_instance)
onHide(() => {
  is_page_visible = false
  cancel_request()
}, page_instance)
onBeforeUnmount(() => {
  is_component_active = false
  cancel_request()
})
</script>

<style scoped lang="scss">
.message-unread-badge {
  position: absolute;
  top: -12rpx;
  right: -6rpx;
  display: flex;
  width: 32rpx;
  height: 32rpx;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: var(--badge-background);
  color: var(--badge-text);
  font-size: 18rpx;
  font-weight: 700;
}
</style>

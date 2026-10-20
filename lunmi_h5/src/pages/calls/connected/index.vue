<template>
  <PageTransition ref="page_transition" class="connected-call-page" :style="theme_style">
    <ConnectedVideoCall
      v-if="CALL_CONNECTION_ENABLED"
      ref="connected_video"
      :busy="is_leaving"
      :error-message="error_message"
      @hangup="end_call"
    />
    <view v-else class="call-unavailable" role="alert">
      <text>{{ $t('This call is unavailable.') }}</text>
      <view role="button" @click="return_from_unavailable">{{ $t('Return') }}</view>
    </view>
  </PageTransition>
</template>

<script setup>
import { t } from '@/utils/i18n'

import { nextTick, onBeforeUnmount, ref } from 'vue'
import { onHide, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { CALL_CONNECTION_ENABLED } from '@/config/callMedia'
import ConnectedVideoCall from '@/components/ConnectedVideoCall.vue'
import PageTransition from '@/components/PageTransition.vue'
import {
  connected_end_toast,
  CONNECTED_END_REASON,
  normalize_call_return_url,
  plan_connected_schedule,
  read_call_route_context
} from '@/utils/callPresentation'
import { create_call_sound_controller } from '@/utils/callSounds'

const page_transition = ref(null)
const connected_video = ref(null)
const call_id = ref('')
const callee_id = ref('')
const return_url = ref('/pages/messages/index')
const is_leaving = ref(false)
const error_message = ref('')
const call_sounds = create_call_sound_controller()
let peer_hangup_timer = null
let network_timer = null
let visible = false

const theme_style = {
  '--page-background': theme.colors.call.background,
  '--call-text': theme.colors.text.on_media
}

const clear_timers = () => {
  clearTimeout(peer_hangup_timer)
  peer_hangup_timer = null
  clearTimeout(network_timer)
  network_timer = null
}

const show_toast = (title) => {
  if (!title || typeof uni === 'undefined' || !uni.showToast) return
  uni.showToast({ title: t(title), icon: 'none' })
}

const finish_call = (reason) => {
  if (is_leaving.value) return
  is_leaving.value = true
  connected_video.value?.stop_camera()
  clear_timers()
  call_sounds.play_ended()
  show_toast(connected_end_toast(reason))
  const fail = () => {
    is_leaving.value = false
    error_message.value = 'Unable to return to the previous page.'
  }
  if (getCurrentPages().length > 1) {
    page_transition.value?.navigate_back({ fail })
    return
  }
  page_transition.value?.navigate_relaunch({ url: return_url.value, fail })
}

const end_call = () => {
  finish_call(CONNECTED_END_REASON.hangup)
}

const return_from_unavailable = () => {
  if (getCurrentPages().length > 1) page_transition.value?.navigate_back({ immediate: true })
  else page_transition.value?.navigate_relaunch({ url: return_url.value, immediate: true })
}

const schedule_simulated_events = () => {
  clear_timers()
  if (!visible || is_leaving.value) return
  const schedule = plan_connected_schedule()
  network_timer = setTimeout(() => {
    network_timer = null
    if (!visible || is_leaving.value) return
    if (schedule.network_failure) finish_call(CONNECTED_END_REASON.network_error)
  }, schedule.network_check_ms)
  peer_hangup_timer = setTimeout(() => {
    peer_hangup_timer = null
    if (!visible || is_leaving.value) return
    finish_call(CONNECTED_END_REASON.peer_hangup)
  }, schedule.peer_hangup_ms)
}

onLoad((query = {}) => {
  const context = read_call_route_context(query)
  call_id.value = context.call_id
  callee_id.value = context.callee_id
  return_url.value = normalize_call_return_url(context.source_page)
  if (!call_id.value || !callee_id.value) {
    error_message.value = 'This call is unavailable.'
  }
})

onShow(() => {
  visible = true
  is_leaving.value = false
  if (!CALL_CONNECTION_ENABLED) {
    show_toast('This call is unavailable.')
    nextTick(return_from_unavailable)
    return
  }
  if (!callee_id.value) {
    page_transition.value?.navigate_back()
    return
  }
  nextTick(() => connected_video.value?.start_camera())
  schedule_simulated_events()
})

const cleanup = () => {
  visible = false
  connected_video.value?.stop_camera()
  clear_timers()
  call_sounds.stop_all()
}

onHide(cleanup)
onBeforeUnmount(cleanup)
</script>

<style scoped lang="scss">
.connected-call-page {
  position: relative;
  background: var(--page-background);
}

.call-unavailable {
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 24rpx;
  align-items: center;
  justify-content: center;
  color: var(--call-text);
}
</style>

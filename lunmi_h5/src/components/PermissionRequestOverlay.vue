<template>
  <view v-if="visible" class="permission-overlay" :style="overlay_style" @click="deny_permission">
    <view class="permission-stage" @click.stop>
      <view class="permission-card" role="dialog" aria-modal="true" :aria-label="$t(current_permission.title)">
        <view class="permission-copy">
          <text class="permission-title">{{ $t(current_permission.title) }}</text>
          <text class="permission-description">{{ $t(current_permission.description) }}</text>
        </view>
        <view class="permission-actions">
          <view
            class="permission-action"
            :class="{ 'permission-action--disabled': is_requesting }"
            role="button"
            :aria-disabled="is_requesting"
            @click="deny_permission"
          >
            <text>{{ $t(current_permission.deny_label) }}</text>
          </view>
          <view
            v-if="current_permission.can_allow"
            class="permission-action permission-action--allow"
            :class="{ 'permission-action--disabled': is_requesting }"
            role="button"
            :aria-disabled="is_requesting"
            :aria-busy="is_requesting"
            @click="allow_permission"
          >
            <text>{{ $t('Allow') }}</text>
          </view>
        </view>
      </view>
      <text v-if="feedback_message" class="permission-feedback">{{ $t(feedback_message) }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { read_permission_request_definition } from '@/utils/permissionRequestPresentation'
import { ensure_ios_permission } from '@/utils/iosPermissionBridge'

const props = defineProps({
  visible: { type: Boolean, default: false },
  permissionKey: { type: String, default: '' }
})

const emit = defineEmits(['update:visible', 'granted', 'denied'])

const is_requesting = ref(false)
const feedback_message = ref('')
const is_active = ref(true)

const current_permission = computed(() => read_permission_request_definition(props.permissionKey))
const overlay_style = {
  '--permission-card': theme.colors.permission.card,
  '--permission-divider': theme.colors.permission.divider,
  '--permission-action': theme.colors.permission.action,
  '--permission-copy': theme.colors.permission.copy,
  '--permission-title': theme.colors.text.on_media,
  '--permission-scrim': theme.colors.surface.scrim,
  '--permission-error': theme.colors.status.danger
}

const close_overlay = (event_name) => {
  if (!props.visible) return
  emit('update:visible', false)
  emit(event_name)
}

const deny_permission = () => {
  if (is_requesting.value) return
  feedback_message.value = ''
  close_overlay('denied')
}

const allow_permission = async () => {
  const bridge_permission = current_permission.value.bridge_permission
  if (is_requesting.value) return
  if (!bridge_permission) {
    feedback_message.value = 'Notification permission is unavailable on this device.'
    return
  }
  is_requesting.value = true
  feedback_message.value = ''
  try {
    const result = await ensure_ios_permission(bridge_permission, {
      reason: current_permission.value.reason
    })
    if (!is_active.value || !props.visible) return
    if (result.granted) {
      is_requesting.value = false
      close_overlay('granted')
      return
    }
    feedback_message.value = result.unavailable
      ? 'This permission is unavailable on this device.'
      : 'Permission was not granted.'
  } catch {
    if (is_active.value && props.visible) {
      feedback_message.value = 'This permission is unavailable on this device.'
    }
  } finally {
    if (is_active.value) is_requesting.value = false
  }
}

watch(() => props.visible, (next_visible) => {
  if (!next_visible) {
    feedback_message.value = ''
    is_requesting.value = false
  }
})

onBeforeUnmount(() => {
  is_active.value = false
})
</script>

<style scoped lang="scss">
.permission-overlay {
  position: fixed;
  z-index: 1300;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
  background: var(--permission-scrim);
}

.permission-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
}

.permission-card {
  width: 614rpx;
  max-width: 100%;
  overflow: hidden;
  border-radius: 30rpx;
  background: var(--permission-card);
}

.permission-copy {
  padding: 36rpx 36rpx 28rpx;
  text-align: center;
}

.permission-title {
  display: block;
  color: var(--permission-title);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.permission-description {
  display: block;
  margin-top: 10rpx;
  color: var(--permission-copy);
  font-size: 24rpx;
  font-weight: 400;
  line-height: 36rpx;
}

.permission-actions {
  display: flex;
  border-top: 1px solid var(--permission-divider);
}

.permission-action {
  display: flex;
  height: 90rpx;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--permission-divider);
  color: var(--permission-action);
  font-size: 34rpx;
  font-weight: 400;
}

.permission-action:last-child {
  border-right-width: 0;
}

.permission-action--allow {
  font-weight: 700;
}

.permission-action--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.permission-feedback {
  width: 614rpx;
  max-width: 100%;
  margin-top: 24rpx;
  color: var(--permission-error);
  font-size: 24rpx;
  font-weight: 500;
  line-height: 34rpx;
  text-align: center;
}
</style>

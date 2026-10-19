<template>
  <transition name="delete-confirm-slide">
    <view v-if="visible" class="delete-confirm" :style="theme_style" @click="emit_cancel">
      <view class="delete-confirm__card" @click.stop>
        <view class="delete-confirm__handle" />
        <view class="delete-confirm__icon" aria-hidden="true">
          <image src="/static/icon/post_details_del.png" mode="aspectFit" />
        </view>
        <text class="delete-confirm__title">{{ $t(title) }}</text>
        <text v-if="copy" class="delete-confirm__copy">{{ $t(copy) }}</text>
        <text v-if="error" class="delete-confirm__error" role="alert">{{ $t(error) }}</text>
        <view class="delete-confirm__actions">
          <view
            class="delete-confirm__button delete-confirm__button--keep"
            role="button"
            :aria-disabled="pending"
            @click="emit_cancel"
          >{{ $t(cancelLabel) }}</view>
          <view
            class="delete-confirm__button delete-confirm__button--delete"
            role="button"
            :aria-disabled="pending"
            @click="emit_confirm"
          >{{ $t(pending ? pendingLabel : confirmLabel) }}</view>
        </view>
      </view>
      <DeleteObjectLoading v-if="pending" :title="$t(pendingLabel)" />
    </view>
  </transition>
</template>

<script setup>
import theme from '@/config/theme.json'
import DeleteObjectLoading from '@/components/DeleteObjectLoading.vue'
import { DELETE_CONFIRM_LABEL, DELETE_KEEP_LABEL, DELETE_PENDING_LABEL } from '@/utils/deleteConfirmPresentation'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  copy: { type: String, default: '' },
  error: { type: String, default: '' },
  pending: { type: Boolean, default: false },
  confirmLabel: { type: String, default: DELETE_CONFIRM_LABEL },
  cancelLabel: { type: String, default: DELETE_KEEP_LABEL },
  pendingLabel: { type: String, default: DELETE_PENDING_LABEL }
})
const emit = defineEmits(['cancel', 'confirm'])
const theme_style = {
  '--delete-sheet': theme.colors.voice_room.sheet_surface,
  '--delete-title': theme.colors.text.title,
  '--delete-copy': theme.colors.text.secondary,
  '--delete-danger': theme.colors.dialog.danger.background,
  '--delete-line': theme.colors.dialog.cancel.border,
  '--delete-keep': theme.colors.dialog.cancel.text,
  '--delete-scrim': theme.colors.surface.scrim,
  '--delete-shadow': theme.colors.surface.shadow,
  '--delete-error': theme.colors.status.danger,
  '--delete-handle': theme.colors.surface.border
}

const emit_cancel = () => {
  if (props.pending) return
  emit('cancel')
}

const emit_confirm = () => {
  if (props.pending) return
  emit('confirm')
}
</script>

<style scoped lang="scss">
.delete-confirm {
  position: fixed;
  z-index: 1250;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 28rpx var(--page-safe-bottom);
  background: var(--delete-scrim);
}

.delete-confirm__card {
  box-sizing: border-box;
  width: 100%;
  padding: 20rpx 36rpx 36rpx;
  border: 1px solid var(--delete-line);
  border-radius: 40rpx;
  background: var(--delete-sheet);
  box-shadow: 0 24rpx 72rpx var(--delete-shadow);
  text-align: center;
}

.delete-confirm__handle {
  width: 72rpx;
  height: 8rpx;
  margin: 0 auto 28rpx;
  border-radius: 999rpx;
  background: var(--delete-handle);
}

.delete-confirm__icon {
  display: flex;
  width: 128rpx;
  height: 128rpx;
  align-items: center;
  justify-content: center;
  margin: 0 auto 28rpx;
}

.delete-confirm__icon image {
 width: 128rpx;
height: 128rpx;
}

.delete-confirm__title {
  display: block;
  color: var(--delete-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.25;
}

.delete-confirm__copy {
  display: block;
  margin-top: 16rpx;
  color: var(--delete-copy);
  font-size: 26rpx;
  line-height: 1.45;
}

.delete-confirm__error {
  display: block;
  margin-top: 16rpx;
  color: var(--delete-error);
  font-size: 24rpx;
  line-height: 1.4;
}

.delete-confirm__actions {
  display: flex;
  margin-top: 36rpx;
  gap: 20rpx;
}

.delete-confirm__button {
  display: flex;
  height: 88rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 88rpx;
}

.delete-confirm__button--keep {
  border: 1px solid var(--delete-line);
  background: transparent;
  color: var(--delete-keep);
}

.delete-confirm__button--delete {
  border: 1px solid var(--delete-danger);
  background: transparent;
  color: var(--delete-danger);
}

.delete-confirm-slide-enter-active,
.delete-confirm-slide-leave-active {
  transition: opacity .28s ease;
}

.delete-confirm-slide-enter-active .delete-confirm__card,
.delete-confirm-slide-leave-active .delete-confirm__card {
  transition: transform .28s cubic-bezier(.33, 1, .68, 1);
}

.delete-confirm-slide-enter-from,
.delete-confirm-slide-leave-to {
  opacity: 0;
}

.delete-confirm-slide-enter-from .delete-confirm__card,
.delete-confirm-slide-leave-to .delete-confirm__card {
  transform: translateY(48rpx);
}
</style>

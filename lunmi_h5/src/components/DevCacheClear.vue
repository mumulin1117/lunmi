<template>
  <view v-if="is_dev_mode" class="dev-cache-clear" :style="theme_style">
    <view class="dev-cache-copy">
      <text class="dev-cache-title">{{ $t('DEV TOOLS') }}</text>
      <text class="dev-cache-caption">{{ $t('Clear this project\'s local cache and session.') }}</text>
    </view>
    <view class="dev-cache-button" role="button" @click="is_confirmation_visible = true">{{ $t('Clear cache') }}</view>
    <transition name="dialog-pop">
      <view v-if="is_confirmation_visible" class="dev-cache-modal" @click.self="close_confirmation">
        <view class="dev-cache-dialog">
          <text class="dev-cache-dialog__eyebrow">{{ $t('DEVELOPMENT ONLY') }}</text>
          <text class="dev-cache-dialog__title">{{ $t('Clear project cache?') }}</text>
          <text class="dev-cache-dialog__copy">{{ $t('This removes local project storage and the current session.') }}</text>
          <view class="dev-cache-dialog__actions">
            <view class="dev-cache-dialog__button dev-cache-dialog__button--secondary" role="button" @click="close_confirmation">{{ $t('Cancel') }}</view>
            <view class="dev-cache-dialog__button dev-cache-dialog__button--primary" role="button" @click="start_clear_cache">{{ $t('Clear cache') }}</view>
          </view>
        </view>
      </view>
    </transition>
    <CacheClearingLoading v-if="is_clearing" />
  </view>
</template>

<script setup>
import { t } from '@/utils/i18n'

import { ref } from 'vue'
import theme from '@/config/theme.json'
import CacheClearingLoading from '@/components/CacheClearingLoading.vue'
import { storeGlobal } from '@/stores/store'
import { clear_project_cache } from '@/utils/projectCache'
import { relaunch_route } from '@/utils/routeTransition'
const is_dev_mode = import.meta.env.DEV
const is_confirmation_visible = ref(false)
const is_clearing = ref(false)
const app_store = storeGlobal()
const theme_style = { '--dev-cache-background': theme.colors.dialog.background, '--dev-cache-text': theme.colors.text.title, '--dev-cache-secondary': theme.colors.text.secondary, '--dev-cache-surface': theme.colors.button_change.default.background, '--dev-cache-border': theme.colors.dialog.border, '--dev-cache-accent': theme.colors.button.primary, '--dev-cache-accent-text': theme.colors.button.text, '--dev-cache-scrim': theme.colors.surface.scrim_soft, '--dev-cache-shadow': theme.colors.surface.shadow }
const close_confirmation = () => { if (!is_clearing.value) is_confirmation_visible.value = false }
const start_clear_cache = async () => {
  if (!is_dev_mode || is_clearing.value) return
  is_confirmation_visible.value = false
  is_clearing.value = true
  try {
    await clear_project_cache()
    app_store.logout()
    relaunch_route({ url: '/pages/login/index' })
  } catch (error) {
    uni.showToast({ title: t(error?.message || 'Unable to clear the cache.'), icon: 'none' })
  } finally {
    is_clearing.value = false
  }
}
</script>

<style scoped lang="scss">
.dev-cache-clear {
  display: flex;
  margin-top: 24rpx;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border: 1rpx dashed var(--dev-cache-accent);
  border-radius: 28rpx;
  background: var(--dev-cache-surface);
}

.dev-cache-copy {
  display: flex;
  min-width: 0;
  padding-right: 18rpx;
  flex: 1;
  flex-direction: column;
}

.dev-cache-title {
  color: var(--dev-cache-accent);
  font-size: 19rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.dev-cache-caption {
  margin-top: 8rpx;
  color: var(--dev-cache-secondary);
  font-size: 21rpx;
}

.dev-cache-button {
  display: flex;
  height: 66rpx;
  align-items: center;
  justify-content: center;
  padding: 0 22rpx;
  border-radius: 18rpx;
  background: var(--dev-cache-accent);
  color: var(--dev-cache-accent-text);
  font-size: 22rpx;
  font-weight: 800;
  line-height: 66rpx;
  text-align: center;
}

.dev-cache-modal {
  position: fixed;
  z-index: 1500;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 44rpx;
  background: var(--dev-cache-scrim);
}

.dev-cache-dialog {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  max-width: 590rpx;
  padding: 42rpx 36rpx 34rpx;
  border: 1rpx solid var(--dev-cache-border);
  border-radius: 36rpx;
  background: var(--dev-cache-background);
  box-shadow: 0 28rpx 80rpx var(--dev-cache-shadow);
  flex-direction: column;
}

.dev-cache-dialog__eyebrow {
  color: var(--dev-cache-accent);
  font-size: 19rpx;
  font-weight: 900;
}

.dev-cache-dialog__title {
  margin-top: 18rpx;
  color: var(--dev-cache-text);
  font-size: 36rpx;
  font-weight: 900;
}

.dev-cache-dialog__copy {
  margin-top: 18rpx;
  color: var(--dev-cache-secondary);
  font-size: 25rpx;
}

.dev-cache-dialog__actions {
  display: flex;
  gap: 16rpx;
  margin-top: 38rpx;
}

.dev-cache-dialog__button {
  display: flex;
  height: 80rpx;
  align-items: center;
  justify-content: center;
  border-radius: 22rpx;
  flex: 1;
  font-size: 25rpx;
  font-weight: 800;
  line-height: 80rpx;
  text-align: center;
}

.dev-cache-dialog__button--secondary {
  border: 1rpx solid var(--dev-cache-secondary);
  background: var(--dev-cache-surface);
  color: var(--dev-cache-text);
}

.dev-cache-dialog__button--primary {
  background: var(--dev-cache-accent);
  color: var(--dev-cache-accent-text);
}

.dialog-pop-enter-active {
  transition: opacity .28s ease-out;
}

.dialog-pop-leave-active {
  transition: opacity .2s ease-in;
}

.dialog-pop-enter-from,
.dialog-pop-leave-to {
  opacity: 0;
}
</style>

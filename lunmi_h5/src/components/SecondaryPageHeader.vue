<template>
  <view class="secondary-page-header" :style="theme_style">
    <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
    <view class="header-copy">
      <slot>
        <text class="header-title">{{ $t(title) }}</text>
      </slot>
    </view>
    <view v-if="$slots.actions" class="header-actions">
      <slot name="actions" />
    </view>
  </view>
</template>

<script setup>
import theme from '@/config/theme.json'
import { back_route, use_route_transition_context } from '@/utils/routeTransition'

const props = defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  returnUrl: { type: String, default: '' },
  backAction: { type: Function, default: null }
})

const route_transition = use_route_transition_context()
const theme_style = {
  '--header-background': theme.colors.page.background,
  '--header-surface': theme.colors.surface.card,
  '--header-title': theme.colors.text.title,
  '--header-secondary': theme.colors.text.secondary
}

const go_back = () => {
  if (props.backAction) {
    props.backAction()
    return
  }
  if (props.returnUrl && route_transition) {
    route_transition.navigate_relaunch({ url: props.returnUrl })
    return
  }
  if (route_transition) {
    route_transition.navigate_back()
    return
  }
  back_route()
}
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.secondary-page-header {
  position: relative;
  z-index: 8;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 96rpx;
  align-items: center;
  padding: 0 40rpx;
  background: var(--header-background);
  flex: none;
}

.back-button {
  @include page_back.button;
  margin-right: 22rpx;
}

.header-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.header-actions {
  display: flex;
  margin-left: 16rpx;
  align-items: center;
  gap: 8rpx;
  flex: none;
}

.header-title {
  display: block;
  overflow: hidden;
  color: var(--header-title);
  font-size: 32rpx;
  font-weight: 800;
  line-height: 44rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

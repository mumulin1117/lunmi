<template>
  <view class="tab-bar" :style="theme_style" role="navigation" :aria-label="$t('Primary navigation')">
    <view
      v-for="item in tab_items"
      :key="item.path"
      class="tab-item"
      role="button"
      :aria-label="$t(item.label)"
      :aria-current="item.path === current_path ? 'page' : undefined"
      @click="switch_tab(item)"
    >
      <image
        class="tab-icon"
        :src="item.path === current_path ? item.active_icon : item.default_icon"
        mode="aspectFit"
      />
    </view>
  </view>
  <LoginRedirectLoading v-if="is_login_redirect_loading" />
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import LoginRedirectLoading from '@/components/LoginRedirectLoading.vue'
import { is_login_redirect_loading } from '@/utils/routeGuard'
import { replace_route } from '@/utils/routeTransition'
import { schedule_configured_incoming_call } from '@/utils/incomingCallScheduler'

const tab_items = [
  { label: 'Home', path: 'pages/discover/index', default_icon: '/static/tabbar/home-default.svg', active_icon: '/static/tabbar/home-active.svg' },
  { label: 'Messages', path: 'pages/messages/index', default_icon: '/static/tabbar/library-default.svg', active_icon: '/static/tabbar/library-active.svg' },
  { label: 'Videos', path: 'pages/videos/index', default_icon: '/static/tabbar/wall-default.svg', active_icon: '/static/tabbar/wall-active.svg' },
  { label: 'Profile', path: 'pages/profile/index', default_icon: '/static/tabbar/profile-default.svg', active_icon: '/static/tabbar/profile-active.svg' }
]

const current_path = ref(tab_items[0].path)
const theme_style = {
  '--tabbar-background': theme.colors.tabbar.background,
  '--tabbar-border': theme.colors.tabbar.border
}

const sync_current_path = () => {
  const pages = getCurrentPages()
  const route = pages[pages.length - 1]?.route
  if (route) current_path.value = route
}

const switch_tab = (item) => {
  if (item.path === current_path.value) return
  replace_route({
    url: `/${item.path}`,
    success: () => {
      current_path.value = item.path
    }
  })
}

onMounted(sync_current_path)
onShow(() => {
  sync_current_path()
  schedule_configured_incoming_call()
})
</script>

<style scoped lang="scss">
.tab-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  display: flex;
  box-sizing: content-box;
  width: 100%;
  height: 98rpx;
  min-height: 98rpx;
  padding-bottom: var(--page-safe-bottom);
  border-top: 1rpx solid var(--tabbar-border);
  background: var(--tabbar-background);
}

.tab-item {
  display: flex;
  min-height: 98rpx;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.tab-icon {
  width: 48rpx;
  height: 48rpx;
}
</style>

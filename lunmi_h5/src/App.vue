<template>
  <ApiErrorDialog />
  <LoginRedirectLoading v-if="is_login_redirect_loading" />
</template>

<script setup>
import { getCurrentInstance, onBeforeUnmount, onMounted } from 'vue'
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { sync_ios_purchase_session } from '@/utils/coinPurchaseSync'
import theme from '@/config/theme.json'
import { ensure_authenticated_entry, register_route_guard } from '@/utils/routeGuard'
import { register_ios_safe_area_bridge } from '@/utils/safeArea'
import ApiErrorDialog from '@/components/ApiErrorDialog.vue'
import LoginRedirectLoading from '@/components/LoginRedirectLoading.vue'
import { is_login_redirect_loading } from '@/utils/routeGuard'
import MainTabBar from '@/components/MainTabBar.vue'
import { mount_global_ui } from '@/utils/mountGlobalUi'
import { register_browser_history_guard } from '@/utils/browserHistoryGuard'
import { storeGlobal } from '@/stores/store'

const app_context = getCurrentInstance().appContext
let unmount_main_tab_bar = () => {}
let remove_history_guard = () => {}

onMounted(() => {
  remove_history_guard = register_browser_history_guard({
    router: app_context.config.globalProperties.$router,
    has_session: () => Boolean(storeGlobal().hasToken)
  })
  unmount_main_tab_bar = mount_global_ui(MainTabBar, app_context)
})
onBeforeUnmount(() => {
  remove_history_guard()
  unmount_main_tab_bar()
})

let browser_gesture_listeners_added = false

const prevent_zoom_gesture = (event) => {
  if ((event.touches?.length > 1 || event.type.startsWith('gesture')) && event.cancelable) {
    event.preventDefault()
  }
}

const configure_h5_runtime = () => {
  if (browser_gesture_listeners_added || typeof document === 'undefined') return

  register_ios_safe_area_bridge()
  document.documentElement.style.setProperty('--theme-page-background', theme.colors.page.background)
  document.addEventListener('gesturestart', prevent_zoom_gesture, { passive: false })
  document.addEventListener('gesturechange', prevent_zoom_gesture, { passive: false })
  document.addEventListener('touchmove', prevent_zoom_gesture, { passive: false })
  browser_gesture_listeners_added = true
}

onLaunch(() => {
  configure_h5_runtime()
  register_route_guard()
  ensure_authenticated_entry()
})

onShow(() => { sync_ios_purchase_session() })
</script>

<style lang="scss">
.main-tabbar-spacer {
  position: relative;
  z-index: 2;
  height: var(--app-main-tab-bar-height);
  flex: none;
}

@font-face {
  font-family: 'Montserrat';
  src: url('/static/fonts/Montserrat-Regular.ttf') format('truetype');
  font-display: swap;
  font-style: normal;
  font-weight: 400;
}

@font-face {
  font-family: 'Montserrat';
  src: url('/static/fonts/Montserrat-Medium.ttf') format('truetype');
  font-display: swap;
  font-style: normal;
  font-weight: 500;
}

@font-face {
  font-family: 'Montserrat';
  src: url('/static/fonts/Montserrat-SemiBold.ttf') format('truetype');
  font-display: swap;
  font-style: normal;
  font-weight: 600;
}

@font-face {
  font-family: 'Montserrat';
  src: url('/static/fonts/Montserrat-Bold.ttf') format('truetype');
  font-display: swap;
  font-style: normal;
  font-weight: 700;
}

@font-face {
  font-family: 'Montserrat';
  src: url('/static/fonts/Montserrat-ExtraBold.ttf') format('truetype');
  font-display: swap;
  font-style: normal;
  font-weight: 800;
}

@font-face {
  font-family: 'Montserrat';
  src: url('/static/fonts/Montserrat-Black.ttf') format('truetype');
  font-display: swap;
  font-style: normal;
  font-weight: 900;
}

html {
  --native-safe-area-top: 0px;
  --native-safe-area-bottom: 0px;
}

html,
body,
#app,
uni-app,
uni-page,
uni-page-wrapper,
uni-page-body,
page {
  --app-safe-top: max(var(--status-bar-height, 0px), var(--native-safe-area-top, 0px), env(safe-area-inset-top, 0px));
  --app-safe-bottom: max(var(--native-safe-area-bottom, 0px), env(safe-area-inset-bottom, 0px));
  --page-safe-top: var(--app-safe-top);
  --page-safe-bottom: var(--app-safe-bottom);
  --app-top-safe-area-height: var(--page-safe-top);
  --app-bottom-safe-area-height: var(--page-safe-bottom);
  --app-main-tab-bar-height: calc(156rpx + var(--page-safe-bottom));
}

html,
body,
#app,
uni-app,
uni-page,
uni-page-wrapper,
uni-page-body,
page {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--theme-page-background);
  font-family: 'Montserrat', sans-serif;
  font-synthesis: none;
  font-weight: 400;
  touch-action: pan-x pan-y;
}

uni-page-body *,
page *,
input,
textarea,
button,
uni-input,
uni-textarea,
uni-button {
  font-family: 'Montserrat', sans-serif;
  font-synthesis: none;
}

input::placeholder,
textarea::placeholder {
  font-family: 'Montserrat', sans-serif;
}

page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--theme-page-background);
}

uni-page-body > .page,
uni-page-body > page-transition > .page {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.page-content {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: calc(100vh - var(--page-safe-top) - var(--page-safe-bottom));
  min-height: 0;
  overflow: hidden;
  flex: 0 0 calc(100vh - var(--page-safe-top) - var(--page-safe-bottom));
  flex-direction: column;
}

.main-page-content {
  box-sizing: border-box;
  width: 100%;
  height: calc(100vh - var(--page-safe-top) - var(--app-main-tab-bar-height));
  min-height: 0;
  flex: 0 0 calc(100vh - var(--page-safe-top) - var(--app-main-tab-bar-height));
}

.content-scroll,
.main-page-content,
uni-scroll-view,
.uni-scroll-view {
  overscroll-behavior-x: none;
  overscroll-behavior-y: auto;
  -webkit-overflow-scrolling: touch;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.content-scroll {
  box-sizing: border-box;
  width: 100%;
  height: 0;
  min-height: 0;
  flex: 1;
}

.content-scroll__inner,
.main-scroll__inner {
  box-sizing: border-box;
  min-height: calc(100% + 2rpx);
}

html::-webkit-scrollbar,
body::-webkit-scrollbar,
uni-page-wrapper::-webkit-scrollbar,
uni-page-body::-webkit-scrollbar,
uni-scroll-view::-webkit-scrollbar,
.uni-scroll-view::-webkit-scrollbar,
.uni-scroll-view-content::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.page-slide-forward-enter-active,
.page-slide-back-enter-active {
  transition: opacity var(--route-transition-enter-duration, 500ms) cubic-bezier(.33, 1, .68, 1), transform var(--route-transition-enter-duration, 500ms) cubic-bezier(.33, 1, .68, 1);
  will-change: opacity, transform;
}

.page-slide-forward-leave-active,
.page-slide-back-leave-active {
  transition: opacity var(--route-transition-leave-duration, 320ms) cubic-bezier(.32, .72, 0, 1), transform var(--route-transition-leave-duration, 320ms) cubic-bezier(.32, .72, 0, 1);
  will-change: opacity, transform;
}

.page-slide-forward-enter-from,
.page-slide-back-leave-to {
  opacity: 0;
  transform: translateX(64rpx);
}

.page-slide-forward-leave-to,
.page-slide-back-enter-from {
  opacity: 0;
  transform: translateX(-32rpx);
}

.route-stack-snapshot {
  position: fixed;
  z-index: 10;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--theme-page-background);
  pointer-events: none;
  transform: translate3d(0, 0, 0) scale(1);
  transform-origin: center center;
  backface-visibility: hidden;
  contain: layout paint;
  will-change: transform;
}

.route-stack-snapshot--animating {
  transition: transform var(--route-transition-stack-duration) cubic-bezier(.32, .72, 0, 1);
}

.route-stack-snapshot--pushed {
  transform: translate3d(-30%, 0, 0) scale(.95);
}

.route-stack-snapshot--revealed {
  transition: none;
  transform: translate3d(0, 0, 0) scale(1);
}

uni-page.route-stack-page--foreground {
  position: relative;
  z-index: 11;
}

uni-page.route-stack-page--foreground,
uni-page.route-stack-page--foreground > uni-page-wrapper,
uni-page.route-stack-page--foreground > uni-page-wrapper > uni-page-body {
  background: transparent;
}

.page-stack-forward-enter-active {
  box-shadow: -24rpx 0 48rpx var(--route-transition-shadow);
}

.page-stack-forward-enter-active,
.page-stack-back-leave-active {
  transition: transform var(--route-transition-stack-duration) cubic-bezier(.32, .72, 0, 1);
  backface-visibility: hidden;
  will-change: transform;
}

.page-stack-back-leave-active {
  opacity: 1;
  filter: none;
  box-shadow: none;
}

.page-stack-forward-enter-from,
.page-stack-back-leave-to {
  transform: translate3d(100%, 0, 0);
}

.page-route-none-enter-active,
.page-route-none-leave-active {
  transition: none;
}

.page--main.page-route-none-enter-active { transition: opacity 160ms ease-out; }
.page--main.page-route-none-enter-from { opacity: 0; }

.page-curtain-enter-active::before,
.page-curtain-enter-active::after {
  position: absolute;
  z-index: 1500;
  top: 0;
  bottom: 0;
  width: 50%;
  background: var(--theme-page-background);
  content: '';
  pointer-events: none;
  transition: transform var(--route-transition-enter-duration) cubic-bezier(.33, 1, .68, 1);
  backface-visibility: hidden;
  will-change: transform;
}

.page-curtain-enter-active::before {
  left: 0;
  transform: translate3d(-100%, 0, 0);
}

.page-curtain-enter-active::after {
  right: 0;
  transform: translate3d(100%, 0, 0);
}

.page-curtain-enter-from::before,
.page-curtain-enter-from::after {
  transform: translate3d(0, 0, 0);
}

@media (prefers-reduced-motion: reduce) {
  .page-slide-forward-enter-active,
  .page-slide-forward-leave-active,
  .page-slide-back-enter-active,
  .page-slide-back-leave-active,
  .page-stack-forward-enter-active,
  .page-stack-back-leave-active,
  .page-curtain-enter-active { transition: opacity 120ms ease !important; }
  .page-slide-forward-enter-from,
  .page-slide-forward-leave-to,
  .page-slide-back-enter-from,
  .page-slide-back-leave-to,
  .page-stack-forward-enter-from,
  .page-stack-back-leave-to { transform: none !important; opacity: 0; }
  .route-stack-snapshot,
  .route-stack-snapshot--pushed,
  .route-stack-snapshot--revealed { transform: none !important; transition: none !important; }
  .page-curtain-enter-active::before,
  .page-curtain-enter-active::after { display: none; }
  .page-curtain-enter-from { opacity: 0; }
}
</style>

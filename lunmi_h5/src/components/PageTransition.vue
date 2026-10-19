<template>
  <transition :name="route_transition_name" :duration="route_transition_duration" appear @after-leave="complete_route_leave">
    <view ref="page_root" v-show="is_page_visible" v-bind="page_attrs">
      <slot />
      <LoginRedirectLoading v-if="is_login_redirect_loading" />
    </view>
  </transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useAttrs } from 'vue'
import { observe_native_launch_ready } from '@/utils/nativeLaunch'
import {
  provide_route_transition,
  ROUTE_TRANSITION_DURATION,
  ROUTE_TRANSITION_VARIANT
} from '@/utils/routeTransition'
import LoginRedirectLoading from '@/components/LoginRedirectLoading.vue'
import { is_login_redirect_loading } from '@/utils/routeGuard'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  transitionVariant: {
    type: String,
    default: ROUTE_TRANSITION_VARIANT.IOS_STACK
  }
})

const attrs = useAttrs()
const page_root = ref(null)
let stop_launch_observer = () => {}
onMounted(() => {
  stop_launch_observer = observe_native_launch_ready(page_root.value?.$el || page_root.value)
})
onBeforeUnmount(() => stop_launch_observer())
const transition_duration_style = Object.freeze({
  '--route-transition-enter-duration': `${ROUTE_TRANSITION_DURATION.ENTER}ms`,
  '--route-transition-leave-duration': `${ROUTE_TRANSITION_DURATION.LEAVE}ms`,
  '--route-transition-stack-duration': `${ROUTE_TRANSITION_DURATION.ENTER}ms`
})
const page_attrs = computed(() => ({
  ...attrs,
  class: ['page', attrs.class],
  style: [attrs.style, transition_duration_style]
}))

const transition = provide_route_transition({
  initial_variant: props.transitionVariant
})
const {
  complete_route_leave,
  is_page_visible,
  route_transition_name,
  route_transition_duration
} = transition

defineExpose({
  navigate_back: transition.navigate_back,
  navigate_forward: transition.navigate_forward,
  navigate_replace: transition.navigate_replace,
  navigate_relaunch: transition.navigate_relaunch
})
</script>

<style scoped lang="scss">
.page {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
  background: var(--page-background);
}
</style>

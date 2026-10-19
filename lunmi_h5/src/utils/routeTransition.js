import { computed, getCurrentInstance, inject, nextTick, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'

export const ROUTE_MOTION = Object.freeze({
  FORWARD: 'forward',
  BACK: 'back',
  NONE: 'none',
  DIRECT: 'direct',
  CURTAIN: 'curtain'
})

export const ROUTE_TRANSITION_VARIANT = Object.freeze({
  STANDARD: 'standard',
  IOS_STACK: 'ios-stack'
})

export const ROUTE_TRANSITION_DURATION = Object.freeze({
  ENTER: 620,
  LEAVE: 220
})

const TRANSITION_NAME_BY_MOTION = Object.freeze({
  [ROUTE_MOTION.FORWARD]: 'page-slide-forward',
  [ROUTE_MOTION.BACK]: 'page-slide-back',
  [ROUTE_MOTION.NONE]: 'page-route-none',
  [ROUTE_MOTION.DIRECT]: 'page-route-none',
  [ROUTE_MOTION.CURTAIN]: 'page-curtain'
})

const STACK_TRANSITION_NAME_BY_MOTION = Object.freeze({
  [ROUTE_MOTION.FORWARD]: 'page-stack-forward',
  [ROUTE_MOTION.BACK]: 'page-stack-back',
  [ROUTE_MOTION.NONE]: 'page-route-none',
  [ROUTE_MOTION.DIRECT]: 'page-route-none',
  [ROUTE_MOTION.CURTAIN]: 'page-curtain'
})

const pending_route_motion = ref(ROUTE_MOTION.NONE)
const pending_route_variant = ref(ROUTE_TRANSITION_VARIANT.STANDARD)
const ROUTE_TRANSITION_CONTEXT = Symbol('route-transition-context')
let pending_route_motion_set_at = 0
const ios_stack_entries = []

const STACK_SOURCE_READY_MAX_FRAMES = 12

const is_ios_stack_variant = (variant) => variant === ROUTE_TRANSITION_VARIANT.IOS_STACK

const get_transition_name = (motion, variant) => {
  const transition_names = is_ios_stack_variant(variant)
    ? STACK_TRANSITION_NAME_BY_MOTION
    : TRANSITION_NAME_BY_MOTION
  return transition_names[motion] || transition_names[ROUTE_MOTION.NONE]
}

const reset_pending_route_transition = () => {
  pending_route_motion.value = ROUTE_MOTION.NONE
  pending_route_variant.value = ROUTE_TRANSITION_VARIANT.STANDARD
  pending_route_motion_set_at = 0
}

const set_pending_route_motion = (motion, variant = ROUTE_TRANSITION_VARIANT.STANDARD) => {
  pending_route_motion.value = TRANSITION_NAME_BY_MOTION[motion]
    ? motion
    : ROUTE_MOTION.NONE
  pending_route_variant.value = is_ios_stack_variant(variant)
    ? variant
    : ROUTE_TRANSITION_VARIANT.STANDARD
  pending_route_motion_set_at = Date.now()
}

const consume_pending_route_transition = (
  fallback_motion = ROUTE_MOTION.FORWARD,
  fallback_variant = ROUTE_TRANSITION_VARIANT.STANDARD
) => {
  const has_fresh_motion = Date.now() - pending_route_motion_set_at <= 1200
  const motion = !has_fresh_motion || pending_route_motion.value === ROUTE_MOTION.NONE
    ? fallback_motion
    : pending_route_motion.value
  const variant = has_fresh_motion
    ? pending_route_variant.value
    : fallback_variant

  reset_pending_route_transition()
  return { motion, variant }
}

const can_use_route_stack_dom = () => typeof document !== 'undefined'

const get_active_stack_entry = () => ios_stack_entries[ios_stack_entries.length - 1] || null

// A completed Pop can retain its snapshot for a few frames while the source
// paints. A second Back must use the next layer, not that retiring snapshot.
const get_return_stack_entry = () => [...ios_stack_entries].reverse().find((entry) => !entry.is_popping) || null

const cancel_stack_animation_frame = (stack_entry) => {
  if (!stack_entry?.animation_frame || typeof cancelAnimationFrame !== 'function') return
  cancelAnimationFrame(stack_entry.animation_frame)
  stack_entry.animation_frame = null
}

const cancel_stack_cleanup_frame = (stack_entry) => {
  if (!stack_entry?.cleanup_frame || typeof cancelAnimationFrame !== 'function') return
  cancelAnimationFrame(stack_entry.cleanup_frame)
  stack_entry.cleanup_frame = null
}

const remove_stack_history_listener = () => {
  if (!can_use_route_stack_dom()) return
  window.removeEventListener('popstate', handle_stack_history_pop)
}

const release_stack_foreground_page = (stack_entry) => {
  const foreground_page_element = stack_entry?.foreground_page_element
  if (!foreground_page_element) return

  // A restored middle page may still be the foreground of an older snapshot.
  stack_entry.foreground_page_element = null
  const is_owned_by_another_entry = ios_stack_entries.some((entry) => (
    entry !== stack_entry
    && entry.foreground_page_element === foreground_page_element
  ))
  if (!is_owned_by_another_entry) {
    foreground_page_element.classList.remove('route-stack-page--foreground')
  }
}

const clear_ios_stack_snapshot = (stack_entry = get_active_stack_entry()) => {
  if (!stack_entry) return

  cancel_stack_animation_frame(stack_entry)
  cancel_stack_cleanup_frame(stack_entry)
  release_stack_foreground_page(stack_entry)
  stack_entry.snapshot_element?.remove()
  const entry_index = ios_stack_entries.indexOf(stack_entry)
  if (entry_index >= 0) ios_stack_entries.splice(entry_index, 1)
  if (!ios_stack_entries.length) remove_stack_history_listener()
}

const clear_all_ios_stack_snapshots = () => {
  while (ios_stack_entries.length) clear_ios_stack_snapshot(get_active_stack_entry())
}

const copy_scroll_positions = (source_element, clone_element) => {
  const source_nodes = [source_element, ...source_element.querySelectorAll('*')]
  const clone_nodes = [clone_element, ...clone_element.querySelectorAll('*')]

  source_nodes.forEach((source_node, index) => {
    const clone_node = clone_nodes[index]
    if (!clone_node) return
    clone_node.scrollTop = source_node.scrollTop
    clone_node.scrollLeft = source_node.scrollLeft
  })
}

const get_active_uni_page = () => {
  if (!can_use_route_stack_dom()) return null
  const page_elements = [...document.querySelectorAll('uni-page')]
  return page_elements[page_elements.length - 1] || null
}

const create_ios_stack_snapshot = (source_page_element) => {
  const snapshot_element = document.createElement('div')
  snapshot_element.setAttribute('aria-hidden', 'true')
  snapshot_element.setAttribute('inert', '')
  snapshot_element.classList.add('route-stack-snapshot')

  Array.from(source_page_element.childNodes).forEach((child_node) => {
    snapshot_element.appendChild(child_node.cloneNode(true))
  })

  // The live Tabbar stays outside routed pages. Include only its inert visual
  // copy when a main page participates in an existing iOS Push/Pop snapshot.
  if (source_page_element.querySelector('.main-tabbar-spacer')) {
    const main_tab_bar = document.querySelector('[data-main-tab-bar]')
    if (main_tab_bar) snapshot_element.appendChild(main_tab_bar.cloneNode(true))
  }

  return snapshot_element
}

const prepare_ios_stack_snapshot = () => {
  if (!can_use_route_stack_dom()) return null

  const source_page_element = get_active_uni_page()
  if (!source_page_element?.parentElement) return null

  const source_page_route = source_page_element.getAttribute('data-page') || ''
  const pending_entry = get_active_stack_entry()
  if (
    pending_entry
    && !pending_entry.foreground_page_element
    && pending_entry.source_page_route === source_page_route
  ) return pending_entry

  const snapshot_element = create_ios_stack_snapshot(source_page_element)
  snapshot_element.style.setProperty(
    '--route-transition-stack-duration',
    `${ROUTE_TRANSITION_DURATION.ENTER}ms`
  )
  source_page_element.parentElement.insertBefore(snapshot_element, source_page_element)
  copy_scroll_positions(source_page_element, snapshot_element)
  const stack_entry = {
    animation_frame: null,
    cleanup_attempt_count: 0,
    cleanup_frame: null,
    foreground_page_element: null,
    is_popping: false,
    snapshot_element,
    source_page_route
  }
  ios_stack_entries.push(stack_entry)
  if (ios_stack_entries.length === 1) window.addEventListener('popstate', handle_stack_history_pop)
  return stack_entry
}

const bind_stack_foreground_page = (stack_entry) => {
  if (!stack_entry) return
  const active_page_element = get_active_uni_page()
  if (stack_entry.foreground_page_element !== active_page_element) {
    release_stack_foreground_page(stack_entry)
    stack_entry.foreground_page_element = active_page_element
  }
  stack_entry.foreground_page_element?.classList.add('route-stack-page--foreground')
}

const start_ios_stack_push = (stack_entry = get_active_stack_entry()) => {
  if (!stack_entry?.snapshot_element || typeof requestAnimationFrame !== 'function') return

  bind_stack_foreground_page(stack_entry)
  stack_entry.snapshot_element.classList.add('route-stack-snapshot--animating')
  cancel_stack_animation_frame(stack_entry)
  stack_entry.animation_frame = requestAnimationFrame(() => {
    stack_entry.animation_frame = null
    stack_entry.snapshot_element?.classList.add('route-stack-snapshot--pushed')
  })
}

const start_ios_stack_pop = (stack_entry = get_active_stack_entry()) => {
  if (!stack_entry?.snapshot_element) return
  bind_stack_foreground_page(stack_entry)
  stack_entry.is_popping = true
  stack_entry.snapshot_element.classList.remove('route-stack-snapshot--revealed')
  stack_entry.snapshot_element.classList.remove('route-stack-snapshot--pushed')
}

const reveal_ios_stack_source = (stack_entry = get_active_stack_entry()) => {
  if (!stack_entry?.snapshot_element) return
  bind_stack_foreground_page(stack_entry)
  stack_entry.is_popping = true
  stack_entry.snapshot_element.classList.add('route-stack-snapshot--revealed')
}

const cancel_ios_stack_pop = (stack_entry = get_active_stack_entry()) => {
  if (!stack_entry?.snapshot_element) return
  stack_entry.is_popping = false
  stack_entry.snapshot_element.classList.remove('route-stack-snapshot--revealed')
  stack_entry.snapshot_element.classList.add('route-stack-snapshot--pushed')
}

const is_stack_source_page_ready = (stack_entry) => {
  const active_page_element = get_active_uni_page()
  if (!active_page_element) return false
  if (!stack_entry.source_page_route) return active_page_element !== stack_entry.foreground_page_element
  return active_page_element.getAttribute('data-page') === stack_entry.source_page_route
}

const wait_for_stack_source_page = (stack_entry) => {
  if (!ios_stack_entries.includes(stack_entry)) return

  if (
    is_stack_source_page_ready(stack_entry)
    || stack_entry.cleanup_attempt_count >= STACK_SOURCE_READY_MAX_FRAMES
  ) {
    stack_entry.cleanup_frame = requestAnimationFrame(() => {
      stack_entry.cleanup_frame = null
      clear_ios_stack_snapshot(stack_entry)
    })
    return
  }

  stack_entry.cleanup_attempt_count += 1
  stack_entry.cleanup_frame = requestAnimationFrame(() => wait_for_stack_source_page(stack_entry))
}

const finish_ios_stack_pop = (stack_entry = get_active_stack_entry()) => {
  if (!stack_entry?.snapshot_element) return
  if (typeof requestAnimationFrame !== 'function') {
    clear_ios_stack_snapshot(stack_entry)
    return
  }

  cancel_stack_cleanup_frame(stack_entry)
  stack_entry.cleanup_attempt_count = 0
  stack_entry.cleanup_frame = requestAnimationFrame(() => wait_for_stack_source_page(stack_entry))
}

function handle_stack_history_pop() {
  const stack_entry = get_active_stack_entry()
  if (!stack_entry) return
  reveal_ios_stack_source(stack_entry)
  finish_ios_stack_pop(stack_entry)
}

const with_native_animation_disabled = (options = {}) => ({
  ...options,
  animationType: 'none',
  animationDuration: 0
})

export const apply_h5_route_hash = (url = '', { replace = false } = {}) => {
  if (!url || typeof window === 'undefined' || typeof window.location === 'undefined') return false
  const normalized_url = `${url}`.startsWith('/') ? `${url}` : `/${url}`
  const route_hash = `#${normalized_url}`
  if (window.location.hash === route_hash) return false
  if (replace) window.location.replace(route_hash)
  else window.location.hash = route_hash
  return true
}

const apply_h5_route_fallback = (method_name, route_options = {}) => {
  if (method_name === 'navigateBack') {
    if (typeof window === 'undefined' || !window.history) return false
    window.history.go(-Math.max(1, Number(route_options.delta) || 1))
    return true
  }
  return apply_h5_route_hash(route_options.url, {
    replace: method_name !== 'navigateTo'
  })
}

const resolve_uni_route_api = (method_name) => {
  if (typeof uni === 'undefined') return null
  if (method_name === 'navigateTo' && typeof uni.navigateTo === 'function') {
    return uni.navigateTo.bind(uni)
  }
  if (method_name === 'redirectTo' && typeof uni.redirectTo === 'function') {
    return uni.redirectTo.bind(uni)
  }
  if (method_name === 'reLaunch' && typeof uni.reLaunch === 'function') {
    return uni.reLaunch.bind(uni)
  }
  if (method_name === 'navigateBack' && typeof uni.navigateBack === 'function') {
    return uni.navigateBack.bind(uni)
  }
  if (method_name === 'switchTab' && typeof uni.switchTab === 'function') {
    return uni.switchTab.bind(uni)
  }
  return null
}

const finish_route_callback = (route_options, hook_name, result) => {
  const callback = route_options?.[hook_name]
  if (typeof callback === 'function') callback(result)
}

const call_uni_route_method = (method_name, route_options) => {
  const route_api = resolve_uni_route_api(method_name)
  const success_result = { errMsg: `${method_name}:ok` }
  if (route_api) {
    try {
      return route_api(route_options)
    } catch (error) {
      if (apply_h5_route_fallback(method_name, route_options)) {
        finish_route_callback(route_options, 'success', success_result)
        finish_route_callback(route_options, 'complete', success_result)
        return
      }
      finish_route_callback(route_options, 'fail', error)
      finish_route_callback(route_options, 'complete', error)
      return
    }
  }
  if (apply_h5_route_fallback(method_name, route_options)) {
    finish_route_callback(route_options, 'success', success_result)
    finish_route_callback(route_options, 'complete', success_result)
    return
  }
  const error = { errMsg: `${method_name}:fail unavailable` }
  finish_route_callback(route_options, 'fail', error)
  finish_route_callback(route_options, 'complete', error)
}

const run_route_method = (
  method_name,
  options,
  motion,
  variant = ROUTE_TRANSITION_VARIANT.STANDARD,
  { clear_stack_on_fail = false, stack_entry = null } = {}
) => {
  set_pending_route_motion(motion, variant)

  const route_options = with_native_animation_disabled(options)
  const original_fail = route_options.fail

  route_options.fail = (error) => {
    reset_pending_route_transition()
    if (clear_stack_on_fail && stack_entry) clear_ios_stack_snapshot(stack_entry)
    original_fail?.(error)
  }

  return call_uni_route_method(method_name, route_options)
}

export const push_route = (options) => {
  const stack_entry = prepare_ios_stack_snapshot()
  return run_route_method(
    'navigateTo',
    options,
    ROUTE_MOTION.FORWARD,
    ROUTE_TRANSITION_VARIANT.IOS_STACK,
    { clear_stack_on_fail: true, stack_entry }
  )
}

export const push_stack_route = push_route

export const replace_route = (options = {}) => {
  const { immediate = false, ...route_options } = options
  return run_route_method('redirectTo', route_options, immediate ? ROUTE_MOTION.DIRECT : ROUTE_MOTION.NONE)
}

export const back_route = (options = {}) => {
  const stack_entry = get_return_stack_entry()
  let route_failed = false
  const variant = stack_entry
    ? ROUTE_TRANSITION_VARIANT.IOS_STACK
    : ROUTE_TRANSITION_VARIANT.STANDARD
  if (stack_entry) start_ios_stack_pop(stack_entry)
  return run_route_method('navigateBack', {
    ...options,
    fail: (error) => {
      route_failed = true
      cancel_ios_stack_pop(stack_entry)
      options.fail?.(error)
    },
    complete: (result) => {
      if (stack_entry && !route_failed) finish_ios_stack_pop(stack_entry)
      options.complete?.(result)
    }
  }, ROUTE_MOTION.BACK, variant)
}

export const relaunch_route = (options = {}) => {
  const { immediate = false, entry_motion, ...route_options } = options
  clear_all_ios_stack_snapshots()
  const motion = entry_motion === ROUTE_MOTION.CURTAIN
    ? ROUTE_MOTION.CURTAIN
    : (immediate ? ROUTE_MOTION.DIRECT : ROUTE_MOTION.NONE)
  return run_route_method('reLaunch', route_options, motion)
}

export const use_route_transition = ({
  initial_motion = ROUTE_MOTION.FORWARD,
  initial_variant = ROUTE_TRANSITION_VARIANT.STANDARD,
  leave_fallback_duration
} = {}) => {
  const initial_transition = consume_pending_route_transition(initial_motion, initial_variant)
  const route_motion = ref(initial_transition.motion)
  const route_variant = ref(initial_transition.variant)
  const is_page_visible = ref(true)
  const is_route_navigating = ref(false)
  let pending_route_action = null
  let leave_fallback_timer = null
  let was_hidden = false

  const route_transition_name = computed(() => (
    get_transition_name(route_motion.value, route_variant.value)
  ))

  // Vue cannot detect transition duration on pseudo-elements from the page root.
  const route_transition_duration = computed(() => (
    route_motion.value === ROUTE_MOTION.CURTAIN
      ? { enter: ROUTE_TRANSITION_DURATION.ENTER, leave: 0 }
      : undefined
  ))

  const resolved_leave_fallback_duration = computed(() => leave_fallback_duration ?? (
    is_ios_stack_variant(route_variant.value)
      ? ROUTE_TRANSITION_DURATION.ENTER + 80
      : ROUTE_TRANSITION_DURATION.LEAVE + 80
  ))

  const clear_leave_fallback_timer = () => {
    if (!leave_fallback_timer) return
    clearTimeout(leave_fallback_timer)
    leave_fallback_timer = null
  }

  const restore_page = async () => {
    clear_leave_fallback_timer()
    pending_route_action = null
    is_route_navigating.value = false
    const restored_transition = consume_pending_route_transition(
      ROUTE_MOTION.NONE,
      route_variant.value
    )
    // The stack Pop already reveals the source page; do not animate it a second time.
    route_motion.value = restored_transition.motion === ROUTE_MOTION.BACK
      && is_ios_stack_variant(restored_transition.variant)
      ? ROUTE_MOTION.NONE
      : restored_transition.motion
    route_variant.value = restored_transition.variant

    if (route_motion.value === ROUTE_MOTION.NONE || route_motion.value === ROUTE_MOTION.DIRECT) {
      is_page_visible.value = true
      return
    }

    is_page_visible.value = false
    await nextTick()
    is_page_visible.value = true
  }

  const complete_route_leave = () => {
    if (!pending_route_action) return

    const route_action = pending_route_action
    pending_route_action = null
    clear_leave_fallback_timer()
    route_action()
  }

  const start_route_leave = (motion, route_action, stack_entry = get_active_stack_entry()) => {
    if (is_route_navigating.value) return false

    route_motion.value = motion
    if (is_ios_stack_variant(route_variant.value) && motion === ROUTE_MOTION.BACK) {
      start_ios_stack_pop(stack_entry)
    }
    is_route_navigating.value = true
    pending_route_action = route_action
    is_page_visible.value = false
    leave_fallback_timer = setTimeout(complete_route_leave, resolved_leave_fallback_duration.value)
    return true
  }

  const navigate_forward = (options) => {
    if (is_route_navigating.value) return false
    is_route_navigating.value = true
    push_route({
      ...options,
      fail: (error) => {
        is_route_navigating.value = false
        options?.fail?.(error)
      },
      complete: (result) => {
        options?.complete?.(result)
      }
    })
    return true
  }

  const navigate_replace = (options) => {
    if (is_route_navigating.value) return false
    is_route_navigating.value = true
    const { immediate, ...route_options } = options || {}
    run_route_method('redirectTo', {
      ...route_options,
      fail: (error) => {
        is_route_navigating.value = false
        route_options?.fail?.(error)
      },
      complete: (result) => {
        route_options?.complete?.(result)
      }
    }, immediate ? ROUTE_MOTION.DIRECT : ROUTE_MOTION.FORWARD, route_variant.value)
    return true
  }

  const navigate_back = (options = {}) => {
    if (is_route_navigating.value) return false
    const { immediate = false, ...route_options } = options
    const stack_entry = get_return_stack_entry()
    let route_failed = false
    const run_back = () => run_route_method('navigateBack', {
      ...route_options,
      fail: (error) => {
        route_failed = true
        if (is_ios_stack_variant(route_variant.value)) cancel_ios_stack_pop(stack_entry)
        is_page_visible.value = true
        is_route_navigating.value = false
        route_options.fail?.(error)
      },
      complete: (result) => {
        if (is_ios_stack_variant(route_variant.value) && !route_failed) {
          finish_ios_stack_pop(stack_entry)
        }
        route_options.complete?.(result)
      }
    }, immediate ? ROUTE_MOTION.DIRECT : ROUTE_MOTION.BACK, route_variant.value)
    if (immediate) {
      is_route_navigating.value = true
      reveal_ios_stack_source(stack_entry)
      run_back()
      return true
    }
    return start_route_leave(ROUTE_MOTION.BACK, run_back, stack_entry)
  }

  const navigate_relaunch = (options = {}) => {
    if (is_route_navigating.value) return false
    const { immediate = false, ...route_options } = options
    const run_relaunch = () => relaunch_route({
      ...route_options,
      immediate,
      fail: (error) => {
        is_page_visible.value = true
        is_route_navigating.value = false
        route_options.fail?.(error)
      }
    })
    if (immediate) {
      is_route_navigating.value = true
      run_relaunch()
      return true
    }
    return start_route_leave(ROUTE_MOTION.BACK, run_relaunch)
  }

  // uni-app dispatches page hooks on the page instance, not on PageTransition.
  let page_instance = getCurrentInstance()
  while (page_instance?.parent && page_instance.proxy?.$mpType !== 'page') {
    page_instance = page_instance.parent
  }

  onHide(() => {
    was_hidden = true
  }, page_instance)

  onShow(() => {
    if (!was_hidden) return
    was_hidden = false
    void restore_page()
  }, page_instance)

  onMounted(() => {
    if (!is_ios_stack_variant(route_variant.value) || route_motion.value !== ROUTE_MOTION.FORWARD) return
    void nextTick(start_ios_stack_push)
  })

  onBeforeUnmount(() => {
    clear_leave_fallback_timer()
    const stack_entry = get_active_stack_entry()
    if (stack_entry?.is_popping) finish_ios_stack_pop(stack_entry)
  })

  return {
    is_page_visible,
    is_route_navigating,
    route_motion,
    route_variant,
    route_transition_name,
    route_transition_duration,
    complete_route_leave,
    navigate_forward,
    navigate_replace,
    navigate_back,
    navigate_relaunch,
    restore_page
  }
}

export const provide_route_transition = (options) => {
  const transition = use_route_transition(options)
  provide(ROUTE_TRANSITION_CONTEXT, transition)
  return transition
}

export const use_route_transition_context = () => inject(ROUTE_TRANSITION_CONTEXT, null)

const AUTH_ENTRY_PATHS = new Set([
  '/pages/welcome/index',
  '/pages/login/index',
  '/pages/signup/index'
])

const route_path = (hash = '') => `${hash}`.replace(/^#/, '').split('?')[0]
const history_position = (state) => Number.isInteger(state?.position) ? state.position : null

// WKWebView traverses browser history without invoking uni navigation APIs.
// Capture before uni's history listener can remove/recreate its page instances.
export const register_browser_history_guard = ({ router, has_session = () => false } = {}) => {
  if (typeof window === 'undefined' || !window.history || typeof router?.afterEach !== 'function') return () => {}
  let accepted_position = history_position(window.history.state)
  let recovery_position = null
  let recovery_timer = null

  const clear_recovery = () => {
    if (recovery_timer !== null) window.clearTimeout(recovery_timer)
    recovery_timer = null
    recovery_position = null
  }

  const remember_navigation = (_to, _from, failure) => {
    if (failure || recovery_position !== null) return
    accepted_position = history_position(window.history.state)
  }

  const recover_history_position = (target_position) => {
    recovery_position = accepted_position
    if (recovery_timer !== null) window.clearTimeout(recovery_timer)
    // Cleanup only; this does not delay navigation or display Loading.
    recovery_timer = window.setTimeout(clear_recovery, 1500)
    try {
      window.history.go(accepted_position - target_position)
    } catch {
      clear_recovery()
    }
  }

  const handle_history_pop = (event) => {
    const target_position = history_position(event.state)
    // Cross-document/native navigation cannot be controlled by this H5 instance.
    if (accepted_position === null || target_position === null) return
    if (recovery_position !== null) {
      event.stopImmediatePropagation()
      if (target_position === recovery_position) clear_recovery()
      else recover_history_position(target_position)
      return
    }
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const delta = target_position - accepted_position
    const returns_to_auth = has_session() && AUTH_ENTRY_PATHS.has(route_path(window.location.hash))
    const leaves_root = delta < 0 && pages.length <= 1
    if (delta > 0 || leaves_root || returns_to_auth) {
      event.stopImmediatePropagation()
      if (delta !== 0) recover_history_position(target_position)
    }
  }

  window.addEventListener('popstate', handle_history_pop, true)
  const remove_router_hook = router.afterEach(remember_navigation)
  return () => {
    clear_recovery()
    window.removeEventListener('popstate', handle_history_pop, true)
    remove_router_hook()
  }
}

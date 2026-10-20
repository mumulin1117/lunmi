import { ref } from 'vue'
import { storeGlobal } from '@/stores/store'
import { apply_h5_route_hash, relaunch_route } from '@/utils/routeTransition'
import { read_agreement_consent } from '@/utils/agreementConsent'

const LOGIN_PAGE_PATH = '/pages/login/index'
const SIGNUP_PAGE_PATH = '/pages/signup/index'
const WELCOME_PAGE_PATH = '/pages/welcome/index'
const USER_AGREEMENT_PAGE_PATH = '/pages/profile/user-agreement'
const PRIVACY_PAGE_PATH = '/pages/profile/privacy'
const PROFILE_SETUP_PAGE_PATH = '/pages/profile/setup/index'
const HOME_PAGE_PATH = '/pages/home/index'
const LOGIN_REDIRECT_SETTLE_MS = 800

let route_guard_registered = false
let redirect_timer = null
let redirect_settle_timer = null
export const is_login_redirect_loading = ref(false)

const get_route_path = (url = '') => {
  const raw = `${url || ''}`.trim()
  const hash_index = raw.lastIndexOf('#')
  const without_hash = hash_index >= 0 ? raw.slice(hash_index + 1) : raw
  return without_hash.split('?')[0].replace(/^\/+/, '')
}

const get_initial_entry_path = (has_session) => {
  if (has_session) return HOME_PAGE_PATH
  return read_agreement_consent() ? LOGIN_PAGE_PATH : WELCOME_PAGE_PATH
}

// Choose the cold-start URL from the session and existing EULA record before
// uni-app installs its H5 router, avoiding a flash of the wrong entry page.
export const prepare_initial_entry = ({ has_session = false } = {}) => {
  if (typeof window === 'undefined' || !window.location) return
  const entry_path = get_initial_entry_path(has_session)
  if (get_route_path(window.location.hash) === get_route_path(entry_path)) return
  const entry_hash = `#${entry_path}`
  try {
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${entry_hash}`
    )
  } catch {
    window.location.replace(entry_hash)
  }
}

const is_public_page = (url) => {
  const path = get_route_path(url)
  return [
    WELCOME_PAGE_PATH,
    USER_AGREEMENT_PAGE_PATH,
    PRIVACY_PAGE_PATH,
    LOGIN_PAGE_PATH,
    SIGNUP_PAGE_PATH,
    PROFILE_SETUP_PAGE_PATH
  ].some(
    (public_path) => path === get_route_path(public_path)
  )
}

const is_logged_in = () => {
  const store = storeGlobal()
  // token 是请求鉴权的唯一凭据。页面重建时 isLogin/userInfo 可能尚未回填，
  // 不能因为这些展示状态暂时为空而把有效会话拦截到登录页。
  return Boolean(store.hasToken)
}

const get_current_route_path = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const route = pages[pages.length - 1]?.route || ''
  if (route) return get_route_path(route)
  if (typeof window !== 'undefined' && window.location?.hash) return get_route_path(window.location.hash)
  return get_route_path(WELCOME_PAGE_PATH)
}

const is_on_login_page = () => get_current_route_path() === get_route_path(LOGIN_PAGE_PATH)
const is_on_welcome_page = () => get_current_route_path() === get_route_path(WELCOME_PAGE_PATH)
const should_keep_auth_entry = (preserve_welcome) => is_on_login_page()
  || (preserve_welcome && is_on_welcome_page())

const finish_login_redirect = () => {
  if (redirect_timer) {
    clearTimeout(redirect_timer)
    redirect_timer = null
  }
  if (redirect_settle_timer) {
    clearTimeout(redirect_settle_timer)
    redirect_settle_timer = null
  }
  is_login_redirect_loading.value = false
}

const apply_h5_login_hash = () => {
  apply_h5_route_hash(LOGIN_PAGE_PATH, { replace: true })
}

const open_login_page = ({ preserve_welcome = false } = {}) => {
  if (should_keep_auth_entry(preserve_welcome)) {
    finish_login_redirect()
    return
  }
  if (redirect_settle_timer) {
    clearTimeout(redirect_settle_timer)
    redirect_settle_timer = null
  }
  redirect_settle_timer = setTimeout(() => {
    redirect_settle_timer = null
    if (!is_login_redirect_loading.value) return
    if (!should_keep_auth_entry(preserve_welcome)) apply_h5_login_hash()
    finish_login_redirect()
  }, LOGIN_REDIRECT_SETTLE_MS)
  relaunch_route({
    url: LOGIN_PAGE_PATH,
    fail: () => {
      if (!should_keep_auth_entry(preserve_welcome)) apply_h5_login_hash()
      finish_login_redirect()
    },
    complete: finish_login_redirect
  })
}

const schedule_login_redirect = (delay = 0, { preserve_welcome = false } = {}) => {
  if (should_keep_auth_entry(preserve_welcome)) {
    finish_login_redirect()
    return
  }
  if (is_login_redirect_loading.value) return
  is_login_redirect_loading.value = true
  const redirect_delay = Math.max(0, Number(delay) || 0)
  redirect_timer = setTimeout(() => {
    redirect_timer = null
    open_login_page({ preserve_welcome })
  }, redirect_delay)
}

// A late 400004 from a page replaced at startup must not steal Welcome.
export const redirect_to_login = (delay = 0) => schedule_login_redirect(delay, { preserve_welcome: true })

const route_interceptor = {
  invoke: (options) => {
    if (is_public_page(options?.url) || is_logged_in()) return
    // Explicit attempts to enter a protected page still redirect and clear
    // any Push snapshot; they are not delayed responses from a previous page.
    finish_login_redirect()
    schedule_login_redirect()
    return false
  }
}

export const ensure_authenticated_entry = () => {
  setTimeout(() => {
    const entry_path = get_initial_entry_path(is_logged_in())
    finish_login_redirect()
    if (get_current_route_path() === get_route_path(entry_path)) return
    relaunch_route({
      url: entry_path,
      immediate: true,
      fail: () => apply_h5_route_hash(entry_path, { replace: true })
    })
  }, 0)
}

export const register_route_guard = () => {
  if (route_guard_registered) return
  route_guard_registered = true
  if (typeof uni === 'undefined' || typeof uni.addInterceptor !== 'function') return
  uni.addInterceptor('navigateTo', route_interceptor)
  uni.addInterceptor('redirectTo', route_interceptor)
  uni.addInterceptor('reLaunch', route_interceptor)
  uni.addInterceptor('switchTab', route_interceptor)
}

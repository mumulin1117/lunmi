/**
 * Login session local record.
 *
 * key: common_template.login_session
 * purpose: Restore the authenticated session after an H5 refresh
 * structure: { version: number, token: string, isLogin: boolean, userInfo: object }
 * version: 1
 * cleanup: logout, expired session (400004), or project cache clear
 * isolation: one session per browser profile; not used as business data fallback
 */
export const LOGIN_SESSION_RECORD = Object.freeze({
  key: 'common_template.login_session',
  version: 1,
  purpose: 'login_session'
})

const is_plain_object = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const read_uni_record = (key) => {
  if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') return null
  try {
    const value = uni.getStorageSync(key)
    return value || null
  } catch {
    return null
  }
}

const write_uni_record = (key, value) => {
  if (typeof uni === 'undefined' || typeof uni.setStorageSync !== 'function') return false
  try {
    uni.setStorageSync(key, value)
    return true
  } catch {
    return false
  }
}

const remove_uni_record = (key) => {
  if (typeof uni === 'undefined' || typeof uni.removeStorageSync !== 'function') return
  try {
    uni.removeStorageSync(key)
  } catch {
    // Ignore storage cleanup failures; in-memory logout still proceeds.
  }
}

const read_web_record = (key) => {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const write_web_record = (key, value) => {
  if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') return false
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const remove_web_record = (key) => {
  if (typeof localStorage === 'undefined' || typeof localStorage.removeItem !== 'function') return
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage cleanup failures; in-memory logout still proceeds.
  }
}

const normalize_session = (value) => {
  if (!is_plain_object(value)) return null
  const token = `${value.token || ''}`.trim()
  if (!token) return null
  return {
    version: LOGIN_SESSION_RECORD.version,
    token,
    isLogin: value.isLogin !== false,
    userInfo: is_plain_object(value.userInfo) ? value.userInfo : {}
  }
}

export const read_login_session = () => {
  const stored = read_uni_record(LOGIN_SESSION_RECORD.key) || read_web_record(LOGIN_SESSION_RECORD.key)
  return normalize_session(stored)
}

export const write_login_session = ({ token = '', isLogin = false, userInfo = {} } = {}) => {
  const session = normalize_session({ token, isLogin, userInfo })
  if (!session) {
    clear_login_session()
    return false
  }
  if (write_uni_record(LOGIN_SESSION_RECORD.key, session)) return true
  return write_web_record(LOGIN_SESSION_RECORD.key, session)
}

export const clear_login_session = () => {
  remove_uni_record(LOGIN_SESSION_RECORD.key)
  remove_web_record(LOGIN_SESSION_RECORD.key)
}

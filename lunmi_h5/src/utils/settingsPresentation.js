export const SETTINGS_PAGE_PATH = '/pages/profile/settings'
export const DELETE_ACCOUNT_PAGE_PATH = '/pages/profile/delete-account/index'
export const PROFILE_PAGE_PATH = '/pages/profile/index'
export const LANGUAGE_PAGE_PATH = '/pages/profile/language/index'
export const SAFETY_PAGE_PATH = '/pages/profile/safety-support/index'
export const FEEDBACK_PAGE_PATH = '/pages/profile/feedback'
export const TERMS_PAGE_PATH = '/pages/profile/user-agreement'
export const PRIVACY_PAGE_PATH = '/pages/profile/privacy'
export const BLOCKED_PAGE_PATH = '/pages/profile/blocked-list'
export const LOGIN_PAGE_PATH = '/pages/login/index'
export const APP_LANGUAGE_LABEL = 'English'

const safe_page = (value, fallback) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  if (!path.startsWith('/pages/') || path.includes('..')) return fallback
  return path
}

export const read_settings_source = (query = {}) => safe_page(query.sourcePage, PROFILE_PAGE_PATH)

export const map_settings_account = (data = {}) => ({
  user_name: `${data.userName || ''}`.trim(),
  email: `${data.userEmail || ''}`.trim(),
  avatar_url: `${data.userImgUrl || ''}`.trim()
})

export const build_settings_url = (path) => {
  const glue = path.includes('?') ? '&' : '?'
  return `${path}${glue}sourcePage=${encodeURIComponent(SETTINGS_PAGE_PATH)}`
}

export const build_terms_url = () => build_settings_url(`${TERMS_PAGE_PATH}?type=terms`)

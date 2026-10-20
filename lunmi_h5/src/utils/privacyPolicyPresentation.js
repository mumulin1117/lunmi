import { AGREEMENTS } from '../config/agreements.js'

export const PRIVACY_PAGE_PATH = '/pages/profile/privacy'
export const SETTINGS_PAGE_PATH = '/pages/profile/settings'

const SOURCE_PAGE_ROUTES = Object.freeze({
  login: '/pages/login/index',
  signup: '/pages/signup/index',
  agreement: '/pages/profile/user-agreement?sourcePage=welcome',
  settings: SETTINGS_PAGE_PATH
})

export const PRIVACY_SECTIONS = AGREEMENTS.privacy.sections

export const read_privacy_source = (query = {}) => {
  let path = `${query.sourcePage || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${query.sourcePage || ''}`.trim()
  }
  if (SOURCE_PAGE_ROUTES[path]) return SOURCE_PAGE_ROUTES[path]
  if (path.startsWith('/pages/') && !path.includes('..')) return path.split('?')[0]
  return SETTINGS_PAGE_PATH
}

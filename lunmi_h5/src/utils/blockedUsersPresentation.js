import { SETTINGS_PAGE_PATH } from './settingsPresentation.js'

export const BLOCKED_PAGE_PATH = '/pages/profile/blocked-list'
export const EMPTY_MARK = '/static/icon/block_empty.png'
export const EMPTY_TITLE = 'No one is blocked'
export const EMPTY_COPY = 'People you block cannot find your lanterns or message you.'
export const BLOCK_RELATION_TYPE = 2

const read_id = (value) => {
  if (value === 0 || value === '0') return '0'
  if (value == null || `${value}`.trim() === '') return ''
  return `${value}`.trim()
}

const read_list = (data) => (Array.isArray(data) ? data : [])

export const map_blocked_users = (data) => read_list(data)
  .map((item = {}) => ({
    user_id: read_id(item.userId),
    user_name: `${item.userName || ''}`.trim(),
    avatar_url: `${item.userImgUrl || ''}`.trim()
  }))
  .filter((item) => item.user_id !== '')

export const build_unblock_params = (user_id) => ({
  beHandleUserId: user_id,
  hanldeType: BLOCK_RELATION_TYPE
})

export const read_blocked_source = (query = {}) => {
  let path = `${query.sourcePage || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${query.sourcePage || ''}`.trim()
  }
  path = path.split('?')[0]
  if (!path.startsWith('/pages/') || path.includes('..')) return SETTINGS_PAGE_PATH
  return path
}

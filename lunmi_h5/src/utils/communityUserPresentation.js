import { WALL_PAGE_PATH } from './wallPresentation.js'
import { FRIEND_FLAG } from './profilePresentation.js'
import { OPEN_CHAT, build_chat_page_url } from './chatPresentation.js'

export const PROFILE_PAGE_PATH = '/pages/community/user/index'
export const PROFILE_PAGE_PATH_SELF = '/pages/profile/index'
export const WISH_COVER = '/static/icon/wish_tree_scene.png'

export const FOLLOW_HINT = 'A chat opens two ways: follow each other, or catch one of their lanterns and reply once.'
export const REQUESTED_HINT = 'Waiting for them to follow you back. Chats open once you both do — or through a lantern.'
export const MUTUAL_HINT = 'You follow each other, so the chat is open.'

const safe_page = (value, fallback = '') => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  if (!path.startsWith('/pages/') || path.includes('..')) return fallback
  return path
}

export const read_profile_user_id = (query = {}) => (
  `${query.targetUserId || query.user_id || query.userId || ''}`.trim()
)

export const read_profile_back = (query = {}) => safe_page(query.sourcePage, WALL_PAGE_PATH)

export const format_profile_joined_date = (value) => {
  if (value === undefined || value === null || `${value}`.trim() === '') return ''
  let source = value
  if (typeof value === 'string') {
    const text = value.trim()
    source = /^\d+$/.test(text) ? Number(text) : text.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
  }
  const date = source instanceof Date ? source : new Date(source)
  if (!Number.isFinite(date.getTime())) return ''
  return `Joined ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}

export const relation_state = (profile) => {
  if (Number(profile?.friend_flag) === FRIEND_FLAG.friends) return 'mutual'
  if (Number(profile?.attention_flag) === 1) return 'requested'
  return 'none'
}

export const relation_hint = (state) => {
  if (state === 'mutual') return MUTUAL_HINT
  if (state === 'requested') return REQUESTED_HINT
  return FOLLOW_HINT
}

export const relation_label = (state) => {
  if (state === 'mutual') return 'Mutual'
  if (state === 'requested') return 'Requested'
  return 'Follow'
}

export const map_profile_wishes = (data) => {
  const records = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : []
  return records
    .filter((item) => Number(item?.deleted) !== 1)
    .map((item) => {
      const wish_id = `${item?.wishId ?? ''}`
      if (!wish_id) return null
      return {
        wish_id,
        content: `${item.content || ''}`.trim(),
        blessing_count: Math.max(0, Number(item.blessingCount) || 0)
      }
    })
    .filter(Boolean)
}

export const read_wish_total = (data, wishes) => {
  const total = Number(data?.total)
  if (Number.isFinite(total) && total >= 0) return total
  return wishes.length
}

export const build_profile_page_url = (user_id, source_page = '') => {
  const id = encodeURIComponent(user_id || '')
  const params = [`targetUserId=${id}`, `user_id=${id}`]
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  return `${PROFILE_PAGE_PATH}?${params.join('&')}`
}

export const build_profile_chat_url = (user_id, source_page = '', peer = {}) => (
  build_chat_page_url({
    user_id,
    user_name: peer.username ?? peer.user_name ?? peer.userName ?? '',
    user_avatar_url: peer.avatar_url ?? peer.user_avatar_url ?? peer.userImg ?? '',
    chat_mode: OPEN_CHAT,
    source_page
  })
)

export const build_profile_wish_url = (wish, source_page = '') => {
  const params = [`wishId=${encodeURIComponent(wish?.wish_id || '')}`]
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  return `/pages/wish/detail/index?${params.join('&')}`
}

export const build_profile_wish_params = (user_id) => ({
  ownerUserId: user_id,
  current: 1,
  size: 20
})

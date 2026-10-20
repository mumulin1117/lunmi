import { WISH_TREE_PATH } from './wishSheetPresentation.js'

const BRANCH_LEVELS = new Set(['HIGH', 'MID', 'LOW', 'FREE'])
const DAY_MS = 24 * 60 * 60 * 1000
const read_record_id = (value) => value == null ? '' : `${value}`.trim()

const read_records = (page) => (
  Array.isArray(page?.records) ? page.records : Array.isArray(page) ? page : []
)

export const WISH_DETAIL_PATH = '/pages/wish/detail/index'
export const FOUND_WISH_PHOTO = '/static/icon/wish_tree_find_card.png'
export const REPLY_MAX_LENGTH = 200

export const read_wish_record = (page) => read_records(page)[0] || null

export const read_wish_id_from_random_detail = (detail) => {
  if (Number(detail?.deleted) === 1) return ''
  return read_record_id(detail?.wishId)
}

const parse_wish_time = (value) => {
  if (value == null || value === '') return NaN
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  const text = `${value}`.trim()
  if (/^\d{13}$/.test(text)) return Number(text)
  return Date.parse(text.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T'))
}

export const format_wish_date = (value) => {
  const time = parse_wish_time(value)
  if (Number.isNaN(time)) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(time))
}

export const format_days_left = (value, now = Date.now()) => {
  const time = parse_wish_time(value)
  if (Number.isNaN(time)) return ''
  const days = Math.ceil((time - now) / DAY_MS)
  if (days <= 0) return '0 days left'
  return days === 1 ? '1 day left' : `${days} days left`
}

export const format_place_line = (location = '', date_label = '') => (
  [location, date_label].map((item) => `${item || ''}`.trim()).filter(Boolean).join(' · ')
)

export const format_waiting_line = (count = 0, days_label = '') => {
  const waiting = `${Math.max(0, Number(count) || 0)} waiting`
  return days_label ? `${waiting} · ${days_label}` : waiting
}

export const map_found_wish = (record) => {
  const wish_id = read_wish_id_from_random_detail(record)
  if (!wish_id) return null
  const owner_profile = map_owner_profile_from_random_detail(record)
  const branch_label = `${record.branchLevel || ''}`.trim().toUpperCase()
  return {
    wish_id,
    owner_user_id: read_record_id(record.ownerUserId) || owner_profile.user_id,
    owner_profile,
    content: `${record.content || ''}`,
    is_anonymous: Number(record.anonymousDisplay) === 1,
    branch_label: BRANCH_LEVELS.has(branch_label) ? branch_label : '',
    blessing_count: Math.max(0, Number(record.blessingCount || 0)),
    reply_count: Math.max(0, Number(record.replyCount || 0)),
    reply_enabled: Number(record.replyEnabled) === 1,
    published_label: format_wish_date(record.publishedAt || record.createdDate),
    days_left_label: format_days_left(record.expiresAt),
    img_url: `${record.imgUrl || ''}`.trim()
  }
}

export const map_owner_profile_from_random_detail = (detail) => {
  const owner = detail?.ownerUserInfo
  return {
    user_id: read_record_id(owner?.userId),
    author_name: `${owner?.userName || ''}`.trim() || 'Wish keeper',
    author_name_is_placeholder: !(`${owner?.userName || ''}`.trim()),
    avatar_url: `${owner?.userImgUrl || ''}`.trim(),
    location_label: `${owner?.userLocation || ''}`.trim(),
    user_brief: `${owner?.userBrief || ''}`.trim(),
    user_gender: owner?.userGender ?? null
  }
}

export const read_account_found_reply_profile = (account_store = {}) => ({
  user_id: account_store.userId,
  user_name: `${account_store.userInfo?.userName || ''}`.trim(),
  avatar_url: `${account_store.userInfo?.userImgUrl || ''}`.trim()
})

export const enrich_found_replies_for_account = (items, account = {}) => {
  const owner_id = `${account.user_id || ''}`
  if (!owner_id) return items
  const user_name = `${account.user_name || ''}`.trim()
  const avatar_url = `${account.avatar_url || ''}`.trim()
  return items.map((item) => {
    if (`${item.user_id}` !== owner_id) return item
    return {
      ...item,
      user_name: user_name || item.user_name || 'You',
    user_name_is_placeholder: !(user_name || item.user_name),
      avatar_url: avatar_url || item.avatar_url || ''
    }
  })
}

export const map_found_replies_from_random_detail = (detail) => {
  const list = Array.isArray(detail?.replyList) ? detail.replyList : []
  return list
    .filter((item) => read_record_id(item?.wishReplyId) && Number(item.deleted) !== 1 && item.moderationStatus !== 'rejected')
    .map((item) => ({
      reply_id: read_record_id(item.wishReplyId),
      user_id: read_record_id(item.userId),
      content: `${item.content || ''}`,
      user_name: `${item.userName || ''}`.trim(),
      avatar_url: `${item.userImgUrl || ''}`.trim(),
      is_local: false
    }))
}

export const map_found_replies = (page) => read_records(page)
  .filter((item) => item?.wishReplyId && Number(item.deleted) !== 1 && item.moderationStatus !== 'rejected')
  .map((item) => ({
    reply_id: `${item.wishReplyId}`,
    user_id: item.userId == null || item.userId === '' ? '' : `${item.userId}`,
    content: `${item.content || ''}`,
    is_local: false
  }))

export const user_has_blessed = (page, user_id) => {
  const owner = `${user_id || ''}`
  if (!owner) return false
  return read_records(page).some((item) => (
    `${item?.userId || ''}` === owner
    && Number(item?.deleted) !== 1
    && item?.blessingStatus !== 'cancelled'
  ))
}

export const build_blessing_params = ({ user_id, wish_id, created_date }) => ({
  userId: user_id,
  wishId: wish_id,
  blessingStatus: 'active',
  createdDate: created_date
})

export const build_reply_params = ({ user_id, wish_id, content, created_date }) => ({
  userId: user_id,
  wishId: wish_id,
  content,
  moderationStatus: 'pending',
  createdDate: created_date
})

export const read_created_reply_id = (data) => {
  const reply_id = data?.wishReplyId
  return reply_id == null || reply_id === '' || reply_id === 0 ? '' : `${reply_id}`
}

export const build_found_detail_url = (wish_id, source_page = WISH_TREE_PATH) => {
  const params = [`wishId=${encodeURIComponent(wish_id)}`]
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  return `${WISH_DETAIL_PATH}?${params.join('&')}`
}

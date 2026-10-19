import { format_days_left, WISH_DETAIL_PATH } from './foundWishPresentation.js'
import { WISH_TREE_PATH } from './wishSheetPresentation.js'

export const MINE_PAGE_PATH = '/pages/wish/mine/index'
export const PROFILE_PAGE_PATH = '/pages/profile/index'
export const WISH_MINE_COVER = '/static/icon/wish_tree_scene.png'
export const EMPTY_TITLE = 'No wishes on the tree'
export const EMPTY_COPY = 'Hang one and let people wait with you for it to come true.'

const BRANCH_NAME = {
  HIGH: 'High',
  MID: 'Mid',
  LOW: 'Low',
  FREE: 'Free'
}

const read_records = (page) => (
  Array.isArray(page?.records) ? page.records : Array.isArray(page) ? page : []
)

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

export const format_day_badge = (expires_at, now = Date.now()) => {
  const label = format_days_left(expires_at, now)
  const count = label.match(/^(\d+)/)
  return count ? `${count[1]}D` : ''
}

export const read_mine_source = (query = {}) => safe_page(query.sourcePage, PROFILE_PAGE_PATH)

export const build_make_wish_url = () => `${WISH_TREE_PATH}?compose=1`

export const build_mine_detail_url = (wish_id) => (
  `${WISH_DETAIL_PATH}?wishId=${encodeURIComponent(wish_id)}&sourcePage=${encodeURIComponent(MINE_PAGE_PATH)}`
)

export const map_my_wishes = (page, now = Date.now()) => read_records(page)
  .filter((item) => item?.wishId && Number(item.deleted) !== 1 && item.wishStatus !== 'deleted')
  .map((item) => {
    const branch_label = `${item.branchLevel || ''}`.trim().toUpperCase()
    const known_branch = BRANCH_NAME[branch_label] ? branch_label : ''
    const days_left_label = format_days_left(item.expiresAt, now)
    const day_badge = format_day_badge(item.expiresAt, now)
    return {
      wish_id: `${item.wishId}`,
      content: `${item.content || ''}`.trim(),
      branch_label: known_branch,
      branch_name: BRANCH_NAME[known_branch] || '',
      day_badge,
      days_left_label,
      blessing_count: Math.max(0, Number(item.blessingCount || 0)),
      is_answered: item.wishStatus === 'answered',
      badge: [known_branch, day_badge].filter(Boolean).join(' · '),
      meta: [
        known_branch ? `${BRANCH_NAME[known_branch]} branch` : '',
        days_left_label
      ].filter(Boolean).join(' · ')
    }
  })

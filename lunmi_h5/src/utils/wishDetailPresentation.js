import { WISH_DETAIL_PATH } from './foundWishPresentation.js'
import { format_day_badge } from './wishMinePresentation.js'
import { WISH_TREE_PATH } from './wishSheetPresentation.js'

export const FULFILL_PAGE_PATH = '/pages/wish/fulfill/index'
export const WISH_DETAIL_COVER = '/static/icon/wish_tree_scene.png'
export const WAITING_SUFFIX = 'people are waiting with you'

const BRANCHES = new Set(['HIGH', 'MID', 'LOW', 'FREE'])

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

export const read_wish_detail_query = (query = {}) => ({
  wish_id: `${query.wishId || query.wish_id || ''}`.trim(),
  source_page: safe_page(query.sourcePage, WISH_TREE_PATH)
})

export const map_wish_detail = (record, now = Date.now()) => {
  if (!record?.wishId || Number(record.deleted) === 1 || record.wishStatus === 'deleted') return null
  const branch = `${record.branchLevel || ''}`.trim().toUpperCase()
  const known_branch = BRANCHES.has(branch) ? branch : ''
  const day_badge = format_day_badge(record.expiresAt, now)
  const branch_badge = known_branch ? `${known_branch} BRANCH` : ''
  const blessing_count = Math.max(0, Number(record.blessingCount || 0))
  return {
    wish_id: `${record.wishId}`,
    owner_user_id: record.ownerUserId == null || record.ownerUserId === '' ? '' : `${record.ownerUserId}`,
    img_url: `${record.imgUrl || ''}`.trim(),
    content: `${record.content || ''}`.trim(),
    reply_enabled: Number(record.replyEnabled) === 1,
    reply_count: Math.max(0, Number(record.replyCount || 0)),
    blessing_count,
    is_answered: record.wishStatus === 'answered',
    is_published: record.wishStatus === 'published',
    badge: [branch_badge, day_badge].filter(Boolean).join(' · '),
    waiting_label: `${blessing_count} ${WAITING_SUFFIX}`
  }
}

export const read_published_outcome = (page) => {
  const record = read_records(page).find((item) => (
    item?.wishOutcomeId
    && Number(item.deleted) !== 1
    && item.outcomeStatus === 'published'
  ))
  if (!record) return null
  return { outcome_text: `${record.outcomeText || ''}`.trim() }
}

export const build_detail_return_path = (wish_id) => (
  `${WISH_DETAIL_PATH}?wishId=${encodeURIComponent(wish_id)}`
)

export const build_fulfill_url = (wish_id) => {
  const params = [
    `wishId=${encodeURIComponent(wish_id)}`,
    `sourcePage=${encodeURIComponent(build_detail_return_path(wish_id))}`
  ]
  return `${FULFILL_PAGE_PATH}?${params.join('&')}`
}

import { build_detail_return_path } from './wishDetailPresentation.js'
import { WISH_TREE_PATH } from './wishSheetPresentation.js'

export const FULFILL_TITLE = 'Come back and tell them'
export const ALREADY_TOLD_TITLE = 'You already told them'
export const FULFILL_NOTE = 'Everyone who blessed it is told, and the wish is marked answered on the tree.'
export const OUTCOME_MAX_LENGTH = 500

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

export const blessed_label = (count = 0) => {
  const total = Math.max(0, Number(count) || 0)
  return total === 1 ? '1 person blessed this wish' : `${total} people blessed this wish`
}

export const read_fulfill_query = (query = {}) => {
  const wish_id = `${query.wishId || query.wish_id || ''}`.trim()
  const fallback = wish_id ? build_detail_return_path(wish_id) : WISH_TREE_PATH
  return {
    wish_id,
    return_page: safe_page(query.sourcePage, fallback)
  }
}

export const build_outcome_params = ({
  wish_id,
  owner_user_id,
  outcome_text,
  published_at
}) => ({
  wishId: wish_id,
  ownerUserId: owner_user_id,
  outcomeText: outcome_text,
  outcomeStatus: 'published',
  publishedAt: published_at,
  notifiedAt: published_at,
  createdDate: published_at,
  updatedDate: published_at
})

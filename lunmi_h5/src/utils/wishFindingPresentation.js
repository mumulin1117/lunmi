import { read_wish_id_from_random_detail } from './foundWishPresentation.js'
import { WISH_TREE_PATH } from './wishSheetPresentation.js'

export const FINDING_PAGE_PATH = '/pages/wish/finding/index'
export const WISH_TOUCH_ANIMATION_VIDEO = '/static/scenes/anim-wish-touch.mp4'
export const NO_WISH_TITLE = 'No new wishes'
export const NO_WISH_COPY = 'There isn\'t a new wish to open right now.'

export const read_finding_wish_id = (query = {}) => `${query.wishId || query.wish_id || ''}`.trim()

export const read_found_wish_id = (query = {}) => `${query.foundWishId || ''}`.trim()

export const build_finding_url = () => FINDING_PAGE_PATH

export const build_found_tree_url = (wish_id = '') => (
  `${WISH_TREE_PATH}?foundWishId=${encodeURIComponent(wish_id)}`
)

export const read_random_find_wish_id = (detail) => read_wish_id_from_random_detail(detail)

export const pick_found_wish = (page, { owner_user_id = '', preferred_id = '' } = {}) => {
  const records = Array.isArray(page?.records) ? page.records : Array.isArray(page) ? page : []
  const owner = owner_user_id === '' || owner_user_id == null ? '' : `${owner_user_id}`
  const available = records.filter((item) => {
    if (!item?.wishId || Number(item.deleted) === 1) return false
    if (owner && `${item.ownerUserId || ''}` === owner) return false
    return true
  })
  const preferred = `${preferred_id || ''}`
  const match = preferred
    ? available.find((item) => `${item.wishId}` === preferred)
    : null
  const chosen = match || available[0]
  return chosen ? `${chosen.wishId}` : ''
}

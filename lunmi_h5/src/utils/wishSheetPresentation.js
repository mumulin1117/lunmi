export const WISH_TREE_PATH = '/pages/wish/tree/index'
export const WISHING_PAGE_PATH = '/pages/wish/create/index'
export const WISH_HANG_ANIMATION_VIDEO = '/static/scenes/anim-wish-hang.mp4'
export const BRANCH_NOTE = 'When the time is up it leaves the tree but stays in your wishes — you can still come back and tell everyone how it ended.'
export const WISH_COST_NOTE = 'Coins buy visibility and time on the tree only — never a blessing, a reply, or the outcome.'

const BRANCH_ORDER = ['high', 'mid', 'low']

export const branch_label = (level = '') => {
  const value = `${level}`.trim().toLowerCase()
  if (value === 'high') return 'High'
  if (value === 'mid') return 'Mid'
  if (value === 'low' || value === 'free') return 'Low'
  return `${level}`.trim()
}

export const branch_cost_label = (cost = 0) => (Number(cost) > 0 ? `${Number(cost)}` : 'FREE')

/** WishSheet 仅展示 30 / 14 / 7 天三档（不含 0 天等其它配置）。 */
export const WISH_SHEET_VISIBILITY_DAYS = Object.freeze([30, 14, 7])

export const WISH_SHEET_BRANCH_COIN_COST_BY_DAYS = Object.freeze({
  30: 300,
  14: 100,
  7: 0
})

export const wish_sheet_branch_coin_cost = (visibility_days = 0) => {
  const days = Number(visibility_days) || 0
  if (Object.hasOwn(WISH_SHEET_BRANCH_COIN_COST_BY_DAYS, days)) {
    return WISH_SHEET_BRANCH_COIN_COST_BY_DAYS[days]
  }
  return 0
}

export const normalize_wish_sheet_branch_option = (option = {}) => {
  const days = Number(option.visibility_days) || 0
  return {
    ...option,
    coin_cost: wish_sheet_branch_coin_cost(days)
  }
}

export const filter_wish_sheet_branch_options = (options = []) => {
  const allowed = new Set(WISH_SHEET_VISIBILITY_DAYS)
  return options
    .filter((item) => allowed.has(Number(item.visibility_days) || 0))
    .map(normalize_wish_sheet_branch_option)
    .sort((left, right) => right.visibility_days - left.visibility_days)
}

export const branch_visibility_label = (option = {}) => {
  const days = Number(option.visibility_days) || 0
  if (days === 7) return '7days'
  return `${days} days`
}

export const branch_option_cost_label = (option = {}) => {
  const level = `${option.branch_level || ''}`.trim().toLowerCase()
  const days = Number(option.visibility_days) || 0
  if (level === 'low' && days === 7) return 'Free'
  return branch_cost_label(option.coin_cost)
}

export const map_branch_options = (page) => {
  const records = Array.isArray(page?.records) ? page.records : []
  return records
    .filter((item) => Number(item?.deleted) !== 1 && Number(item?.isActive ?? 1) === 1 && `${item?.branchLevel || ''}`.trim())
    .map((item) => ({
      branch_level: `${item.branchLevel}`.trim(),
      visibility_days: Number(item.visibilityDays) || 0,
      coin_cost: Number(item.coinCost) || 0
    }))
    .sort((left, right) => {
      const left_index = BRANCH_ORDER.indexOf(left.branch_level.toLowerCase())
      const right_index = BRANCH_ORDER.indexOf(right.branch_level.toLowerCase())
      return (left_index < 0 ? BRANCH_ORDER.length : left_index) - (right_index < 0 ? BRANCH_ORDER.length : right_index)
    })
}

export const default_branch_level = (options = []) => {
  const free_branch = options.find((item) => item.coin_cost <= 0)
  return free_branch?.branch_level || options[0]?.branch_level || ''
}

export const can_afford_branch = (balance = 0, cost = 0) => Number(balance) >= Number(cost || 0)

export const build_wish_params = ({
  owner_user_id,
  content = '',
  branch = {},
  reply_enabled = true,
  published_at = new Date(),
  img_url = ''
} = {}) => {
  const days = Number(branch.visibility_days) || 0
  const expires_at = new Date(published_at.getTime() + days * 86400000)
  const stamp = published_at.toISOString()
  const params = {
    ownerUserId: owner_user_id,
    content: `${content}`.trim(),
    anonymousDisplay: 1,
    branchLevel: branch.branch_level,
    visibilityDays: days,
    coinCost: Number(branch.coin_cost) || 0,
    replyEnabled: reply_enabled ? 1 : 0,
    wishStatus: 'published',
    publishedAt: stamp,
    expiresAt: expires_at.toISOString(),
    createdDate: stamp,
    updatedDate: stamp
  }
  const image_url = `${img_url || ''}`.trim()
  if (image_url) params.imgUrl = image_url
  return params
}

export const read_created_wish_id = (data) => {
  const wish_id = data?.wishId
  if (wish_id === '' || wish_id == null || Number(wish_id) === 0) return ''
  return `${wish_id}`
}

export const WISH_PUBLISHED_LABEL = 'Your wish is on the tree.'
export const WISH_PUBLISHED_DIALOG_TITLE = 'Wish sent'
export const WISH_PUBLISHED_DIALOG_COPY = WISH_PUBLISHED_LABEL

export const read_wishing_query = (query = {}) => ({
  wish_id: `${query.wishId || query.wish_id || ''}`.trim(),
  mode: `${query.mode || ''}`.trim()
})

export const wish_record_exists = (page, wish_id) => {
  const target = `${wish_id || ''}`
  if (!target) return false
  const records = Array.isArray(page?.records)
    ? page.records
    : Array.isArray(page)
      ? page
      : page?.wishId ? [page] : []
  return records.some((item) => `${item?.wishId || ''}` === target && Number(item?.deleted) !== 1)
}

export const build_tree_published_url = () => `${WISH_TREE_PATH}?wishPublished=1`

export const build_wishing_url = ({ wish_id = '', source_page = WISH_TREE_PATH } = {}) => {
  const params = ['mode=wishing', `sourcePage=${encodeURIComponent(source_page)}`]
  if (`${wish_id}` !== '') params.push(`wishId=${encodeURIComponent(wish_id)}`)
  return `${WISHING_PAGE_PATH}?${params.join('&')}`
}

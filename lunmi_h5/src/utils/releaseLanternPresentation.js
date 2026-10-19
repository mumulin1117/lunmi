import {
  build_expense_balance_record_params,
  plan_balance_consumption
} from './coinPurchasePresentation.js'
import { read_coin_balance } from './myProfilePresentation.js'
import { map_public_user_profile } from './profilePresentation.js'

export const LANTERN_TYPES = Object.freeze(['Late-night', 'Unsaid', 'Gratitude'])

export const BOOST_COIN_COST = 100
export const LANTERN_BOOST_BALANCE_CONTENT = 'Lantern boost'

export const plan_lantern_boost_consumption = ({
  cached_balance = 0,
  boost_cost = BOOST_COIN_COST
} = {}) => plan_balance_consumption({
  cached_balance,
  coin_count: boost_cost
})

export const build_lantern_boost_record_params = ({
  user_id = '',
  boost_cost = BOOST_COIN_COST,
  balance_after = 0
} = {}) => build_expense_balance_record_params({
  user_id,
  coin_count: boost_cost,
  balance_current: balance_after,
  balance_content: LANTERN_BOOST_BALANCE_CONTENT
})

export const map_release_sheet_session = (user_info = {}, balance = 0) => {
  const profile = map_public_user_profile(user_info)
  const username = `${profile.username || ''}`.trim()
  return {
    display_name: username || 'You',
    display_name_is_placeholder: !(username),
    avatar_url: profile.avatar_url,
    city_name: profile.location,
    coin_balance: read_coin_balance(balance)
  }
}

const read_id = (value) => {
  if (value === 0 || value === '0') return value
  if (value == null || value === '') return ''
  return value
}

export const build_add_lantern_params = ({
  content = '',
  lantern_label = '',
  owner_user_id = null,
  city_name = ''
} = {}) => {
  const params = {
    anonymousDisplay: 1,
    content: `${content}`.trim(),
    lanternLabel: `${lantern_label}`.trim(),
    lanternStatus: 'drifting'
  }
  if (owner_user_id !== null && owner_user_id !== '') {
    params.ownerUserId = owner_user_id
  }
  const release_city_name = `${city_name}`.trim()
  if (release_city_name) params.releaseCityName = release_city_name
  return params
}

export const build_add_media_asset_params = ({
  image_url = '',
  owner_user_id = null,
  mime_type = '',
  file_size = 0
} = {}) => {
  const params = {
    mediaType: 'image',
    publicUrl: `${image_url}`.trim()
  }
  if (owner_user_id !== null && owner_user_id !== '') {
    params.ownerUserId = owner_user_id
  }
  const mime = `${mime_type}`.trim()
  if (mime) params.mimeType = mime
  const size = Number(file_size)
  if (Number.isFinite(size) && size > 0) params.fileSize = size
  return params
}

export const build_add_lantern_media_params = ({
  lantern_id = '',
  media_asset_id = '',
  sort_no = 1
} = {}) => ({
  lanternId: lantern_id,
  mediaAssetId: media_asset_id,
  sortNo: sort_no
})

export const read_lantern_id = (data) => read_id(data?.lanternId)

export const read_media_asset_id = (data) => read_id(data?.mediaAssetId)

export const can_afford_boost = (coin_balance, cost = BOOST_COIN_COST) => (
  Number(coin_balance) >= Number(cost)
)

export const HOME_PAGE_PATH = '/pages/home/index'
export const LANTERN_RELEASE_PATH = '/pages/lantern/release/index'
export const LANTERN_DETAIL_PATH = '/pages/lantern/detail/index'
export const RELEASE_ANIMATION_VIDEO = '/static/scenes/anim-release.mp4'

const decode_query_value = (value) => {
  const text = `${value || ''}`.trim()
  if (!text) return ''
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

export const read_route_lantern_id = (query = {}) => read_id(query.lanternId)

export const read_route_lantern_type = (query = {}) => {
  const candidate = decode_query_value(query.lanternType || query.lantern_type)
  return LANTERN_TYPES.includes(candidate) ? candidate : ''
}

export const is_release_flow_detail = (query = {}) => `${query.returnHome || ''}` === '1'

export const normalize_lantern_source_page = (value, fallback = HOME_PAGE_PATH) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  path = path.split('?')[0]
  if (!path.startsWith('/pages/') || path.includes('..')) return fallback
  return path
}

export const build_select_lantern_params = ({
  lantern_id = '',
  current = 1,
  size = 1
} = {}) => {
  const params = { current, size }
  if (lantern_id !== '' && lantern_id != null) params.lanternId = lantern_id
  return params
}

export const read_lantern_records = (data) => {
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data)) return data
  return []
}

export const map_lantern_record = (record) => {
  if (!record || typeof record !== 'object') return null
  const lantern_id = read_id(record.lanternId)
  if (lantern_id === '') return null
  return {
    lantern_id,
    content: `${record.content || ''}`.trim(),
    lantern_label: `${record.lanternLabel || ''}`.trim(),
    lantern_status: `${record.lanternStatus || ''}`.trim(),
    owner_user_id: read_id(record.ownerUserId),
    anonymous_display: Number(record.anonymousDisplay) === 1,
    release_city_name: `${record.releaseCityName || ''}`.trim(),
    released_at: record.releasedAt || '',
    scooped_at: record.scoopedAt || '',
    created_date: record.createdDate || '',
    deleted: Number(record.deleted) === 1
  }
}

export const build_lantern_release_url = ({
  lantern_id = '',
  lantern_type = '',
  source_page = HOME_PAGE_PATH
} = {}) => {
  const params = [
    `lanternId=${encodeURIComponent(lantern_id)}`,
    'mode=releasing'
  ]
  const type = decode_query_value(lantern_type)
  if (LANTERN_TYPES.includes(type)) {
    params.push(`lanternType=${encodeURIComponent(type)}`)
  }
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  return `${LANTERN_RELEASE_PATH}?${params.join('&')}`
}

export const build_lantern_detail_url = ({
  lantern_id = '',
  source_page = HOME_PAGE_PATH,
  mode = '',
  lantern_type = '',
  return_home = false,
  released = false
} = {}) => {
  const params = [`lanternId=${encodeURIComponent(lantern_id)}`]
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  if (mode) params.push(`mode=${encodeURIComponent(mode)}`)
  const type = decode_query_value(lantern_type)
  if (LANTERN_TYPES.includes(type)) {
    params.push(`lanternType=${encodeURIComponent(type)}`)
  }
  if (return_home) params.push('returnHome=1')
  if (released) params.push('released=1')
  return `${LANTERN_DETAIL_PATH}?${params.join('&')}`
}

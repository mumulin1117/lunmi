import { map_attempt_record } from './lanternHomePresentation.js'
import {
  map_lantern_record,
  read_lantern_records
} from './releaseLanternPresentation.js'
import { map_reply_record, map_scoop_record, read_page_records } from './lanternDetailPresentation.js'
import { map_user_base_profile } from './profilePresentation.js'

export const HOME_PAGE_PATH = '/pages/home/index'
export const SCOOP_PAGE_PATH = '/pages/lantern/scoop/index'
export const SCOOP_ANIMATION_VIDEO = '/static/scenes/anim-scoop.mp4'
export const DRIFTING_LANTERN_STATUS = 'drifting'
export const ACTIVE_SCOOP_STATUS = 'active'
export const SCOOP_SEARCH_SIZE = 20
export const SCOOP_HISTORY_SIZE = 50

export const NO_LANTERN_TITLE = 'No new lantern was found'
export const NO_LANTERN_COPY = 'Nothing new is drifting right now. Your scoop attempts stay as they are.'
export const CAUGHT_REPLY_NOTICE = 'One reply only — the chat opens when they write back.'
export const CAUGHT_REPLIED_NOTICE = 'You already sent the one reply for this lantern.'

export const map_caught_lantern_result = (data) => {
  if (!data || typeof data !== 'object') return null
  const lantern = map_lantern_record(data.lantern)
  const scoop = map_scoop_record(data)
  const remaining = Number(data.scoopRemaining)
  if (!lantern || !scoop || `${lantern.lantern_id}` !== `${scoop.lantern_id}`
    || data.scoopRemaining == null || !Number.isInteger(remaining) || remaining < 0) return null
  return {
    lantern,
    scoop,
    owner_profile: data.ownerUserInfo ? map_user_base_profile(data.ownerUserInfo) : null,
    reply_record: map_reply_record(data.replyInfo),
    scoop_remaining: remaining
  }
}

const read_id = (value) => {
  if (value === 0 || value === '0') return value
  if (value == null || value === '') return ''
  return value
}

const normalize_owner_id = (value) => {
  if (value === 0 || value === '0') return '0'
  if (value == null || `${value}`.trim() === '') return ''
  return `${value}`.trim()
}

export const build_caught_owner_snapshot = (lantern = null, profile = null) => {
  if (!lantern) return null
  if (lantern.anonymous_display) {
    return {
      anonymous_display: true,
      owner_user_id: normalize_owner_id(lantern.owner_user_id)
    }
  }
  const owner_user_id = normalize_owner_id(profile?.user_id || lantern.owner_user_id)
  if (!owner_user_id) {
    return {
      anonymous_display: false,
      owner_user_id: '',
      owner_user_name: '',
      owner_avatar_url: ''
    }
  }
  return {
    anonymous_display: false,
    owner_user_id,
    owner_user_name: `${profile?.username || ''}`.trim(),
    owner_avatar_url: `${profile?.avatar_url || ''}`.trim()
  }
}

export const build_select_drifting_params = ({
  current = 1,
  size = SCOOP_SEARCH_SIZE
} = {}) => ({
  current,
  size,
  lanternStatus: DRIFTING_LANTERN_STATUS
})

export const build_select_user_scoops_params = ({
  scooper_user_id = '',
  lantern_id = '',
  current = 1,
  size = SCOOP_HISTORY_SIZE
} = {}) => {
  const params = { current, size }
  if (scooper_user_id !== '' && scooper_user_id != null) params.scooperUserId = scooper_user_id
  if (lantern_id !== '' && lantern_id != null) params.lanternId = lantern_id
  return params
}

export const collect_scooped_lantern_ids = (page) => read_page_records(page)
  .map((record) => map_scoop_record(record))
  .filter((scoop) => scoop && `${scoop.scoop_status}` !== 'cancelled')
  .map((scoop) => scoop.lantern_id)
  .filter((lantern_id) => lantern_id !== '' && lantern_id != null)

export const pick_scoop_candidate = (page, {
  owner_user_id = '',
  scooped_lantern_ids = []
} = {}) => {
  const taken = new Set(scooped_lantern_ids.map((lantern_id) => `${lantern_id}`))
  const owner = owner_user_id === '' || owner_user_id == null ? '' : `${owner_user_id}`
  for (const record of read_lantern_records(page)) {
    const lantern = map_lantern_record(record)
    if (!lantern || lantern.deleted) continue
    if (lantern.lantern_status !== DRIFTING_LANTERN_STATUS) continue
    if (owner && `${lantern.owner_user_id}` === owner) continue
    if (taken.has(`${lantern.lantern_id}`)) continue
    return lantern
  }
  return null
}

export const build_add_scoop_params = ({
  lantern_id = '',
  scooper_user_id = '',
  scooped_at = ''
} = {}) => {
  const params = {
    lanternId: lantern_id,
    scoopStatus: ACTIVE_SCOOP_STATUS
  }
  if (scooper_user_id !== '' && scooper_user_id != null) params.scooperUserId = scooper_user_id
  if (scooped_at) params.scoopedAt = scooped_at
  return params
}

export const read_created_scoop_id = (data) => {
  const direct = read_id(data?.lanternScoopId)
  if (direct !== '') return direct
  return map_scoop_record(data)?.lantern_scoop_id || ''
}

export const match_created_scoop = (page, lantern_id) => {
  const target = `${lantern_id}`
  const scoops = read_page_records(page)
    .map((record) => map_scoop_record(record))
    .filter((scoop) => scoop && `${scoop.lantern_id}` === target && scoop.scoop_status !== 'cancelled')
  return scoops[0] || null
}

export const build_home_caught_url = ({
  lantern_id = '',
  lantern_scoop_id = ''
} = {}) => {
  const params = [
    `caughtLanternId=${encodeURIComponent(lantern_id)}`,
    `lanternScoopId=${encodeURIComponent(lantern_scoop_id)}`
  ]
  return `${HOME_PAGE_PATH}?${params.join('&')}`
}

export const read_caught_route = (query = {}) => ({
  lantern_id: read_id(query.caughtLanternId),
  lantern_scoop_id: read_id(query.lanternScoopId)
})

export const read_attempt_snapshot = (page) => map_attempt_record(page)

export const format_scoop_clock = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export const caught_place_label = (city_name, scooped_at) => {
  const city = `${city_name || ''}`.trim()
  const clock = format_scoop_clock(scooped_at)
  if (city && clock) return `${city} · ${clock}`
  return city || clock || 'Somewhere under the same sky'
}

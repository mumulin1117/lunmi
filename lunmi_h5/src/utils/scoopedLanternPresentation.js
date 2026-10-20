import { build_lantern_detail_url } from './releaseLanternPresentation.js'

export const SCOOPED_LANTERNS_PATH = '/pages/lantern/scooped/index'
export const PROFILE_PAGE_PATH = '/pages/profile/index'
export const HOME_PAGE_PATH = '/pages/home/index'
export const EMPTY_MARK = '/static/icon/scoop_empty.png'
export const EMPTY_TITLE = 'Nothing scooped tonight'
export const EMPTY_COPY = 'Every night you can pick up three lanterns from strangers.'

const read_records = (page) => (
  Array.isArray(page?.records) ? page.records : Array.isArray(page) ? page : []
)

const read_id = (value) => {
  if (value === 0 || value === '0') return `${value}`
  if (value == null || `${value}`.trim() === '') return ''
  return `${value}`.trim()
}

const safe_page = (value, fallback) => {
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

export const read_scooped_source = (query = {}) => safe_page(query.sourcePage, PROFILE_PAGE_PATH)

export const build_find_lantern_url = () => `${HOME_PAGE_PATH}?scoop=1`

export const build_scooped_detail_url = (lantern_id) => build_lantern_detail_url({
  lantern_id,
  source_page: SCOOPED_LANTERNS_PATH,
  mode: 'caught'
})

export const read_page_total = (page) => {
  const total = Number(page?.total)
  return Number.isFinite(total) && total > 0 ? total : 0
}

export const format_scoop_day = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

export const join_scoop_meta = (city = '', day_label = '') => (
  [city, day_label].map((item) => `${item || ''}`.trim()).filter(Boolean).join(' · ')
)

export const scoop_reply_badge = (reply_count = 0) => {
  const count = Math.max(0, Number(reply_count) || 0)
  if (count < 1) return { label: 'New', tone: 'new' }
  const noun = count === 1 ? 'message' : 'messages'
  return { label: `${count} ${noun}`, tone: 'messages' }
}

export const count_scoop_replies = (page) => read_records(page)
  .filter((item) => read_id(item?.lanternReplyId) && Number(item.deleted) !== 1)
  .length

export const map_scooped_lanterns = (page) => read_records(page)
  .filter((item) => read_id(item?.lanternScoopId) && read_id(item?.lanternId))
  .filter((item) => Number(item.deleted) !== 1 && item.scoopStatus !== 'cancelled')
  .map((item) => ({
    scoop_id: read_id(item.lanternScoopId),
    lantern_id: read_id(item.lanternId),
    scooped_at: item.scoopedAt || item.createdDate || ''
  }))

export const map_scooped_card = ({
  scoop = {},
  lantern = null,
  user_name = '',
  avatar_url = '',
  reply_count = 0
} = {}) => {
  const anonymous = Boolean(lantern?.anonymous_display)
  const name = anonymous
    ? 'A quiet stranger'
    : `${user_name || ''}`.trim() || 'Lantern keeper'
  return {
    scoop_id: scoop.scoop_id,
    lantern_id: scoop.lantern_id,
    name,
    name_is_placeholder: anonymous || !`${user_name || ''}`.trim(),
    avatar_url: anonymous ? '' : `${avatar_url || ''}`.trim(),
    meta: join_scoop_meta(lantern?.release_city_name || '', format_scoop_day(scoop.scooped_at)),
    badge: reply_count == null ? null : scoop_reply_badge(reply_count)
  }
}

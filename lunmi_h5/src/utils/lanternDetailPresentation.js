import {
  HOME_PAGE_PATH,
  map_lantern_record,
  read_lantern_records,
  read_route_lantern_id
} from './releaseLanternPresentation.js'

export { HOME_PAGE_PATH, map_lantern_record, read_lantern_records, read_route_lantern_id }

export const LANTERN_REPLY_PATH = '/pages/lantern/reply/index'

const read_id = (value) => {
  if (value === 0 || value === '0') return value
  if (value == null || value === '') return ''
  return value
}

export const is_caught_lantern_mode = (query = {}) => `${query.mode || ''}`.trim() === 'caught'

export const build_select_scoop_params = ({
  lantern_id = '',
  scooper_user_id = '',
  current = 1,
  size = 1
} = {}) => {
  const params = { current, size }
  if (lantern_id !== '' && lantern_id != null) params.lanternId = lantern_id
  if (scooper_user_id !== '' && scooper_user_id != null) params.scooperUserId = scooper_user_id
  return params
}

export const build_select_reply_params = ({
  lantern_scoop_id = '',
  current = 1,
  size = 1
} = {}) => {
  const params = { current, size }
  if (lantern_scoop_id !== '' && lantern_scoop_id != null) params.lanternScoopId = lantern_scoop_id
  return params
}

export const read_page_records = (data) => {
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data)) return data
  return []
}

export const map_scoop_record = (record) => {
  if (!record || typeof record !== 'object') return null
  const lantern_scoop_id = read_id(record.lanternScoopId)
  if (lantern_scoop_id === '') return null
  return {
    lantern_scoop_id,
    lantern_id: read_id(record.lanternId),
    scooper_user_id: read_id(record.scooperUserId),
    scoop_status: `${record.scoopStatus || ''}`.trim(),
    scooped_at: record.scoopedAt || '',
    conversation_id: read_id(record.conversationId)
  }
}

export const map_reply_record = (record) => {
  if (!record || typeof record !== 'object') return null
  const lantern_reply_id = read_id(record.lanternReplyId)
  if (lantern_reply_id === '') return null
  return {
    lantern_reply_id,
    lantern_id: read_id(record.lanternId),
    lantern_scoop_id: read_id(record.lanternScoopId),
    content: `${record.content || ''}`.trim(),
    sender_user_id: read_id(record.senderUserId),
    sent_at: record.sentAt || '',
    moderation_status: `${record.moderationStatus || ''}`.trim()
  }
}

export const lantern_status_label = (status) => {
  const value = `${status || ''}`.trim()
  if (!value) return 'Drifting'
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

export const lantern_title_from_content = (content, fallback = 'Released lantern') => {
  const text = `${content || ''}`.trim()
  if (!text) return fallback
  return text.length > 24 ? `${text.slice(0, 24)}…` : text
}

export const format_lantern_date = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const lantern_owner_label = (lantern) => {
  if (!lantern) return 'Someone tonight'
  return lantern.anonymous_display ? 'A quiet stranger' : 'Lantern keeper'
}

export const build_lantern_reply_url = ({
  lantern_id = '',
  target_user_id = '',
  source_page = HOME_PAGE_PATH
} = {}) => {
  const params = [
    `lanternId=${encodeURIComponent(lantern_id)}`,
    `targetUserId=${encodeURIComponent(target_user_id)}`
  ]
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  return `${LANTERN_REPLY_PATH}?${params.join('&')}`
}

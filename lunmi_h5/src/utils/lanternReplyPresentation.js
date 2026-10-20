import { build_chat_page_url } from './chatPresentation.js'
import { format_lantern_date } from './lanternDetailPresentation.js'
import { HOME_PAGE_PATH } from './releaseLanternPresentation.js'

export const CHAT_PAGE_PATH = '/pages/messages/chat'
export const ONE_REPLY_CHAT_MODE = 'one_reply'
export const REPLY_NOTICE = 'One reply only — the chat opens when they write back.'
export const REPLY_PLACEHOLDER = 'Say one kind thing...'

const read_id = (value) => {
  if (value === 0 || value === '0') return value
  if (value == null || value === '') return ''
  return value
}

export const reply_source_meta = (city_name, released_at) => {
  const place = `${city_name || ''}`.trim()
  const released = format_lantern_date(released_at)
  const released_label = released === '—' ? '' : `released ${released}`
  if (place && released_label) return `${place} · ${released_label}`
  return place || released_label || 'Released lantern'
}

export const quote_lantern_content = (content) => {
  const text = `${content || ''}`.trim()
  if (!text) return 'A lantern with no written note.'
  return `“${text}”`
}

export const build_add_reply_params = ({
  content = '',
  lantern_id = '',
  lantern_scoop_id = '',
  sender_user_id = '',
  sent_at = ''
} = {}) => {
  const params = {
    content: `${content}`.trim()
  }
  if (lantern_id !== '' && lantern_id != null) params.lanternId = lantern_id
  if (lantern_scoop_id !== '' && lantern_scoop_id != null) params.lanternScoopId = lantern_scoop_id
  if (sender_user_id !== '' && sender_user_id != null) params.senderUserId = sender_user_id
  if (sent_at) params.sentAt = sent_at
  return params
}

export const read_created_reply_id = (data) => read_id(data?.lanternReplyId)

export const build_one_reply_chat_url = ({
  user_id = '',
  user_name = '',
  user_avatar_url = '',
  source_page = HOME_PAGE_PATH
} = {}) => build_chat_page_url({
  user_id,
  user_name,
  user_avatar_url,
  chat_mode: ONE_REPLY_CHAT_MODE,
  source_page
})

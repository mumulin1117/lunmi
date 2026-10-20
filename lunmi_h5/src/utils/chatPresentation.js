import { to_user_id_param } from './profilePresentation.js'

const normalize_id = (value) => (
  value === undefined || value === null ? '' : `${value}`.trim()
)

export const LOCKED_ONE_REPLY = 'locked_one_reply'
export const WAITING_OTHER = 'waiting_other'
export const YOUR_TURN = 'your_turn'
export const OPEN_CHAT = 'open'

export const ONE_REPLY_NOTICE = 'One reply only — the chat opens when they write back.'
export const YOUR_TURN_NOTICE = 'They replied to your lantern. Reply once to open the chat.'
export const WAITING_STATUS = 'Waiting for their reply'
export const YOUR_TURN_STATUS = 'Your turn'

export const read_chat_peer_id = (query = {}) => (
  normalize_id(query.targetUserId || query.user_id || query.userId)
)

export const read_receive_user_id = (peer_user_id = '') => {
  const receive_user_id = to_user_id_param(peer_user_id)
  if (receive_user_id === null || receive_user_id === '') return null
  if (typeof receive_user_id === 'number' && receive_user_id <= 0) return null
  return receive_user_id
}

const normalize_text = (value) => `${value || ''}`.trim()

export const read_chat_peer_profile = (query = {}) => ({
  user_id: read_chat_peer_id(query),
  user_name: normalize_text(query.userName ?? query.user_name),
  user_avatar_url: normalize_text(query.userImg ?? query.userImgUrl ?? query.avatar_url)
})

export const build_chat_page_url = ({
  user_id = '',
  user_name = '',
  user_avatar_url = '',
  chat_mode = '',
  source_page = ''
} = {}) => {
  const id = encodeURIComponent(user_id || '')
  const params = [`user_id=${id}`, `targetUserId=${id}`]
  const name = normalize_text(user_name)
  const avatar = normalize_text(user_avatar_url)
  if (name) params.push(`userName=${encodeURIComponent(name)}`)
  if (avatar) params.push(`userImg=${encodeURIComponent(avatar)}`)
  if (chat_mode) params.push(`chatMode=${encodeURIComponent(chat_mode)}`)
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  return `/pages/messages/chat?${params.join('&')}`
}

export const read_requested_chat_mode = (query = {}) => normalize_id(query.chatMode)

const SEND_MESSAGE_REQUIRED_FIELDS = Object.freeze([
  'receiveUserId',
  'receiveUserName',
  'receiveUserImg',
  'content',
  'sendUserId',
  'sendUserName',
  'sendUserImgUrl',
  'messageType'
])

export const build_chat_send_params = ({
  content = '',
  message_type = 1,
  message_classify = null,
  receive_user_id = null,
  receive_user_name = '',
  receive_user_img = '',
  send_user_id = '',
  send_user_name = '',
  send_user_img_url = ''
} = {}) => {
  const params = {
    content: normalize_text(content),
    messageType: Number(message_type) || 1,
    receiveUserId: receive_user_id,
    receiveUserName: normalize_text(receive_user_name),
    receiveUserImg: normalize_text(receive_user_img),
    sendUserId: normalize_text(send_user_id),
    sendUserName: normalize_text(send_user_name),
    sendUserImgUrl: normalize_text(send_user_img_url)
  }
  if (message_classify != null && `${message_classify}`.trim() !== '') {
    params.messageClassify = message_classify
  }
  return params
}

export const read_missing_send_message_fields = (params = {}) => (
  SEND_MESSAGE_REQUIRED_FIELDS.filter((field) => {
    const value = params[field]
    if (field === 'messageType') {
      return !Number.isFinite(Number(value)) || Number(value) <= 0
    }
    return value === null || value === undefined || `${value}`.trim() === ''
  })
)

export const decorate_chat_messages = (messages = [], current_user_id = '') => {
  const current_id = normalize_id(current_user_id)
  return messages.map((message) => {
    const sender_id = normalize_id(message.sender_id)
    const is_mine = current_id ? sender_id === current_id : Boolean(message.is_mine)
    return { ...message, is_mine }
  })
}

export const resolve_chat_mode = ({
  requested_mode = '',
  messages = []
} = {}) => {
  const requested = normalize_id(requested_mode)
  const list = messages.filter((message) => Number(message.message_type) !== 3)
  const mine_count = list.filter((message) => message.is_mine).length
  const peer_count = list.length - mine_count
  if (requested === OPEN_CHAT) return OPEN_CHAT
  if (requested === 'one_reply' || requested === LOCKED_ONE_REPLY) {
    if (peer_count > 0 && mine_count > 0) return OPEN_CHAT
    if (peer_count > 0) return YOUR_TURN
    return LOCKED_ONE_REPLY
  }
  if (!list.length) return YOUR_TURN
  if (peer_count === 0) return mine_count <= 1 ? LOCKED_ONE_REPLY : WAITING_OTHER
  const last = list[list.length - 1]
  if (last?.is_mine) return OPEN_CHAT
  return YOUR_TURN
}

export const chat_status_label = (mode) => {
  if (mode === LOCKED_ONE_REPLY || mode === WAITING_OTHER) return WAITING_STATUS
  if (mode === YOUR_TURN) return YOUR_TURN_STATUS
  return ''
}

export const can_compose_chat = (mode) => mode === YOUR_TURN || mode === OPEN_CHAT

export const shows_video_call = (mode) => mode === WAITING_OTHER || mode === OPEN_CHAT

export const next_mode_after_send = (mode) => (
  mode === YOUR_TURN ? OPEN_CHAT : mode
)

const parse_chat_time = (value) => {
  if (value == null || value === '') return NaN
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  const text = `${value}`.trim()
  if (/^\d{13}$/.test(text)) return Number(text)
  return Date.parse(text.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T'))
}

export const format_chat_clock = (value) => {
  const timestamp = parse_chat_time(value)
  if (!Number.isFinite(timestamp)) return ''
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(timestamp))
}

export const chat_day_label = (value, now = new Date()) => {
  const timestamp = parse_chat_time(value)
  if (!Number.isFinite(timestamp)) return ''
  const date = new Date(timestamp)
  if (date.toDateString() === now.toDateString()) return 'Tonight'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export { build_ringing_url } from './callPresentation.js'

// 消息展示的纯函数；不发起请求、不保存状态。
const MESSAGE_TYPE = Object.freeze({
  CHAT: 1,
  CALL: 2,
  NOTICE: 3,
  AUDIO: 4,
  IMAGE: 5,
  VIDEO: 6
})

const normalize_id = (value) => (
  value === undefined || value === null ? '' : `${value}`.trim()
)
const normalize_text = (value) => `${value || ''}`.trim()

const first_non_empty_text = (...values) => {
  for (const value of values) {
    const text = normalize_text(value)
    if (text) return text
  }
  return ''
}

export const read_message_list_entries = (data) => {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.records)) return data.records
  if (Array.isArray(data.list)) return data.list
  if (Array.isArray(data.rows)) return data.rows
  if (Array.isArray(data.messageUserVoList)) return [{ messageUserVoList: data.messageUserVoList }]
  return []
}

const preview_for_message = (message = {}) => {
  const content = normalize_text(message.content)
  const title = normalize_text(message.title)
  const message_type = Number(message.messageType)
  if (message_type === MESSAGE_TYPE.CALL) return title || 'Voice call'
  if (message_type === MESSAGE_TYPE.AUDIO) return content || 'sent a voice message'
  if (message_type === MESSAGE_TYPE.IMAGE) return content || 'sent a photo'
  if (message_type === MESSAGE_TYPE.VIDEO) return content || 'sent a video'
  return content || title
}

const parse_message_date = (value) => {
  const text = normalize_text(value)
  if (!text) return NaN
  let timestamp = Date.parse(text)
  if (!Number.isFinite(timestamp)) timestamp = Date.parse(text.replace(' ', 'T'))
  return timestamp
}

const is_conversation_summary = (item) => (
  item
  && typeof item === 'object'
  && !Array.isArray(item.messageUserVoList)
  && item.messageId == null
  && item.sendUserId == null
  && item.receiveUserId == null
  && normalize_id(item.userId) !== ''
  && (
    Object.prototype.hasOwnProperty.call(item, 'lastMessage')
    || Object.prototype.hasOwnProperty.call(item, 'lastMessageTime')
    || Object.prototype.hasOwnProperty.call(item, 'unreadCount')
  )
)

const reply_wait_status = ({ open_chat_flag = 0, message_type, message_classify, send_user_id, receive_user_id, current_user_id }) => {
  if (Number(open_chat_flag) === 1) return 'open'
  if (Number(message_type) !== MESSAGE_TYPE.CHAT || Number(message_classify) !== 1) return 'open'
  const current_id = normalize_id(current_user_id)
  if (!current_id) return 'open'
  if (normalize_id(send_user_id) === current_id) return 'waiting'
  if (normalize_id(receive_user_id) === current_id) return 'your_turn'
  return 'open'
}

const map_conversation_summary = (item, current_user_id = '', now = Date.now()) => {
  const unread_count = Number(item.unreadCount)
  const has_unread = Number.isFinite(unread_count) && unread_count > 0
  const updated_at = item.lastMessageTime || ''
  return {
    conversation_id: normalize_id(item.userId),
    user_id: normalize_id(item.userId),
    user_name: normalize_text(item.userName) || 'Unknown',
    user_name_is_placeholder: !(normalize_text(item.userName)),
    user_avatar_url: normalize_text(item.userImg),
    preview: normalize_text(item.lastMessage),
    preview_is_system: false,
    updated_at,
    updated_label: format_message_time_label(updated_at, now),
    open_chat_flag: Number(item.openChatFlag) === 1 ? 1 : 0,
    chat_status: reply_wait_status({
      open_chat_flag: item.openChatFlag,
      message_type: item.lastMessageType,
      message_classify: item.lastMessageClassify,
      send_user_id: item.lastSendUserId,
      receive_user_id: item.lastReceiveUserId,
      current_user_id
    }),
    has_unread
  }
}

export const format_message_time_label = (create_date, now = Date.now()) => {
  const timestamp = parse_message_date(create_date)
  if (!Number.isFinite(timestamp)) return ''
  const diff_minutes = Math.floor(Math.max(0, now - timestamp) / 60000)
  if (diff_minutes < 1) return 'now'
  if (diff_minutes < 60) return `${diff_minutes}m`
  const diff_hours = Math.floor(diff_minutes / 60)
  if (diff_hours < 24) return `${diff_hours}h`
  const diff_days = Math.floor(diff_hours / 24)
  if (diff_days < 7) return `${diff_days}d`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(timestamp))
}

const resolve_peer = (message = {}, current_user_id = '') => {
  const current_id = normalize_id(current_user_id)
  const send_id = normalize_id(message.sendUserId)
  const receive_id = normalize_id(message.receiveUserId)
  const target_id = normalize_id(message.targetUserId ?? message.userId)
  if (current_id && send_id === current_id) {
    return {
      user_id: receive_id || target_id,
      user_name: first_non_empty_text(message.receiveUserName, message.targetUserName),
      user_avatar_url: first_non_empty_text(message.receiveUserImg, message.receiveUserImgUrl, message.targetUserImg)
    }
  }
  if (current_id && receive_id === current_id) {
    return {
      user_id: send_id || target_id,
      user_name: first_non_empty_text(message.sendUserName, message.targetUserName),
      user_avatar_url: first_non_empty_text(message.sendUserImgUrl, message.sendUserImg, message.targetUserImg)
    }
  }
  if (target_id && target_id !== current_id) {
    return {
      user_id: target_id,
      user_name: first_non_empty_text(message.targetUserName, message.sendUserName, message.receiveUserName),
      user_avatar_url: first_non_empty_text(
        message.targetUserImg,
        message.sendUserImgUrl,
        message.sendUserImg,
        message.receiveUserImg,
        message.receiveUserImgUrl
      )
    }
  }
  const fallback_id = send_id && send_id !== current_id ? send_id : receive_id
  return {
    user_id: fallback_id,
    user_name: first_non_empty_text(message.sendUserName, message.receiveUserName, message.targetUserName),
    user_avatar_url: first_non_empty_text(
      message.sendUserImgUrl,
      message.sendUserImg,
      message.receiveUserImg,
      message.receiveUserImgUrl,
      message.targetUserImg
    )
  }
}

const collect_message_groups_from_entries = (entries) => (
  entries.flatMap((item) => {
    if (is_conversation_summary(item)) return []
    if (Array.isArray(item?.messageUserVoList)) return [item.messageUserVoList]
    if (item && typeof item === 'object' && (
      item.messageId != null
      || item.sendUserId != null
      || item.receiveUserId != null
      || item.targetUserId != null
    )) {
      return [[item]]
    }
    return []
  })
)

const collect_message_groups = (data) => collect_message_groups_from_entries(read_message_list_entries(data))

const sort_conversations = (conversations) => [...conversations].sort((left, right) => {
  const right_value = parse_message_date(right.updated_at)
  const left_value = parse_message_date(left.updated_at)
  const right_time = Number.isFinite(right_value) ? right_value : 0
  const left_time = Number.isFinite(left_value) ? left_value : 0
  return right_time - left_time
})

const pick_latest_message = (messages) => (
  [...messages].sort((left, right) => {
    const right_time = Date.parse(right?.createDate)
    const left_time = Date.parse(left?.createDate)
    const right_value = Number.isFinite(right_time) ? right_time : 0
    const left_value = Number.isFinite(left_time) ? left_time : 0
    return right_value - left_value
  })[0]
)

export const map_message_conversations = (data, { current_user_id = '', now = Date.now() } = {}) => {
  const conversations = new Map()
  const entries = read_message_list_entries(data)
  entries.filter(is_conversation_summary).forEach((item) => {
    const conversation = map_conversation_summary(item, current_user_id, now)
    if (!conversation.user_id) return
    conversations.set(conversation.user_id, conversation)
  })
  collect_message_groups_from_entries(entries).forEach((messages) => {
    const chat_messages = messages.filter((message) => (
      message && Number(message.messageType) !== MESSAGE_TYPE.NOTICE
    ))
    if (!chat_messages.length) return
    const latest = pick_latest_message(chat_messages)
    const peer = resolve_peer(latest, current_user_id)
    if (!peer.user_id) return
    const existing = conversations.get(peer.user_id)
    const open_chat_flag = existing?.open_chat_flag ?? 0
    const chat_status = reply_wait_status({
      open_chat_flag,
      message_type: latest.messageType,
      message_classify: latest.messageClassify,
      send_user_id: latest.sendUserId,
      receive_user_id: latest.receiveUserId,
      current_user_id
    })
    const conversation = {
      conversation_id: peer.user_id,
      user_id: peer.user_id,
      user_name: peer.user_name || 'Unknown',
    user_name_is_placeholder: !(peer.user_name),
      user_avatar_url: peer.user_avatar_url,
      preview: preview_for_message(latest),
      preview_is_system: !normalize_text(latest.content) && !normalize_text(latest.title),
      updated_at: latest.createDate || '',
      updated_label: format_message_time_label(latest.createDate, now),
      open_chat_flag,
      chat_status,
      has_unread: chat_messages.some((message) => {
        if (Number(message.readFlag) !== 0) return false
        const send_id = normalize_id(message.sendUserId)
        const receive_id = normalize_id(message.receiveUserId)
        const current_id = normalize_id(current_user_id)
        if (!send_id || send_id !== peer.user_id) return false
        if (current_id && send_id === current_id) return false
        if (current_id && receive_id && receive_id !== current_id) return false
        return true
      })
    }
    const existing_time = parse_message_date(existing?.updated_at)
    const next_time = parse_message_date(conversation.updated_at)
    if (!existing || (Number.isFinite(next_time) && next_time >= (Number.isFinite(existing_time) ? existing_time : 0))) {
      conversations.set(peer.user_id, conversation)
    }
  })
  return sort_conversations(conversations.values())
}

export const format_clock_time_label = (create_date) => {
  const timestamp = Date.parse(create_date)
  if (!Number.isFinite(timestamp)) return ''
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp))
}

export const format_notice_time_label = format_clock_time_label

// Lunmi notifications store their existing content field as JSON for object links and display text.
const read_notice_content = (value) => {
  if (typeof value !== 'string' || !value.trim().startsWith('{')) return null
  try {
    const payload = JSON.parse(value)
    return payload && typeof payload === 'object' && typeof payload.body === 'string' ? payload : null
  } catch {
    return null
  }
}

export const map_notice_messages = (data) => {
  const source = read_message_list_entries(data).flatMap((item) => {
    if (Array.isArray(item?.messageUserVoList)) return item.messageUserVoList
    if (item && typeof item === 'object') return [item]
    return []
  })
  return source
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const notice_id = normalize_id(item.messageId) || `${normalize_id(item.sendUserId)}-${item.createDate || ''}`
      const title = normalize_text(item.title)
      const payload = read_notice_content(item.content)
      const content = payload ? normalize_text(payload.body) : normalize_text(item.content)
      return {
        notice_id,
        user_id: normalize_id(item.sendUserId),
        user_name: normalize_text(item.sendUserName) || 'Unknown',
    user_name_is_placeholder: !(normalize_text(item.sendUserName)),
        user_avatar_url: normalize_text(item.sendUserImgUrl),
        title,
        content,
        preview: content || title,
        message_classify: Number(item.messageClassify) || 4,
        wish_id: normalize_id(payload?.wishId),
        lantern_id: normalize_id(payload?.lanternId),
        wish_content: normalize_text(payload?.wishContent),
        viewer_count: payload?.viewerCount == null ? null : Number(payload.viewerCount),
        created_at: item.createDate || '',
        created_label: format_notice_time_label(item.createDate),
        has_unread: Number(item.readFlag) === 0
      }
    })
    .filter((item) => item.notice_id)
    .sort((left, right) => {
      const right_time = Date.parse(right.created_at)
      const left_time = Date.parse(left.created_at)
      const right_value = Number.isFinite(right_time) ? right_time : 0
      const left_value = Number.isFinite(left_time) ? left_time : 0
      return right_value - left_value
    })
}

export const find_notice_message = (data, notice_id = '') => {
  const target_id = normalize_id(notice_id)
  if (!target_id) return null
  return map_notice_messages(data).find((item) => item.notice_id === target_id) || null
}

export const map_chat_messages = (data, { peer_user_id = '' } = {}) => {
  const requested_peer_id = normalize_id(peer_user_id)
  const source_messages = read_message_list_entries(data).flatMap((item) => {
    if (Array.isArray(item?.messageUserVoList)) return item.messageUserVoList
    if (item && typeof item === 'object') return [item]
    return []
  })
  const messages = source_messages
    .filter((message) => message && Number(message.messageType) !== MESSAGE_TYPE.NOTICE)
    .map((message) => {
      const send_id = normalize_id(message.sendUserId)
      const message_type = Number(message.messageType)
      const content = normalize_text(message.content)
      const is_image = message_type === MESSAGE_TYPE.IMAGE && /^https?:\/\//i.test(content)
      return {
        message_id: normalize_id(message.messageId) || `${send_id}-${message.createDate || ''}`,
        is_mine: Boolean(message.self),
        show_time: Boolean(message.showTime),
        message_type,
        message_classify: message.messageClassify,
        content,
        preview: preview_for_message(message),
        image_url: is_image ? content : '',
        created_at: message.createDate || '',
        created_label: normalize_text(message.timeText),
        sender_id: send_id,
        sender_name: normalize_text(message.sendUserName),
        sender_avatar_url: first_non_empty_text(message.sendUserImgUrl, message.sendUserImg)
      }
    })
    .filter((item) => item.message_id)
    .sort((left, right) => {
      const left_time = Date.parse(left.created_at)
      const right_time = Date.parse(right.created_at)
      const left_value = Number.isFinite(left_time) ? left_time : 0
      const right_value = Number.isFinite(right_time) ? right_time : 0
      return left_value - right_value
    })
  const peer_source = messages.find((message) => !message.is_mine) || null
  return {
    messages,
    peer: {
      user_id: peer_source?.sender_id || requested_peer_id,
      user_name: peer_source?.sender_name || 'Unknown',
    user_name_is_placeholder: !(peer_source?.sender_name),
      user_avatar_url: peer_source?.sender_avatar_url || ''
    }
  }
}

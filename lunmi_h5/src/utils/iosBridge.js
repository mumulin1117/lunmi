import {
  IOS_BRIDGE_EVENT_NAME,
  IOS_BRIDGE_HANDLER_NAME,
  IOS_BRIDGE_RECEIVER_NAME
} from './iosMessageTypes.js'

// Unified protocol:
// H5 -> iOS: window.webkit.messageHandlers.CommonTemplateBridge.postMessage({ type, data })
// iOS -> H5: window.CommonTemplateH5Bridge.receive({ type, data })

const message_listener_map = new Map()
let bridge_registered = false

const is_data_object = (value) => Boolean(
  value
  && typeof value === 'object'
  && !Array.isArray(value)
)

const parse_message = (payload) => {
  if (typeof payload !== 'string') return payload
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export const create_ios_message = (type, data = {}) => {
  if (typeof type !== 'string' || !type.trim()) throw new TypeError('iOS message type must be a non-empty string.')
  if (!is_data_object(data)) throw new TypeError('iOS message data must be an object.')
  return { type: type.trim(), data: { ...data } }
}

export const normalize_ios_message = (payload) => {
  const message = parse_message(payload)
  if (!message || typeof message.type !== 'string' || !message.type.trim() || !is_data_object(message.data)) return null
  return create_ios_message(message.type, message.data)
}

const get_ios_message_handler = (handler_name) => {
  if (typeof window === 'undefined') return null
  return window.webkit?.messageHandlers?.[handler_name] || window[handler_name] || null
}

export const has_ios_message_handler = (handler_name = IOS_BRIDGE_HANDLER_NAME) => (
  Boolean(get_ios_message_handler(handler_name))
)

const post_to_ios_handler = (handler_name, payload) => {
  const message_handler = get_ios_message_handler(handler_name)
  if (!message_handler) return false
  try {
    if (typeof message_handler.postMessage === 'function') {
      message_handler.postMessage(payload)
      return true
    }
    if (typeof message_handler.sendMessage === 'function') {
      message_handler.sendMessage(payload)
      return true
    }
    if (typeof message_handler === 'function') {
      message_handler(payload)
      return true
    }
  } catch {
    return false
  }
  return false
}

export const send_ios_message = (
  type,
  data = {},
  {
    handler_name = IOS_BRIDGE_HANDLER_NAME,
    fallback_handler_name = '',
    fallback_payload
  } = {}
) => {
  const message = create_ios_message(type, data)
  if (post_to_ios_handler(handler_name, message)) return true
  if (!fallback_handler_name || fallback_handler_name === handler_name) return false
  return post_to_ios_handler(
    fallback_handler_name,
    fallback_payload === undefined ? message : fallback_payload
  )
}

export const receive_ios_message = (payload) => {
  const message = normalize_ios_message(payload)
  if (!message) return false
  const listener_set = message_listener_map.get(message.type)
  if (!listener_set?.size) return false
  listener_set.forEach((listener) => {
    try {
      listener(message)
    } catch {}
  })
  return true
}

export const register_ios_bridge = () => {
  if (bridge_registered || typeof window === 'undefined') return false
  const existing_receiver = window[IOS_BRIDGE_RECEIVER_NAME]
  window[IOS_BRIDGE_RECEIVER_NAME] = {
    ...(is_data_object(existing_receiver) ? existing_receiver : {}),
    receive: receive_ios_message
  }
  window.addEventListener('message', (event) => receive_ios_message(event.data))
  window.addEventListener(IOS_BRIDGE_EVENT_NAME, (event) => receive_ios_message(event.detail))
  bridge_registered = true
  return true
}

export const subscribe_ios_message = (type, listener) => {
  if (typeof type !== 'string' || !type.trim()) throw new TypeError('iOS message type must be a non-empty string.')
  if (typeof listener !== 'function') throw new TypeError('iOS message listener must be a function.')
  const normalized_type = type.trim()
  const listener_set = message_listener_map.get(normalized_type) || new Set()
  listener_set.add(listener)
  message_listener_map.set(normalized_type, listener_set)
  register_ios_bridge()
  return () => {
    listener_set.delete(listener)
    if (!listener_set.size) message_listener_map.delete(normalized_type)
  }
}

export const create_ios_request_id = (scope = 'request') => (
  `${String(scope || 'request').replace(/[^a-z0-9_]/gi, '_')}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
)

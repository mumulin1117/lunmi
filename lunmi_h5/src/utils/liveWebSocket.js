import { LIVE_WS_BASE_URL } from '@/config/api'

const encode_query = (value) => encodeURIComponent(`${value ?? ''}`)

/**
 * The legacy server accepts `channel` and `req` query parameters. Keeping this
 * small adapter separate from the page makes reconnect and teardown testable.
 */
export const create_live_socket = ({ room_id, token, on_open, on_message, on_error, on_close } = {}) => {
  if (typeof WebSocket === 'undefined') throw new Error('WebSocket is unavailable in this browser.')
  if (!LIVE_WS_BASE_URL) throw new Error('Live WebSocket URL is not configured.')
  const socket = new WebSocket(
    `${LIVE_WS_BASE_URL}/websocket?channel=${encode_query(room_id)}&req=${encode_query(token)}`
  )
  if (on_open) socket.onopen = on_open
  if (on_message) socket.onmessage = on_message
  if (on_error) socket.onerror = on_error
  if (on_close) socket.onclose = on_close
  return socket
}

export const send_live_socket_message = (socket, payload = {}) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false
  const message = `${payload.message ?? ''}`.trim()
  // TalkMessage requires non-empty `channelId` and `message`; missing message returns 参数错误.
  socket.send(JSON.stringify({
    ...payload,
    message: message || 'ok'
  }))
  return true
}

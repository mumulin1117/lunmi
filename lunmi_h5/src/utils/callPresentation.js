/**
 * Simulated one-to-one video calls (no call signaling in tempdata/api.md).
 * Route params follow design_flow_document.md: callId, peer ids, sourcePage.
 */
import { CALL_CONNECTION_ENABLED } from '../config/callMedia.js'

const normalize_id = (value) => (
  value === undefined || value === null ? '' : `${value}`.trim()
)

const normalize_text = (value) => `${value || ''}`.trim()

export const CALL_STATE_RINGING = 'ringing'
export const CALL_STATE_CONNECTED = 'connected'

export const RINGING_END_REASON = Object.freeze({
  cancel: 'cancel',
  rejected: 'rejected',
  timeout: 'timeout',
  network_error: 'network_error',
  unavailable: 'unavailable'
})

export const CONNECTED_END_REASON = Object.freeze({
  hangup: 'hangup',
  peer_hangup: 'peer_hangup',
  network_error: 'network_error'
})

export const ringing_end_toast = (reason) => {
  if (reason === RINGING_END_REASON.unavailable) return 'This call is unavailable.'
  if (reason === RINGING_END_REASON.rejected) return 'Call declined'
  if (reason === RINGING_END_REASON.timeout) return 'No answer'
  if (reason === RINGING_END_REASON.network_error) return 'Network error'
  return ''
}

export const connected_end_toast = (reason) => {
  if (reason === CONNECTED_END_REASON.peer_hangup) return 'They hung up'
  if (reason === CONNECTED_END_REASON.network_error) return 'Network error'
  if (reason === CONNECTED_END_REASON.hangup) return 'Call ended'
  return 'Call ended'
}

export const decode_query_value = (value) => {
  const text = `${value || ''}`
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

export const create_call_id = (callee_id = '', now = Date.now()) => {
  const peer = normalize_id(callee_id) || 'peer'
  return `${peer}-${now}`
}

export const ringing_status_label = (dot_count = 0) => {
  const dots = '.'.repeat(Math.max(0, Math.min(3, Number(dot_count) || 0)))
  return `Calling${dots}`
}

/**
 * @param {() => number} random
 */
export const plan_ringing_schedule = (random = Math.random) => {
  if (!CALL_CONNECTION_ENABLED) {
    return { connect_ms: null, timeout_ms: 8000 + Math.floor(random() * 4001), outcome_at_connect: RINGING_END_REASON.unavailable }
  }
  const connect_ms = 3000 + Math.floor(random() * 3001)
  const timeout_ms = 8000 + Math.floor(random() * 4001)
  const roll = random()
  let outcome_at_connect = 'connected'
  if (roll < 0.12) outcome_at_connect = RINGING_END_REASON.rejected
  else if (roll < 0.18) outcome_at_connect = RINGING_END_REASON.network_error
  return { connect_ms, timeout_ms, outcome_at_connect }
}

/**
 * @param {() => number} random
 */
export const plan_connected_schedule = (random = Math.random) => ({
  peer_hangup_ms: 28000 + Math.floor(random() * 17001),
  network_check_ms: 12000 + Math.floor(random() * 8001),
  network_failure: random() < 0.08
})

const build_call_query = ({
  call_id = '',
  caller_id = '',
  callee_id = '',
  callee_name = '',
  callee_avatar_url = '',
  source_page = '',
  call_state = ''
} = {}) => {
  const params = []
  const id = normalize_id(call_id)
  const callee = normalize_id(callee_id)
  if (id) params.push(`callId=${encodeURIComponent(id)}`)
  if (callee) {
    params.push(`calleeId=${encodeURIComponent(callee)}`)
    params.push(`targetUserId=${encodeURIComponent(callee)}`)
  }
  const caller = normalize_id(caller_id)
  if (caller) params.push(`callerId=${encodeURIComponent(caller)}`)
  const name = normalize_text(callee_name)
  const avatar = normalize_text(callee_avatar_url)
  if (name) {
    params.push(`calleeName=${encodeURIComponent(name)}`)
    params.push(`userName=${encodeURIComponent(name)}`)
  }
  if (avatar) {
    params.push(`calleeAvatar=${encodeURIComponent(avatar)}`)
    params.push(`userImg=${encodeURIComponent(avatar)}`)
  }
  const source = normalize_text(source_page)
  if (source) params.push(`sourcePage=${encodeURIComponent(source)}`)
  if (call_state) params.push(`callState=${encodeURIComponent(call_state)}`)
  return params.join('&')
}

export const build_ringing_url = ({
  call_id = '',
  callee_id = '',
  target_user_id = '',
  callee_name = '',
  callee_avatar_url = '',
  caller_id = '',
  source_page = ''
} = {}) => {
  const callee = normalize_id(callee_id || target_user_id)
  const resolved_call_id = normalize_id(call_id) || create_call_id(callee)
  return `/pages/calls/ringing/index?${build_call_query({
    call_id: resolved_call_id,
    caller_id,
    callee_id: callee,
    callee_name,
    callee_avatar_url,
    source_page,
    call_state: CALL_STATE_RINGING
  })}`
}

export const build_connected_url = ({
  call_id = '',
  callee_id = '',
  target_user_id = '',
  callee_name = '',
  callee_avatar_url = '',
  caller_id = '',
  source_page = ''
} = {}) => {
  const callee = normalize_id(callee_id || target_user_id)
  return `/pages/calls/connected/index?${build_call_query({
    call_id: normalize_id(call_id),
    caller_id,
    callee_id: callee,
    callee_name,
    callee_avatar_url,
    source_page,
    call_state: CALL_STATE_CONNECTED
  })}`
}

export const read_call_route_context = (query = {}) => {
  const callee_id = normalize_id(query.calleeId || query.targetUserId || query.user_id || query.userId)
  const caller_id = normalize_id(query.callerId)
  const call_id = normalize_id(query.callId) || (callee_id ? create_call_id(callee_id) : '')
  const callee_name = normalize_text(
    query.calleeName || query.userName || query.user_name
  ) || 'Community member'
  const callee_avatar_url = normalize_text(
    query.calleeAvatar || query.userImg || query.userImgUrl || query.avatar_url
  )
  const source_page = normalize_text(query.sourcePage || query.returnPage)
  const call_state = normalize_text(query.callState)
  return {
    call_id,
    caller_id,
    callee_id,
    callee_name,
    callee_avatar_url,
    source_page,
    call_state
  }
}

const CALL_PAGE_PATHS = Object.freeze([
  'pages/calls/ringing/index',
  'pages/calls/connected/index'
])

export const normalize_call_return_url = (value, fallback = '/pages/messages/index') => {
  const candidate = normalize_text(value || fallback)
  const normalized = candidate.startsWith('/') ? candidate : `/${candidate}`
  const path = normalized.split('?')[0].slice(1)
  if (CALL_PAGE_PATHS.includes(path)) return fallback
  return path.startsWith('pages/') ? normalized : fallback
}

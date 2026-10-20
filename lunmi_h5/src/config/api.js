const vite_env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

const native_env = typeof window !== 'undefined' ? window.LunmiNativeConfiguration || {} : {}
const read_env_text = (key) => `${vite_env[key] || native_env[key] || ''}`.trim()
const parsed_timeout = Number(read_env_text('VITE_API_TIMEOUT_MS'))

export const API_BASE_URL = read_env_text('VITE_API_BASE_URL').replace(/\/+$/, '')
export const AGORA_APP_ID = read_env_text('VITE_AGORA_APP_ID') || '444f56a0183647fda5faa58865a3dac1'
const runtime_ws_base = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  : ''
const is_dev = Boolean(vite_env.DEV)
export const LIVE_WS_BASE_URL = (
  read_env_text('VITE_LIVE_WS_URL')
  || API_BASE_URL.replace(/^http/i, 'ws').replace(/\/api$/i, '').replace(/\/backfour\/?$/i, '')
  || runtime_ws_base
).replace(/\/+$/, '')
export const API_BUNDLE_ID = read_env_text('VITE_BUNDLE_ID')
export const API_REQUEST_TIMEOUT_MS = Number.isFinite(parsed_timeout) && parsed_timeout > 0
  ? parsed_timeout
  : 15000

export const API_ENDPOINTS = Object.freeze({
  email_login: '/api/emailLogin',
  update_user: '/api/updateUser',
  oss_hai_upload: '/sj/common/ossHaiUpload',
  image_upload: '/api/fileUpload',
  dynamic_list: '/api/selectDynamicList',
  video_upload: '/api/fileVideoUpload',
  dynamic_add: '/api/addDynamic',
  select_message_list: '/api/selectMessageList',
  select_notice_message_list: '/api/selectNoticeMessageList',
  select_user_info: '/api/selectUserInfo',
  select_user_balance: '/api/selectUserBalance',
  send_message: '/api/sendMessage',
  update_msg_read: '/api/updateMsgRead'
})

const to_relative_api_path = (endpoint) => `/${`${endpoint || ''}`.trim().replace(/^\/+/, '')}`

export const resolve_api_url = (endpoint) => {
  const normalized_endpoint = `${endpoint || ''}`.trim()
  if (/^https?:\/\//i.test(normalized_endpoint)) return normalized_endpoint
  const relative_path = to_relative_api_path(normalized_endpoint)
  if (API_BASE_URL) return `${API_BASE_URL}${relative_path}`
  if (is_dev) return relative_path
  throw new Error('API base URL is not configured.')
}

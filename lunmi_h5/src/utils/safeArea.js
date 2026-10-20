import {
  send_ios_message,
  subscribe_ios_message
} from './iosBridge.js'
import {
  IOS_MESSAGE_TYPE,
  IOS_SAFE_AREA_EVENT_NAME,
  IOS_SAFE_AREA_RECEIVER_NAME,
  IOS_SAFE_AREA_REQUEST_HANDLER_NAME
} from './iosMessageTypes.js'

export {
  IOS_SAFE_AREA_EVENT_NAME,
  IOS_SAFE_AREA_RECEIVER_NAME,
  IOS_SAFE_AREA_REQUEST_HANDLER_NAME
} from './iosMessageTypes.js'

let bridge_registered = false
let refresh_frame_id = 0

const parse_payload = (payload) => {
  if (typeof payload !== 'string') return payload && typeof payload === 'object' ? payload : {}

  try {
    return JSON.parse(payload)
  } catch (error) {
    return {}
  }
}

const normalize_css_length = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.max(0, value)}px`
  }

  const normalized_value = `${value ?? ''}`.trim()
  if (!normalized_value) return '0px'
  if (/^\d+(?:\.\d+)?$/.test(normalized_value)) return `${normalized_value}px`

  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    return CSS.supports('height', normalized_value) ? normalized_value : '0px'
  }

  return /^\d+(?:\.\d+)?(?:px|rpx)$/.test(normalized_value) ? normalized_value : '0px'
}

const normalize_safe_area = (payload) => {
  const parsed_payload = parse_payload(payload)
  const inset_source = parsed_payload.safe_area_insets
    || parsed_payload.safeAreaInsets
    || parsed_payload.insets
    || parsed_payload

  return {
    top: normalize_css_length(
      inset_source.top
      ?? inset_source.safe_area_top
      ?? inset_source.safeAreaTop
      ?? inset_source.topInset
    ),
    bottom: normalize_css_length(
      inset_source.bottom
      ?? inset_source.safe_area_bottom
      ?? inset_source.safeAreaBottom
      ?? inset_source.bottomInset
    )
  }
}

export const apply_ios_safe_area = (payload = {}) => {
  if (typeof document === 'undefined') return false

  const safe_area = normalize_safe_area(payload)
  const root_style = document.documentElement.style
  root_style.setProperty('--native-safe-area-top', safe_area.top)
  root_style.setProperty('--native-safe-area-bottom', safe_area.bottom)
  return true
}

export const request_ios_safe_area = () => {
  if (typeof window === 'undefined') return false
  const data = {
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight
  }
  return send_ios_message(IOS_MESSAGE_TYPE.SAFE_AREA_REQUEST, data, {
    fallback_handler_name: IOS_SAFE_AREA_REQUEST_HANDLER_NAME,
    fallback_payload: { type: 'getSafeAreaInsets', ...data }
  })
}

const schedule_safe_area_request = () => {
  if (typeof window === 'undefined') return
  if (refresh_frame_id) window.cancelAnimationFrame(refresh_frame_id)

  refresh_frame_id = window.requestAnimationFrame(() => {
    refresh_frame_id = 0
    request_ios_safe_area()
  })
}

export const register_ios_safe_area_bridge = () => {
  if (bridge_registered || typeof window === 'undefined') return

  subscribe_ios_message(
    IOS_MESSAGE_TYPE.SAFE_AREA_UPDATE,
    (message) => apply_ios_safe_area(message.data)
  )

  const existing_receiver = window[IOS_SAFE_AREA_RECEIVER_NAME]
  window[IOS_SAFE_AREA_RECEIVER_NAME] = {
    ...(existing_receiver && typeof existing_receiver === 'object' ? existing_receiver : {}),
    update: apply_ios_safe_area,
    setInsets: apply_ios_safe_area
  }

  window.addEventListener(IOS_SAFE_AREA_EVENT_NAME, (event) => apply_ios_safe_area(event.detail))
  window.addEventListener('orientationchange', schedule_safe_area_request)
  window.addEventListener('resize', schedule_safe_area_request)
  window.addEventListener('pageshow', schedule_safe_area_request)
  bridge_registered = true
  request_ios_safe_area()
}

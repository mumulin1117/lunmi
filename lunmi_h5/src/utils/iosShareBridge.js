import { send_ios_message } from './iosBridge.js'
import {
  IOS_MESSAGE_TYPE,
  IOS_SHARE_ACTIVITY_HANDLER_NAME
} from './iosMessageTypes.js'

export const IOS_SHARE_APP_NAME = 'Lunmi'
export const IOS_SHARE_APP_ICON = 'logo.png'

const share_icon_url = () => {
  if (typeof window === 'undefined') return '/static/logo.png'
  try {
    return new URL('/static/logo.png', window.location.href).href
  } catch {
    return '/static/logo.png'
  }
}

export const open_ios_share_activity = ({ title = '', text = '', description = '' } = {}) => {
  const subject = String(title).trim() || IOS_SHARE_APP_NAME
  const data = {
    title: IOS_SHARE_APP_NAME,
    subject,
    text: String(text).trim(),
    description: String(description).trim() || subject,
    appName: IOS_SHARE_APP_NAME,
    appIcon: IOS_SHARE_APP_ICON,
    appIconUrl: share_icon_url()
  }
  if (!data.text) return false
  return send_ios_message(IOS_MESSAGE_TYPE.SHARE_ACTIVITY_REQUEST, data, {
    fallback_handler_name: IOS_SHARE_ACTIVITY_HANDLER_NAME,
    fallback_payload: data
  })
}

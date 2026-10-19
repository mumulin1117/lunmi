import { has_ios_message_handler } from './iosBridge.js'
import { IOS_HAPTIC_HANDLER_NAME } from './iosMessageTypes.js'

// common_template_api/tempdata/ios_webview/WH5/H5BrowserView.swift:
// WKNavigationDelegate opens external schemes with UIApplication.shared.open,
// then cancels WebView navigation. mailto uses that existing host protocol.
export const open_ios_support_email = ({ address = '', subject = '' } = {}) => {
  const email = `${address}`.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { dispatched: false, error: 'This email address is unavailable.' }
  }
  if (typeof window === 'undefined'
    || (!has_ios_message_handler() && !has_ios_message_handler(IOS_HAPTIC_HANDLER_NAME))) {
    return { dispatched: false, error: 'Open email from the iOS app.' }
  }
  const title = `${subject}`.trim()
  const query = title ? `?subject=${encodeURIComponent(title)}` : ''
  const [local_part, domain] = email.split('@')
  const recipient = `${encodeURIComponent(local_part)}@${encodeURIComponent(domain)}`
  try {
    window.location.assign(`mailto:${recipient}${query}`)
    // The host has no mail callback; dispatch does not mean an email was sent.
    return { dispatched: true, error: '' }
  } catch {
    return { dispatched: false, error: 'Unable to open email. Please try again.' }
  }
}

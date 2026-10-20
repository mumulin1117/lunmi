import { create_ios_request_id, has_ios_message_handler, send_ios_message, subscribe_ios_message } from './iosBridge.js'
import { IOS_MESSAGE_TYPE } from './iosMessageTypes.js'
import { is_allowed_app_language } from './languagePresentation.js'

let native_state = null

const configuration = () => typeof window === 'undefined' ? {} : window.LunmiNativeConfiguration || {}
const supports_language_bridge = () => configuration().APP_LANGUAGE_BRIDGE_VERSION === '1' && has_ios_message_handler()

export const read_native_language_state = () => native_state || {
  deviceLanguage: configuration().APP_DEVICE_LANGUAGE,
  preferredLanguage: configuration().APP_LANGUAGE_PREFERENCE
}

export const persist_native_app_language = (code) => {
  if (!supports_language_bridge()) return Promise.resolve()
  const requestId = create_ios_request_id('language')
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribe_ios_message(IOS_MESSAGE_TYPE.LANGUAGE_SET_RESULT, ({ data }) => {
      if (data.requestId !== requestId) return
      clearTimeout(timer)
      unsubscribe()
      if (data.success === true && data.code === code) resolve()
      else reject(new Error('Unable to save this language.'))
    })
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error('Unable to save this language.'))
    }, 5000)
    if (!send_ios_message(IOS_MESSAGE_TYPE.LANGUAGE_SET_REQUEST, { requestId, code })) {
      clearTimeout(timer)
      unsubscribe()
      reject(new Error('Unable to save this language.'))
    }
  })
}

export const subscribe_native_language = (listener) => {
  if (!supports_language_bridge()) return () => {}
  const unsubscribe = subscribe_ios_message(IOS_MESSAGE_TYPE.LANGUAGE_STATE_UPDATE, ({ data }) => {
    if (!is_allowed_app_language(data.deviceLanguage)) return
    native_state = {
      deviceLanguage: data.deviceLanguage,
      preferredLanguage: is_allowed_app_language(data.preferredLanguage) ? data.preferredLanguage : ''
    }
    listener(native_state)
  })
  send_ios_message(IOS_MESSAGE_TYPE.LANGUAGE_STATE_REQUEST)
  return unsubscribe
}

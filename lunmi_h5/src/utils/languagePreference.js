/**
 * App language local record.
 *
 * key: lunmi.app_language
 * purpose: Remember the device language chosen in settings
 * structure: { version: number, code: 'en' | 'ja' }
 * version: 1
 * cleanup: preserved by cache clear and logout; removed with the app installation
 * isolation: one manual preference per installation/browser profile, never Keychain or account data
 */
import { app_language_option, is_allowed_app_language, match_device_language } from './languagePresentation.js'
import { persist_native_app_language, read_native_language_state } from './languageNativeBridge.js'

const APP_LANGUAGE_RECORD = Object.freeze({
  key: 'lunmi.app_language',
  version: 1,
  purpose: 'app_language'
})

const read_record = () => {
  if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') return null
  try {
    const value = uni.getStorageSync(APP_LANGUAGE_RECORD.key)
    return value || null
  } catch {
    return null
  }
}

const write_record = (value) => {
  if (typeof uni === 'undefined' || typeof uni.setStorageSync !== 'function') return false
  try {
    uni.setStorageSync(APP_LANGUAGE_RECORD.key, value)
    return true
  } catch {
    return false
  }
}

export const read_saved_app_language = () => {
  const record = read_record()
  if (record?.version === APP_LANGUAGE_RECORD.version && is_allowed_app_language(record.code)) return record.code
  const native = read_native_language_state().preferredLanguage
  return is_allowed_app_language(native) ? native : null
}

export const read_device_language = () => {
  const native = read_native_language_state().deviceLanguage
  if (is_allowed_app_language(native)) return native
  if (typeof navigator !== 'undefined') return match_device_language(navigator.languages?.[0] || navigator.language)
  try {
    if (typeof uni !== 'undefined') return match_device_language(uni.getSystemInfoSync?.().language)
  } catch {}
  return match_device_language('')
}

export const read_app_language = () => read_saved_app_language() || read_device_language()

export const read_app_language_label = () => app_language_option(read_app_language()).native_name

export const write_app_language = (code) => {
  if (!is_allowed_app_language(code)) return false
  return write_record({
    version: APP_LANGUAGE_RECORD.version,
    code
  })
}

export const save_app_language_preference = async (code) => {
  const previous = read_record()
  if (!write_app_language(code)) return false
  try {
    await persist_native_app_language(code)
    return true
  } catch {
    try {
      if (previous) write_record(previous)
      else if (typeof uni.removeStorageSync === 'function') uni.removeStorageSync(APP_LANGUAGE_RECORD.key)
      else write_record(null)
    } catch {}
    return false
  }
}

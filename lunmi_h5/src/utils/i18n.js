import { ref, readonly, watch } from 'vue'
import en from '../locales/en.json' with { type: 'json' }
import ja from '../locales/ja.json' with { type: 'json' }
import { read_app_language, read_saved_app_language, save_app_language_preference, write_app_language } from './languagePreference.js'
import { persist_native_app_language, read_native_language_state, subscribe_native_language } from './languageNativeBridge.js'
import page_configuration from '../pages.json' with { type: 'json' }

const current_language = ref(read_app_language())
let native_language_registered = false
export const app_language = readonly(current_language)
const catalogs = { en, ja }
const escape_regex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Presentation helpers keep English source text. Translate their completed labels
// at the render boundary so retained pages update without querying their data again.
const message_patterns = Object.keys(en).filter((key) => /\{\d+\}/.test(key))
  .sort((a, b) => b.length - a.length)
  .map((key) => {
    const indexes = []
    const pattern = escape_regex(key).replace(/\\\{(\d+)\\\}/g, (_, index) => {
      indexes.push(index)
      const numeric = /^\{0\}(?:m|h|d|D| days| DAYS| coins| waiting| message| people| min| \{1\} ago|-\{1\} DAYS)/.test(key)
      return numeric && (index === '0' || key === '{0}-{1} DAYS') ? '([\\d,]+)' : '(.*?)'
    })
    return { key, indexes, regex: new RegExp(`^${pattern}$`, 's') }
  })

const interpolate = (message, parameters) => message.replace(/\{(\d+)\}/g, (token, key) => (
  parameters[key] === undefined ? token : `${parameters[key]}`
))

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const localize_date = (source) => {
  if (current_language.value !== 'ja') return source
  const month_date = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/g
  return source.replace(month_date, (_, month, day, year) => (
    `${year ? `${year}年` : ''}${months.findIndex((item) => item.toLowerCase() === month.toLowerCase()) + 1}月${Number(day)}日`
  )).replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/g, (_, month, year) => (
    `${year}年${months.indexOf(month) + 1}月`
  )).replace(/\b(\d{1,2}:\d{2})\s+(AM|PM)\b/g, (_, time, period) => `${period === 'AM' ? '午前' : '午後'}${time}`)
}

const permission_labels = {
  camera: 'Camera',
  photo_library: 'Photo library',
  microphone: 'Microphone',
  location: 'Location',
  unknown: 'Unknown'
}

const date_parameters = {
  'Caught {0}': ['0'],
  'Joined {0}': ['0'],
  'released {0}': ['0'],
  '{0} · released {1}': ['1'],
  '{0} · Caught {1}': ['1']
}

export const get_app_locale = () => current_language.value === 'ja' ? 'ja-JP' : 'en-US'

export const sync_app_language = () => {
  current_language.value = read_app_language()
  if (typeof document !== 'undefined') document.documentElement.lang = get_app_locale()
  if (typeof uni !== 'undefined' && typeof uni.setLocale === 'function'
    && typeof getApp === 'function' && getApp({ allowDefault: true })?.$vm) {
    uni.setLocale(current_language.value)
  }
}

const update_page_title = () => {
  if (typeof getCurrentPages !== 'function') return
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  let title = page_configuration.pages.find((item) => item.path === page?.route)?.style?.navigationBarTitleText
  if (page?.route === 'pages/profile/user-agreement') {
    const options = page.options || page.$page?.options || {}
    const hash_query = typeof window !== 'undefined' && window.location?.hash
      ? window.location.hash.split('?')[1] || ''
      : ''
    const document_type = options.type || new URLSearchParams(hash_query).get('type')
    title = document_type === 'terms' ? 'Terms of Service' : 'End User License Agreement'
  }
  if (!title || typeof uni === 'undefined' || typeof uni.setNavigationBarTitle !== 'function') return
  uni.setNavigationBarTitle({ title: t(title) })
}

export const set_app_language = (code) => {
  if (!write_app_language(code)) return false
  sync_app_language()
  return true
}

export const save_app_language = async (code) => {
  if (!await save_app_language_preference(code)) return false
  sync_app_language()
  return true
}

export const t = (source, parameters = {}) => {
  const catalog = catalogs[current_language.value]
  if (typeof source !== 'string' || !source) return source
  if (Object.prototype.hasOwnProperty.call(catalog, source)) return interpolate(catalog[source], parameters)
  const trimmed = source.trim()
  if (Object.prototype.hasOwnProperty.call(catalog, trimmed)) return source.replace(trimmed, interpolate(catalog[trimmed], parameters))
  for (const pattern of message_patterns) {
    const match = pattern.regex.exec(source)
    if (!match) continue
    const values = Object.fromEntries(pattern.indexes.map((index, offset) => [index, match[offset + 1]]))
    if (pattern.key === '{0} {1} ago') values[1] = catalog[values[1]] || values[1]
    if (pattern.key === '{0} permission request timed out.' || pattern.key === 'Unsupported stored iOS permission: {0}.') {
      values[0] = catalog[permission_labels[values[0]]] || values[0]
    }
    for (const index of date_parameters[pattern.key] || []) values[index] = localize_date(values[index])
    if (['{0} BRANCH', '{0} branch'].includes(pattern.key)) values[0] = catalog[values[0]] || values[0]
    return interpolate(catalog[pattern.key], values)
  }
  const date_text = localize_date(source)
  if (date_text !== source) return date_text
  if (source.includes(' · ')) return source.split(' · ').map((part) => t(part)).join(' · ')
  return source
}

export const install_i18n = (app) => {
  sync_app_language()
  if (!native_language_registered) {
    native_language_registered = true
    subscribe_native_language(() => { sync_app_language() })
    const saved = read_saved_app_language()
    if (saved && saved !== read_native_language_state().preferredLanguage) {
      void persist_native_app_language(saved).catch(() => {})
    }
  }
  app.config.globalProperties.$t = t
  app.mixin({ onShow: () => {
    sync_app_language();
    update_page_title()
  } })
  watch(current_language, update_page_title, { flush: 'post' })
}

export const APP_LANGUAGES = Object.freeze([
  { code: 'en', native_name: 'English', english_name: 'English' },
  { code: 'ja', native_name: '日本語', english_name: 'Japanese' }
])

export const DEFAULT_APP_LANGUAGE = 'en'

export const match_device_language = (locale) => {
  const code = `${locale || ''}`.trim().toLowerCase().split(/[-_]/)[0]
  return is_allowed_app_language(code) ? code : DEFAULT_APP_LANGUAGE
}

export const is_allowed_app_language = (code) => (
  APP_LANGUAGES.some((item) => item.code === code)
)

export const app_language_option = (code) => (
  APP_LANGUAGES.find((item) => item.code === code) || APP_LANGUAGES.find((item) => item.code === DEFAULT_APP_LANGUAGE)
)

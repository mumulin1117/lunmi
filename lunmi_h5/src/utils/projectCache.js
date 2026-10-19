import { sync_app_language } from './i18n.js'
import { read_saved_app_language, write_app_language } from './languagePreference.js'

export const clear_project_cache = async () => {
  const language = read_saved_app_language()
  const results = await Promise.allSettled([
    Promise.resolve().then(() => {
      if (typeof uni !== 'undefined' && typeof uni.clearStorageSync === 'function') uni.clearStorageSync()
      if (language && !write_app_language(language)) throw new Error('Unable to save this language.')
    }),
    Promise.resolve().then(async () => {
      if (typeof window === 'undefined') return
      window.sessionStorage?.clear()
      if (typeof window.caches?.keys !== 'function') return
      const cache_keys = await window.caches.keys()
      await Promise.all(cache_keys.map((cache_key) => window.caches.delete(cache_key)))
    })
  ])
  const failure = results.find((result) => result.status === 'rejected')
  if (failure) throw failure.reason
  sync_app_language()
}

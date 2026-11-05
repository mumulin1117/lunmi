import { read_declined_chat_state, restore_declined_chat_state } from './declinedChatStorage.js'
import { sync_app_language } from './i18n.js'
import { read_saved_app_language, write_app_language } from './languagePreference.js'
import { read_profile_guide_state, restore_profile_guide_state } from './profileGuideStorage.js'

export const clear_project_cache = async () => {
  const language = read_saved_app_language()
  const profile_guides = read_profile_guide_state()
  const declined_chats = read_declined_chat_state()
  const results = await Promise.allSettled([
    Promise.resolve().then(() => {
      if (typeof uni !== 'undefined' && typeof uni.clearStorageSync === 'function') uni.clearStorageSync()
      if (language && !write_app_language(language)) throw new Error('Unable to save this language.')
      if (!restore_profile_guide_state(profile_guides)) throw new Error('Unable to save profile hint preferences.')
      if (!restore_declined_chat_state(declined_chats)) throw new Error('Unable to save declined requests.')
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

/**
 * key: lunmi.declined_chat_requests
 * purpose: Hide specific initial replies declined on this installation.
 * structure: { version: 1, accounts: { [userId]: string[] } }
 * cleanup: Retained during sign-out/cache clearing; removed with App data.
 * isolation: Account-specific request fingerprints, without message bodies.
 * This is a local dismissal preference, not a server-side rejection or block.
 */
const STORAGE_KEY = 'lunmi.declined_chat_requests'

export const read_declined_chat_state = () => {
  try {
    const value = typeof uni !== 'undefined' ? uni.getStorageSync?.(STORAGE_KEY) : null
    if (value?.version !== 1 || !value.accounts || typeof value.accounts !== 'object') return {}
    return Object.fromEntries(Object.entries(value.accounts)
      .filter(([user_id, keys]) => /^\d+$/.test(user_id) && Array.isArray(keys))
      .map(([user_id, keys]) => [user_id, [...new Set(keys.filter(key => typeof key === 'string' && key))]]))
  } catch { return {} }
}

export const read_declined_chat_requests = (user_id) => (
  read_declined_chat_state()[`${user_id || ''}`] || []
)

export const restore_declined_chat_state = (accounts) => {
  if (!Object.keys(accounts || {}).length) return true
  try {
    if (typeof uni === 'undefined' || typeof uni.setStorageSync !== 'function') return false
    uni.setStorageSync(STORAGE_KEY, { version: 1, accounts })
    const saved = read_declined_chat_state()
    return Object.entries(accounts).every(([user_id, keys]) => {
      const saved_keys = new Set(saved[user_id] || [])
      return keys.every(key => saved_keys.has(key))
    })
  } catch { return false }
}

export const decline_chat_request = (user_id, request_key) => {
  const id = `${user_id || ''}`.trim()
  if (!/^\d+$/.test(id) || !request_key) return false
  const accounts = read_declined_chat_state()
  accounts[id] = [...new Set([...(accounts[id] || []), request_key])]
  return restore_declined_chat_state(accounts)
}

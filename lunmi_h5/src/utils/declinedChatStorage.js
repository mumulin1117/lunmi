/**
 * key: lunmi.declined_chat_requests
 * purpose: Remember explicit choices for initial replies on this installation.
 * structure: { version: 1, accounts: { [userId]: string[] }, accepted_accounts: { [userId]: string[] } }
 * cleanup: Retained during sign-out/cache clearing; removed with App data.
 * isolation: Account-specific request fingerprints, without message bodies.
 * These are local choices, not server acknowledgements or blocks.
 */
const STORAGE_KEY = 'lunmi.declined_chat_requests'

const normalize_accounts = (accounts) => {
  if (!accounts || typeof accounts !== 'object' || Array.isArray(accounts)) return {}
  return Object.fromEntries(Object.entries(accounts)
    .filter(([user_id, keys]) => /^\d+$/.test(user_id) && Array.isArray(keys))
    .map(([user_id, keys]) => [user_id, [...new Set(keys.filter(key => typeof key === 'string' && key))]]))
}

export const read_chat_request_decisions = () => {
  try {
    const value = typeof uni !== 'undefined' ? uni.getStorageSync?.(STORAGE_KEY) : null
    if (value?.version === 1) return {
      declined: normalize_accounts(value.accounts),
      accepted: normalize_accounts(value.accepted_accounts)
    }
  } catch {}
  return { declined: {}, accepted: {} }
}

export const read_declined_chat_state = () => read_chat_request_decisions().declined

export const read_declined_chat_requests = (user_id) => (
  read_declined_chat_state()[`${user_id || ''}`] || []
)

export const read_accepted_chat_requests = (user_id) => (
  read_chat_request_decisions().accepted[`${user_id || ''}`] || []
)

export const restore_chat_request_decisions = (decisions) => {
  const declined = normalize_accounts(decisions?.declined)
  const accepted = normalize_accounts(decisions?.accepted)
  if (!Object.keys(declined).length && !Object.keys(accepted).length) return true
  try {
    if (typeof uni === 'undefined' || typeof uni.setStorageSync !== 'function') return false
    uni.setStorageSync(STORAGE_KEY, { version: 1, accounts: declined, accepted_accounts: accepted })
    return JSON.stringify(read_chat_request_decisions()) === JSON.stringify({ declined, accepted })
  } catch { return false }
}

export const restore_declined_chat_state = (accounts) => restore_chat_request_decisions({
  ...read_chat_request_decisions(), declined: accounts
})

const save_choice = (user_id, request_key, choice) => {
  const id = `${user_id || ''}`.trim()
  if (!/^\d+$/.test(id) || !request_key) return false
  const decisions = read_chat_request_decisions()
  const other = choice === 'accepted' ? 'declined' : 'accepted'
  decisions[choice][id] = [...new Set([...(decisions[choice][id] || []), request_key])]
  decisions[other][id] = (decisions[other][id] || []).filter(key => key !== request_key)
  return restore_chat_request_decisions(decisions)
}

export const decline_chat_request = (user_id, request_key) => save_choice(user_id, request_key, 'declined')
export const accept_chat_request = (user_id, request_key) => save_choice(user_id, request_key, 'accepted')

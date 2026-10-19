import { watch } from 'vue'
import { storeGlobal } from '@/stores/store'
import { selectUserBalance } from '@/api/common'
import { API_BASE_URL } from '@/config/api'
import { send_ios_message, subscribe_ios_message } from './iosBridge.js'
import { IOS_MESSAGE_TYPE } from './iosMessageTypes.js'

let refresh_sequence = 0
let registered = false
const purchase_refreshes = new Map()

const parse_balance = (data) => {
  const raw = data && typeof data === 'object' ? data.userBalance ?? data.balance : data
  if (raw === null || raw === undefined || typeof raw === 'boolean' || `${raw}`.trim() === '') return null
  const balance = Number(raw)
  return Number.isFinite(balance) && balance >= 0 ? balance : null
}

export const refresh_account_coin_balance = async (request_context = null) => {
  const store = storeGlobal()
  const user_id = `${store.userId || ''}`
  const token = store.token
  if (!user_id || !token) return false
  const sequence = ++refresh_sequence
  const result = await selectUserBalance({}, request_context)
  if (sequence !== refresh_sequence || `${store.userId || ''}` !== user_id || store.token !== token || !result.success) return false
  const balance = parse_balance(result.data)
  if (balance === null) return false
  store.setBalance(balance)
  store.updateUserInfo({ userBalance: balance })
  return true
}

export const refresh_credited_purchase = (result) => {
  const store = storeGlobal()
  const user_id = `${result.userId || result.user_id || ''}`
  const transaction_id = `${result.transactionId || result.transaction_id || ''}`
  if (result.verified !== true || result.credited !== true || !transaction_id || user_id !== `${store.userId || ''}` || !store.token) return Promise.resolve(false)
  const key = `${user_id}:${transaction_id}`
  if (!purchase_refreshes.has(key)) {
    const pending = refresh_account_coin_balance().then((success) => {
      if (!success) purchase_refreshes.delete(key)
      return success
    }).catch(() => {
      purchase_refreshes.delete(key);
      return false
    })
    purchase_refreshes.set(key, pending)
    if (purchase_refreshes.size > 100) purchase_refreshes.delete(purchase_refreshes.keys().next().value)
  }
  return purchase_refreshes.get(key)
}

export const sync_ios_purchase_session = () => {
  const store = storeGlobal()
  send_ios_message(IOS_MESSAGE_TYPE.PURCHASE_SESSION_UPDATE, { userId: store.userId || '', token: store.token || '', apiBaseURL: API_BASE_URL })
}

export const register_coin_purchase_sync = () => {
  if (registered) return
  registered = true
  subscribe_ios_message(IOS_MESSAGE_TYPE.PURCHASE_SUCCESS, ({ data }) => { void refresh_credited_purchase(data) })
  watch(() => [storeGlobal().userId, storeGlobal().token], () => {
    refresh_sequence += 1
    purchase_refreshes.clear()
    sync_ios_purchase_session()
  }, { immediate: true, flush: 'sync' })
}

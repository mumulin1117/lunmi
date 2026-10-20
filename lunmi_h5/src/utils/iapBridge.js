import {
  has_ios_message_handler,
  send_ios_message,
  subscribe_ios_message
} from './iosBridge.js'
import {
  IOS_IAP_CALLBACK_RECEIVER_NAME,
  IOS_IAP_CALLBACK_TIMEOUT_MS,
  IOS_IAP_PURCHASE_TIMEOUT_MS,
  IOS_IAP_REQUEST_HANDLER_NAME,
  IOS_MESSAGE_TYPE
} from './iosMessageTypes.js'

export {
  IOS_IAP_CALLBACK_RECEIVER_NAME,
  IOS_IAP_CALLBACK_TIMEOUT_MS,
  IOS_IAP_REQUEST_HANDLER_NAME
} from './iosMessageTypes.js'

const pending_request_map = new Map()
let callback_registered = false

const create_request_id = () => `iap_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
const normalize_iap_field = (value) => (
  value === undefined || value === null ? '' : `${value}`.trim()
)
const iap_fields_match = (left, right) => (
  normalize_iap_field(left) === normalize_iap_field(right)
)
const parse_payload = (payload) => {
  if (typeof payload !== 'string') return payload && typeof payload === 'object' ? payload : {}
  try {
    return JSON.parse(payload)
  } catch {
    return {}
  }
}

const normalize_result = (payload) => {
  const result = parse_payload(payload)
  const data = result.data && typeof result.data === 'object' ? result.data : result
  let status = `${data.status || result.status || data.result || result.result || ''}`.toLowerCase()
  if (!status && data.success === true) status = 'success'
  if (!status && data.success === false) status = 'failed'
  return {
    ...data,
    request_id: data.request_id || data.requestId || '',
    user_id: normalize_iap_field(data.user_id || data.userId),
    package_id: normalize_iap_field(data.package_id || data.packageId),
    product_id: normalize_iap_field(data.product_id || data.productId),
    transaction_id: data.transaction_id || data.transactionId || data.apple_transaction_id || data.appleTransactionId || '',
    purchased_at: data.purchased_at || data.purchasedAt || '',
    verified: data.verified === true || data.verification_status === 'verified' || data.verificationStatus === 'verified',
    status
  }
}

const purchase_error = (result) => {
  const messages = {
    delivery_not_configured: 'Purchases are unavailable until transaction verification is configured.',
    invalid_product: 'This coin package is unavailable.',
    store_unavailable: 'The App Store is unavailable. Please try again.',
    not_logged_in: 'Please log in to buy coins.',
    purchase_busy: 'Another purchase is in progress.',
    unverified_transaction: 'Apple transaction verification failed.',
    account_mismatch: 'The purchase belongs to another account.',
    delivery_pending: 'Your payment is awaiting coin delivery. Please do not purchase again.',
    approval_pending: 'Your purchase is awaiting approval.',
    user_cancelled: 'Purchase was cancelled.',
    consumables_not_restorable: 'Consumed coins cannot be restored. Your balance is linked to your Lunmi account.',
    api_not_configured: 'The account service is not configured.',
    api_unavailable: 'Unable to update your balance. Please try again.'
  }
  if (messages[result.code]) return messages[result.code]
  if (['cancelled', 'canceled'].includes(result.status)) return 'Purchase was cancelled.'
  return result.message || result.errorMessage || result.error_message || 'Purchase failed. Please try again.'
}

const find_pending_request = (result, operation) => {
  if (result.isRecovery === true) return null
  if (result.request_id) {
    const pending_request = pending_request_map.get(result.request_id)
    return pending_request?.operation === operation
      ? { request_id: result.request_id, pending_request }
      : null
  }
  const candidates = [...pending_request_map.entries()]
    .filter(([, pending_request]) => pending_request.operation === operation)
  if (candidates.length !== 1) return null
  const [request_id, pending_request] = candidates[0]
  return { request_id, pending_request }
}

const receive_ios_iap_result = (payload, operation = 'purchase') => {
  const result = normalize_result(payload)
  const matched = find_pending_request(result, operation)
  if (!matched) return false
  const { request_id, pending_request } = matched
  clearTimeout(pending_request.timeout_id)
  pending_request_map.delete(request_id)

  if (result.status !== 'success') {
    pending_request.reject(new Error(purchase_error(result)))
    return true
  }
  if (!result.verified || result.credited !== true) {
    pending_request.reject(new Error('The purchase has not been confirmed as credited.'))
    return true
  }
  const result_user_id = normalize_iap_field(result.user_id)
  const pending_user_id = normalize_iap_field(pending_request.user_id)
  if (result_user_id && pending_user_id && !iap_fields_match(result_user_id, pending_user_id)) {
    pending_request.reject(new Error('Purchase account verification failed.'))
    return true
  }
  if (operation === 'purchase') {
    const result_package_id = normalize_iap_field(result.package_id)
    const result_product_id = normalize_iap_field(result.product_id)
    const transaction_id = normalize_iap_field(result.transaction_id)
    if (!iap_fields_match(result_package_id, pending_request.package_id)) {
      pending_request.reject(new Error('Purchase product verification failed.'))
      return true
    }
    if (!iap_fields_match(result_product_id, pending_request.product_id)) {
      pending_request.reject(new Error('Purchase product verification failed.'))
      return true
    }
    if (!transaction_id) {
      pending_request.reject(new Error('Purchase product verification failed.'))
      return true
    }
  }
  pending_request.resolve({ ...result, operation, request_id: result.request_id || request_id })
  return true
}

const receive_native_result = (operation, status, payload) => receive_ios_iap_result(
  { ...parse_payload(payload), status },
  operation
)

const register_ios_iap_callback = () => {
  if (callback_registered || typeof window === 'undefined') return
  subscribe_ios_message(
    IOS_MESSAGE_TYPE.PURCHASE_SUCCESS,
    (message) => receive_ios_iap_result(message.data, 'purchase')
  )
  subscribe_ios_message(
    IOS_MESSAGE_TYPE.PURCHASE_FAILED,
    (message) => receive_ios_iap_result(message.data, 'purchase')
  )
  subscribe_ios_message(
    IOS_MESSAGE_TYPE.PURCHASE_RESTORE_SUCCESS,
    (message) => receive_ios_iap_result(message.data, 'restore')
  )
  subscribe_ios_message(
    IOS_MESSAGE_TYPE.PURCHASE_RESTORE_FAILED,
    (message) => receive_ios_iap_result(message.data, 'restore')
  )

  const existing_bridge = window[IOS_IAP_CALLBACK_RECEIVER_NAME] || {}
  window[IOS_IAP_CALLBACK_RECEIVER_NAME] = {
    ...existing_bridge,
    purchaseSucceeded: (payload) => receive_native_result('purchase', 'success', payload),
    purchaseFailed: (payload) => receive_native_result('purchase', 'failed', payload),
    purchaseCancelled: (payload) => receive_native_result('purchase', 'cancelled', payload),
    restorePurchasesSucceeded: (payload) => receive_native_result('restore', 'success', payload),
    restorePurchasesFailed: (payload) => receive_native_result('restore', 'failed', payload),
    restorePurchasesCancelled: (payload) => receive_native_result('restore', 'cancelled', payload)
  }
  window.addEventListener('sawme-iap-result', (event) => {
    const result = parse_payload(event.detail)
    receive_ios_iap_result(result, result.operation || 'purchase')
  })
  callback_registered = true
}

const request_ios_iap = (operation, data = {}) => {
  register_ios_iap_callback()
  const request_id = create_request_id()
  const message_type = operation === 'restore'
    ? IOS_MESSAGE_TYPE.PURCHASE_RESTORE_REQUEST
    : IOS_MESSAGE_TYPE.PURCHASE_REQUEST
  const message_data = {
    operation,
    productId: data.product_id || '',
    packageId: data.package_id || '',
    requestId: request_id,
    userId: data.user_id || ''
  }
  const legacy_payload = {
    type: operation === 'restore' ? 'restorePurchases' : 'startPurchase',
    operation,
    request_id,
    requestId: request_id,
    user_id: message_data.userId,
    userId: message_data.userId,
    package_id: message_data.packageId,
    packageId: message_data.packageId,
    product_id: message_data.productId,
    productId: message_data.productId
  }

  return new Promise((resolve, reject) => {
    const timeout_id = setTimeout(() => {
      pending_request_map.delete(request_id)
      reject(new Error('Purchase confirmation is taking longer than expected. Check your balance before trying again.'))
    }, IOS_IAP_PURCHASE_TIMEOUT_MS)
    pending_request_map.set(request_id, {
      resolve,
      reject,
      timeout_id,
      operation,
      package_id: normalize_iap_field(data.package_id),
      product_id: normalize_iap_field(data.product_id),
      user_id: normalize_iap_field(data.user_id)
    })
    const sent = send_ios_message(message_type, message_data, {
      fallback_handler_name: IOS_IAP_REQUEST_HANDLER_NAME,
      fallback_payload: legacy_payload
    })
    if (!sent) {
      clearTimeout(timeout_id)
      pending_request_map.delete(request_id)
      reject(new Error('Apple in-app purchases are available only in the iOS app.'))
    }
  })
}

export const request_ios_coin_purchase = ({ user_id, package_id, product_id } = {}) => (
  request_ios_iap('purchase', { user_id, package_id, product_id })
)

export const request_ios_purchase_restore = ({ user_id } = {}) => (
  request_ios_iap('restore', { user_id })
)

export { receive_ios_iap_result }

export const request_ios_coin_products = (packages) => {
  if (!has_ios_message_handler()) return Promise.resolve(null)
  const request_id = create_request_id()
  return new Promise((resolve, reject) => {
    let timer
    const unsubscribe = subscribe_ios_message(IOS_MESSAGE_TYPE.PRODUCTS_RESULT, ({ data }) => {
      if (data.requestId !== request_id) return
      clearTimeout(timer)
      unsubscribe()
      if (data.success !== true || !Array.isArray(data.products)) reject(new Error('The App Store is unavailable. Please try again.'))
      else resolve(data.products)
    })
    timer = setTimeout(() => {
      unsubscribe();
      reject(new Error('The App Store is unavailable. Please try again.'))
    }, IOS_IAP_CALLBACK_TIMEOUT_MS)
    if (!send_ios_message(IOS_MESSAGE_TYPE.PRODUCTS_REQUEST, { requestId: request_id, productIds: packages.map((item) => item.product_id) })) {
      clearTimeout(timer)
      unsubscribe()
      reject(new Error('The App Store is unavailable. Please try again.'))
    }
  })
}

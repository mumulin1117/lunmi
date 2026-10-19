import assert from 'node:assert/strict'
import test from 'node:test'

const setup_window = () => {
  const listeners = new Map()
  globalThis.window = {
    addEventListener: (name, handler) => {
      const set = listeners.get(name) || new Set()
      set.add(handler)
      listeners.set(name, set)
    },
    webkit: { messageHandlers: { CommonTemplateBridge: { postMessage() {} } } }
  }
  return listeners
}

test('iap purchase accepts numeric userId and string pending user_id', async () => {
  setup_window()
  const { request_ios_coin_purchase, receive_ios_iap_result } = await import('../src/utils/iapBridge.js')
  const purchase_promise = request_ios_coin_purchase({
    user_id: '700828858110021',
    package_id: 'coins_2450',
    product_id: 'com.lunmi.coins.2450'
  })
  const handled = receive_ios_iap_result({
    status: 'success',
    verified: true,
    credited: true,
    userId: 700828858110021,
    packageId: 'coins_2450',
    productId: 'com.lunmi.coins.2450',
    transactionId: 'apple-tx-1'
  }, 'purchase')
  assert.equal(handled, true)
  const result = await purchase_promise
  assert.equal(result.transaction_id, 'apple-tx-1')
})

test('iap purchase succeeds when native callback omits user_id', async () => {
  setup_window()
  const { request_ios_coin_purchase, receive_ios_iap_result } = await import('../src/utils/iapBridge.js?v=' + Date.now())
  const purchase_promise = request_ios_coin_purchase({
    user_id: 42,
    package_id: 'pkg',
    product_id: 'prod'
  })
  const handled = receive_ios_iap_result({
    status: 'success',
    verified: true,
    credited: true,
    package_id: 'pkg',
    product_id: 'prod',
    transaction_id: 'tx-local'
  }, 'purchase')
  assert.equal(handled, true)
  await purchase_promise
})

test('iap purchase rejects mismatched user_id', async () => {
  setup_window()
  const { request_ios_coin_purchase, receive_ios_iap_result } = await import('../src/utils/iapBridge.js?v=' + Date.now())
  const purchase_promise = request_ios_coin_purchase({
    user_id: 42,
    package_id: 'pkg',
    product_id: 'prod'
  })
  receive_ios_iap_result({
    status: 'success',
    verified: true,
    credited: true,
    user_id: 99,
    transaction_id: 'tx-2'
  }, 'purchase')
  await assert.rejects(purchase_promise, /Purchase account verification failed/)
})

test('only verified and credited transactions with the requested product can complete a purchase', async () => {
  setup_window()
  const bridge = await import('../src/utils/iapBridge.js?checks=' + Date.now())
  for (const change of [{ verified: false }, { credited: false }, { productId: 'wrong' }, { transactionId: '' }]) {
    const pending = bridge.request_ios_coin_purchase({ user_id: 42, package_id: 'pkg', product_id: 'prod' })
    bridge.receive_ios_iap_result({ status: 'success', verified: true, credited: true, userId: 42, packageId: 'pkg', productId: 'prod', transactionId: 'tx', ...change })
    await assert.rejects(pending, /confirmed|verification/)
  }
})

test('stale request IDs cannot complete a new purchase and cancellation never counts as success', async () => {
  setup_window()
  const requests = []
  window.webkit.messageHandlers.CommonTemplateBridge.postMessage = (message) => requests.push(message)
  const bridge = await import('../src/utils/iapBridge.js?stale=' + Date.now())
  const pending = bridge.request_ios_coin_purchase({ user_id: 42, package_id: 'pkg', product_id: 'prod' })
  assert.equal(bridge.receive_ios_iap_result({ requestId: 'old', status: 'success', verified: true, credited: true }), false)
  assert.equal(bridge.receive_ios_iap_result({ isRecovery: true, status: 'success', verified: true, credited: true, userId: 42, productId: 'prod', packageId: 'pkg', transactionId: 'recovered' }), false)
  bridge.receive_ios_iap_result({ requestId: requests[0].data.requestId, status: 'cancelled', code: 'user_cancelled' })
  await assert.rejects(pending, /cancelled/)
})

test('unavailable bridge fails immediately and App Store product replies preserve localized prices', async () => {
  setup_window()
  const bridge = await import('../src/utils/iapBridge.js?products=' + Date.now())
  delete window.webkit.messageHandlers.CommonTemplateBridge
  await assert.rejects(bridge.request_ios_coin_purchase({ user_id: 42, package_id: 'pkg', product_id: 'prod' }), /only in the iOS app/)
  const { receive_ios_message } = await import('../src/utils/iosBridge.js')
  window.webkit.messageHandlers.CommonTemplateBridge = { postMessage(message) {
    receive_ios_message({ type: 'APP_PRODUCTS_RESULT', data: { requestId: message.data.requestId, success: true, products: [{ productId: 'prod', displayPrice: '¥150', available: true }] } })
  } }
  const products = await bridge.request_ios_coin_products([{ product_id: 'prod' }])
  assert.equal(products[0].displayPrice, '¥150')
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { reactive } from 'vue'
import { import_source } from './api-test-helpers.mjs'

const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { resolve, promise }
}
const setup = async (request) => {
  const store = reactive({
    userId: 42, token: 'session', balance: 20, userInfo: { userId: 42 },
    setBalance(value) { this.balance = value },
    updateUserInfo(value) { Object.assign(this.userInfo, value) }
  })
  const key = '__purchase_sync_' + Math.random().toString(36).slice(2)
  globalThis[key] = { store, request }
  const sync = await import_source('src/utils/coinPurchaseSync.js', [
    ["import { storeGlobal } from '@/stores/store'", `const storeGlobal = () => globalThis.${key}.store`],
    ["import { selectUserBalance } from '@/api/common'", `const selectUserBalance = () => globalThis.${key}.request()`],
    ["import { API_BASE_URL } from '@/config/api'", "const API_BASE_URL = 'https://api.example.test'"],
    ["from 'vue'", `from '${import.meta.resolve('vue')}'`],
    ["from './iosBridge.js'", `from '${new URL('../src/utils/iosBridge.js', import.meta.url).href}'`],
    ["from './iosMessageTypes.js'", `from '${new URL('../src/utils/iosMessageTypes.js', import.meta.url).href}'`]
  ])
  return { store, sync, cleanup: () => { delete globalThis[key] } }
}

test('confirmed native callbacks refresh once from the server instead of adding coins locally', async () => {
  let reads = 0
  const { store, sync, cleanup } = await setup(async () => { reads += 1; return { success: true, data: 300 } })
  try {
    const result = { verified: true, credited: true, transactionId: 'tx1', userId: 42, balance: 99999 }
    await Promise.all([sync.refresh_credited_purchase(result), sync.refresh_credited_purchase(result)])
    assert.equal(reads, 1)
    assert.equal(store.balance, 300)
    assert.equal(store.userInfo.userBalance, 300)
    assert.equal(await sync.refresh_credited_purchase({ ...result, transactionId: 'other', userId: 99 }), false)
    assert.equal(await sync.refresh_credited_purchase({ ...result, credited: false }), false)
    assert.equal(reads, 1)
  } finally { cleanup() }
})

test('late balance responses cannot overwrite a newer refresh or a different login session', async () => {
  const first = deferred()
  const second = deferred()
  let reads = 0
  const { store, sync, cleanup } = await setup(() => (++reads === 1 ? first.promise : second.promise))
  try {
    const old = sync.refresh_account_coin_balance()
    const recent = sync.refresh_account_coin_balance()
    second.resolve({ success: true, data: 580 })
    await recent
    first.resolve({ success: true, data: 20 })
    await old
    assert.equal(store.balance, 580)
    const pending = deferred()
    const other = await setup(() => pending.promise)
    const refresh = other.sync.refresh_account_coin_balance()
    other.store.userId = 99
    pending.resolve({ success: true, data: 900 })
    await refresh
    assert.equal(other.store.balance, 20)
    other.cleanup()
  } finally { cleanup() }
})

test('failed balance reads preserve the visible balance and can be retried', async () => {
  let reads = 0
  const { store, sync, cleanup } = await setup(async () => ++reads === 1 ? { success: false } : { success: true, data: 0 })
  try {
    const result = { verified: true, credited: true, transactionId: 'tx2', userId: 42 }
    assert.equal(await sync.refresh_credited_purchase(result), false)
    assert.equal(store.balance, 20)
    assert.equal(await sync.refresh_credited_purchase(result), true)
    assert.equal(store.balance, 0)
  } finally { cleanup() }
})

test('all seven configured packages match the supplied IDs, coins and ascending USD prices', async () => {
  const { coin_packages } = JSON.parse(await readFile(new URL('../static/config/coin-packages.json', import.meta.url), 'utf8'))
  assert.deepEqual(coin_packages.map((p) => [p.price_amount, p.coin_count, p.product_id]), [
    [0.99, 280, 'rmbsziwbnslhsddk'], [1.99, 560, 'pleaimfvbtyjtyjz'], [4.99, 1400, 'osmjqvwjzzerocwd'],
    [9.99, 2800, 'rxtsdinlflyesgik'], [19.99, 5600, 'lklakechsrphypay'], [49.99, 14050, 'bwibfrpuysevpeqb'], [99.99, 28300, 'nejagbiggkbeoncm']
  ])
  const { load_coin_package_config } = await import('../src/utils/coinPackageConfig.js')
  globalThis.document = { baseURI: 'http://127.0.0.1:19731/' }
  globalThis.uni = { request(options) { options.success({ statusCode: 200, data: { coin_packages: [...coin_packages].reverse() } }) } }
  try { assert.deepEqual((await load_coin_package_config()).coin_packages.map((p) => p.price_amount), coin_packages.map((p) => p.price_amount)) }
  finally { delete globalThis.uni; delete globalThis.document }
})

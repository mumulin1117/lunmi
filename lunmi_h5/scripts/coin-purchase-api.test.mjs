import assert from 'node:assert/strict'
import test from 'node:test'
import { envelope, load_api } from './api-test-helpers.mjs'
import {
  BALANCE_CHANGE_EXPENSE,
  BALANCE_CHANGE_INCOME,
  build_expense_balance_record_params,
  build_recharge_balance_record_params,
  build_update_user_balance_params,
  next_balance_after_expense,
  next_balance_after_recharge,
  plan_balance_consumption,
  read_balance_after_update
} from '../src/utils/coinPurchasePresentation.js'
import {
  BOOST_COIN_COST,
  build_lantern_boost_record_params,
  plan_lantern_boost_consumption
} from '../src/utils/releaseLanternPresentation.js'

test('recharge balance math and payload builders match the documented fields', () => {
  assert.equal(next_balance_after_expense(500, 100), 400)
  assert.equal(next_balance_after_expense(50, 100), 0)
  assert.equal(next_balance_after_recharge(480, 2450), 2930)
  assert.deepEqual(build_update_user_balance_params({ balance: 2930 }), { balance: 2930 })
  assert.deepEqual(build_recharge_balance_record_params({
    user_id: 42,
    coin_count: 2450,
    balance_current: 2930,
    balance_content: '2,450 Coins',
    bundle_id: 'com.example.app'
  }), {
    balanceVal: 2450,
    balanceCurrent: 2930,
    changeType: BALANCE_CHANGE_INCOME,
    balanceContent: '2,450 Coins',
    bundleId: 'com.example.app',
    userId: 42
  })
  assert.equal(
    build_recharge_balance_record_params({ coin_count: 100, balance_current: 100 }).balanceContent,
    'Buy coins'
  )
  assert.deepEqual(build_expense_balance_record_params({
    user_id: 7,
    coin_count: 100,
    balance_current: 400,
    balance_content: 'Lantern boost'
  }), {
    balanceVal: 100,
    balanceCurrent: 400,
    changeType: BALANCE_CHANGE_EXPENSE,
    balanceContent: 'Lantern boost',
    bundleId: '',
    userId: 7
  })
  assert.deepEqual(plan_balance_consumption({
    cached_balance: 500,
    coin_count: 100
  }), {
    balance_after: 400,
    update_balance_params: { balance: 400 }
  })
  assert.deepEqual(plan_lantern_boost_consumption({
    cached_balance: 500,
    boost_cost: BOOST_COIN_COST
  }), {
    balance_after: 400,
    update_balance_params: { balance: 400 }
  })
  assert.deepEqual(build_lantern_boost_record_params({
    user_id: 7,
    boost_cost: BOOST_COIN_COST,
    balance_after: 400
  }), {
    balanceVal: BOOST_COIN_COST,
    balanceCurrent: 400,
    changeType: BALANCE_CHANGE_EXPENSE,
    balanceContent: 'Lantern boost',
    bundleId: '',
    userId: 7
  })
  assert.equal(read_balance_after_update({ success: true, data: 395 }, 400), 395)
  assert.equal(read_balance_after_update({ success: true, data: null }, 400), 400)
  assert.equal(read_balance_after_update({ success: false }, 400), null)
})

test('updateUserBalance and addUserBalanceRecord call the documented endpoints', async () => {
  const { api, calls } = await load_api('src/api/common.js', () => envelope(200000, {}))
  const balance_result = await api.updateUserBalance({ balance: 2930 })
  assert.equal(balance_result.success, true)
  assert.equal(calls[0].endpoint, '/api/updateUserBalance')
  assert.deepEqual(calls[0].data, { balance: 2930 })

  const record_result = await api.addUserBalanceRecord({
    balanceVal: 2450,
    balanceCurrent: 2930,
    changeType: 1,
    balanceContent: 'Buy coins',
    bundleId: 'com.example.app',
    userId: 42
  })
  assert.equal(record_result.success, true)
  assert.equal(calls[1].endpoint, '/api/addUserBalanceRecord')
  assert.equal(calls[1].data.changeType, 1)
  assert.equal(calls[1].data.balanceVal, 2450)
})

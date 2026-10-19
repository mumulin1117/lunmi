import assert from 'node:assert/strict'
import test from 'node:test'
import { envelope, load_api } from './api-test-helpers.mjs'
import {
  ATTEMPT_MODULE_TYPE,
  SCOOP_ATTEMPT_COIN_COST,
  SCOOP_ATTEMPT_PACK,
  build_consume_scoop_attempt_params,
  build_persist_purchased_scoop_remaining_params,
  build_save_scoop_attempts_params,
  build_scoop_attempt_purchase_record_params,
  can_afford_scoop_attempt,
  map_attempt_record,
  plan_scoop_attempt_purchase_consumption,
  read_scoop_remaining,
  scoop_remaining_after_purchase_start,
  SCOOP_ATTEMPT_BALANCE_CONTENT,
  WISH_FIND_ATTEMPT_BALANCE_CONTENT,
  WISH_FIND_ATTEMPT_COIN_COST,
  WISH_FIND_ATTEMPT_PACK,
  build_consume_wish_find_attempt_params,
  build_persist_purchased_wish_find_remaining_params,
  build_save_wish_find_attempts_params,
  build_wish_find_attempt_purchase_record_params,
  plan_wish_find_attempt_purchase_consumption,
  wish_find_remaining_after_purchase_start
} from '../src/utils/lanternHomePresentation.js'
import { BALANCE_CHANGE_EXPENSE } from '../src/utils/coinPurchasePresentation.js'

test('attempt records map moduleType 1 remaining fields', () => {
  const mapped = map_attempt_record({
    records: [{
      userModuleDataId: 8,
      userId: 3,
      moduleType: 1,
      commonField1: 0,
      commonField2: 2
    }]
  })
  assert.equal(mapped.user_module_data_id, 8)
  assert.equal(mapped.scoop_remaining, 0)
  assert.equal(mapped.wish_find_remaining, 2)
  assert.equal(read_scoop_remaining({ records: [] }), 0)
  assert.equal(can_afford_scoop_attempt(99, SCOOP_ATTEMPT_COIN_COST), false)
  assert.equal(can_afford_scoop_attempt(100, SCOOP_ATTEMPT_COIN_COST), true)
})

test('attempt records accept commonFieldOne and commonFieldTwo from selectLmUserModuleDataPage', () => {
  const mapped = map_attempt_record({
    records: [{
      userModuleDataId: 857963335106629,
      userId: 857705160659013,
      moduleType: 1,
      commonFieldOne: 3,
      commonFieldTwo: 3
    }]
  })
  assert.equal(mapped.scoop_remaining, 3)
  assert.equal(mapped.wish_find_remaining, 3)
})

test('consume scoop attempt only sends userModuleDataId and commonFieldOne', () => {
  assert.deepEqual(build_consume_scoop_attempt_params({
    user_module_data_id: 857963335106629,
    next_scoop_remaining: 2
  }), {
    userModuleDataId: 857963335106629,
    commonFieldOne: 2
  })
})

test('save scoop attempts keeps wish finds and documented module fields', () => {
  assert.deepEqual(build_save_scoop_attempts_params({
    attempt_record: {
      user_module_data_id: 8,
      wish_find_remaining: 2,
      user_id: 3
    },
    user_id: 3,
    next_scoop_remaining: SCOOP_ATTEMPT_PACK
  }), {
    moduleType: ATTEMPT_MODULE_TYPE,
    commonFieldOne: SCOOP_ATTEMPT_PACK,
    commonFieldTwo: 2,
    userId: 3,
    userModuleDataId: 8
  })
})

test('persist purchased scoop remaining writes commonFieldOne on the module row', () => {
  assert.deepEqual(build_persist_purchased_scoop_remaining_params({
    attempt_record: { user_module_data_id: 857963335106629, wish_find_remaining: 2 },
    scoop_remaining: 2
  }), {
    userModuleDataId: 857963335106629,
    commonFieldOne: 2
  })
})

test('purchase pack grants three scoops and leaves two after an immediate start', () => {
  assert.equal(SCOOP_ATTEMPT_PACK, 3)
  assert.equal(scoop_remaining_after_purchase_start(0), 2)
  assert.equal(scoop_remaining_after_purchase_start(1), 3)
})

test('consume wish find attempt only sends userModuleDataId and commonFieldTwo', () => {
  assert.deepEqual(build_consume_wish_find_attempt_params({
    user_module_data_id: 857963335106629,
    next_wish_find_remaining: 1
  }), {
    userModuleDataId: 857963335106629,
    commonFieldTwo: 1
  })
})

test('save wish find attempts keeps scoop count and documented module fields', () => {
  assert.deepEqual(build_save_wish_find_attempts_params({
    attempt_record: {
      user_module_data_id: 8,
      scoop_remaining: 3,
      user_id: 3
    },
    user_id: 3,
    next_wish_find_remaining: WISH_FIND_ATTEMPT_PACK
  }), {
    moduleType: ATTEMPT_MODULE_TYPE,
    commonFieldOne: 3,
    commonFieldTwo: WISH_FIND_ATTEMPT_PACK,
    userId: 3,
    userModuleDataId: 8
  })
})

test('persist purchased wish find remaining writes commonFieldTwo on the module row', () => {
  assert.deepEqual(build_persist_purchased_wish_find_remaining_params({
    attempt_record: { user_module_data_id: 857963335106629, scoop_remaining: 1 },
    wish_find_remaining: 2
  }), {
    userModuleDataId: 857963335106629,
    commonFieldTwo: 2
  })
})

test('wish find purchase pack grants three finds and leaves two after an immediate start', () => {
  assert.equal(WISH_FIND_ATTEMPT_PACK, 3)
  assert.equal(wish_find_remaining_after_purchase_start(0), 2)
  assert.equal(wish_find_remaining_after_purchase_start(1), 3)
})

test('wish find purchase plans balance deduction and expense record', () => {
  const consumption = plan_wish_find_attempt_purchase_consumption({
    cached_balance: 250,
    find_cost: WISH_FIND_ATTEMPT_COIN_COST
  })
  assert.equal(consumption.balance_after, 150)
  assert.deepEqual(build_wish_find_attempt_purchase_record_params({
    user_id: 3,
    find_cost: WISH_FIND_ATTEMPT_COIN_COST,
    balance_after: 150
  }), {
    balanceVal: WISH_FIND_ATTEMPT_COIN_COST,
    balanceCurrent: 150,
    changeType: BALANCE_CHANGE_EXPENSE,
    balanceContent: WISH_FIND_ATTEMPT_BALANCE_CONTENT,
    bundleId: '',
    userId: 3
  })
})

test('home queries remaining attempts and saves the documented module row', async () => {
  const user_module = await load_api('src/api/userModule.js', (options) => {
    if (options.endpoint.includes('selectLmUserModuleDataPage')) {
      return envelope(200000, {
        records: [{
          userModuleDataId: 8,
          userId: 3,
          moduleType: 1,
          commonField1: 0,
          commonField2: 2
        }]
      })
    }
    return envelope(200000, {})
  })
  const page_result = await user_module.api.selectLmUserModuleDataPage({
    current: 1,
    size: 20,
    moduleType: ATTEMPT_MODULE_TYPE,
    userId: 3
  })
  assert.equal(page_result.success, true)
  assert.equal(user_module.calls[0].endpoint, '/sj/lunmi/selectLmUserModuleDataPage')
  assert.equal(user_module.calls[0].data.moduleType, 1)

  const save_result = await user_module.api.saveLmUserModuleData(build_save_scoop_attempts_params({
    attempt_record: map_attempt_record(page_result.data),
    user_id: 3,
    next_scoop_remaining: SCOOP_ATTEMPT_PACK
  }))
  assert.equal(save_result.success, true)
  assert.equal(user_module.calls[1].endpoint, '/sj/lunmi/saveLmUserModuleData')
  assert.equal(user_module.calls[1].data.commonFieldOne, SCOOP_ATTEMPT_PACK)
  assert.equal(user_module.calls[1].data.commonFieldTwo, 2)
  assert.equal(user_module.calls[1].data.userModuleDataId, 8)
})

test('purchase checks the documented wallet endpoint', async () => {
  const common_api = await load_api('src/api/common.js', () => envelope(200000, { userBalance: 40 }))
  const result = await common_api.api.selectUserBalance({})
  assert.equal(result.success, true)
  assert.equal(common_api.calls[0].endpoint, '/api/selectUserBalance')
  assert.equal(can_afford_scoop_attempt(result.data.userBalance), false)
})

test('scoop purchase plans balance deduction and expense record', () => {
  const consumption = plan_scoop_attempt_purchase_consumption({
    cached_balance: 250,
    scoop_cost: SCOOP_ATTEMPT_COIN_COST
  })
  assert.equal(consumption.balance_after, 150)
  assert.deepEqual(consumption.update_balance_params, { balance: 150 })
  assert.deepEqual(build_scoop_attempt_purchase_record_params({
    user_id: 3,
    scoop_cost: SCOOP_ATTEMPT_COIN_COST,
    balance_after: 150
  }), {
    balanceVal: SCOOP_ATTEMPT_COIN_COST,
    balanceCurrent: 150,
    changeType: BALANCE_CHANGE_EXPENSE,
    balanceContent: SCOOP_ATTEMPT_BALANCE_CONTENT,
    bundleId: '',
    userId: 3
  })
})

test('scoop purchase updates balance and writes a record', async () => {
  const common_api = await load_api('src/api/common.js', (options) => {
    if (options.endpoint === '/api/updateUserBalance') {
      return envelope(200000, { userBalance: 150 })
    }
    if (options.endpoint === '/api/addUserBalanceRecord') {
      return envelope(200000, {})
    }
    return envelope(200000, { userBalance: 250 })
  })
  const consumption = plan_scoop_attempt_purchase_consumption({ cached_balance: 250 })
  const update_result = await common_api.api.updateUserBalance(consumption.update_balance_params)
  assert.equal(update_result.success, true)
  assert.equal(common_api.calls[0].endpoint, '/api/updateUserBalance')
  assert.equal(common_api.calls[0].data.balance, 150)
  const record_result = await common_api.api.addUserBalanceRecord(build_scoop_attempt_purchase_record_params({
    user_id: 3,
    balance_after: 150
  }))
  assert.equal(record_result.success, true)
  assert.equal(common_api.calls[1].endpoint, '/api/addUserBalanceRecord')
  assert.equal(common_api.calls[1].data.changeType, BALANCE_CHANGE_EXPENSE)
  assert.equal(common_api.calls[1].data.balanceVal, SCOOP_ATTEMPT_COIN_COST)
})

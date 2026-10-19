import {
  build_expense_balance_record_params,
  plan_balance_consumption
} from './coinPurchasePresentation.js'

export const ATTEMPT_MODULE_TYPE = 1

export const SCOOP_ATTEMPT_COIN_COST = 100

export const SCOOP_ATTEMPT_PACK = 3

export const SCOOP_ATTEMPTS_USED_WHEN_STARTING = 1

export const SCOOP_ATTEMPT_BALANCE_CONTENT = 'Buy 3 scoop attempts'

export const scoop_remaining_after_purchase = (current_remaining = 0) => (
  read_count(current_remaining) + SCOOP_ATTEMPT_PACK
)

export const WISH_FIND_ATTEMPT_COIN_COST = SCOOP_ATTEMPT_COIN_COST

export const WISH_FIND_ATTEMPT_PACK = SCOOP_ATTEMPT_PACK

export const WISH_FIND_ATTEMPTS_USED_WHEN_STARTING = SCOOP_ATTEMPTS_USED_WHEN_STARTING

export const WISH_FIND_ATTEMPT_BALANCE_CONTENT = 'Buy 3 find wish attempts'

/** 购买整包并立刻开始捞灯后，应写入模块的剩余次数。 */
export const scoop_remaining_after_purchase_start = (current_remaining = 0) => {
  const next = read_count(current_remaining) + SCOOP_ATTEMPT_PACK - SCOOP_ATTEMPTS_USED_WHEN_STARTING
  return Math.max(0, next)
}

/** 购买整包并立刻开始找愿望后，应写入模块的剩余次数（commonFieldTwo）。 */
export const wish_find_remaining_after_purchase_start = (current_remaining = 0) => {
  const next = read_count(current_remaining) + WISH_FIND_ATTEMPT_PACK - WISH_FIND_ATTEMPTS_USED_WHEN_STARTING
  return Math.max(0, next)
}

export const plan_scoop_attempt_purchase_consumption = ({
  cached_balance = 0,
  scoop_cost = SCOOP_ATTEMPT_COIN_COST
} = {}) => plan_balance_consumption({
  cached_balance,
  coin_count: scoop_cost
})

export const build_scoop_attempt_purchase_record_params = ({
  user_id = '',
  scoop_cost = SCOOP_ATTEMPT_COIN_COST,
  balance_after = 0
} = {}) => build_expense_balance_record_params({
  user_id,
  coin_count: scoop_cost,
  balance_current: balance_after,
  balance_content: SCOOP_ATTEMPT_BALANCE_CONTENT
})

export const plan_wish_find_attempt_purchase_consumption = ({
  cached_balance = 0,
  find_cost = WISH_FIND_ATTEMPT_COIN_COST
} = {}) => plan_balance_consumption({
  cached_balance,
  coin_count: find_cost
})

export const build_wish_find_attempt_purchase_record_params = ({
  user_id = '',
  find_cost = WISH_FIND_ATTEMPT_COIN_COST,
  balance_after = 0
} = {}) => build_expense_balance_record_params({
  user_id,
  coin_count: find_cost,
  balance_current: balance_after,
  balance_content: WISH_FIND_ATTEMPT_BALANCE_CONTENT
})

const read_id = (value) => {
  if (value === 0 || value === '0') return value
  if (value == null || value === '') return ''
  return value
}

const read_count = (value) => {
  const remaining = Number(value)
  if (!Number.isFinite(remaining)) return 0
  return Math.max(0, remaining)
}

const MODULE_COMMON_FIELD_WORDS = Object.freeze(['One', 'Two', 'Three', 'Four'])

/** 读取模块扩展字段；响应可能是 commonField1 或 commonFieldOne。 */
export const read_module_common_field = (record = {}, field_index = 1) => {
  const index = Number(field_index)
  if (!Number.isInteger(index) || index < 1 || index > MODULE_COMMON_FIELD_WORDS.length) return undefined
  const digit_key = `commonField${index}`
  const word_key = `commonField${MODULE_COMMON_FIELD_WORDS[index - 1]}`
  if (record[digit_key] !== undefined && record[digit_key] !== null) return record[digit_key]
  if (record[word_key] !== undefined && record[word_key] !== null) return record[word_key]
  return undefined
}

export const map_attempt_record = (page) => {
  const records = Array.isArray(page?.records) ? page.records : []
  const record = records.find((item) => Number(item.moduleType) === ATTEMPT_MODULE_TYPE) || null
  if (!record) {
    return {
      user_module_data_id: '',
      scoop_remaining: 0,
      wish_find_remaining: 0,
      user_id: ''
    }
  }
  return {
    user_module_data_id: read_id(record.userModuleDataId),
    scoop_remaining: read_count(read_module_common_field(record, 1)),
    wish_find_remaining: read_count(read_module_common_field(record, 2)),
    user_id: read_id(record.userId)
  }
}

export const read_scoop_remaining = (page) => map_attempt_record(page).scoop_remaining

export const can_afford_scoop_attempt = (coin_balance, cost = SCOOP_ATTEMPT_COIN_COST) => (
  Number(coin_balance) >= Number(cost)
)

export const can_afford_wish_find_attempt = (coin_balance, cost = WISH_FIND_ATTEMPT_COIN_COST) => (
  can_afford_scoop_attempt(coin_balance, cost)
)

export const build_consume_scoop_attempt_params = ({
  user_module_data_id = '',
  next_scoop_remaining = 0
} = {}) => {
  const params = {
    commonFieldOne: read_count(next_scoop_remaining)
  }
  const record_id = read_id(user_module_data_id)
  if (record_id !== '' && record_id != null) params.userModuleDataId = record_id
  return params
}

export const build_consume_wish_find_attempt_params = ({
  user_module_data_id = '',
  next_wish_find_remaining = 0
} = {}) => {
  const params = {
    commonFieldTwo: read_count(next_wish_find_remaining)
  }
  const record_id = read_id(user_module_data_id)
  if (record_id !== '' && record_id != null) params.userModuleDataId = record_id
  return params
}

export const build_save_scoop_attempts_params = ({
  attempt_record = null,
  user_id = '',
  next_scoop_remaining = 0
} = {}) => {
  const params = {
    moduleType: ATTEMPT_MODULE_TYPE,
    commonFieldOne: read_count(next_scoop_remaining),
    commonFieldTwo: read_count(attempt_record?.wish_find_remaining || 0)
  }
  const owner_user_id = user_id !== '' && user_id != null
    ? user_id
    : attempt_record?.user_id
  if (owner_user_id !== '' && owner_user_id != null) params.userId = owner_user_id
  const record_id = attempt_record?.user_module_data_id
  if (record_id !== '' && record_id != null) params.userModuleDataId = record_id
  return params
}

export const build_save_wish_find_attempts_params = ({
  attempt_record = null,
  user_id = '',
  next_wish_find_remaining = 0
} = {}) => {
  const params = {
    moduleType: ATTEMPT_MODULE_TYPE,
    commonFieldOne: read_count(attempt_record?.scoop_remaining || 0),
    commonFieldTwo: read_count(next_wish_find_remaining)
  }
  const owner_user_id = user_id !== '' && user_id != null
    ? user_id
    : attempt_record?.user_id
  if (owner_user_id !== '' && owner_user_id != null) params.userId = owner_user_id
  const record_id = attempt_record?.user_module_data_id
  if (record_id !== '' && record_id != null) params.userModuleDataId = record_id
  return params
}

/** 购买后异步落库剩余捞灯次数；已有模块行时只传 userModuleDataId + commonFieldOne。 */
export const build_persist_purchased_scoop_remaining_params = ({
  attempt_record = null,
  user_id = '',
  scoop_remaining = 0
} = {}) => {
  const next_remaining = read_count(scoop_remaining)
  const record_id = read_id(attempt_record?.user_module_data_id)
  if (record_id !== '' && record_id != null) {
    return build_consume_scoop_attempt_params({
      user_module_data_id: record_id,
      next_scoop_remaining: next_remaining
    })
  }
  return build_save_scoop_attempts_params({
    attempt_record,
    user_id,
    next_scoop_remaining: next_remaining
  })
}

/** 购买后异步落库剩余找愿望次数；已有模块行时只传 userModuleDataId + commonFieldTwo。 */
export const build_persist_purchased_wish_find_remaining_params = ({
  attempt_record = null,
  user_id = '',
  wish_find_remaining = 0
} = {}) => {
  const next_remaining = read_count(wish_find_remaining)
  const record_id = read_id(attempt_record?.user_module_data_id)
  if (record_id !== '' && record_id != null) {
    return build_consume_wish_find_attempt_params({
      user_module_data_id: record_id,
      next_wish_find_remaining: next_remaining
    })
  }
  return build_save_wish_find_attempts_params({
    attempt_record,
    user_id,
    next_wish_find_remaining: next_remaining
  })
}

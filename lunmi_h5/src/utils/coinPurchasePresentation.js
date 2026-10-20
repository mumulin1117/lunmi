import { read_coin_balance } from './myProfilePresentation.js'

export const BALANCE_CHANGE_INCOME = 1
export const BALANCE_CHANGE_EXPENSE = 2

const to_finite_balance = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

export const next_balance_after_recharge = (current_balance, coin_count) => (
  to_finite_balance(current_balance) + to_finite_balance(coin_count)
)

export const next_balance_after_expense = (current_balance, coin_count) => (
  Math.max(0, to_finite_balance(current_balance) - to_finite_balance(coin_count))
)

export const build_update_user_balance_params = ({ balance = 0 } = {}) => ({
  balance: to_finite_balance(balance)
})

/** 消费：用当前缓存余额减去消费数量，得到要提交给 updateUserBalance 的最终余额。 */
export const plan_balance_consumption = ({
  cached_balance = 0,
  coin_count = 0
} = {}) => {
  const balance_after = next_balance_after_expense(cached_balance, coin_count)
  return {
    balance_after,
    update_balance_params: build_update_user_balance_params({ balance: balance_after })
  }
}

/** 余额更新接口成功后的最新余额，用于流水 balanceCurrent 与本地缓存。 */
export const read_balance_after_update = (balance_result, planned_balance_after = 0) => {
  if (!balance_result?.success) return null
  return read_coin_balance(balance_result.data ?? planned_balance_after)
}

export const build_recharge_balance_record_params = ({
  user_id = '',
  coin_count = 0,
  balance_current = 0,
  balance_content = '',
  bundle_id = ''
} = {}) => {
  const params = {
    balanceVal: to_finite_balance(coin_count),
    balanceCurrent: to_finite_balance(balance_current),
    changeType: BALANCE_CHANGE_INCOME,
    balanceContent: `${balance_content || ''}`.trim() || 'Buy coins',
    bundleId: `${bundle_id || ''}`.trim()
  }
  if (user_id !== null && user_id !== undefined && `${user_id}`.trim() !== '') {
    params.userId = user_id
  }
  return params
}

export const build_expense_balance_record_params = ({
  user_id = '',
  coin_count = 0,
  balance_current = 0,
  balance_content = '',
  bundle_id = ''
} = {}) => {
  const params = {
    balanceVal: to_finite_balance(coin_count),
    balanceCurrent: to_finite_balance(balance_current),
    changeType: BALANCE_CHANGE_EXPENSE,
    balanceContent: `${balance_content || ''}`.trim() || 'Coins spent',
    bundleId: `${bundle_id || ''}`.trim()
  }
  if (user_id !== null && user_id !== undefined && `${user_id}`.trim() !== '') {
    params.userId = user_id
  }
  return params
}

// 本地记录：lunmi_found_wish_random_detail
// 用途：寻找愿望动效期间拉取的 selectRandomLmWish 聚合详情，供回到许愿树弹层一次性展示。
// 版本：1；清理：看到愿望弹层关闭后清除，用户不匹配或结构无效时清除。

const STORAGE_KEY = 'lunmi_found_wish_random_detail'
const RECORD_VERSION = 1

const normalize_id = (value) => {
  if (value === 0 || value === '0') return '0'
  if (value == null || `${value}`.trim() === '') return ''
  return `${value}`.trim()
}

const read_raw = () => {
  if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') return null
  try {
    const value = uni.getStorageSync(STORAGE_KEY)
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

const write_raw = (record) => {
  if (typeof uni === 'undefined' || typeof uni.setStorageSync !== 'function') return false
  try {
    uni.setStorageSync(STORAGE_KEY, record)
    return true
  } catch {
    return false
  }
}

const remove_raw = () => {
  if (typeof uni === 'undefined' || typeof uni.removeStorageSync !== 'function') return false
  try {
    uni.removeStorageSync(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export const save_found_wish_random_detail = ({ user_id = '', detail = null } = {}) => {
  const owner_id = normalize_id(user_id)
  const wish_id = normalize_id(detail?.wishId)
  if (!owner_id || !wish_id || !detail || typeof detail !== 'object') return false
  return write_raw({
    version: RECORD_VERSION,
    user_id: owner_id,
    wish_id,
    detail,
    saved_at: Date.now()
  })
}

export const read_found_wish_random_detail = ({ expected_user_id = '', wish_id = '' } = {}) => {
  const record = read_raw()
  if (!record) return null
  if (Number(record.version) !== RECORD_VERSION) {
    remove_raw()
    return null
  }
  const cached_user = normalize_id(record.user_id)
  const cached_wish = normalize_id(record.wish_id)
  const expected_user = normalize_id(expected_user_id)
  const expected_wish = normalize_id(wish_id)
  if (!cached_user || !cached_wish || !record.detail || typeof record.detail !== 'object') {
    remove_raw()
    return null
  }
  if (expected_user && cached_user !== expected_user) {
    remove_raw()
    return null
  }
  if (expected_wish && cached_wish !== expected_wish) {
    return null
  }
  return record.detail
}

export const clear_found_wish_random_detail = () => remove_raw()

export const remove_found_wish_cached_reply = ({ user_id = '', wish_id = '', reply_id = '' } = {}) => {
  const owner_id = normalize_id(user_id)
  const target_wish_id = normalize_id(wish_id)
  const target_reply_id = normalize_id(reply_id)
  if (!owner_id || !target_wish_id || !target_reply_id) return false
  const detail = read_found_wish_random_detail({ expected_user_id: owner_id, wish_id: target_wish_id })
  if (!detail || normalize_id(detail.wishId) !== target_wish_id) return false
  const reply_list = Array.isArray(detail.replyList) ? detail.replyList : []
  const saved = save_found_wish_random_detail({
    user_id: owner_id,
    detail: {
      ...detail,
      replyList: reply_list.filter((reply) => normalize_id(reply?.wishReplyId) !== target_reply_id),
      replyCount: Math.max(0, (Number(detail.replyCount) || 0) - 1)
    }
  })
  if (!saved) remove_raw()
  return saved
}

export const has_found_wish_random_detail = ({
  expected_user_id = '',
  wish_id = ''
} = {}) => Boolean(read_found_wish_random_detail({ expected_user_id, wish_id }))

export const read_pending_found_wish_id = (expected_user_id = '') => {
  const record = read_raw()
  if (!record || Number(record.version) !== RECORD_VERSION) return ''
  const cached_user = normalize_id(record.user_id)
  const expected_user = normalize_id(expected_user_id)
  if (!cached_user || !record.detail || typeof record.detail !== 'object') return ''
  if (expected_user && cached_user !== expected_user) return ''
  return normalize_id(record.wish_id)
}

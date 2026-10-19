// 本地记录：lunmi_caught_lantern_pending
// 用途：捞花灯成功后到首页弹出 CaughtLanternSheet 的一次性意图（id + 发布者展示快照）。
// 版本：2；清理：首页消费后清除，用户不匹配或结构无效时清除。

const STORAGE_KEY = 'lunmi_caught_lantern_pending'
const RECORD_VERSION = 2
// One-use route handoff in memory only; never persist the complete API response.
let pending_result = null

const normalize_id = (value) => {
  if (value === 0 || value === '0') return '0'
  if (value == null || `${value}`.trim() === '') return ''
  return `${value}`.trim()
}

const normalize_text = (value) => `${value || ''}`.trim()

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
  pending_result = null
  if (typeof uni === 'undefined' || typeof uni.removeStorageSync !== 'function') return false
  try {
    uni.removeStorageSync(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

const map_owner_fields = (record = {}) => ({
  anonymous_display: Number(record.anonymous_display) === 1 || record.anonymous_display === true,
  owner_user_id: normalize_id(record.owner_user_id),
  owner_user_name: normalize_text(record.owner_user_name),
  owner_avatar_url: normalize_text(record.owner_avatar_url)
})

export const save_pending_caught_lantern = ({
  user_id = '',
  lantern_id = '',
  lantern_scoop_id = '',
  anonymous_display = false,
  owner_user_id = '',
  owner_user_name = '',
  owner_avatar_url = '',
  caught_data = null
} = {}) => {
  const scooper_id = normalize_id(user_id)
  const lantern = normalize_id(lantern_id)
  const scoop = normalize_id(lantern_scoop_id)
  if (!scooper_id || !lantern || !scoop) return false
  pending_result = caught_data ? {
    user_id: scooper_id,
    lantern_id: lantern,
    lantern_scoop_id: scoop,
    caught_data
  } : null
  const owner = map_owner_fields({
    anonymous_display,
    owner_user_id,
    owner_user_name,
    owner_avatar_url
  })
  return write_raw({
    version: RECORD_VERSION,
    user_id: scooper_id,
    lantern_id: lantern,
    lantern_scoop_id: scoop,
    anonymous_display: owner.anonymous_display,
    owner_user_id: owner.owner_user_id,
    owner_user_name: owner.owner_user_name,
    owner_avatar_url: owner.owner_avatar_url,
    saved_at: Date.now()
  })
}

export const read_pending_caught_lantern = (expected_user_id = '') => {
  const record = read_raw()
  if (!record) return null
  const version = Number(record.version)
  if (version !== RECORD_VERSION && version !== 1) {
    remove_raw()
    return null
  }
  const scooper_id = normalize_id(record.user_id)
  const lantern_id = normalize_id(record.lantern_id)
  const lantern_scoop_id = normalize_id(record.lantern_scoop_id)
  if (!scooper_id || !lantern_id || !lantern_scoop_id) {
    remove_raw()
    return null
  }
  const expected = normalize_id(expected_user_id)
  if (expected && scooper_id !== expected) {
    remove_raw()
    return null
  }
  const owner = version === RECORD_VERSION
    ? map_owner_fields(record)
    : {
      anonymous_display: false,
      owner_user_id: '',
      owner_user_name: '',
      owner_avatar_url: ''
    }
  return {
    user_id: scooper_id,
    lantern_id,
    lantern_scoop_id,
    ...owner,
    caught_data: pending_result?.user_id === scooper_id
      && pending_result.lantern_id === lantern_id
      && pending_result.lantern_scoop_id === lantern_scoop_id
      ? pending_result.caught_data
      : null
  }
}

export const clear_pending_caught_lantern = () => remove_raw()

const PERMISSION_STORAGE_KEY = 'lunmi_permission_preferences'
const PERMISSION_KEYS = Object.freeze(['microphone', 'camera', 'location', 'album', 'contacts', 'notification'])

const read_record = () => {
  if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') return {}
  try {
    const value = uni.getStorageSync(PERMISSION_STORAGE_KEY)
    return value && typeof value === 'object' ? value : {}
  } catch { return {} }
}

export const read_permission_record = () => {
  const record = read_record()
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, Boolean(record[key])]))
}

export const write_permission_record = (permission, granted) => {
  if (!PERMISSION_KEYS.includes(permission) || typeof uni === 'undefined' || typeof uni.setStorageSync !== 'function') return false
  try {
    uni.setStorageSync(PERMISSION_STORAGE_KEY, { ...read_record(), [permission]: Boolean(granted) })
    return true
  } catch { return false }
}

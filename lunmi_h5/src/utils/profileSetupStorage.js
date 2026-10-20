const PROFILE_SETUP_CITY_KEY = 'lunmi_profile_setup_city'

export const clear_profile_setup_city = () => {
  if (typeof uni === 'undefined' || typeof uni.removeStorageSync !== 'function') return false
  try {
    uni.removeStorageSync(PROFILE_SETUP_CITY_KEY)
    return true
  } catch {
    return false
  }
}

export const read_profile_setup_city = () => {
  if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') return ''
  try { return `${uni.getStorageSync(PROFILE_SETUP_CITY_KEY) || ''}` } catch { return '' }
}

export const write_profile_setup_city = (city = '') => {
  if (typeof uni === 'undefined' || typeof uni.setStorageSync !== 'function') return false
  try {
    uni.setStorageSync(PROFILE_SETUP_CITY_KEY, `${city}`)
    return true
  } catch { return false }
}

/**
 * key: lunmi.profile_guide
 * purpose: Remember profile hints already presented on this installation.
 * structure: { version: 1, scoop: boolean, wish: boolean }
 * cleanup: Retained during sign-out and cache clearing; removed with App data.
 * isolation: Installation preference, independent of account and profile IDs.
 */
const STORAGE_KEY = 'lunmi.profile_guide'
const CONTEXTS = ['scoop', 'wish']

export const read_profile_guide_state = () => {
  try {
    const record = typeof uni !== 'undefined' ? uni.getStorageSync?.(STORAGE_KEY) : null
    if (record?.version === 1) return { scoop: record.scoop === true, wish: record.wish === true }
  } catch {}
  return { scoop: false, wish: false }
}

export const has_presented_profile_guide = (context) => (
  !CONTEXTS.includes(context) || read_profile_guide_state()[context]
)

export const restore_profile_guide_state = (state) => {
  if (!state?.scoop && !state?.wish) return true
  try {
    if (typeof uni === 'undefined' || typeof uni.setStorageSync !== 'function') return false
    uni.setStorageSync(STORAGE_KEY, { version: 1, scoop: state.scoop === true, wish: state.wish === true })
    return true
  } catch { return false }
}

export const mark_profile_guide_presented = (context) => {
  if (!CONTEXTS.includes(context)) return false
  return restore_profile_guide_state({ ...read_profile_guide_state(), [context]: true })
}

/**
 * Agreement consent local record.
 *
 * key: lunmi.agreement_consent
 * purpose: Remember that this device accepted the onboarding EULA
 * structure: { version: number, accepted: boolean }
 * version: 2 - new legal copy requires renewed acceptance
 * cleanup: project cache clear removes every uni storage record
 * isolation: one onboarding flag per browser profile; not account or business data
 */
const AGREEMENT_CONSENT_RECORD = Object.freeze({
  key: 'lunmi.agreement_consent',
  version: 2,
  purpose: 'agreement_consent'
})

const read_record = () => {
  if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') return null
  try {
    const value = uni.getStorageSync(AGREEMENT_CONSENT_RECORD.key)
    return value || null
  } catch {
    return null
  }
}

const write_record = (value) => {
  if (typeof uni === 'undefined' || typeof uni.setStorageSync !== 'function') return false
  try {
    uni.setStorageSync(AGREEMENT_CONSENT_RECORD.key, value)
    return true
  } catch {
    return false
  }
}

export const read_agreement_consent = () => {
  const record = read_record()
  if (!record || record.version !== AGREEMENT_CONSENT_RECORD.version) return false
  return record.accepted === true
}

export const write_agreement_consent = (accepted) => write_record({
  version: AGREEMENT_CONSENT_RECORD.version,
  accepted: Boolean(accepted)
})

import { storeGlobal } from '@/stores/store'
import { clear_pending_caught_lantern } from './caughtLanternPendingStorage.js'
import { clear_found_wish_random_detail } from './foundWishRandomCacheStorage.js'
import { clear_profile_setup_city } from './profileSetupStorage.js'

const get_store = () => storeGlobal()

export const get_current_user = () => get_store().userInfo
export const clear_login_state = () => get_store().logout()

/** Only call after the backend has confirmed account deletion. */
export const clear_deleted_account_state = () => {
  clear_login_state()
  clear_pending_caught_lantern()
  clear_found_wish_random_detail()
  clear_profile_setup_city()
}

import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { storeGlobal } from '@/stores/store'
import { prepare_initial_entry } from '@/utils/routeGuard'
import { install_i18n } from '@/utils/i18n'
import { register_coin_purchase_sync } from '@/utils/coinPurchaseSync'

export const createApp = () => {
  const pinia = createPinia()
  const account_store = storeGlobal(pinia)
  account_store.initLoginStatus()
  prepare_initial_entry({ has_session: account_store.hasToken })

  const app = createSSRApp(App)
  app.use(pinia)
  register_coin_purchase_sync()
  install_i18n(app)

  return {
    app,
    pinia
  }
}

import { SHOW_INCOME_CALL, SHOW_INCOME_CALL_TIMES } from '@/config/incomeControll'
import { CALL_CONNECTION_ENABLED } from '@/config/callMedia'
import { MAIN_TABS, normalize_page_route } from '@/config/mainTabs'
import { selectMessageList } from '@/api/message'
import { storeGlobal } from '@/stores/store'
import { map_message_conversations } from '@/utils/messagePresentation'
import { push_route } from '@/utils/routeTransition'

const MINIMUM_DELAY_MS = 3000
const MAXIMUM_DELAY_MS = 5000
let incoming_call_timer = null
let incoming_call_count = 0
let navigation_pending = false
let previous_caller_id = ''

const configured_call_limit = () => Math.max(0, Math.floor(Number(SHOW_INCOME_CALL_TIMES) || 0))

const current_main_tab = () => {
  const route = normalize_page_route(getCurrentPages().at(-1)?.route || '')
  return MAIN_TABS.find((tab) => tab.path === route) || null
}

const random_delay = () => MINIMUM_DELAY_MS + Math.floor(Math.random() * (MAXIMUM_DELAY_MS - MINIMUM_DELAY_MS + 1))

const choose_caller = (conversations) => {
  const callers = conversations.filter((conversation) => conversation.user_id)
  if (!callers.length) return null
  const pool = callers.length > 1
    ? callers.filter((caller) => `${caller.user_id}` !== previous_caller_id)
    : callers
  return pool[Math.floor(Math.random() * pool.length)] || callers[0]
}

export const schedule_configured_incoming_call = () => {
  if (!CALL_CONNECTION_ENABLED || !SHOW_INCOME_CALL || configured_call_limit() <= incoming_call_count || incoming_call_timer || navigation_pending) {
    return
  }
  incoming_call_timer = setTimeout(async () => {
    incoming_call_timer = null
    const tab = current_main_tab()
    const account_store = storeGlobal()
    if (!tab || !account_store.isLogin) return
    const result = await selectMessageList({})
    if (!result?.success) return
    const conversations = map_message_conversations(result.data, { current_user_id: account_store.userId })
    const caller = choose_caller(conversations)
    if (!caller) return
    navigation_pending = true
    const return_url = `/${tab.path}`
    try {
      push_route({
        url: [
          '/pages/profile/incoming-call?user_id=',
          encodeURIComponent(caller.user_id),
          '&user_name=',
          encodeURIComponent(caller.user_name || ''),
          '&avatar_url=',
          encodeURIComponent(caller.user_avatar_url || ''),
          '&source=',
          encodeURIComponent(tab.key),
          '&return_url=',
          encodeURIComponent(return_url)
        ].join(''),
        success: () => {
          incoming_call_count += 1
          previous_caller_id = `${caller.user_id}`
        },
        fail: () => {
          navigation_pending = false
          schedule_configured_incoming_call()
        },
        complete: () => {
          navigation_pending = false
        }
      })
    } catch {
      navigation_pending = false
      schedule_configured_incoming_call()
    }
  }, random_delay())
}

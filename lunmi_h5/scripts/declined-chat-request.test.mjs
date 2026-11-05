import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { babelParse, compileTemplate, parse } from '@vue/compiler-sfc'
import * as vue from 'vue'
import * as presentation from '../src/utils/messagePresentation.js'
import * as storage from '../src/utils/declinedChatStorage.js'
import * as chat from '../src/utils/chatPresentation.js'
import * as detail from '../src/utils/lanternDetailPresentation.js'
import * as profile from '../src/utils/profilePresentation.js'
import * as release from '../src/utils/releaseLanternPresentation.js'
import { MAIN_TAB_ITEMS, MAIN_TAB_UNREAD_EVENT } from '../src/utils/mainTabNavigation.js'

const root = new URL('../', import.meta.url)
const theme = JSON.parse(await readFile(new URL('src/config/theme.json', root), 'utf8'))
const initial = {
  userId: 20, userName: 'Lilin', userImg: '/static/logo.png', lastMessage: 'A kind initial reply',
  lastMessageTime: '2026-11-05 12:00:00', lastMessageType: 1, lastMessageClassify: 1,
  lastSendUserId: 20, lastReceiveUserId: 10, openChatFlag: 0, unreadCount: 1
}
const open = { ...initial, userId: 30, userName: 'Susna', openChatFlag: 1, lastMessageClassify: 0 }
const incoming = {
  messageId: 100, messageType: 1, messageClassify: 1, sendUserId: 20, receiveUserId: 10,
  content: initial.lastMessage, createDate: initial.lastMessageTime, readFlag: 0
}
const memory_storage = () => {
  const values = new Map(), events = []
  globalThis.uni = {
    getStorageSync: key => structuredClone(values.get(key)),
    setStorageSync: (key, value) => values.set(key, structuredClone(value)),
    clearStorageSync: () => values.clear(),
    $emit: (...args) => events.push(args), $on: () => {}, $off: () => {}
  }
  return { values, events }
}
const mount_page = async (filename, names, { account = { userId: 10 }, rows = [initial, open], thread = [incoming], modules = {} } = {}) => {
  const source = await readFile(new URL(filename, root), 'utf8')
  const { descriptor } = parse(source)
  let script = descriptor.scriptSetup.content
  const imports = babelParse(script, { sourceType: 'module' }).program.body.filter(node => node.type === 'ImportDeclaration')
  const dependencies = {
    vue: { ...vue, onBeforeUnmount: () => {} },
    '@dcloudio/uni-app': { onShow: () => {}, onHide: () => {}, onLoad: () => {}, onBackPress: () => {} },
    '@/config/theme.json': { default: theme },
    '@/config/callMedia': { CALL_CONNECTION_ENABLED: false },
    '@/stores/store': { storeGlobal: () => account },
    '@/api/message': {
      selectMessageList: async () => ({ success: true, data: rows }),
      selectNoticeMessageList: async () => ({ success: true, data: [] }),
      selectTargetUserMessageList: async () => ({ success: true, data: thread }),
      updateMsgRead: async () => ({ success: true })
    },
    '@/utils/mainTabNavigation': { MAIN_TAB_ITEMS, MAIN_TAB_UNREAD_EVENT },
    '@/utils/messagePresentation': presentation,
    '@/utils/declinedChatStorage': storage,
    '@/utils/chatPresentation': chat,
    '@/utils/lanternDetailPresentation': detail,
    '@/utils/profilePresentation': profile,
    '@/utils/releaseLanternPresentation': release,
    ...modules
  }
  const bindings = imports.flatMap(entry => entry.specifiers.map(specifier => {
    const key = specifier.type === 'ImportDefaultSpecifier' ? 'default' : specifier.imported.name
    return `const ${specifier.local.name} = modules[${JSON.stringify(entry.source.value)}]?.[${JSON.stringify(key)}];`
  }))
  for (const entry of [...imports].reverse()) script = script.slice(0, entry.start) + script.slice(entry.end)
  return new Function('modules', 'defineProps', `${bindings.join('\n')}\n${script}\nreturn {${names.join(',')}}`)(dependencies, () => ({ count: null }))
}
const list_names = ['accept_conversation', 'page_transition', 'load_page', 'conversations', 'status_counts', 'decline_conversation', 'decline_error', 'filter_type', 'visible_conversations']
const detail_names = ['go_back', 'accept_pending_request', 'is_request_accepted', 'needs_request_decision', 'can_send', 'draft', 'send_text', 'is_loading', 'load_error', 'load_chat', 'page_transition', 'peer_user_id', 'peer_name', 'peer_avatar_url', 'can_decide_request', 'decline_pending_request', 'is_sending', 'is_request_declined', 'composer_visible', 'video_visible', 'send_error', 'requested_mode']
const mount_detail = async options => {
  const page = await mount_page('src/pages/messages/chat.vue', detail_names, options)
  page.peer_user_id.value = '20'
  page.peer_name.value = 'Lilin'
  page.peer_avatar_url.value = '/static/logo.png'
  await page.load_chat()
  return page
}

test('declining from the list removes only that request, updates counts, and survives reload', async () => {
  const { events } = memory_storage()
  const page = await mount_page('src/pages/messages/index.vue', list_names)
  await page.load_page()
  page.filter_type.value = 'your_turn'
  assert.equal(page.visible_conversations.value.length, 1)
  page.decline_conversation(page.visible_conversations.value[0])
  assert.equal(page.visible_conversations.value.length, 0)
  assert.equal(page.status_counts.value.your_turn, 0)
  assert.equal(page.status_counts.value.open, 1)
  assert.equal(events.at(-1)[0], MAIN_TAB_UNREAD_EVENT)
  assert.equal(events.at(-1)[1].unread_count, 1)
  await page.load_page()
  assert.deepEqual(page.conversations.value.map(item => item.user_id), ['30'])
})

test('request fingerprints agree across summary and detail, but new requests and other accounts stay visible', () => {
  memory_storage()
  const row = presentation.map_message_conversations([initial], { current_user_id: 10 })[0]
  const message = presentation.map_chat_messages([incoming]).messages[0]
  const key = presentation.chat_request_key(row)
  assert.equal(key, presentation.chat_request_key({ user_id: 20, updated_at: message.created_at.replace(' ', 'T'), preview: message.preview }))
  assert.equal(storage.decline_chat_request(10, key), true)
  const options = { current_user_id: 10, declined_request_keys: storage.read_declined_chat_requests(10) }
  assert.equal(presentation.map_message_conversations([initial], options).length, 0)
  assert.equal(presentation.map_message_conversations([{ ...initial, lastMessageTime: '2026-11-05 12:01:00' }], options).length, 1)
  assert.equal(presentation.map_message_conversations([{ ...initial, lastMessage: 'A different initial reply' }], options).length, 1)
  assert.equal(presentation.map_message_conversations([{ ...initial, openChatFlag: 1 }], options).length, 1)
  assert.equal(presentation.map_message_conversations([initial], { current_user_id: 11, declined_request_keys: storage.read_declined_chat_requests(11) }).length, 1)
  assert.equal(JSON.stringify(storage.read_declined_chat_state()).includes(initial.lastMessage), false)
})

test('details decline persists the same request, returns to Messages and disables a reopened composer', async () => {
  memory_storage()
  const page = await mount_detail()
  assert.equal(page.can_decide_request.value, true)
  const routes = []
  page.page_transition.value = { navigate_relaunch: options => routes.push(options.url) }
  globalThis.getCurrentPages = () => []
  page.decline_pending_request()
  assert.equal(page.is_request_declined.value, true)
  assert.equal(page.composer_visible.value, false)
  assert.deepEqual(routes, ['/pages/messages/index'])
  const returning = await mount_detail()
  assert.equal(returning.is_request_declined.value, true)
  assert.equal(returning.composer_visible.value, false)
  assert.equal(returning.video_visible.value, false)
  assert.equal(returning.can_decide_request.value, false)
  const list = await mount_page('src/pages/messages/index.vue', list_names)
  await list.load_page()
  assert.equal(list.status_counts.value.your_turn, 0)
})

test('failed persistence retains the list item and details; no false dismissal or navigation', async () => {
  memory_storage()
  uni.setStorageSync = () => { throw new Error('Storage is full') }
  const list = await mount_page('src/pages/messages/index.vue', list_names)
  await list.load_page()
  list.decline_conversation(list.conversations.value.find(row => row.user_id === '20'))
  assert.equal(list.status_counts.value.your_turn, 1)
  assert.match(list.decline_error.value, /Unable to save/)
  const page = await mount_detail()
  page.page_transition.value = { navigate_relaunch: () => assert.fail('Must not navigate on failure') }
  page.decline_pending_request()
  assert.equal(page.is_request_declined.value, false)
  assert.equal(page.composer_visible.value, false)
  assert.match(page.send_error.value, /Unable to save/)
})

test('established chats and ordinary messages never offer decline; sending and account changes guard it', async () => {
  memory_storage()
  const ordinary = await mount_detail({ thread: [{ ...incoming, messageClassify: 0 }] })
  assert.equal(ordinary.can_decide_request.value, false)
  const established = await mount_detail({ thread: [
    { ...incoming, messageId: 99, sendUserId: 10, receiveUserId: 20, content: 'Already replied' }, incoming
  ] })
  assert.equal(established.can_decide_request.value, false)
  const account = { userId: 10 }
  const page = await mount_detail({ account })
  page.is_sending.value = true
  page.decline_pending_request()
  assert.equal(storage.read_declined_chat_requests(10).length, 0)
  page.is_sending.value = false
  account.userId = 11
  page.decline_pending_request()
  assert.equal(storage.read_declined_chat_requests(11).length, 0)
})

test('cache clearing retains dismissals, and each new installation starts without them', async () => {
  const { values } = memory_storage()
  storage.decline_chat_request(10, 'specific-request')
  storage.accept_chat_request(10, 'another-request')
  const { clear_project_cache } = await import('../src/utils/projectCache.js')
  await clear_project_cache()
  assert.deepEqual(storage.read_declined_chat_requests(10), ['specific-request'])
  assert.deepEqual(storage.read_accepted_chat_requests(10), ['another-request'])
  values.clear()
  assert.deepEqual(storage.read_declined_chat_requests(10), [])
  assert.deepEqual(storage.read_accepted_chat_requests(10), [])
})

test('list Accept saves the choice before opening details and moves only that request to Open', async () => {
  memory_storage()
  const page = await mount_page('src/pages/messages/index.vue', list_names)
  await page.load_page()
  const routes = []
  page.page_transition.value = { navigate_forward: options => {
    assert.equal(storage.read_accepted_chat_requests(10).length, 1)
    routes.push(options.url)
  } }
  const request = page.conversations.value.find(row => row.user_id === '20')
  page.accept_conversation(request)
  page.accept_conversation(request)
  page.decline_conversation(request)
  assert.equal(storage.read_declined_chat_requests(10).length, 0)
  assert.equal(routes.length, 1)
  assert.match(routes[0], /chatMode=pending_request/)
  assert.equal(page.status_counts.value.your_turn, 0)
  assert.equal(page.status_counts.value.open, 2)
  await page.load_page()
  const accepted = page.conversations.value.find(row => row.user_id === '20')
  assert.equal(accepted.chat_status, 'open')
  assert.equal(accepted.open_chat_flag, 0, 'Do not fabricate server acceptance')
  assert.equal(accepted.request_accepted, true)
  const detail = await mount_detail()
  assert.equal(detail.is_request_accepted.value, true)
  assert.equal(detail.composer_visible.value, true)
})

test('detail cannot send until explicit Accept, which sends no automatic message and survives reload', async () => {
  memory_storage()
  let sends = 0
  const account = { userId: 10, userInfo: { userName: 'Lunmi', userImgUrl: '/static/logo.png' } }
  const modules = { '@/api/message': {
    selectTargetUserMessageList: async () => ({ success: true, data: [incoming] }),
    updateMsgRead: async () => ({ success: true }),
    sendMessage: async () => { sends += 1; return { success: true, data: { messageId: 200 } } }
  } }
  const page = await mount_detail({ account, modules })
  assert.equal(page.needs_request_decision.value, true)
  assert.equal(page.composer_visible.value, false)
  page.draft.value = 'I am happy to talk.'
  await page.send_text()
  assert.equal(sends, 0)
  page.accept_pending_request()
  assert.equal(page.is_request_accepted.value, true)
  assert.equal(page.needs_request_decision.value, false)
  assert.equal(page.composer_visible.value, true)
  assert.equal(page.can_send.value, true)
  assert.equal(sends, 0)
  const returning = await mount_detail({ account })
  assert.equal(returning.composer_visible.value, true)
  assert.equal(returning.can_decide_request.value, false)
  const another = await mount_detail({ account, thread: [{ ...incoming, createDate: '2026-11-05 12:01:00' }] })
  assert.equal(another.needs_request_decision.value, true)
  assert.equal(another.composer_visible.value, false)
  await page.send_text()
  assert.equal(sends, 1, 'Send only the message the user composed after Accept')
})

test('route hints cannot bypass explicit acceptance, and an unavailable request fails closed', async () => {
  memory_storage()
  const page = await mount_detail()
  page.requested_mode.value = 'open'
  await page.load_chat()
  assert.equal(page.needs_request_decision.value, true)
  assert.equal(page.composer_visible.value, false)
  assert.equal(page.video_visible.value, false)
  const empty = await mount_detail({ thread: [] })
  empty.requested_mode.value = 'pending_request'
  await empty.load_chat()
  assert.match(empty.load_error.value, /no longer available/)
  assert.equal(empty.composer_visible.value, false)
})

test('the composer stays hidden from the first frame until the initial request is loaded and accepted', async () => {
  memory_storage()
  let resolve_messages
  const pending = new Promise(resolve => { resolve_messages = resolve })
  const page = await mount_page('src/pages/messages/chat.vue', detail_names, { modules: { '@/api/message': {
    selectTargetUserMessageList: () => pending,
    updateMsgRead: async () => ({ success: true })
  } } })
  page.peer_user_id.value = '20'
  page.peer_name.value = 'Lilin'
  page.peer_avatar_url.value = '/static/logo.png'
  assert.equal(page.composer_visible.value, false)
  const loading = page.load_chat()
  assert.equal(page.composer_visible.value, false)
  resolve_messages({ success: true, data: [incoming] })
  await loading
  assert.equal(page.needs_request_decision.value, true)
  assert.equal(page.composer_visible.value, false)
  page.accept_pending_request()
  assert.equal(page.composer_visible.value, true)
})

test('failed Accept keeps both choices available and does not enter the chat or enable input', async () => {
  memory_storage()
  uni.setStorageSync = () => { throw new Error('Storage full') }
  const list = await mount_page('src/pages/messages/index.vue', list_names)
  await list.load_page()
  list.page_transition.value = { navigate_forward: () => assert.fail('Must not navigate') }
  list.accept_conversation(list.conversations.value.find(row => row.user_id === '20'))
  assert.equal(list.status_counts.value.your_turn, 1)
  assert.match(list.decline_error.value, /Unable to save/)
  const page = await mount_detail()
  page.accept_pending_request()
  assert.equal(page.needs_request_decision.value, true)
  assert.equal(page.composer_visible.value, false)
  assert.match(page.send_error.value, /Unable to save/)
})

test('leaving a preview skips the decision without silently accepting or declining', async () => {
  memory_storage()
  const page = await mount_detail()
  const routes = []
  globalThis.getCurrentPages = () => []
  page.page_transition.value = { navigate_relaunch: options => routes.push(options.url) }
  page.go_back()
  assert.deepEqual(routes, ['/pages/messages/index'])
  assert.deepEqual(storage.read_accepted_chat_requests(10), [])
  assert.deepEqual(storage.read_declined_chat_requests(10), [])
  const list = await mount_page('src/pages/messages/index.vue', list_names)
  await list.load_page()
  assert.equal(list.status_counts.value.your_turn, 1)
})

test('choices are account/request specific, preserve legacy declines and do not implicitly accept new requests', () => {
  const { values } = memory_storage()
  values.set('lunmi.declined_chat_requests', { version: 1, accounts: { 10: ['legacy'] } })
  storage.accept_chat_request(10, 'accepted')
  assert.deepEqual(storage.read_declined_chat_requests(10), ['legacy'])
  storage.decline_chat_request(10, 'other')
  assert.deepEqual(storage.read_accepted_chat_requests(10), ['accepted'])
  storage.decline_chat_request(10, 'accepted')
  assert.deepEqual(storage.read_accepted_chat_requests(10), [])
  storage.accept_chat_request(10, 'accepted')
  assert.equal(storage.read_declined_chat_requests(10).includes('accepted'), false)
  const row = presentation.map_message_conversations([initial], { current_user_id: 10 })[0]
  const key = presentation.chat_request_key(row)
  storage.accept_chat_request(10, key)
  const options = { current_user_id: 10, accepted_request_keys: storage.read_accepted_chat_requests(10) }
  assert.equal(presentation.map_message_conversations([initial], options)[0].chat_status, 'open')
  assert.equal(presentation.map_message_conversations([{ ...initial, lastMessageTime: '2026-11-05 12:01:00' }], options)[0].chat_status, 'your_turn')
  assert.deepEqual(storage.read_accepted_chat_requests(11), [])
})

test('unread badge refreshes exclude declined requests, rather than restoring a phantom unread', async () => {
  memory_storage()
  storage.decline_chat_request(10, presentation.chat_request_key(presentation.map_message_conversations([initial], { current_user_id: 10 })[0]))
  const modules = {
    vue: { ...vue, onBeforeUnmount: () => {}, onMounted: () => {}, watch: () => {},
      getCurrentInstance: () => ({ proxy: { $route: { path: '/pages/home/index' } } }) }
  }
  const account = { userId: 10, isLogin: true }
  const main = await mount_page('src/components/MainTabBar.vue', ['load_unread_count', 'unread_chat_count'], { account, rows: [initial], modules })
  await main.load_unread_count()
  assert.equal(main.unread_chat_count.value, 0)
  const badge = await mount_page('src/components/MessageUnreadBadge.vue', ['load_unread_count', 'fetched_count', 'set_mounted: () => { is_mounted = true }'], { account, rows: [initial], modules })
  badge.set_mounted()
  await badge.load_unread_count()
  assert.equal(badge.fetched_count.value, 0)
})

test('both page templates and the shared button compile, with English and Japanese labels', async () => {
  for (const filename of ['src/pages/messages/index.vue', 'src/pages/messages/chat.vue', 'src/components/ChatRequestActions.vue']) {
    const { descriptor } = parse(await readFile(new URL(filename, root), 'utf8'))
    const compiled = compileTemplate({ source: descriptor.template.content, filename, id: 'decline-test' })
    assert.deepEqual(compiled.errors, [])
  }
  for (const language of ['en', 'ja']) {
    const locale = JSON.parse(await readFile(new URL(`src/locales/${language}.json`, root), 'utf8'))
    assert.equal(locale.Decline, language === 'en' ? 'Decline' : '拒否')
    assert.ok(locale['Decline request'])
    assert.equal(locale.Accept, language === 'en' ? 'Accept' : '承諾')
    assert.ok(locale['Accept request'])
  }
})

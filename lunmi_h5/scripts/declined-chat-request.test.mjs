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
const list_names = ['load_page', 'conversations', 'status_counts', 'decline_conversation', 'decline_error', 'filter_type', 'visible_conversations']
const detail_names = ['load_chat', 'page_transition', 'peer_user_id', 'peer_name', 'peer_avatar_url', 'can_decline_request', 'decline_pending_request', 'is_sending', 'is_request_declined', 'composer_visible', 'video_visible', 'send_error', 'requested_mode']
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
  assert.equal(page.can_decline_request.value, true)
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
  assert.equal(returning.can_decline_request.value, false)
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
  assert.equal(page.composer_visible.value, true)
  assert.match(page.send_error.value, /Unable to save/)
})

test('established chats and ordinary messages never offer decline; sending and account changes guard it', async () => {
  memory_storage()
  const ordinary = await mount_detail({ thread: [{ ...incoming, messageClassify: 0 }] })
  assert.equal(ordinary.can_decline_request.value, false)
  const established = await mount_detail({ thread: [
    { ...incoming, messageId: 99, sendUserId: 10, receiveUserId: 20, content: 'Already replied' }, incoming
  ] })
  assert.equal(established.can_decline_request.value, false)
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
  const { clear_project_cache } = await import('../src/utils/projectCache.js')
  await clear_project_cache()
  assert.deepEqual(storage.read_declined_chat_requests(10), ['specific-request'])
  values.clear()
  assert.deepEqual(storage.read_declined_chat_requests(10), [])
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
  for (const filename of ['src/pages/messages/index.vue', 'src/pages/messages/chat.vue', 'src/components/DeclineRequestButton.vue']) {
    const { descriptor } = parse(await readFile(new URL(filename, root), 'utf8'))
    const compiled = compileTemplate({ source: descriptor.template.content, filename, id: 'decline-test' })
    assert.deepEqual(compiled.errors, [])
  }
  for (const language of ['en', 'ja']) {
    const locale = JSON.parse(await readFile(new URL(`src/locales/${language}.json`, root), 'utf8'))
    assert.equal(locale.Decline, language === 'en' ? 'Decline' : '拒否')
    assert.ok(locale['Decline request'])
  }
})

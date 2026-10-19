import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { babelParse, compileTemplate, parse } from '@vue/compiler-sfc'
import * as vue from 'vue'
import * as presentation from '../src/utils/foundWishPresentation.js'
import * as storage from '../src/utils/foundWishRandomCacheStorage.js'
import { WISH_DETAIL_COVER } from '../src/utils/wishDetailPresentation.js'
import { can_delete_owned_object } from '../src/utils/deleteConfirmPresentation.js'
import { set_app_language, t } from '../src/utils/i18n.js'
import { envelope, load_api } from './api-test-helpers.mjs'

const root = new URL('../', import.meta.url)
const detail = (id = 42) => ({
  wishId: id,
  ownerUserId: 9,
  content: `Wish ${id}`,
  imgUrl: `https://example.test/wish-${id}.jpg`,
  anonymousDisplay: 0,
  branchLevel: 'high',
  replyEnabled: 1,
  blessingCount: 2,
  replyCount: 1,
  publishedAt: Date.parse('2026-08-28T12:00:00Z'),
  expiresAt: Date.now() + 26 * 24 * 60 * 60 * 1000,
  ownerUserInfo: { userId: 9, userName: 'Luna', userImgUrl: 'https://example.test/luna.jpg', userLocation: 'Seoul' },
  replyList: [{
    wishReplyId: 7,
    userId: 3,
    content: `Reply ${id}`,
    moderationStatus: 'passed',
    userName: 'River',
    userImgUrl: 'https://example.test/river.jpg'
  }]
})

const strip_imports = (source) => babelParse(source, { sourceType: 'module' }).program.body
  .filter((node) => node.type === 'ImportDeclaration').reverse()
  .reduce((result, node) => result.slice(0, node.start) + result.slice(node.end), source)

const flush = async () => {
  for (let index = 0; index < 6; index += 1) await vue.nextTick()
}

const mount_sheet = async (transport = () => { throw new Error('Unexpected transport request') }) => {
  const memory = new Map()
  globalThis.uni = {
    getStorageSync: (key) => memory.get(key),
    setStorageSync: (key, value) => memory.set(key, value),
    removeStorageSync: (key) => memory.delete(key)
  }
  set_app_language('en')
  const api = await load_api('src/api/wish.js', transport)
  const source = await readFile(new URL('src/components/FoundWishSheet.vue', root), 'utf8')
  const { descriptor } = parse(source)
  const theme = JSON.parse(await readFile(new URL('src/config/theme.json', root), 'utf8'))
  const props = vue.reactive({ visible: false, wishId: '' })
  const emits = []
  const scope = vue.effectScope()
  let unmount
  const context = vm.createContext({
    ...vue,
    ...presentation,
    ...storage,
    ...api.api,
    theme,
    WISH_DETAIL_COVER,
    can_delete_owned_object,
    storeGlobal: () => ({ userId: 3, userInfo: { userName: 'Me', userImgUrl: 'https://example.test/me.jpg' } }),
    defineProps: () => props,
    defineEmits: () => (...args) => emits.push(args),
    onBeforeUnmount: (hook) => { unmount = hook }
  })
  const fields = ['wish', 'replies', 'author_name', 'avatar_url', 'location_label', 'reply_draft',
    'load_error', 'reply_error', 'action_error', 'is_loading', 'is_blessing', 'is_replying',
    'theme_style', 'place_line', 'waiting_line', 'reply_total', 'wish_photo', 'can_report_author',
    'can_report_reply', 'can_delete_reply', 'deleting_reply_id', 'placeholder_style', 'is_report_open', 'report_name', 'report_user_id',
    'close', 'load_sheet', 'open_author', 'open_report', 'bless_wish', 'delete_reply', 'send_reply', 'apply_random_detail',
    'is_photo_loading', 'photo_error', 'on_photo_load', 'on_photo_error', 'show_cover_shimmer', 'already_blessed']
  scope.run(() => vm.runInContext(`${strip_imports(descriptor.scriptSetup.content)}\nglobalThis.subject = { ${fields.join(', ')} }`, context))
  const template = compileTemplate({ source: descriptor.template.content, filename: 'FoundWishSheet.vue', id: 'test' })
  assert.equal(template.errors.length, 0)
  const imports = babelParse(template.code, { sourceType: 'module' }).program.body
    .filter((node) => node.type === 'ImportDeclaration')
  imports.forEach((node) => node.specifiers.forEach((specifier) => {
    const name = specifier.imported.name
    context[specifier.local.name] = name === 'resolveComponent' ? (name) => name
      : name === 'withDirectives' ? (node) => node : vue[name]
  }))
  vm.runInContext(strip_imports(template.code).replace('export function render', 'function render'), context)
  return {
    ...context.subject,
    props,
    emits,
    api,
    source,
    render: () => context.render(vue.proxyRefs({ ...context.subject, ...props, $t: t }), []),
    dispose: () => { unmount(); scope.stop(); delete globalThis.uni }
  }
}

const render_nodes = (node) => {
  if (typeof node === 'string') return [node]
  if (!node) return []
  const children = typeof node.children?.default === 'function' ? node.children.default() : node.children
  return [node, ...(Array.isArray(children) ? children.flatMap(render_nodes) : render_nodes(children))]
}

test('random API aggregate renders wish, author, photo and reply body with no follow-up reads', async () => {
  const sheet = await mount_sheet(() => envelope(200000, detail()))
  try {
    const result = await sheet.api.api.selectRandomLmWish()
    storage.save_found_wish_random_detail({ user_id: 3, detail: result.data })
    sheet.props.wishId = '42'
    sheet.props.visible = true
    await flush()
    assert.equal(sheet.wish.value.content, 'Wish 42')
    assert.equal(sheet.author_name.value, 'Luna')
    assert.equal(sheet.location_label.value, 'Seoul')
    assert.equal(sheet.replies.value[0].content, 'Reply 42')
    assert.equal(sheet.replies.value[0].user_name, 'River')
    assert.equal(sheet.replies.value[0].avatar_url, detail().replyList[0].userImgUrl)
    const nodes = render_nodes(sheet.render())
    const text = nodes.filter((node) => typeof node === 'string').join('\n')
    for (const value of ['Wish 42', 'Luna', 'Seoul', 'Reply 42', 'River', 'Aug 28', 'waiting · 26 days left']) {
      assert.ok(text.includes(value), value)
    }
    assert.ok(nodes.some((node) => node.props?.class === 'found-waiting__count' && node.children === '2'))
    assert.ok(nodes.some((node) => node.props?.source === detail().ownerUserInfo.userImgUrl))
    assert.ok(nodes.some((node) => node.props?.src === detail().imgUrl))
    assert.equal(sheet.api.calls.length, 1)
    assert.equal(sheet.is_loading.value, false)
  } finally { sheet.dispose() }
})

test('the retained wish sheet switches Japanese and English while keeping account names and replies intact', async () => {
  const sheet = await mount_sheet(() => envelope(200000, detail()))
  try {
    const result = await sheet.api.api.selectRandomLmWish()
    storage.save_found_wish_random_detail({ user_id: 3, detail: result.data })
    sheet.props.wishId = '42'
    sheet.props.visible = true
    await flush()
    set_app_language('ja')
    const japanese = render_nodes(sheet.render()).filter((node) => typeof node === 'string').join('\n')
    for (const value of ['Luna', 'Reply 42', '祝福する', '返信 ·', '待ち', 'あと26日']) assert.ok(japanese.includes(value), value)
    set_app_language('en')
    const english = render_nodes(sheet.render()).filter((node) => typeof node === 'string').join('\n')
    assert.ok(english.includes('Bless'))
    assert.ok(english.includes('waiting · 26 days left'))
    assert.equal(sheet.api.calls.length, 1)
  } finally { sheet.dispose() }
})

test('missing target cache clears old wish and reports an error without requesting other APIs', async () => {
  const sheet = await mount_sheet()
  try {
    storage.save_found_wish_random_detail({ user_id: 3, detail: detail() })
    sheet.props.wishId = '42'
    sheet.props.visible = true
    await flush()
    sheet.reply_draft.value = 'Old draft'
    sheet.props.wishId = '55'
    await vue.nextTick()
    assert.equal(sheet.wish.value, null)
    assert.equal(sheet.author_name.value, '')
    assert.equal(sheet.avatar_url.value, '')
    assert.equal(sheet.location_label.value, '')
    assert.equal(sheet.reply_draft.value, '')
    assert.equal(sheet.replies.value.length, 0)
    assert.equal(sheet.is_loading.value, false)
    assert.ok(sheet.load_error.value)
    assert.equal(sheet.api.calls.length, 0)
    sheet.props.visible = false
    await vue.nextTick()
    await flush()
    assert.equal(sheet.wish.value, null)
    assert.equal(sheet.is_loading.value, false)
  } finally { sheet.dispose() }
})

test('stale random detail cannot repaint a closed sheet', async () => {
  const sheet = await mount_sheet()
  try {
    assert.equal(sheet.apply_random_detail(detail(), -1), false)
    assert.equal(sheet.wish.value, null)
    assert.equal(sheet.replies.value.length, 0)
    assert.equal(sheet.author_name.value, '')
  } finally { sheet.dispose() }
})

test('sheet has a definite scroll viewport and fixed composer', async () => {
  const sheet = await mount_sheet()
  try {
    assert.match(sheet.source, /\.found-sheet__panel\s*\{[^}]*\bheight:\s*92%/s)
    assert.match(sheet.source, /\.found-sheet__scroll\s*\{[^}]*\bheight:\s*0;/s)
    assert.match(sheet.source, /\.found-composer\s*\{[^}]*flex-shrink:\s*0;/s)
  } finally { sheet.dispose() }
})

test('Bless writes asynchronously, blocks duplicates and stays in the found sheet', async () => {
  let finish
  const sheet = await mount_sheet(() => new Promise((resolve) => { finish = resolve }))
  try {
    storage.save_found_wish_random_detail({ user_id: 3, detail: detail() })
    sheet.props.wishId = '42'
    sheet.props.visible = true
    await flush()
    const saving = sheet.bless_wish()
    assert.equal(sheet.is_blessing.value, true)
    assert.equal(sheet.wish.value.blessing_count, 3)
    await sheet.bless_wish()
    assert.equal(sheet.api.calls.length, 1)
    assert.equal(sheet.api.calls[0].endpoint, '/sj/lunmi/addLmWishBlessing')
    assert.equal(sheet.api.calls[0].data.wishId, '42')
    assert.equal(sheet.api.calls[0].data.userId, 3)
    finish(envelope(200000, { wishBlessingId: 8 }))
    await saving
    assert.equal(sheet.is_blessing.value, false)
    assert.equal(sheet.already_blessed.value, true)
    await sheet.bless_wish()
    assert.equal(sheet.api.calls.length, 1)
    assert.equal(sheet.emits.length, 0)
    assert.equal(sheet.props.visible, true)
  } finally { sheet.dispose() }
})

test('failed Bless rolls the count back and allows retry without navigating', async () => {
  const sheet = await mount_sheet(() => envelope(500000, null))
  try {
    storage.save_found_wish_random_detail({ user_id: 3, detail: detail() })
    sheet.props.wishId = '42'
    sheet.props.visible = true
    await flush()
    await sheet.bless_wish()
    assert.equal(sheet.wish.value.blessing_count, 2)
    assert.equal(sheet.already_blessed.value, false)
    assert.ok(sheet.action_error.value)
    await sheet.bless_wish()
    assert.equal(sheet.api.calls.length, 2)
    assert.equal(sheet.emits.length, 0)
  } finally { sheet.dispose() }
})

test('wish photo loading and failure use the same fallback as the wish detail page', async () => {
  const sheet = await mount_sheet()
  try {
    storage.save_found_wish_random_detail({ user_id: 3, detail: detail() })
    sheet.props.wishId = '42'
    sheet.props.visible = true
    await flush()
    assert.equal(sheet.is_photo_loading.value, true)
    assert.equal(sheet.show_cover_shimmer.value, true)
    sheet.on_photo_load()
    assert.equal(sheet.is_photo_loading.value, false)
    assert.equal(sheet.show_cover_shimmer.value, false)
    sheet.on_photo_error()
    assert.equal(sheet.photo_error.value, true)
    assert.equal(sheet.wish_photo.value, WISH_DETAIL_COVER)
    assert.equal(sheet.show_cover_shimmer.value, false)
    const next_detail = detail(55)
    next_detail.imgUrl = ''
    storage.save_found_wish_random_detail({ user_id: 3, detail: next_detail })
    sheet.props.wishId = '55'
    await flush()
    assert.equal(sheet.wish_photo.value, WISH_DETAIL_COVER)
    assert.equal(sheet.photo_error.value, false)
    assert.equal(sheet.is_photo_loading.value, false)
    assert.equal(sheet.show_cover_shimmer.value, false)
  } finally { sheet.dispose() }
})

test('missing owner info never triggers a public profile lookup', async () => {
  const sheet = await mount_sheet()
  try {
    const incomplete = detail()
    incomplete.ownerUserInfo = null
    storage.save_found_wish_random_detail({ user_id: 3, detail: incomplete })
    sheet.props.wishId = '42'
    sheet.props.visible = true
    await flush()
    assert.equal(sheet.author_name.value, 'Wish keeper')
    assert.equal(sheet.avatar_url.value, '')
    assert.equal(sheet.location_label.value, '')
    assert.equal(sheet.wish.value.content, 'Wish 42')
    assert.equal(sheet.load_error.value, '')
    assert.equal(sheet.api.calls.length, 0)
    assert.doesNotMatch(sheet.source, /selectUserInfo|selectLmWish(?:Page|ReplyPage|BlessingPage)/)
    assert.equal(sheet.is_loading.value, false)
  } finally { sheet.dispose() }
})

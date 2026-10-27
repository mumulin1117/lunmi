import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { babelParse, compileTemplate, parse } from '@vue/compiler-sfc'
import * as vue from 'vue'
import * as detail from '../src/utils/lanternDetailPresentation.js'
import * as scoop from '../src/utils/scoopLanternPresentation.js'
import * as release from '../src/utils/releaseLanternPresentation.js'
import * as profile from '../src/utils/profilePresentation.js'
import { set_app_language, t } from '../src/utils/i18n.js'

const root = new URL('../', import.meta.url)
const strip_imports = (source) => babelParse(source, { sourceType: 'module' }).program.body
  .filter((node) => node.type === 'ImportDeclaration').reverse()
  .reduce((result, node) => result.slice(0, node.start) + result.slice(node.end), source)
const flush = async () => { for (let index = 0; index < 6; index += 1) await vue.nextTick() }
const deferred = () => {
  let resolve
  const promise = new Promise((complete) => { resolve = complete })
  return { promise, resolve }
}
const aggregate = (id = 42) => ({
  lantern: { lantern_id: id, owner_user_id: 9, anonymous_display: false,
    content: `Lantern ${id}`, lantern_label: 'Gratitude' },
  scoop: { lantern_scoop_id: id + 100, lantern_id: id, scooper_user_id: 3 },
  owner_profile: { username: 'Luna', avatar_url: 'https://example.test/luna.jpg' },
  reply_record: null
})
const scoop_page = (id = 42) => ({ success: true, data: { records: [{
  lanternScoopId: id + 100, lanternId: id, scooperUserId: 3, scoopStatus: 'active'
}] } })
const lantern_page = (id = 42) => ({ success: true, data: { records: [{
  lanternId: id, ownerUserId: 9, anonymousDisplay: 0, content: `Lantern ${id}`, lanternLabel: 'Gratitude'
}] } })
const nodes = (node) => {
  if (!node || typeof node === 'string') return []
  const children = typeof node.children?.default === 'function' ? node.children.default() : node.children
  return [node, ...(Array.isArray(children) ? children.flatMap(nodes) : nodes(children))]
}
const template_renderer = (template, context, filename) => {
  const compiled = compileTemplate({ source: template, filename, id: 'test' })
  assert.equal(compiled.errors.length, 0)
  babelParse(compiled.code, { sourceType: 'module' }).program.body
    .filter((node) => node.type === 'ImportDeclaration').forEach((node) => {
      node.specifiers.forEach((specifier) => {
        const name = specifier.imported.name
        context[specifier.local.name] = name === 'resolveComponent' ? (name) => name
          : name === 'withDirectives' ? (node) => node : vue[name]
      })
    })
  vm.runInContext(strip_imports(compiled.code).replace('export function render', 'function render'), context)
  return (bindings) => context.render(vue.proxyRefs({ ...bindings, $t: t }), [])
}

const mount_sheet = async (read = () => { throw new Error('Unexpected read') }) => {
  const memory = new Map()
  globalThis.uni = { getStorageSync: (key) => memory.get(key),
    setStorageSync: (key, value) => memory.set(key, value), removeStorageSync: (key) => memory.delete(key) }
  set_app_language('en')
  const source = await readFile(new URL('src/components/CaughtLanternSheet.vue', root), 'utf8')
  const { descriptor } = parse(source)
  const props = vue.reactive({ visible: false, lanternId: '', lanternScoopId: '', caughtData: null,
    cachedOwnerUserId: '', cachedOwnerName: '', cachedOwnerAvatarUrl: '', cachedOwnerAnonymous: false, bottomOffset: '0px' })
  const emits = []
  const calls = []
  const reads = Object.fromEntries(['selectUserBaseInfo', 'selectLmLanternPage', 'selectLmLanternReplyPage', 'selectLmLanternScoopPage']
    .map((name) => [name, (params, context) => {
      const call = { name, params, cancelled: false }
      context.cancel = () => { call.cancelled = true }
      calls.push(call)
      return read(call)
    }]))
  let unmount
  const context = vm.createContext({ ...vue, ...detail, ...scoop, ...release, ...profile, ...reads, t,
    theme: JSON.parse(await readFile(new URL('src/config/theme.json', root), 'utf8')),
    storeGlobal: () => ({ userId: 3 }), defineProps: () => props,
    defineEmits: () => (...args) => { emits.push(args); if (args[0] === 'close') props.visible = false },
    onBeforeUnmount: (hook) => { unmount = hook }
  })
  const fields = ['lantern', 'scoop', 'reply_record', 'avatar_url', 'owner_name', 'is_loading', 'load_error',
    'sheet_style', 'has_owner_preview', 'show_owner_avatar', 'owner_label', 'place_label', 'lantern_label',
    'can_report', 'notice_text', 'reply_label', 'close', 'after_close', 'reply', 'open_report', 'load_caught']
  const scope = vue.effectScope()
  scope.run(() => vm.runInContext(`${strip_imports(descriptor.scriptSetup.content)}\nglobalThis.subject = { ${fields.join(', ')} }`, context))
  const render = template_renderer(descriptor.template.content, context, 'CaughtLanternSheet.vue')
  return { ...context.subject, props, emits, calls,
    render: () => render({ ...context.subject, ...props }),
    open: async (data = aggregate()) => {
      Object.assign(props, { lanternId: data.lantern.lantern_id, lanternScoopId: data.scoop.lantern_scoop_id,
        caughtData: data, visible: true })
      await flush()
    },
    dispose: () => { unmount(); scope.stop(); delete globalThis.uni }
  }
}

test('the result toolbar closes the loaded sheet without replies, reports or API calls', async () => {
  const sheet = await mount_sheet()
  try {
    await sheet.open()
    const retained = sheet.lantern.value
    const toolbar = nodes(sheet.render()).find((node) => node.type === 'ResultSheetToolbar')
    assert.ok(toolbar)
    toolbar.props.onClose()
    await flush()
    assert.deepEqual(sheet.emits.map(([event]) => event), ['close'])
    assert.equal(sheet.props.visible, false)
    assert.equal(sheet.lantern.value, retained, 'loaded content remains available during the exit')
    assert.equal(sheet.owner_name.value, 'Luna')
    assert.equal(sheet.calls.length, 0)
    const transition = nodes(sheet.render()).find((node) => typeof node.props?.onAfterLeave === 'function')
    assert.ok(transition)
    transition.props.onAfterLeave()
    assert.deepEqual(sheet.emits.map(([event]) => event), ['close', 'after-close'])
  } finally { sheet.dispose() }
})

test('closing cancels outstanding reads and late responses cannot repaint the hidden sheet', async () => {
  const pending = deferred()
  const sheet = await mount_sheet(({ name }) => pending.promise.then(() => name === 'selectLmLanternScoopPage' ? scoop_page() : lantern_page()))
  try {
    Object.assign(sheet.props, { lanternId: 42, lanternScoopId: 142, visible: true })
    await flush()
    assert.equal(sheet.calls.length, 2)
    sheet.close()
    assert.ok(sheet.calls.every((call) => call.cancelled))
    pending.resolve(lantern_page())
    await flush()
    assert.equal(sheet.lantern.value, null)
    assert.equal(sheet.reply_record.value, null)
    assert.equal(sheet.load_error.value, '')
    assert.deepEqual(sheet.emits.map(([event]) => event), ['close'])
    assert.equal(sheet.calls.length, 2)
  } finally { sheet.dispose() }
})

test('quick reopen keeps the new aggregate intact when old reads and leave completion arrive', async () => {
  const pending = deferred()
  const sheet = await mount_sheet(({ name }) => pending.promise.then(() => name === 'selectLmLanternScoopPage' ? scoop_page() : lantern_page()))
  try {
    Object.assign(sheet.props, { lanternId: 42, lanternScoopId: 142, visible: true })
    await flush()
    sheet.close()
    await flush()
    await sheet.open(aggregate(55))
    sheet.after_close()
    pending.resolve(lantern_page())
    await flush()
    assert.equal(sheet.props.visible, true)
    assert.equal(sheet.lantern.value.content, 'Lantern 55')
    assert.equal(sheet.owner_name.value, 'Luna')
    assert.equal(sheet.load_error.value, '')
    assert.equal(sheet.is_loading.value, false)
    assert.equal(sheet.calls.length, 2)
    assert.deepEqual(sheet.emits.map(([event]) => event), ['close'])
  } finally { sheet.dispose() }
})

test('a reply read already in flight is cancelled without erasing loaded content on close', async () => {
  const pending_reply = deferred()
  const sheet = await mount_sheet(({ name }) => name === 'selectLmLanternScoopPage'
    ? Promise.resolve(scoop_page()) : name === 'selectLmLanternPage'
      ? Promise.resolve(lantern_page()) : pending_reply.promise)
  try {
    Object.assign(sheet.props, { lanternId: 42, lanternScoopId: 142, visible: true })
    await flush()
    assert.equal(sheet.lantern.value.content, 'Lantern 42')
    assert.equal(sheet.calls[2].name, 'selectLmLanternReplyPage')
    sheet.close()
    assert.equal(sheet.calls[2].cancelled, true)
    pending_reply.resolve({ success: true, data: { records: [{ lanternReplyId: 4, content: 'Stale reply' }] } })
    await flush()
    assert.equal(sheet.lantern.value.content, 'Lantern 42')
    assert.equal(sheet.reply_record.value, null)
    assert.equal(sheet.calls.length, 3, 'closing must not continue with a profile lookup')
    assert.deepEqual(sheet.emits.map(([event]) => event), ['close'])
  } finally { sheet.dispose() }
})

test('a stale closed request cannot clear the loading state or error of a newly opened request', async () => {
  const old = deferred()
  const current = deferred()
  const sheet = await mount_sheet(({ name, params }) => {
    if (name === 'selectLmLanternReplyPage') return Promise.resolve({ success: true, data: { records: [] } })
    const id = Number(params.lanternId)
    return (id === 42 ? old.promise : current.promise).then(() => id === 42
      ? { success: false, error: 'Stale closed-request error' }
      : name === 'selectLmLanternScoopPage' ? scoop_page(id) : lantern_page(id))
  })
  try {
    Object.assign(sheet.props, { lanternId: 42, lanternScoopId: 142, visible: true })
    await flush()
    sheet.close()
    await flush()
    Object.assign(sheet.props, { lanternId: 55, lanternScoopId: 155, visible: true,
      cachedOwnerUserId: 9, cachedOwnerName: 'Luna' })
    await flush()
    assert.equal(sheet.is_loading.value, true)
    old.resolve()
    await flush()
    assert.equal(sheet.is_loading.value, true)
    assert.equal(sheet.load_error.value, '')
    current.resolve()
    await flush()
    assert.equal(sheet.is_loading.value, false)
    assert.equal(sheet.lantern.value.content, 'Lantern 55')
    assert.equal(sheet.load_error.value, '')
  } finally { sheet.dispose() }
})

test('the native close button exposes the English and Japanese name and emits close only', async () => {
  const sheet = await mount_sheet()
  try {
    const { descriptor } = parse(await readFile(new URL('src/components/ResultSheetToolbar.vue', root), 'utf8'))
    const context = vm.createContext({})
    const render = template_renderer(descriptor.template.content, context, 'ResultSheetToolbar.vue')
    const events = []
    for (const [language, label] of [['en', 'Close'], ['ja', '閉じる']]) {
      assert.equal(set_app_language(language), true)
      const button = nodes(render({ $emit: (...args) => events.push(args) })).find((node) => node.type === 'button')
      assert.ok(button)
      assert.equal(button.props['aria-label'], label)
      let stopped = false
      button.props.onClick({ stopPropagation: () => { stopped = true } })
      assert.equal(stopped, true)
    }
    assert.deepEqual(events, [['close'], ['close']])
    set_app_language('en')
  } finally { sheet.dispose() }
})

test('Home retains owner-only preview until the actual after-close event', async () => {
  const { descriptor } = parse(await readFile(new URL('src/pages/home/index.vue', root), 'utf8'))
  const script = descriptor.scriptSetup.content
  const statements = babelParse(script, { sourceType: 'module' }).program.body
  const functions = ['close_caught', 'reset_caught_owner_cache'].map((name) => {
    const statement = statements.find((node) => node.type === 'VariableDeclaration'
      && node.declarations.some((item) => item.id.name === name))
    assert.ok(statement)
    return script.slice(statement.start, statement.end)
  }).join('\n')
  const bindings = Object.fromEntries(Object.entries({ is_caught_visible: true, is_caught_report_visible: true,
    caught_data: null, caught_lantern_id: 42, caught_scoop_id: 142, caught_owner_user_id: '9',
    caught_owner_name: 'Luna', caught_owner_avatar_url: 'https://example.test/luna.jpg', caught_owner_anonymous: false })
    .map(([key, value]) => [key, vue.ref(value)]))
  const context = vm.createContext({ ...bindings, cancel_caught_open() {}, reply_to_caught() {}, open_caught_report() {} })
  vm.runInContext(`let caught_query_key = 'old-query';\n${functions}\nglobalThis.handlers = { close_caught, reset_caught_owner_cache }`, context)
  const find_sheet = (node) => node?.tag === 'CaughtLanternSheet' ? node
    : node?.children?.map(find_sheet).find(Boolean)
  const sheet_template = find_sheet(descriptor.template.ast)
  assert.ok(sheet_template)
  const render = template_renderer(sheet_template.loc.source, context, 'HomeCaughtLanternSheet.vue')
  const sheet = nodes(render({ ...bindings, ...context.handlers, reply_to_caught() {}, open_caught_report() {} }))
    .find((node) => node.type === 'CaughtLanternSheet')
  sheet.props.onClose()
  assert.equal(bindings.is_caught_visible.value, false)
  assert.equal(bindings.is_caught_report_visible.value, false)
  assert.equal(bindings.caught_owner_name.value, 'Luna')
  assert.equal(bindings.caught_owner_user_id.value, '9')
  assert.equal(typeof sheet.props.onAfterClose, 'function')
  sheet.props.onAfterClose()
  assert.equal(bindings.caught_owner_name.value, '')
  assert.equal(bindings.caught_owner_user_id.value, '')
  assert.equal(bindings.caught_owner_avatar_url.value, '')
})

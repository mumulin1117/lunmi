import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import * as vue from 'vue'
import { babelParse, parse } from '@vue/compiler-sfc'
import * as presentation from '../src/utils/voiceRoomDetailPresentation.js'

const source = await readFile(new URL('../src/pages/live-room/detail.vue', import.meta.url), 'utf8')
const theme = JSON.parse(await readFile(new URL('../src/config/theme.json', import.meta.url), 'utf8'))
const granted_fixture = { granted: true, permission_status: 'granted' }
const denied_fixture = { granted: false, permission_status: 'denied' }

// Isolated controller fixtures do not grant an OS permission or start a microphone.
const load_controller = (permission = async () => denied_fixture) => {
  let script = parse(source).descriptor.scriptSetup.content
  const imports = babelParse(script, { sourceType: 'module' }).program.body.filter(node => node.type === 'ImportDeclaration')
  const hooks = {}
  const calls = []
  const settings = []
  const document_events = new Map()
  const document = {
    hidden: false,
    addEventListener: (event, callback) => document_events.set(event, callback),
    removeEventListener: event => document_events.delete(event)
  }
  const account = vue.reactive({ userId: 42 })
  const modules = {
    vue: { ...vue, onBeforeUnmount: callback => { hooks.unmount = callback } },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload', 'onBackPress'].map(key => [key, callback => { hooks[key] = callback }])),
    '@/config/theme.json': { default: theme },
    '@/utils/i18n': { t: value => value },
    '@/stores/store': { storeGlobal: () => account },
    '@/api/live': { addQuitLive: async () => ({ success: true }) },
    '@/utils/mediaPlayback': { clear_media() {}, activate_media() {} },
    '@/utils/voiceRoomDetailPresentation.js': presentation,
    '@/utils/iosPermissionBridge': {
      ensure_ios_permission: (kind, options) => { calls.push({ kind, options }); return permission(kind, options) },
      request_ios_microphone_permission: options => { settings.push(options); return true }
    }
  }
  const bindings = imports.flatMap(entry => entry.specifiers.map(specifier => {
    const name = specifier.type === 'ImportDefaultSpecifier' ? 'default' : specifier.imported.name
    return `const ${specifier.local.name} = modules[${JSON.stringify(entry.source.value)}]?.[${JSON.stringify(name)}];`
  }))
  for (const entry of [...imports].reverse()) script = script.slice(0, entry.start) + script.slice(entry.end)
  const names = ['is_mic_on', 'is_permission_pending', 'is_microphone_notice_visible', 'microphone_notice_unavailable',
    'request_entry_microphone_permission', 'toggle_microphone', 'open_microphone_settings', 'on_document_visibility_change',
    'room', 'has_joined', 'is_confirm_visible']
  const controller = new Function('modules', 'document', `${bindings.join('\n')}\n${script}\nreturn {${names.join(',')}}`)(modules, document)
  controller.room.value = { liveId: 8, userId: 3, liveStatus: 1 }
  controller.has_joined.value = true
  return { ...controller, hooks, calls, settings, document, document_events, account }
}

test('joining requests fresh system permission once and stays muted after a granted result', async () => {
  const room = load_controller(async () => granted_fixture)
  assert.equal(room.is_mic_on.value, false)
  await room.request_entry_microphone_permission()
  await room.request_entry_microphone_permission()
  assert.deepEqual(room.calls, [{ kind: 'microphone', options: {
    force_refresh: true, reason: 'Speak in voice rooms. You join muted, and nothing is recorded.'
  } }])
  assert.equal(room.is_mic_on.value, false)
})

test('mute toggles off immediately and speaking requires a fresh permission check every time', async () => {
  let permission_result = granted_fixture
  const room = load_controller(async () => permission_result)
  await room.toggle_microphone()
  assert.equal(room.is_mic_on.value, true)
  assert.deepEqual(room.calls[0].options, { check_only: true })
  await room.toggle_microphone()
  assert.equal(room.is_mic_on.value, false)
  assert.equal(room.calls.length, 1)
  permission_result = denied_fixture
  await room.toggle_microphone()
  assert.equal(room.is_mic_on.value, false)
  assert.equal(room.is_microphone_notice_visible.value, true)
  assert.equal(room.microphone_notice_unavailable.value, false)
  room.open_microphone_settings()
  assert.deepEqual(room.settings, [{ open_settings: true }])
})

test('unavailable bridge and undetermined system access stay muted with the appropriate notice', async () => {
  for (const result of [null, { granted: false, permission_status: 'unavailable', unavailable: true },
    { granted: false, permission_status: 'unavailable', unavailable: true, cancelled: true }]) {
    const room = load_controller(async () => result)
    await room.toggle_microphone()
    assert.equal(room.is_mic_on.value, false)
    assert.equal(room.is_microphone_notice_visible.value, true)
    assert.equal(room.microphone_notice_unavailable.value, !result || !result.cancelled)
  }
})

test('duplicate taps are blocked and late permission responses cannot unmute a hidden, leaving or unloaded room', async () => {
  for (const interruption of ['hide', 'unload', 'background', 'confirm', 'account']) {
    let complete
    const room = load_controller(() => new Promise(resolve => { complete = resolve }))
    const pending = room.toggle_microphone()
    await room.toggle_microphone()
    assert.equal(room.calls.length, 1)
    assert.equal(room.is_permission_pending.value, true)
    if (interruption === 'hide') room.hooks.onHide()
    if (interruption === 'unload') room.hooks.onUnload()
    if (interruption === 'background') { room.document.hidden = true; room.on_document_visibility_change() }
    if (interruption === 'confirm') room.is_confirm_visible.value = true
    if (interruption === 'account') room.account.userId = 99
    complete(granted_fixture)
    await pending
    assert.equal(room.is_mic_on.value, false, interruption)
  }
})

test('returning to the page keeps the microphone muted', async () => {
  const room = load_controller(async () => granted_fixture)
  await room.toggle_microphone()
  room.hooks.onHide()
  room.hooks.onShow()
  assert.equal(room.is_mic_on.value, false)
})

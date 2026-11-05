import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { babelParse, compileTemplate, parse } from '@vue/compiler-sfc'
import * as vue from 'vue'
import * as calls from '../src/utils/callPresentation.js'

const root = new URL('../', import.meta.url)
const source = await readFile(new URL('src/pages/calls/ringing/index.vue', root), 'utf8')
const { descriptor } = parse(source)
const theme = JSON.parse(await readFile(new URL('src/config/theme.json', root), 'utf8'))
const granted = { success: true, granted: true, permission_status: 'granted' }
const denied = { success: false, granted: false, permission_status: 'denied' }
const defer = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }

const mount_page = ({ permission = async () => granted, depth = 1, query = {} } = {}) => {
  const hooks = {}, timers = new Map(), permission_calls = [], sounds = [], routes = [], toasts = [], settings = []
  let timer_sequence = 0
  const register_timer = (callback, delay, interval = false) => {
    const id = ++timer_sequence
    timers.set(id, { callback, delay, interval })
    return id
  }
  const modules = {
    vue: { ...vue, onBeforeUnmount: callback => { hooks.unmount = callback } },
    '@dcloudio/uni-app': {
      onLoad: callback => { hooks.load = callback }, onShow: callback => { hooks.show = callback },
      onHide: callback => { hooks.hide = callback }, onBackPress: callback => { hooks.back = callback }
    },
    '@/api/common': { selectUserBaseInfo: async () => ({ success: false }) },
    '@/config/theme.json': { default: theme },
    '@/config/callMedia': { CALL_CONNECTION_ENABLED: false },
    '@/config/user': { DEFAULT_AVATAR_URL: '/static/logo.png' },
    '@/utils/i18n': { t: value => value },
    '@/utils/callPresentation': calls,
    '@/utils/callSounds': { create_call_sound_controller: () => ({
      start_waiting: () => sounds.push('waiting'), stop_waiting: () => sounds.push('stop_waiting'),
      stop_all: () => sounds.push('stop_all'), play_ended: () => sounds.push('ended')
    }) },
    '@/utils/iosPermissionBridge': {
      ensure_ios_permission: (name, options) => { permission_calls.push({ name, options }); return permission(name) },
      request_ios_permission: (name, options) => { settings.push({ name, options }); return true }
    }
  }
  let script = descriptor.scriptSetup.content
  const imports = babelParse(script, { sourceType: 'module' }).program.body.filter(node => node.type === 'ImportDeclaration')
  const bindings = imports.flatMap(entry => entry.specifiers.map(specifier => {
    const key = specifier.type === 'ImportDefaultSpecifier' ? 'default' : specifier.imported.name
    return `const ${specifier.local.name} = modules[${JSON.stringify(entry.source.value)}]?.[${JSON.stringify(key)}];`
  }))
  for (const entry of [...imports].reverse()) script = script.slice(0, entry.start) + script.slice(entry.end)
  const names = ['page_transition', 'permissions_ready', 'permission_problem', 'can_open_settings', 'is_leaving',
    'is_report_visible', 'status_copy', 'callee_name', 'callee_avatar_url', 'check_call_permissions', 'cancel_call',
    'waiting_control_toast', 'open_report', 'on_report_submitted', 'open_permission_settings']
  const run = new Function('modules', 'uni', 'getCurrentPages', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    `${bindings.join('\n')}\n${script}\nreturn {${names.join(',')}}`)
  const scope = vue.effectScope()
  const page = scope.run(() => run(modules, { showToast: event => toasts.push(event.title) }, () => Array(depth).fill({}),
    register_timer, id => timers.delete(id), (callback, delay) => register_timer(callback, delay, true), id => timers.delete(id)))
  page.page_transition.value = {
    navigate_relaunch: options => { routes.push(options.url); return true },
    navigate_back: () => { routes.push('back'); return true },
    navigate_replace: () => assert.fail('Production ringing must not simulate a connection')
  }
  hooks.load({ callId: 'test-call', calleeId: '20', calleeName: 'River', calleeAvatar: '/static/logo.png', ...query })
  return { ...page, hooks, timers, permission_calls, sounds, routes, toasts, settings,
    enter: async () => { hooks.show(); await page.check_call_permissions() },
    dispose: () => { hooks.unmount(); scope.stop() } }
}

test('entry requests camera then microphone from the native system and waits for both results', async () => {
  const camera = defer(), microphone = defer()
  const page = mount_page({ permission: name => name === 'camera' ? camera.promise : microphone.promise })
  page.hooks.show()
  assert.deepEqual(page.permission_calls.map(x => x.name), ['camera'])
  assert.equal(page.timers.size, 0)
  assert.equal(page.permissions_ready.value, false)
  camera.resolve(granted)
  await Promise.resolve()
  assert.deepEqual(page.permission_calls.map(x => x.name), ['camera', 'microphone'])
  assert.equal(page.timers.size, 0)
  microphone.resolve(granted)
  await page.check_call_permissions()
  assert.equal(page.permissions_ready.value, true)
  assert.equal(page.status_copy.value, 'Waiting for them to answer')
  assert.equal(page.sounds.includes('waiting'), true)
  assert.equal(page.timers.size, 2)
  assert.ok(page.permission_calls.every(x => x.options.force_refresh === true))
  assert.equal(page.callee_name.value, 'River')
  assert.equal(page.callee_avatar_url.value, '/static/logo.png')
  page.dispose()
})

test('denied or unavailable permissions never start ringing or manufacture success', async () => {
  for (const failed of ['camera', 'microphone']) {
    const page = mount_page({ permission: async name => name === failed ? denied : granted })
    await page.enter()
    assert.equal(page.permissions_ready.value, false)
    assert.equal(page.timers.size, 0)
    assert.match(page.permission_problem.value, /Settings/)
    assert.equal(page.can_open_settings.value, true)
    page.open_permission_settings()
    assert.deepEqual(page.settings, [{ name: failed, options: { open_settings: true } }])
    page.cancel_call()
    assert.deepEqual(page.routes, ['/pages/messages/index'])
    page.dispose()
  }
  const unavailable = mount_page({ permission: async () => ({ permission_status: 'unavailable' }) })
  await unavailable.enter()
  assert.equal(unavailable.permissions_ready.value, false)
  assert.equal(unavailable.can_open_settings.value, false)
  assert.match(unavailable.permission_problem.value, /unavailable/)
  assert.equal(unavailable.timers.size, 0)
  unavailable.dispose()
})

test('late permission callbacks cannot request the next permission or start a cancelled/hidden call', async () => {
  for (const stop of ['cancel', 'hide', 'unmount']) {
    const camera = defer()
    const page = mount_page({ permission: () => camera.promise })
    page.hooks.show()
    const task = page.check_call_permissions()
    if (stop === 'cancel') page.cancel_call()
    else if (stop === 'hide') page.hooks.hide()
    else page.hooks.unmount()
    camera.resolve(granted)
    await task
    assert.equal(page.permission_calls.length, 1)
    assert.equal(page.timers.size, 0)
    assert.equal(page.permissions_ready.value, false)
    assert.equal(page.sounds.includes('waiting'), false)
    page.dispose()
  }
})

test('microphone/camera controls explain availability; hangup keeps the existing return flow', async () => {
  const page = mount_page({ depth: 2 })
  await page.enter()
  page.waiting_control_toast()
  page.waiting_control_toast()
  assert.deepEqual(page.toasts, ['Available after the call connects.', 'Available after the call connects.'])
  page.cancel_call()
  page.cancel_call()
  assert.deepEqual(page.routes, ['back'])
  assert.equal(page.timers.size, 0)
  assert.equal(page.sounds.filter(x => x === 'ended').length, 1)
  page.dispose()
})

test('More pauses the timeout for reporting; closing resumes, and a successful block ends the call', async () => {
  const page = mount_page()
  await page.enter()
  page.open_report()
  await vue.nextTick()
  assert.equal(page.is_report_visible.value, true)
  assert.equal(page.timers.size, 0)
  page.is_report_visible.value = false
  await vue.nextTick()
  assert.equal(page.timers.size, 2)
  page.open_report()
  page.on_report_submitted({ blocked: true })
  await vue.nextTick()
  assert.equal(page.is_leaving.value, true)
  assert.equal(page.timers.size, 0)
  assert.deepEqual(page.routes, ['/pages/messages/index'])
  page.dispose()
})

test('permission revalidation after returning never overlaps the native permission requests', async () => {
  const camera = defer()
  let first = true
  const page = mount_page({ permission: name => {
    if (first && name === 'camera') { first = false; return camera.promise }
    return Promise.resolve(granted)
  } })
  page.hooks.show()
  const initial = page.check_call_permissions()
  page.hooks.hide()
  page.hooks.show()
  assert.equal(page.permission_calls.length, 1)
  camera.resolve(granted)
  await initial
  await page.check_call_permissions()
  assert.equal(page.permissions_ready.value, true)
  assert.deepEqual(page.permission_calls.map(x => x.name), ['camera', 'camera', 'microphone'])
  page.dispose()
})

test('ringing template compiles and waiting/permission/control copy is localized in English and Japanese', async () => {
  const compiled = compileTemplate({ source: descriptor.template.content, filename: 'ringing.vue', id: 'ringing-test' })
  assert.deepEqual(compiled.errors, [])
  for (const language of ['en', 'ja']) {
    const locale = JSON.parse(await readFile(new URL(`src/locales/${language}.json`, root), 'utf8'))
    for (const key of ['Waiting for them to answer', 'Available after the call connects.', 'Report or block', 'Camera and microphone access is needed for a video call. You can change permissions in Settings.']) {
      assert.ok(locale[key])
      if (language === 'ja') assert.notEqual(locale[key], key)
    }
  }
})

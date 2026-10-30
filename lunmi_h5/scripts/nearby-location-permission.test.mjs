import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'

const source = await readFile(new URL('../src/pages/home/index.vue', import.meta.url), 'utf8')
const script = parse(source).descriptor.scriptSetup.content
const statements = babelParse(script, { sourceType: 'module' }).program.body
const declaration = (name) => {
  const node = statements.find((entry) => entry.type === 'VariableDeclaration'
    && entry.declarations.some((item) => item.id.name === name))
  assert.ok(node, `Home controller declares ${name}`)
  return node
}
const state_names = ['feed_scope', 'is_nearby_requesting', 'nearby_request_generation', 'action_message',
  'is_home_shown', 'is_page_active', 'is_permission_request_visible', 'permission_request_key',
  'permission_request_mode', 'permission_request_intent', 'recheck_nearby_on_show']
const state_source = state_names.map((name) => {
  const node = declaration(name)
  return script.slice(node.start, node.end)
}).join('\n')
const choice_source = script.slice(declaration('choose_all').start, declaration('open_posts').start)
const lifecycle_source = statements.filter((node) => node.type === 'ExpressionStatement'
  && node.expression.type === 'CallExpression'
  && ['onShow', 'onHide', 'onBeforeUnmount'].includes(node.expression.callee.name))
  .map((node) => script.slice(node.start, node.end)).join('\n')

const granted = { success: true, granted: true, permission_status: 'granted' }
const denied = { success: false, granted: false, permission_status: 'denied' }
const not_determined = { success: false, granted: false, permission_status: 'unavailable', cancelled: true }
const tick = () => new Promise((resolve) => setImmediate(resolve))
const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((complete, fail) => { resolve = complete; reject = fail })
  return { promise, resolve, reject }
}

// Execute the real page choices and lifecycle callbacks with synthetic permission
// responses. This never requests a device permission, reads account data or calls an API.
const load_controller = (permission = async () => denied, { shown = true } = {}) => {
  const hooks = {}
  const calls = []
  let cache_reads = 0
  const cached_account = {
    getAuthRecord() { cache_reads += 1; return true },
    get authRecord() { cache_reads += 1; return { location: true } }
  }
  const context = vm.createContext({
    ref: (value) => ({ value }),
    storeGlobal: () => cached_account,
    ensure_ios_permission: (kind, options) => {
      calls.push({ kind, options: JSON.parse(JSON.stringify(options)) })
      return permission(kind, options)
    },
    onShow: (hook) => { hooks.show = hook },
    onHide: (hook) => { hooks.hide = hook },
    onBeforeUnmount: (hook) => { hooks.unmount = hook },
    open_caught_sheet: () => false,
    open_scheduled_release_sheet: () => {},
    load_home: () => {},
    cancel_caught_open: () => {},
    clearTimeout: () => {},
    request_context: null,
    purchase_request_context: {},
    scoop_purchase_sync_context: {},
    release_leave_timer: null,
    scoop_remaining: { value: 1 },
    is_caught_visible: { value: true },
    is_caught_suspended: { value: false }
  })
  vm.runInContext(`${state_source}
    let caught_route_query = null
    ${choice_source}
    ${lifecycle_source}
    globalThis.subject = { choose_all, choose_nearby, on_permission_granted, on_permission_denied,
      on_permission_cancelled, on_permission_settings_opened,
      ${state_names.filter((name) => !['nearby_request_generation', 'is_home_shown', 'permission_request_intent', 'recheck_nearby_on_show'].includes(name)).join(', ')},
      permission_intent: () => permission_request_intent,
      settings_recheck_pending: () => recheck_nearby_on_show }
  `, context)
  if (shown) hooks.show()
  return { ...context.subject, hooks, calls, cache_reads: () => cache_reads }
}

test('Nearby silently checks fresh native location status and selects Nearby only for an actual grant', async () => {
  const pending = deferred()
  const home = load_controller(() => pending.promise)
  const request = home.choose_nearby()
  assert.equal(home.feed_scope.value, 'all')
  assert.equal(home.is_nearby_requesting.value, true)
  assert.deepEqual(home.calls, [{ kind: 'location', options: {
    force_refresh: true,
    check_only: true,
    reason: 'Use your location to recommend lanterns from your area when you select Nearby.'
  } }])
  assert.equal(home.is_permission_request_visible.value, false)
  assert.equal(home.permission_request_key.value, '')
  assert.equal(home.permission_intent(), '')
  pending.resolve(granted)
  await request
  assert.equal(home.feed_scope.value, 'nearby')
  assert.equal(home.is_nearby_requesting.value, false)
  assert.equal(home.action_message.value, '')
})

test('denied access offers Settings while restricted or unavailable access stays inline', async () => {
  const fixtures = [
    [denied, /Location access is off/, true],
    [{ ...denied, permanent: true }, /Location access is restricted/, false],
    [{ granted: false, permission_status: 'unavailable', unavailable: true }, /Location access is unavailable/, false],
    [null, /Location access is unavailable/, false]
  ]
  for (const [result, explanation, show_settings] of fixtures) {
    const home = load_controller(async () => result)
    await home.choose_nearby()
    assert.equal(home.feed_scope.value, 'all')
    assert.equal(home.is_nearby_requesting.value, false)
    assert.match(home.action_message.value, explanation)
    assert.equal(home.is_permission_request_visible.value, show_settings)
    if (show_settings) {
      assert.equal(home.permission_request_mode.value, 'settings')
      assert.equal(home.permission_request_key.value, 'location')
      assert.equal(home.permission_intent(), 'nearby')
    }
  }
})

test('an exception releases the pending state and allows a later successful retry', async () => {
  let first = true
  const home = load_controller(async () => {
    if (first) { first = false; throw new Error('Synthetic bridge failure') }
    return granted
  })
  await home.choose_nearby()
  assert.equal(home.feed_scope.value, 'all')
  assert.equal(home.is_nearby_requesting.value, false)
  assert.match(home.action_message.value, /Location access is unavailable/)
  await home.choose_nearby()
  assert.equal(home.calls.length, 2)
  assert.equal(home.feed_scope.value, 'nearby')
})

test('a previously cached grant is never used to bypass the current native decision', async () => {
  const home = load_controller(async () => denied)
  await home.choose_nearby()
  assert.equal(home.cache_reads(), 0)
  assert.equal(home.calls.length, 1)
  assert.equal(home.calls[0].options.force_refresh, true)
  assert.equal(home.feed_scope.value, 'all')
})

test('repeated taps while pending issue only one native request', async () => {
  const pending = deferred()
  const home = load_controller(() => pending.promise)
  const first = home.choose_nearby()
  await home.choose_nearby()
  await home.choose_nearby({ type: 'click' })
  assert.equal(home.calls.length, 1)
  pending.resolve(granted)
  await first
  assert.equal(home.is_nearby_requesting.value, false)
})

test('manual All invalidates a pending authorization or exception without a late UI update', async () => {
  for (const fail of [false, true]) {
    const pending = deferred()
    const home = load_controller(() => pending.promise)
    const first = home.choose_nearby()
    home.choose_all()
    assert.equal(home.feed_scope.value, 'all')
    if (fail) pending.reject(new Error('Synthetic late failure'))
    else pending.resolve(granted)
    await first
    assert.equal(home.feed_scope.value, 'all')
    assert.equal(home.action_message.value, '')
    assert.equal(home.is_nearby_requesting.value, false)
  }
})

test('onHide cancels a pending result even if the user returns before it resolves', async () => {
  const pending = deferred()
  const home = load_controller(() => pending.promise)
  const first = home.choose_nearby()
  home.hooks.hide()
  assert.equal(home.feed_scope.value, 'all')
  home.hooks.show()
  assert.equal(home.calls.length, 1)
  pending.resolve(granted)
  await first
  assert.equal(home.feed_scope.value, 'all')
  assert.equal(home.action_message.value, '')
  assert.equal(home.is_nearby_requesting.value, false)
})

test('hidden or unmounted pages ignore late authorization and reject new permission requests', async () => {
  for (const lifecycle of ['hide', 'unmount']) {
    const pending = deferred()
    const home = load_controller(() => pending.promise)
    const first = home.choose_nearby()
    home.hooks[lifecycle]()
    await home.choose_nearby()
    assert.equal(home.calls.length, 1)
    pending.resolve(granted)
    await first
    assert.equal(home.feed_scope.value, 'all')
    assert.equal(home.action_message.value, '')
  }
  const not_shown = load_controller(async () => granted, { shown: false })
  await not_shown.choose_nearby()
  assert.equal(not_shown.calls.length, 0)
})

test('returning with Nearby selected checks current system status without prompting again', async () => {
  let result = granted
  const home = load_controller(async () => result)
  await home.choose_nearby()
  home.hooks.hide()
  assert.equal(home.feed_scope.value, 'nearby')
  result = denied
  home.hooks.show()
  await tick()
  assert.equal(home.calls.length, 2)
  assert.equal(home.calls[1].options.force_refresh, true)
  assert.equal(home.calls[1].options.check_only, true)
  assert.equal(home.feed_scope.value, 'all')
  assert.match(home.action_message.value, /Location access is off/)
})

test('only literal true suppresses the overlay; click events never become foreground rechecks', async () => {
  const home = load_controller(async () => not_determined)
  await home.choose_nearby({ type: 'click', detail: 1 })
  assert.equal(home.calls[0].options.check_only, true)
  assert.equal(home.is_permission_request_visible.value, true)
  home.on_permission_cancelled()
  await home.choose_nearby(true)
  assert.equal(home.calls[1].options.check_only, true)
  assert.equal(home.calls[1].options.force_refresh, true)
  assert.equal(home.is_permission_request_visible.value, false)
  assert.equal(home.feed_scope.value, 'all')
})

test('an inconsistent permission response never selects Nearby', async () => {
  for (const result of [
    { granted: true, permission_status: 'denied' },
    { granted: false, permission_status: 'granted' },
    { success: false, granted: true, permission_status: 'granted' }
  ]) {
    const home = load_controller(async () => result)
    await home.choose_nearby()
    assert.equal(home.feed_scope.value, 'all')
    assert.equal(home.is_nearby_requesting.value, false)
  }
})

test('a first-time click only queries status before showing the explanation', async () => {
  const home = load_controller(async () => not_determined)
  await home.choose_nearby()
  assert.equal(home.calls.length, 1)
  assert.equal(home.calls[0].options.check_only, true)
  assert.equal(home.feed_scope.value, 'all')
  assert.equal(home.is_permission_request_visible.value, true)
  assert.equal(home.permission_request_key.value, 'location')
  assert.equal(home.permission_request_mode.value, 'explanation')
  assert.equal(home.permission_intent(), 'nearby')
  assert.equal(home.action_message.value, '')
  await home.choose_nearby()
  assert.equal(home.calls.length, 1, 'the visible explanation blocks repeated taps')
})

test('only the real granted event selects Nearby after the explanation', async () => {
  const home = load_controller(async () => not_determined)
  await home.choose_nearby()
  assert.equal(home.feed_scope.value, 'all')
  home.on_permission_granted()
  assert.equal(home.feed_scope.value, 'nearby')
  assert.equal(home.is_permission_request_visible.value, false)
  assert.equal(home.permission_intent(), '')
  assert.equal(home.action_message.value, '')
  assert.equal(home.calls.length, 1)
})

test('denial, Cancel and manual All close the overlay without manufacturing a grant', async () => {
  for (const action of ['on_permission_denied', 'on_permission_cancelled', 'choose_all']) {
    const home = load_controller(async () => not_determined)
    await home.choose_nearby()
    home[action]()
    assert.equal(home.feed_scope.value, 'all', action)
    assert.equal(home.is_permission_request_visible.value, false, action)
    assert.equal(home.permission_intent(), '', action)
    assert.equal(home.settings_recheck_pending(), false, action)
    home.on_permission_granted()
    assert.equal(home.feed_scope.value, 'all', `${action} cleared the old explanation intent`)
  }
})

test('Settings waits for a real foreground query before selecting Nearby', async () => {
  let result = denied
  const home = load_controller(async () => result)
  await home.choose_nearby()
  assert.equal(home.permission_request_mode.value, 'settings')
  home.on_permission_settings_opened()
  assert.equal(home.feed_scope.value, 'all')
  assert.equal(home.is_permission_request_visible.value, false)
  assert.equal(home.permission_intent(), '')
  assert.equal(home.settings_recheck_pending(), true)
  assert.equal(home.calls.length, 1, 'opening Settings does not request or grant permission')
  home.on_permission_granted()
  assert.equal(home.feed_scope.value, 'all')
  home.hooks.hide()
  result = granted
  home.hooks.show()
  await tick()
  assert.equal(home.calls.length, 2)
  assert.equal(home.calls[1].options.check_only, true)
  assert.equal(home.settings_recheck_pending(), false)
  assert.equal(home.feed_scope.value, 'nearby')
})

test('returning from Settings without a grant never reopens an overlay automatically', async () => {
  for (const result of [denied, not_determined, { ...denied, permanent: true }]) {
    let next_result = denied
    const home = load_controller(async () => next_result)
    await home.choose_nearby()
    home.on_permission_settings_opened()
    home.hooks.hide()
    next_result = result
    home.hooks.show()
    await tick()
    assert.equal(home.calls.length, 2)
    assert.equal(home.calls[1].options.check_only, true)
    assert.equal(home.feed_scope.value, 'all')
    assert.equal(home.is_permission_request_visible.value, false)
    assert.equal(home.settings_recheck_pending(), false)
  }
})

test('leaving an explanation clears it so a late component grant cannot select Nearby after return', async () => {
  const home = load_controller(async () => not_determined)
  await home.choose_nearby()
  home.hooks.hide()
  assert.equal(home.is_permission_request_visible.value, false)
  assert.equal(home.permission_intent(), '')
  home.hooks.show()
  home.on_permission_granted()
  assert.equal(home.feed_scope.value, 'all')
  assert.equal(home.calls.length, 1)
})

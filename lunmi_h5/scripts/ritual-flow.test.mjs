import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
import { babelParse, parse } from '@vue/compiler-sfc'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import * as handoff from '../src/utils/ritualHandoff.js'
import * as release from '../src/utils/releaseLanternPresentation.js'
import * as scoop from '../src/utils/scoopLanternPresentation.js'
import * as wish from '../src/utils/wishSheetPresentation.js'

// Controller fixtures use local responses only, without signing in or writing to a service.
const root = new URL('../', import.meta.url)
const theme = JSON.parse(await readFile(new URL('src/config/theme.json', root), 'utf8'))
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const load_page = async (filename, dependencies, fields) => {
  let script = parse(await readFile(new URL(filename, root), 'utf8')).descriptor.scriptSetup.content
  const imports = babelParse(script, { sourceType: 'module' }).program.body.filter(node => node.type === 'ImportDeclaration')
  for (const entry of imports.reverse()) script = script.slice(0, entry.start) + script.slice(entry.end)
  const hooks = {}
  const context = vm.createContext({ ref, computed, watch, nextTick, theme, ...handoff, ...release, ...scoop, ...wish,
    ...Object.fromEntries(['onLoad', 'onReady', 'onBackPress', 'onUnload', 'onBeforeUnmount', 'onMounted'].map(name => [name, callback => { hooks[name] = callback }])), ...dependencies })
  vm.runInContext(script + '\nglobalThis.subject = {' + fields.join(',') + '}', context)
  return { ...context.subject, hooks }
}
const navigation = routes => Object.fromEntries(['navigate_relaunch', 'navigate_replace', 'navigate_back'].map(method => [method, options => { routes.push(options); return true }]))
const caught = { lanternId: 8, lanternScoopId: 21, scooperUserId: 9, scoopStatus: 'active', scoopRemaining: 2, lantern: { lanternId: 8, ownerUserId: 4, content: 'Fixture', anonymousDisplay: 1 } }
const load_scoop = async response => {
  const routes = [], saved = [], account = { userId: 9 }
  let requests = 0
  const page = await load_page('src/pages/lantern/scoop/index.vue', {
    storeGlobal: () => account, addLmLanternScoop: () => { requests++; return response },
    save_pending_caught_lantern: value => { saved.push(value); return true }, getCurrentPages: () => []
  }, ['page_transition', 'start_scoop', 'retry_search', 'skip_scoop', 'finish_caught_scoop_flow', 'is_scooping', 'is_catch_ready', 'is_empty', 'load_error'])
  page.page_transition.value = navigation(routes)
  return { ...page, routes, saved, account, requests: () => requests }
}
const load_wish = async (response, id, remember = true) => {
  const routes = [], account = { userId: 'wish-qa' }
  if (remember) handoff.remember_ritual('wish', account.userId, id, 'high')
  const page = await load_page('src/pages/wish/create/index.vue', { storeGlobal: () => account, selectLmWishPage: () => response },
    ['page_transition', 'wish_ready', 'branch_level', 'load_error', 'on_rise_end', 'skip_rise'])
  page.page_transition.value = navigation(routes)
  page.hooks.onLoad({ wishId: id })
  return { ...page, routes, account }
}

test('publish evidence is account-scoped, expires and is consumed only once', t => {
  let now = 1000
  t.mock.method(Date, 'now', () => now)
  handoff.remember_ritual('release', 'one', 'lamp')
  assert.equal(handoff.take_ritual('release', 'two', 'lamp'), null)
  assert.equal(handoff.take_ritual('release', 'one', 'other'), null)
  assert.equal(handoff.take_ritual('release', 'one', 'lamp').entity_id, 'lamp')
  assert.equal(handoff.take_ritual('release', 'one', 'lamp'), null)
  handoff.remember_ritual('release', 'one', 'lamp'); now += 60001
  assert.equal(handoff.take_ritual('release', 'one', 'lamp'), null)
})
test('scoop waits for valid data and returns one caught result without another request', async () => {
  const pending = deferred(), page = await load_scoop(pending.promise)
  const request = page.start_scoop(); await page.start_scoop(); page.finish_caught_scoop_flow()
  assert.equal(page.requests(), 1); assert.equal(page.is_catch_ready.value, false); assert.equal(page.routes.length, 0)
  pending.resolve({ success: true, data: caught }); await request
  assert.equal(page.is_catch_ready.value, true); assert.equal(page.routes.length, 0)
  page.finish_caught_scoop_flow(); page.finish_caught_scoop_flow(); await flush()
  assert.equal(page.requests(), 1); assert.equal(page.routes.length, 1); assert.equal(page.saved.at(-1).lantern_id, 8)
})
test('empty, failed, incomplete and wrong-account scoop responses cannot celebrate', async () => {
  for (const response of [{ success: true, data: null }, { success: false }, { success: true, data: {} }, { success: true, data: { ...caught, scooperUserId: 99 } }]) {
    const page = await load_scoop(Promise.resolve(response)); await page.start_scoop(); page.finish_caught_scoop_flow()
    assert.equal(page.is_catch_ready.value, false); assert.equal(page.routes.length, 0)
    if (response.data === null) assert.equal(page.is_empty.value, true)
  }
})
test('an account change during the catch animation cannot open another account result', async () => {
  const page = await load_scoop(Promise.resolve({ success: true, data: caught }))
  await page.start_scoop()
  const saved = page.saved.length
  page.account.userId = 99
  page.finish_caught_scoop_flow()
  await flush()
  assert.equal(page.is_catch_ready.value, false)
  assert.equal(page.saved.length, saved)
  assert.equal(page.routes.length, 0)
})
test('leaving or changing account during scoop discards a late response', async () => {
  for (const leave of [true, false]) {
    const pending = deferred(), page = await load_scoop(pending.promise), request = page.start_scoop()
    if (leave) page.skip_scoop(); else page.account.userId = 99
    const navigations = page.routes.length
    pending.resolve({ success: true, data: caught }); await request; page.finish_caught_scoop_flow()
    assert.equal(page.is_catch_ready.value, false); assert.equal(page.routes.length, navigations); assert.equal(page.saved.length, 0)
  }
})
test('wish animation requires publish evidence and successful record confirmation', async () => {
  const page = await load_wish(Promise.resolve({ success: true, data: { records: [{ wishId: 'w1' }] } }), 'w1'); await flush()
  assert.equal(page.wish_ready.value, true); assert.equal(page.branch_level.value, 'high'); assert.equal(page.routes.length, 0)
  page.on_rise_end(); page.on_rise_end()
  assert.equal(page.routes.length, 1); assert.equal(page.routes[0].url, wish.build_tree_published_url())
  assert.equal(handoff.take_ritual('wish', page.account.userId, 'w1').branch_level, 'high')
})
test('route flags, missing records and failed confirmation never show wish success', async () => {
  for (const [id, response, remember] of [ ['w2', { success: true, data: { wishId: 'w2' } }, false], ['w3', { success: true, data: { records: [] } }, true], ['w4', { success: false }, true], ['w5', { success: true, data: { wishId: 'w5', deleted: 1 } }, true] ]) {
    const page = await load_wish(Promise.resolve(response), id, remember); await flush(); page.on_rise_end()
    assert.equal(page.wish_ready.value, false); assert.equal(page.routes.length, 0)
    page.skip_rise(); assert.equal(page.routes[0].url, wish.WISH_TREE_PATH)
  }
})
test('skip and unload prevent a delayed wish response from completing navigation', async () => {
  for (const [id, unload] of [['w6', false], ['w7', true]]) {
    const pending = deferred(), page = await load_wish(pending.promise, id)
    if (unload) page.hooks.onUnload(); else page.skip_rise()
    const navigations = page.routes.length
    pending.resolve({ success: true, data: { wishId: id } }); await flush(); page.on_rise_end()
    assert.equal(page.wish_ready.value, false); assert.equal(page.routes.length, navigations)
  }
})
test('release consumes publish evidence; direct routes do not replay success', async () => {
  for (const real of [false, true]) {
    const routes = []
    if (real) handoff.remember_ritual('release', 'release-qa', '8')
    const page = await load_page('src/pages/lantern/release/index.vue', { storeGlobal: () => ({ userId: 'release-qa' }) }, ['page_transition', 'has_release', 'finish_release'])
    page.page_transition.value = navigation(routes); page.hooks.onLoad({ lanternId: 8 }); assert.equal(page.has_release.value, real)
    page.hooks.onReady()
    if (real) { assert.equal(routes.length, 0); page.finish_release(); page.finish_release() }
    assert.equal(routes.length, 1)
  }
})
test('completion pauses offscreen, respects reduced motion and emits only once', async () => {
  const props = reactive({ state: 'waiting', kind: 'scoop', branchLevel: 'mid' }), activity = { is_visible: ref(false), is_reduced: ref(false) }
  const timers = new Map(), emitted = []; let sequence = 0
  const page = await load_page('src/components/LanternRitual.vue', {
    defineProps: () => props, defineEmits: () => type => emitted.push(type), use_ambient_activity: () => activity,
    setTimeout: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id }, clearTimeout: id => timers.delete(id)
  }, ['complete', 'mark_art_ready'])
  props.state = 'complete'; await nextTick(); assert.equal(timers.size, 0)
  activity.is_visible.value = true; await nextTick(); assert.equal(timers.size, 0)
  page.mark_art_ready(); await nextTick(); const old = [...timers.values()][0]; assert.equal(old.delay, 1320)
  activity.is_visible.value = false; await nextTick(); old.callback(); assert.equal(emitted.length, 0)
  activity.is_reduced.value = true; activity.is_visible.value = true; await nextTick()
  const reduced = [...timers.values()][0]; assert.equal(reduced.delay, 120); reduced.callback(); page.complete()
  assert.deepEqual(emitted, ['complete']); page.hooks.onBeforeUnmount()
})

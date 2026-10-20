import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { babelParse } from '@vue/compiler-sfc'
import { ref } from 'vue'
import { register_browser_history_guard } from '../src/utils/browserHistoryGuard.js'

const setup = ({ position = 3, depth = 1, logged_in = true } = {}) => {
  const listeners = []
  const hooks = []
  const timers = new Map()
  const go_calls = []
  let timer_id = 0
  let bubble_calls = 0
  const browser = {
    history: { state: { position }, go: (delta) => go_calls.push(delta) },
    location: { hash: '#/pages/home/index' },
    addEventListener: (name, listener, capture = false) => listeners.push({ name, listener, capture }),
    removeEventListener: (name, listener) => {
      const index = listeners.findIndex((entry) => entry.name === name && entry.listener === listener)
      if (index >= 0) listeners.splice(index, 1)
    },
    setTimeout: (callback) => { timers.set(++timer_id, callback); return timer_id },
    clearTimeout: (id) => timers.delete(id)
  }
  globalThis.window = browser
  globalThis.getCurrentPages = () => Array.from({ length: depth })
  // uni installs this before the app mounts. Capture must still run first.
  browser.addEventListener('popstate', () => { bubble_calls++ })
  const router = {
    afterEach: (hook) => {
      hooks.push(hook)
      return () => { hooks.splice(hooks.indexOf(hook), 1) }
    }
  }
  const dispose = register_browser_history_guard({ router, has_session: () => logged_in })
  return {
    go_calls,
    timers,
    get bubble_calls() { return bubble_calls },
    get hook_count() { return hooks.length },
    set_depth: (value) => { depth = value },
    pop: (next_position, path) => {
      browser.history.state = next_position === null ? null : { position: next_position }
      browser.location.hash = `#${path}`
      let stopped = false
      const event = { state: browser.history.state, stopImmediatePropagation: () => { stopped = true } }
      for (const { listener } of [...listeners].sort((a, b) => Number(b.capture) - Number(a.capture))) {
        if (!stopped) listener(event)
      }
      return stopped
    },
    commit: (next_position, failure = null) => {
      browser.history.state = { position: next_position }
      hooks.forEach((hook) => hook({}, {}, failure))
    },
    dispose: () => {
      dispose()
      delete globalThis.window
      delete globalThis.getCurrentPages
    }
  }
}

test('login history is intercepted before uni can remove the home page; restoration also stays private', () => {
  const browser = setup()
  try {
    assert.equal(browser.pop(2, '/pages/login/index'), true)
    assert.deepEqual(browser.go_calls, [1])
    assert.equal(browser.bubble_calls, 0)
    assert.equal(browser.pop(3, '/pages/home/index'), true)
    assert.equal(browser.bubble_calls, 0)
    assert.equal(browser.timers.size, 0)
  } finally { browser.dispose() }
})

test('forward swipe cannot recreate the detail page after returning; explicit reopening remains allowed', () => {
  const browser = setup({ position: 0 })
  try {
    assert.equal(browser.pop(1, '/pages/wish/detail/index?wishId=42'), true)
    assert.deepEqual(browser.go_calls, [-1])
    assert.equal(browser.bubble_calls, 0)
    browser.pop(0, '/pages/home/index')
    // A click uses router.push, not a popstate event, and starts a fresh route.
    browser.commit(1)
    browser.set_depth(2)
    assert.equal(browser.pop(0, '/pages/home/index'), false)
    assert.equal(browser.bubble_calls, 1)
  } finally { browser.dispose() }
})

test('normal detail returns, multi-level returns, and legal pages keep browser/uni navigation working', () => {
  const browser = setup({ position: 4, depth: 3 })
  try {
    assert.equal(browser.pop(3, '/pages/profile/user-agreement?type=terms'), false)
    browser.commit(3)
    browser.set_depth(2)
    assert.equal(browser.pop(2, '/pages/home/index'), false)
    browser.commit(2)
    browser.set_depth(1)
    assert.equal(browser.pop(1, '/pages/welcome/index'), true)
    assert.equal(browser.bubble_calls, 2)
  } finally { browser.dispose() }
})

test('logout root cannot go back to old protected content even with no active login session', () => {
  const browser = setup({ position: 5, logged_in: false })
  try {
    assert.equal(browser.pop(4, '/pages/messages/chat?targetUserId=9'), true)
    assert.deepEqual(browser.go_calls, [1])
  } finally { browser.dispose() }
})

test('rapid history traversals recover to the last accepted page, while failed navigation does not change it', () => {
  const browser = setup()
  try {
    browser.commit(4, new Error('Failed navigation'))
    browser.pop(2, '/pages/login/index')
    browser.pop(1, '/pages/welcome/index')
    assert.deepEqual(browser.go_calls, [1, 2])
    assert.equal(browser.pop(3, '/pages/home/index'), true)
    assert.equal(browser.timers.size, 0)
  } finally { browser.dispose() }
})

test('unknown cross-document history is left to WebView; disposal removes listeners, hooks and recovery timers', () => {
  const browser = setup()
  try {
    assert.equal(browser.pop(null, '/pages/login/index'), false)
    browser.pop(2, '/pages/login/index')
    assert.equal(browser.timers.size, 1)
    browser.dispose()
    assert.equal(browser.hook_count, 0)
    assert.equal(browser.timers.size, 0)
  } finally { delete globalThis.window; delete globalThis.getCurrentPages }
})

test('H5 navigation fallbacks append only a Push; replace and reLaunch replace the current hash entry', async () => {
  let source = await readFile(new URL('../src/utils/routeTransition.js', import.meta.url), 'utf8')
  const imports = babelParse(source, { sourceType: 'module' }).program.body.filter((node) => node.type === 'ImportDeclaration')
  for (const node of imports.reverse()) source = source.slice(0, node.start) + source.slice(node.end)
  source = source.replace(/^export /gm, '')
  const replacements = []
  const location = {
    hash: '#/pages/home/index',
    replace: (hash) => { replacements.push(hash); location.hash = hash }
  }
  const context = vm.createContext({ ref, window: { location } })
  vm.runInContext(`${source}\nglobalThis.subject = { push_route, replace_route, relaunch_route }`, context)
  context.subject.push_route({ url: '/pages/wish/detail/index?wishId=42' })
  assert.equal(location.hash, '#/pages/wish/detail/index?wishId=42')
  assert.equal(replacements.length, 0)
  context.subject.replace_route({ url: '/pages/messages/index' })
  context.subject.relaunch_route({ url: '/pages/home/index' })
  assert.deepEqual(replacements, ['#/pages/messages/index', '#/pages/home/index'])
})

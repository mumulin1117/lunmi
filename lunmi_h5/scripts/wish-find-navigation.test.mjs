import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'
import { computed, nextTick, ref } from 'vue'
import * as attempts from '../src/utils/lanternHomePresentation.js'
import * as finding from '../src/utils/wishFindingPresentation.js'
import { envelope, load_api } from './api-test-helpers.mjs'

const root = new URL('../', import.meta.url)
const without_imports = (source) => {
  const imports = babelParse(source, { sourceType: 'module' }).program.body
    .filter((node) => node.type === 'ImportDeclaration')
  return imports.reverse().reduce((result, node) => (
    result.slice(0, node.start) + result.slice(node.end)
  ), source)
}

const load_setup = async (path, dependencies, fields) => {
  const { descriptor } = parse(await readFile(new URL(path, root), 'utf8'))
  const hooks = {}
  const context = vm.createContext({
    ref,
    nextTick,
    onBeforeUnmount: (hook) => { hooks.unmount = hook },
    ...Object.fromEntries(['onLoad', 'onShow', 'onReady', 'onBackPress'].map((name) => (
      [name, (hook) => { hooks[name] = hook }]
    ))),
    ...dependencies
  })
  const source = without_imports(descriptor.scriptSetup.content)
  vm.runInContext(`${source}\nglobalThis.subject = { ${fields.join(', ')} }`, context)
  return { ...context.subject, hooks }
}

const load_routes = async () => {
  const source = without_imports(await readFile(new URL('src/utils/routeTransition.js', root), 'utf8'))
    .replace(/^export /gm, '')
  const timers = new Map()
  const registrations = []
  const mount_hooks = []
  let instance = null
  let timer_id = 0
  const context = vm.createContext({
    ref,
    computed,
    nextTick,
    getCurrentInstance: () => instance,
    onBeforeUnmount: () => {},
    onMounted: (hook) => { mount_hooks.push(hook) },
    onShow: (hook, target) => { registrations.push({ name: 'show', hook, target }) },
    onHide: (hook, target) => { registrations.push({ name: 'hide', hook, target }) },
    setTimeout: (hook) => {
      const id = ++timer_id
      timers.set(id, hook)
      return id
    },
    clearTimeout: (id) => { timers.delete(id) },
    uni: {}
  })
  vm.runInContext(`${source}\nglobalThis.routes = { use_route_transition }`, context)
  return {
    context,
    timers,
    create: () => {
      const page = { proxy: { $mpType: 'page' } }
      instance = { proxy: { $mpType: 'component' }, parent: page }
      const mount_start = mount_hooks.length
      const transition = context.routes.use_route_transition({ initial_variant: 'ios-stack' })
      const hooks = mount_hooks.slice(mount_start)
      return { page, transition, mount: () => hooks.forEach((hook) => hook()) }
    },
    emit: (page, name) => {
      registrations.filter((item) => item.target === page && item.name === name)
        .forEach((item) => item.hook())
    }
  }
}

const install_stack_dom = (routes, source_path) => {
  const snapshots = new Set()
  const listeners = new Map()
  const frames = new Map()
  let frame_id = 0
  const parent = { insertBefore: (element) => { snapshots.add(element) } }
  const element = (path = '') => {
    const classes = new Set()
    return {
      childNodes: [],
      parentElement: parent,
      style: { setProperty: () => {} },
      classList: {
        add: (name) => { classes.add(name) },
        remove: (name) => { classes.delete(name) },
        contains: (name) => classes.has(name)
      },
      getAttribute: () => path,
      setAttribute: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      remove: function () { snapshots.delete(this) }
    }
  }
  const pages = [element(source_path)]
  routes.context.document = {
    querySelectorAll: () => pages,
    createElement: () => element()
  }
  routes.context.window = {
    addEventListener: (name, hook) => { listeners.set(name, hook) },
    removeEventListener: (name) => { listeners.delete(name) }
  }
  routes.context.requestAnimationFrame = (hook) => {
    frames.set(++frame_id, hook)
    return frame_id
  }
  routes.context.cancelAnimationFrame = (id) => { frames.delete(id) }
  return {
    pages,
    snapshots,
    listeners,
    push: (path) => { pages.push(element(path)) },
    pop: () => { pages.pop(); listeners.get('popstate')?.() },
    flush: () => {
      for (let count = 0; frames.size && count < 20; count += 1) {
        const pending = [...frames.values()]
        frames.clear()
        pending.forEach((hook) => hook())
      }
      assert.equal(frames.size, 0)
    }
  }
}

test('nested wish and profile routes preserve the middle page and clean only the returned level', async () => {
  const paths = [
    ['/pages/wish/tree/index', '/pages/wish/detail/index', '/pages/community/user/index'],
    ['/pages/profile/index', '/pages/profile/settings', '/pages/profile/language/index']
  ]
  for (const [first_path, middle_path, last_path] of paths) {
    const routes = await load_routes()
    const dom = install_stack_dom(routes, first_path)
    const first = routes.create()
    let active = first
    const stack = [first]
    routes.context.uni.navigateTo = (options) => {
      routes.emit(active.page, 'hide')
      dom.push(options.url)
    }
    routes.context.uni.navigateBack = (options) => {
      stack.pop()
      active = stack.at(-1)
      dom.pop()
      routes.emit(active.page, 'show')
      options.complete?.({ errMsg: 'navigateBack:ok' })
    }
    first.transition.navigate_forward({ url: middle_path })
    const middle = routes.create()
    active = middle
    stack.push(middle)
    middle.mount()
    await nextTick()
    dom.flush()
    middle.transition.navigate_forward({ url: last_path })
    const last = routes.create()
    active = last
    stack.push(last)
    last.mount()
    await nextTick()
    dom.flush()
    assert.equal(dom.snapshots.size, 2)
    last.transition.navigate_back()
    last.transition.complete_route_leave()
    dom.flush()
    assert.equal(dom.snapshots.size, 1)
    assert.equal(dom.pages.at(-1).classList.contains('route-stack-page--foreground'), true)
    assert.equal(middle.transition.is_route_navigating.value, false)
    assert.equal(middle.transition.route_transition_name.value, 'page-route-none')
    middle.transition.navigate_back({ immediate: true })
    dom.flush()
    assert.equal(dom.snapshots.size, 0)
    assert.equal(dom.listeners.size, 0)
    assert.equal(first.transition.is_route_navigating.value, false)
  }
})

test('page lifecycle releases navigation lock and repeated finds return without page motion', async () => {
  const routes = await load_routes()
  const tree = routes.create()
  let calls = 0
  routes.context.uni.navigateTo = (options) => {
    calls += 1
    routes.emit(tree.page, 'hide')
    options.complete?.({ errMsg: 'navigateTo:ok' })
  }
  routes.context.uni.navigateBack = (options) => {
    assert.equal(options.animationType, 'none')
    assert.equal(options.animationDuration, 0)
    assert.equal('immediate' in options, false)
    routes.emit(tree.page, 'show')
    options.complete?.({ errMsg: 'navigateBack:ok' })
  }
  for (let index = 0; index < 3; index += 1) {
    assert.equal(tree.transition.navigate_forward({ url: finding.FINDING_PAGE_PATH }), true)
    assert.equal(tree.transition.navigate_forward({ url: finding.FINDING_PAGE_PATH }), false)
    const search = routes.create()
    assert.equal(search.transition.navigate_back({ immediate: true }), true)
    assert.equal(tree.transition.is_route_navigating.value, false)
    assert.equal(tree.transition.is_page_visible.value, true)
    assert.equal(tree.transition.route_transition_name.value, 'page-route-none')
    assert.equal(routes.timers.size, 0)
  }
  assert.equal(calls, 3)
})

test('ordinary stack return does not replay source animation; failed navigation can retry', async () => {
  const routes = await load_routes()
  const tree = routes.create()
  routes.context.uni.navigateTo = () => { routes.emit(tree.page, 'hide') }
  tree.transition.navigate_forward({ url: finding.FINDING_PAGE_PATH })
  const search = routes.create()
  routes.context.uni.navigateBack = (options) => {
    routes.emit(tree.page, 'show')
    options.complete?.({ errMsg: 'navigateBack:ok' })
  }
  search.transition.navigate_back()
  assert.equal(routes.timers.size, 1)
  search.transition.complete_route_leave()
  assert.equal(routes.timers.size, 0)
  assert.equal(tree.transition.route_transition_name.value, 'page-route-none')

  routes.context.uni.navigateBack = (options) => {
    options.fail({ errMsg: 'navigateBack:fail' })
    options.complete?.({ errMsg: 'navigateBack:fail' })
  }
  const failed = routes.create()
  assert.equal(failed.transition.navigate_back({ immediate: true }), true)
  assert.equal(failed.transition.is_route_navigating.value, false)
  assert.equal(failed.transition.is_page_visible.value, true)
  assert.equal(failed.transition.navigate_back({ immediate: true }), true)
})

test('direct relaunch fallback has no target entry animation and restores lock after failure', async () => {
  const routes = await load_routes()
  const search = routes.create()
  routes.context.uni.reLaunch = (options) => {
    options.fail({ errMsg: 'reLaunch:fail' })
  }
  search.transition.navigate_relaunch({ url: '/pages/wish/tree/index', immediate: true })
  assert.equal(search.transition.is_route_navigating.value, false)
  routes.context.uni.reLaunch = () => {}
  assert.equal(search.transition.navigate_relaunch({ url: '/pages/wish/tree/index', immediate: true }), true)
  const tree = routes.create()
  assert.equal(tree.transition.route_transition_name.value, 'page-route-none')
  assert.equal(routes.timers.size, 0)
})

test('finding waits for animation, returns to the tree directly and allows programmatic back', async () => {
  const theme = JSON.parse(await readFile(new URL('src/config/theme.json', root), 'utf8'))
  const api = await load_api('src/api/wish.js', () => envelope(200000, { wishId: 42, content: 'A wish' }))
  const navigations = []
  const timers = new Map()
  const search = await load_setup('src/pages/wish/finding/index.vue', {
    theme,
    ...finding,
    WISH_TREE_PATH: '/pages/wish/tree/index',
    selectRandomLmWish: api.api.selectRandomLmWish,
    storeGlobal: () => ({ userId: 7 }),
    save_found_wish_random_detail: () => true,
    getCurrentPages: () => [{ route: 'pages/wish/tree/index' }, { route: 'pages/wish/finding/index' }],
    setTimeout: (hook) => { timers.set(1, hook); return 1 },
    clearTimeout: (id) => { timers.delete(id) }
  }, ['page_transition', 'search_wishes', 'on_search_end', 'skip_search', 'found_id'])
  search.page_transition.value = {
    navigate_back: (options) => { navigations.push(options); return true }
  }
  await search.search_wishes()
  assert.equal(search.found_id.value, '42')
  assert.equal(navigations.length, 0)
  search.on_search_end()
  search.on_search_end()
  assert.equal(navigations.length, 1)
  assert.equal(navigations[0].immediate, true)
  assert.equal(search.hooks.onBackPress({ from: 'navigateBack' }), false)
  assert.equal(api.calls.length, 1)
  search.hooks.unmount()
  assert.equal(timers.size, 0)
})

test('tree opens the sheet on the next render and starts another find after dismissal', async () => {
  const theme = JSON.parse(await readFile(new URL('src/config/theme.json', root), 'utf8'))
  const api = await load_api('src/api/userModule.js', () => envelope(200000, true))
  let pending_id = '42'
  let navigations = 0
  const tree = await load_setup('src/pages/wish/tree/index.vue', {
    theme,
    ...attempts,
    ...finding,
    saveLmUserModuleData: api.api.saveLmUserModuleData,
    storeGlobal: () => ({ userId: 7 }),
    read_pending_found_wish_id: () => pending_id,
    getCurrentPages: () => [{ options: {} }],
    setTimeout: () => { throw new Error('Sheet opening must not wait for a route timer') }
  }, ['page_transition', 'found_wish_id', 'schedule_open_found_wish', 'close_found_wish',
    'open_find', 'find_remaining', 'attempt_record', 'is_find_consuming', 'action_message'])
  tree.page_transition.value = {
    navigate_forward: () => { navigations += 1; return true }
  }
  tree.find_remaining.value = 3
  tree.attempt_record.value = { user_module_data_id: 9 }
  for (let index = 0; index < 3; index += 1) {
    await tree.open_find()
    assert.equal(tree.is_find_consuming.value, false)
    tree.schedule_open_found_wish()
    assert.equal(tree.found_wish_id.value, '')
    await nextTick()
    assert.equal(tree.found_wish_id.value, pending_id)
    tree.close_found_wish(false)
    assert.equal(tree.found_wish_id.value, '')
    pending_id = `${43 + index}`
  }
  assert.equal(navigations, 3)
  assert.equal(api.calls.length, 3)
  assert.equal(tree.find_remaining.value, 0)
  tree.hooks.unmount()
})

test('tree uses the latest random result ahead of an old route ID and consumes the route once', async () => {
  const theme = JSON.parse(await readFile(new URL('src/config/theme.json', root), 'utf8'))
  let pending_id = '55'
  const tree = await load_setup('src/pages/wish/tree/index.vue', {
    theme,
    ...attempts,
    ...finding,
    storeGlobal: () => ({ userId: 7 }),
    read_pending_found_wish_id: () => pending_id,
    getCurrentPages: () => [{ options: { foundWishId: '42' } }]
  }, ['found_wish_id', 'schedule_open_found_wish', 'close_found_wish'])
  tree.schedule_open_found_wish()
  await nextTick()
  assert.equal(tree.found_wish_id.value, '55')
  tree.close_found_wish(false)
  pending_id = ''
  tree.schedule_open_found_wish()
  await nextTick()
  assert.equal(tree.found_wish_id.value, '')
  pending_id = '55'
  tree.schedule_open_found_wish()
  await nextTick()
  assert.equal(tree.found_wish_id.value, '55')
  tree.hooks.unmount()
})

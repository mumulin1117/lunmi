import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { babelParse, compileTemplate, parse } from '@vue/compiler-sfc'
import * as vue from 'vue'
import * as storage from '../src/utils/profileGuideStorage.js'
import { set_app_language, t } from '../src/utils/i18n.js'

const root = new URL('../', import.meta.url)
const strip_imports = source => babelParse(source, { sourceType: 'module' }).program.body
  .filter(node => node.type === 'ImportDeclaration').reverse()
  .reduce((result, node) => result.slice(0, node.start) + result.slice(node.end), source)
const source = await readFile(new URL('src/components/ProfileAvatarGuide.vue', root), 'utf8')
const { descriptor } = parse(source)
const theme = JSON.parse(await readFile(new URL('src/config/theme.json', root), 'utf8'))
const memory_storage = () => {
  const memory = new Map()
  globalThis.uni = { getStorageSync: key => memory.get(key), setStorageSync: (key, value) => memory.set(key, value),
    removeStorageSync: key => memory.delete(key), clearStorageSync: () => memory.clear() }
  return memory
}
const mount_guide = (context_name = 'scoop', eligible = true) => {
  const props = vue.reactive({ context: context_name, eligible })
  const timers = new Map()
  const scope = vue.effectScope()
  let sequence = 0, unmount
  const context = vm.createContext({ ...vue, ...storage, theme,
    defineProps: () => props, defineExpose() {}, onBeforeUnmount: hook => { unmount = hook },
    setTimeout: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id },
    clearTimeout: id => timers.delete(id) })
  scope.run(() => vm.runInContext(`${strip_imports(descriptor.scriptSetup.content)}\nglobalThis.subject={is_visible,dismiss,guide_style}`, context))
  const compiled = compileTemplate({ source: descriptor.template.content, filename: 'ProfileAvatarGuide.vue', id: 'test' })
  assert.deepEqual(compiled.errors, [])
  babelParse(compiled.code, { sourceType: 'module' }).program.body
    .filter(node => node.type === 'ImportDeclaration').forEach(node => node.specifiers.forEach(specifier => {
      const name = specifier.imported.name
      context[specifier.local.name] = name === 'resolveComponent' ? name => name : vue[name]
    }))
  vm.runInContext(strip_imports(compiled.code).replace('export function render', 'function render'), context)
  return { ...context.subject, props, timers,
    reveal: () => { for (const [id, item] of timers) { timers.delete(id); item.callback() } },
    render: () => context.render(vue.proxyRefs({ ...context.subject, ...props, $t: t }), []),
    dispose: () => { unmount(); scope.stop() } }
}
const nodes = node => {
  if (!node || typeof node === 'string') return node ? [node] : []
  const children = typeof node.children?.default === 'function' ? node.children.default() : node.children
  return [node, ...(Array.isArray(children) ? children.flatMap(nodes) : nodes(children))]
}

test('first eligible result shows after entry, persists once, and Scoop/Wish are independent', () => {
  memory_storage()
  const first = mount_guide()
  assert.equal(first.is_visible.value, false)
  assert.equal([...first.timers.values()][0].delay, 700)
  assert.equal(storage.has_presented_profile_guide('scoop'), false)
  first.reveal()
  assert.equal(first.is_visible.value, true)
  assert.equal(storage.has_presented_profile_guide('scoop'), true)
  assert.equal(storage.has_presented_profile_guide('wish'), false)
  first.dispose()
  const returning = mount_guide()
  assert.equal(returning.timers.size, 0)
  assert.equal(returning.is_visible.value, false)
  returning.dispose()
  const wish = mount_guide('wish')
  wish.reveal()
  assert.equal(wish.is_visible.value, true)
  assert.equal(storage.has_presented_profile_guide('wish'), true)
  wish.dispose()
})

test('closing, hiding or lacking an eligible avatar cancels presentation without consuming it', async () => {
  memory_storage()
  const guide = mount_guide('scoop', false)
  assert.equal(guide.timers.size, 0)
  guide.props.eligible = true
  await vue.nextTick()
  const delayed = [...guide.timers.values()][0].callback
  guide.props.eligible = false
  await vue.nextTick()
  assert.equal(guide.timers.size, 0)
  delayed()
  assert.equal(guide.is_visible.value, false)
  assert.equal(storage.has_presented_profile_guide('scoop'), false)
  guide.props.eligible = true
  await vue.nextTick()
  guide.dispose()
  assert.equal(guide.timers.size, 0)
  assert.equal(storage.has_presented_profile_guide('scoop'), false)
})

test('Got it and an early avatar visit dismiss the hint without replay on return', async () => {
  for (const early of [false, true]) {
    memory_storage()
    const guide = mount_guide()
    if (!early) guide.reveal()
    guide.dismiss()
    assert.equal(guide.is_visible.value, false)
    assert.equal(guide.timers.size, 0)
    assert.equal(storage.has_presented_profile_guide('scoop'), true)
    guide.props.eligible = false
    await vue.nextTick()
    guide.props.eligible = true
    await vue.nextTick()
    assert.equal(guide.timers.size, 0)
    guide.dispose()
  }
})

test('guide copy switches between English and Japanese and Got it handles dismissal', () => {
  memory_storage()
  const guide = mount_guide()
  guide.reveal()
  for (const [language, title, label] of [['en', 'View profile', 'Got it'], ['ja', 'プロフィールを見る', 'わかりました']]) {
    set_app_language(language)
    const rendered = nodes(guide.render())
    const text = rendered.filter(node => typeof node === 'string').join('\n')
    assert.ok(text.includes(title))
    assert.ok(text.includes(label))
    assert.ok(rendered.some(node => node.props?.role === 'note'))
  }
  const button = nodes(guide.render()).find(node => node.props?.class === 'profile-guide__done')
  let stopped = false
  button.props.onClick({ stopPropagation: () => { stopped = true } })
  assert.equal(stopped, true)
  assert.equal(guide.is_visible.value, false)
  guide.dispose()
  set_app_language('en')
})

test('cache clearing retains presentation preferences, while a new installation starts fresh', async () => {
  const memory = memory_storage()
  storage.mark_profile_guide_presented('scoop')
  memory.set('temporary-media-cache', 'fixture')
  const { clear_project_cache } = await import('../src/utils/projectCache.js')
  await clear_project_cache()
  assert.equal(memory.has('temporary-media-cache'), false)
  assert.equal(storage.has_presented_profile_guide('scoop'), true)
  assert.equal(storage.has_presented_profile_guide('wish'), false)
  memory.clear() // App-data removal / reinstall, not sign-out.
  assert.equal(storage.has_presented_profile_guide('scoop'), false)
  assert.equal(storage.has_presented_profile_guide('wish'), false)
  assert.equal(storage.mark_profile_guide_presented('invalid'), false)
})

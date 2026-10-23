import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { babelParse, compileTemplate, parse } from '@vue/compiler-sfc'
import * as vue from 'vue'
import { PERMISSION_REQUEST_DEFINITIONS, read_permission_request_definition } from '../src/utils/permissionRequestPresentation.js'

const filename = new URL('../src/components/PermissionRequestOverlay.vue', import.meta.url)
const source = await readFile(filename, 'utf8')
const { descriptor } = parse(source)
const theme = JSON.parse(await readFile(new URL('../src/config/theme.json', import.meta.url), 'utf8'))
const strip_imports = source => babelParse(source, { sourceType: 'module' }).program.body
  .filter(node => node.type === 'ImportDeclaration').reverse()
  .reduce((result, node) => result.slice(0, node.start) + result.slice(node.end), source)

// Controller and rendered-template fixtures never request a real device permission.
const load_overlay = (permission = async () => ({ permission_status: 'denied' }), permission_key = 'location', options = {}) => {
  const props = vue.reactive({ visible: true, permissionKey: permission_key, mode: options.mode || 'explanation' })
  const emits = []
  const requests = []
  const settings_requests = []
  let unmount
  const scope = vue.effectScope()
  const context = vm.createContext({
    ...vue, theme, read_permission_request_definition,
    defineProps: () => props,
    defineEmits: () => (...args) => emits.push(args),
    onBeforeUnmount: callback => { unmount = callback },
    ensure_ios_permission: (kind, options) => {
      requests.push({ kind, options })
      return permission(kind, options)
    },
    request_ios_location_permission: settings_options => {
      settings_requests.push(settings_options)
      return options.dispatch ? options.dispatch(settings_options) : true
    }
  })
  const fields = ['current_permission', 'card_title', 'card_description', 'is_settings_mode', 'overlay_style', 'feedback_message', 'is_requesting', 'continue_permission', 'cancel_settings']
  scope.run(() => vm.runInContext(`${strip_imports(descriptor.scriptSetup.content)}\nglobalThis.subject = { ${fields.join(', ')} }`, context))
  const compiled = compileTemplate({ source: descriptor.template.content, filename: String(filename), id: 'permission-test' })
  assert.deepEqual(compiled.errors, [])
  const imports = babelParse(compiled.code, { sourceType: 'module' }).program.body.filter(node => node.type === 'ImportDeclaration')
  for (const entry of imports) for (const specifier of entry.specifiers) {
    const name = specifier.imported.name
    context[specifier.local.name] = name === 'resolveComponent' ? name => name : vue[name]
  }
  vm.runInContext(strip_imports(compiled.code).replace('export function render', 'function render'), context)
  return {
    ...context.subject, props, emits, requests, settings_requests,
    render: () => context.render(vue.proxyRefs({ ...context.subject, ...props, $t: value => value }), []),
    dispose: () => { unmount(); scope.stop() }
  }
}

const nodes = node => {
  if (!node || typeof node === 'string') return node ? [node] : []
  const children = typeof node.children?.default === 'function' ? node.children.default() : node.children
  return [node, ...(Array.isArray(children) ? children.flatMap(nodes) : nodes(children))]
}
const buttons = overlay => nodes(overlay.render()).filter(node => node?.props?.role === 'button')
const button_text = overlay => nodes(buttons(overlay)[0]).filter(node => typeof node === 'string').join('')

test('definitions use neutral localized titles and contain no simulated system decision labels', () => {
  for (const [key, title] of Object.entries({ location: 'Nearby lanterns', microphone: 'Microphone', photos: 'Photos', camera: 'Camera', notifications: 'Notifications' })) {
    const definition = read_permission_request_definition(key)
    assert.equal(definition.title, title)
    assert.equal(Object.hasOwn(definition, 'deny_label'), false)
    assert.equal(Object.hasOwn(definition, 'can_allow'), false)
    assert.doesNotMatch(definition.title, /Allow|Deny|Would Like|Lunmi/)
  }
  assert.equal(read_permission_request_definition('unknown').bridge_permission, '')
  assert.equal(Object.keys(PERMISSION_REQUEST_DEFINITIONS).length, 5)
})

test('the explanation renders one Continue action and neither background nor stage can cancel it', () => {
  const overlay = load_overlay()
  try {
    assert.equal(buttons(overlay).length, 1)
    assert.equal(button_text(overlay), 'Continue')
    for (const node of nodes(overlay.render()).filter(node => /permission-overlay|permission-stage/.test(node?.props?.class || ''))) {
      assert.equal(node.props.onClick, undefined)
    }
    assert.equal(overlay.requests.length, 0)
    assert.equal(overlay.settings_requests.length, 0)
    overlay.cancel_settings()
    assert.equal(overlay.emits.length, 0)
  } finally { overlay.dispose() }
})

test('the iOS choice note is shown only for the location explanation', () => {
  for (const key of ['location', 'microphone', 'photos', 'camera']) {
    const overlay = load_overlay(undefined, key)
    try {
      const rendered_text = nodes(overlay.render()).filter(node => typeof node === 'string').join(' ')
      assert.equal(rendered_text.includes('You choose whether to allow access in the next iOS prompt.'), key === 'location')
    } finally { overlay.dispose() }
  }
})

test('Continue requests fresh system authorization and only a confirmed grant emits granted', async () => {
  const overlay = load_overlay(async () => ({ success: true, granted: true, permission_status: 'granted' }))
  try {
    await overlay.continue_permission()
    assert.equal(overlay.requests.length, 1)
    assert.equal(overlay.requests[0].kind, 'location')
    assert.equal(overlay.requests[0].options.force_refresh, true)
    assert.equal(overlay.requests[0].options.reason, read_permission_request_definition('location').reason)
    assert.equal(JSON.stringify(overlay.emits), JSON.stringify([['update:visible', false], ['granted']]))
    assert.equal(overlay.is_requesting.value, false)
  } finally { overlay.dispose() }
})

test('a denied, restricted or cancelled system response closes the explanation without a retry loop', async () => {
  for (const result of [
    { success: false, granted: false, permission_status: 'denied' },
    { success: false, granted: false, permission_status: 'denied', permanent: true },
    { success: false, granted: false, permission_status: 'unavailable', cancelled: true }
  ]) {
    const overlay = load_overlay(async () => result)
    try {
      await overlay.continue_permission()
      assert.equal(JSON.stringify(overlay.emits), JSON.stringify([['update:visible', false], ['denied']]))
      assert.equal(overlay.feedback_message.value, '')
      assert.equal(overlay.is_requesting.value, false)
    } finally { overlay.dispose() }
  }
})

test('unavailable, malformed or failed responses offer OK to exit and never imply a grant', async () => {
  for (const transport of [
    async () => ({ success: false, granted: false, permission_status: 'unavailable', unavailable: true }),
    async () => ({ granted: true }),
    async () => { throw new Error('Unavailable bridge') }
  ]) {
    const overlay = load_overlay(transport)
    try {
      await overlay.continue_permission()
      assert.equal(overlay.emits.length, 0)
      assert.equal(buttons(overlay).length, 1)
      assert.equal(button_text(overlay), 'OK')
      assert.equal(overlay.feedback_message.value, 'This permission is unavailable on this device.')
      await overlay.continue_permission()
      assert.equal(overlay.requests.length, 1)
      assert.equal(JSON.stringify(overlay.emits), JSON.stringify([['update:visible', false], ['denied']]))
    } finally { overlay.dispose() }
  }
})

test('an unconfigured permission cannot request or imply authorization', async () => {
  const overlay = load_overlay(async () => { throw new Error('Unexpected request') }, 'notifications')
  try {
    await overlay.continue_permission()
    assert.equal(overlay.requests.length, 0)
    assert.equal(button_text(overlay), 'OK')
    await overlay.continue_permission()
    assert.equal(JSON.stringify(overlay.emits), JSON.stringify([['update:visible', false], ['denied']]))
  } finally { overlay.dispose() }
})

test('duplicate taps and late results for hidden, changed or unmounted explanations are ignored', async () => {
  for (const interruption of ['hidden', 'changed', 'mode', 'unmounted']) {
    let complete
    const overlay = load_overlay(() => new Promise(resolve => { complete = resolve }))
    const pending = overlay.continue_permission()
    await overlay.continue_permission()
    assert.equal(overlay.requests.length, 1)
    assert.equal(overlay.is_requesting.value, true)
    if (interruption === 'hidden') overlay.props.visible = false
    if (interruption === 'changed') overlay.props.permissionKey = 'camera'
    if (interruption === 'mode') overlay.props.mode = 'settings'
    if (interruption === 'unmounted') overlay.dispose()
    await vue.nextTick()
    complete({ success: true, granted: true, permission_status: 'granted' })
    await pending
    assert.equal(overlay.emits.length, 0, interruption)
    if (interruption !== 'unmounted') overlay.dispose()
  }
})

test('settings mode explains the existing refusal and Cancel makes no native request', () => {
  const overlay = load_overlay(undefined, 'location', { mode: 'settings' })
  try {
    assert.equal(overlay.card_title.value, 'Location access is off')
    assert.equal(overlay.card_description.value, 'Location access is off. You can change it in Settings, or keep using All lanterns.')
    assert.equal(buttons(overlay).length, 2)
    assert.equal(nodes(buttons(overlay)[0]).filter(node => typeof node === 'string').join(''), 'Cancel')
    assert.equal(nodes(buttons(overlay)[1]).filter(node => typeof node === 'string').join(''), 'Open Settings')
    assert.equal(nodes(overlay.render()).filter(node => typeof node === 'string').join(' ').includes('You choose whether to allow access in the next iOS prompt.'), false)
    assert.equal(overlay.requests.length, 0)
    assert.equal(overlay.settings_requests.length, 0)
    overlay.cancel_settings()
    assert.equal(JSON.stringify(overlay.emits), JSON.stringify([['update:visible', false], ['cancelled']]))
    assert.equal(overlay.requests.length, 0)
    assert.equal(overlay.settings_requests.length, 0)
  } finally { overlay.dispose() }
})

test('Open Settings dispatches only from the explicit action and never grants permission', async () => {
  const overlay = load_overlay(undefined, 'location', { mode: 'settings' })
  try {
    assert.equal(overlay.settings_requests.length, 0)
    await overlay.continue_permission()
    assert.equal(overlay.requests.length, 0)
    assert.equal(JSON.stringify(overlay.settings_requests), JSON.stringify([{ open_settings: true }]))
    assert.equal(JSON.stringify(overlay.emits), JSON.stringify([['update:visible', false], ['settings-opened']]))
    assert.equal(overlay.emits.some(([event]) => event === 'granted'), false)
  } finally { overlay.dispose() }
})

test('a failed settings dispatch offers only OK and does not repeat or invent a grant', async () => {
  for (const dispatch of [() => false, () => { throw new Error('Unavailable settings bridge') }]) {
    const overlay = load_overlay(undefined, 'location', { mode: 'settings', dispatch })
    try {
      await overlay.continue_permission()
      assert.equal(overlay.requests.length, 0)
      assert.equal(overlay.settings_requests.length, 1)
      assert.equal(overlay.emits.length, 0)
      assert.equal(buttons(overlay).length, 1)
      assert.equal(button_text(overlay), 'OK')
      await overlay.continue_permission()
      assert.equal(overlay.settings_requests.length, 1)
      assert.equal(JSON.stringify(overlay.emits), JSON.stringify([['update:visible', false], ['denied']]))
    } finally { overlay.dispose() }
  }
})

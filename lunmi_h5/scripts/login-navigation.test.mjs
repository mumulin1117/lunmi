import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import * as vue from 'vue'
import { babelParse, parse } from '@vue/compiler-sfc'

const source = await readFile(new URL('../src/pages/login/index.vue', import.meta.url), 'utf8')
const theme = JSON.parse(await readFile(new URL('../src/config/theme.json', import.meta.url), 'utf8'))
const ready_user = { token: 'unit-session-fixture', userName: 'QA' }

// Isolated controller fixtures never sign in to a service or accept a real agreement.
const load_login = ({ result = { success: true, data: ready_user }, pending_result = null, navigation_started = true } = {}) => {
  let script = parse(source).descriptor.scriptSetup.content
  const imports = babelParse(script, { sourceType: 'module' }).program.body.filter(node => node.type === 'ImportDeclaration')
  const events = []
  const hooks = {}
  const route = []
  const modules = {
    vue: { ...vue, onBeforeUnmount: callback => { hooks.unmount = callback } },
    '@dcloudio/uni-app': { onLoad() {}, onBackPress() {}, onUnload: callback => { hooks.unload = callback } },
    '@/config/theme.json': { default: theme },
    '@/api/auth': { emailLogin: async () => pending_result || result },
    '@/stores/store': { storeGlobal: () => ({ login: () => events.push('store-session') }) },
    '@/utils/routeTransition': { ROUTE_MOTION: { CURTAIN: 'curtain' } }
  }
  const bindings = imports.flatMap(entry => entry.specifiers.map(specifier => {
    const name = specifier.type === 'ImportDefaultSpecifier' ? 'default' : specifier.imported.name
    return `const ${specifier.local.name} = modules[${JSON.stringify(entry.source.value)}]?.[${JSON.stringify(name)}];`
  }))
  for (const entry of [...imports].reverse()) script = script.slice(0, entry.start) + script.slice(entry.end)
  const names = ['sign_in', 'page_transition', 'is_terms_agreed', 'is_signing_in', 'is_entering_app', 'login_error', 'email', 'password']
  const login = new Function('modules', 'document', 'uni', `${bindings.join('\n')}\n${script}\nreturn {${names.join(',')}}`)(
    modules, { activeElement: { blur() {} } }, { hideKeyboard() {} }
  )
  login.is_terms_agreed.value = true
  login.email.value = 'login-fixture@example.test'
  login.password.value = 'fixture-password'
  login.page_transition.value = { navigate_relaunch: options => { route.push(options); return navigation_started } }
  return { ...login, events, hooks, route }
}

test('successful login enters Home with the restored curtain transition', async () => {
  const login = load_login()
  await login.sign_in()
  assert.deepEqual(login.events, ['store-session'])
  assert.equal(login.route[0].url, '/pages/home/index')
  assert.equal(login.route[0].immediate, true)
  assert.equal(login.route[0].entry_motion, 'curtain')
})

test('rejected or incomplete logins and missing consent never enter the app', async () => {
  for (const result of [{ success: false, error: 'Denied' }, { success: true, data: {} }]) {
    const login = load_login({ result })
    await login.sign_in()
    assert.deepEqual(login.events, [])
    assert.deepEqual(login.route, [])
  }
  const login = load_login()
  login.is_terms_agreed.value = false
  await login.sign_in()
  assert.deepEqual(login.events, [])
  assert.deepEqual(login.route, [])
})

test('new profiles retain the original setup destination and curtain transition', async () => {
  const login = load_login({ result: { success: true, data: { token: 'unit-session-fixture', userName: '' } } })
  await login.sign_in()
  assert.deepEqual(login.events, ['store-session'])
  assert.equal(login.route[0].url, '/pages/profile/setup/index')
  assert.equal(login.route[0].entry_motion, 'curtain')
})

test('both failed navigation paths restore login controls', async () => {
  for (const navigation_started of [true, false]) {
    const login = load_login({ navigation_started })
    await login.sign_in()
    if (navigation_started) login.route[0].fail()
    assert.equal(login.is_entering_app.value, false)
    assert.match(login.login_error.value, /Unable to open/)
  }
})

test('leaving during the login request prevents late navigation', async () => {
  let finish_request
  const login = load_login({ pending_result: new Promise(resolve => { finish_request = resolve }) })
  const pending = login.sign_in()
  assert.equal(login.is_signing_in.value, true)
  login.hooks.unload()
  finish_request({ success: true, data: ready_user })
  await pending
  assert.deepEqual(login.events, [])
  assert.deepEqual(login.route, [])
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { computed, nextTick } from 'vue'
import { babelParse, compileTemplate, parse } from '@vue/compiler-sfc'
import en from '../src/locales/en.json' with { type: 'json' }
import ja from '../src/locales/ja.json' with { type: 'json' }
import { app_language, get_app_locale, install_i18n, set_app_language, sync_app_language, t } from '../src/utils/i18n.js'

const storage = new Map()
globalThis.uni = {
  getStorageSync: (key) => storage.get(key),
  setStorageSync: (key, value) => storage.set(key, value)
}

const files_under = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory()
    ? files_under(path.join(directory, entry.name))
    : [path.join(directory, entry.name)])

test('device language is the initial language; choices persist and failed saves keep the current language', () => {
  storage.clear()
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'ja-JP', languages: ['ja-JP'] } })
  sync_app_language()
  assert.equal(get_app_locale(), 'ja-JP')
  assert.equal(t('Messages'), 'メッセージ')
  assert.equal(set_app_language('en'), true)
  assert.equal(app_language.value, 'en')
  assert.deepEqual(storage.get('lunmi.app_language'), { version: 1, code: 'en' })
  assert.equal(t('Messages'), 'Messages')
  assert.equal(set_app_language('fr'), false)
  const save = uni.setStorageSync
  uni.setStorageSync = () => { throw new Error('Unavailable storage') }
  assert.equal(set_app_language('ja'), false)
  assert.equal(app_language.value, 'en')
  uni.setStorageSync = save
  storage.set('lunmi.app_language', { version: 99, code: 'en' })
  sync_app_language()
  assert.equal(app_language.value, 'ja')
})

test('retained JS labels, relative times and dates react to a language switch without fetching data', () => {
  set_app_language('ja')
  const label = computed(() => t('42 waiting · 26 days left'))
  const date = computed(() => t('Shanghai · Aug 28'))
  assert.equal(label.value, '42人が待っています · あと26日')
  assert.equal(date.value, 'Shanghai · 8月28日')
  assert.equal(t('2 hours ago'), '2時間前')
  assert.equal(t('1 day ago'), '1日前')
  assert.equal(t('HIGH · 7D'), '高い枝 · 7日')
  assert.equal(t('1 message'), '1件のメッセージ')
  assert.equal(t('Joined Sep 2026'), '2026年9月に参加')
  assert.equal(t('Open profile for Alex'), 'Alexのプロフィールを開く')
  assert.equal(t('Open profile for May 20'), 'May 20のプロフィールを開く')
  assert.equal(t('You need {0} coins for this branch. The wish stays unsent.', { 0: 480 }), 'この枝には480コインが必要です。願いはまだ送信されません。')
  assert.equal(t('A sentence from a user that is not a UI message.'), 'A sentence from a user that is not a UI message.')
  assert.equal(set_app_language('en'), true)
  assert.equal(label.value, '42 waiting · 26 days left')
  assert.equal(date.value, 'Shanghai · Aug 28')
})

test('English and Japanese catalogs cover identical keys and preserve parameter identifiers', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ja).sort())
  for (const [key, value] of Object.entries(ja)) {
    assert.equal(typeof value, 'string', key)
    assert.ok(value.trim(), key)
    const source_parameters = new Set(key.match(/\{\d+\}/g) || [])
    for (const parameter of value.match(/\{\d+\}/g) || []) assert.ok(source_parameters.has(parameter), `${key}: ${parameter}`)
  }
})

test('every page and component compiles and contains no untranslated English template text or visible static attribute', () => {
  const missing = []
  const labels = new Set(['aria-label', 'placeholder', 'title', 'subtitle', 'label', 'description', 'message', 'copy', 'confirm-label', 'cancel-label'])
  for (const filename of files_under('src').filter((file) => file.endsWith('.vue'))) {
    const { descriptor, errors } = parse(fs.readFileSync(filename, 'utf8'))
    assert.deepEqual(errors, [], filename)
    if (!descriptor.template) continue
    assert.deepEqual(compileTemplate({ id: 'i18n', filename, source: descriptor.template.content }).errors, [], filename)
    const expression_keys = (expression) => {
      let ast
      try { ast = babelParse(expression, { sourceType: 'module' }) } catch { return }
      const visit = (node, translated = false) => {
        if (!node || typeof node !== 'object') return
        const is_translated = translated || (node.type === 'CallExpression' && node.callee?.name === '$t')
        if (node.type === 'StringLiteral' && is_translated && /[A-Za-z]/.test(node.value)) {
          if (!Object.prototype.hasOwnProperty.call(ja, node.value.trim())) missing.push(`${filename}: ${node.value}`)
        }
        for (const [key, value] of Object.entries(node)) {
          if (['loc', 'extra', 'comments'].includes(key)) continue
          if (Array.isArray(value)) value.forEach((child) => visit(child, is_translated))
          else if (value && typeof value === 'object') visit(value, is_translated)
        }
      }
      visit(ast)
    }
    const visit = (node) => {
      if (node.type === 2) assert.ok(!/[A-Za-z]/.test(node.content), `${filename}: ${node.content}`)
      if (node.type === 5) expression_keys(node.content.content)
      if (node.type === 1) for (const prop of node.props) {
        if (prop.type === 6 && labels.has(prop.name) && prop.value) assert.ok(!/[A-Za-z]/.test(prop.value.content), `${filename}: ${prop.loc.source}`)
        if (prop.type === 7 && prop.exp) expression_keys(prop.exp.content)
      }
      for (const child of node.children || []) visit(child)
    }
    visit(descriptor.template.ast)
  }
  assert.deepEqual(missing, [])
})

test('render templates preserve actual usernames and post/reply content', () => {
  const wish = fs.readFileSync('src/components/FoundWishSheet.vue', 'utf8')
  const chat = fs.readFileSync('src/pages/messages/chat.vue', 'utf8')
  const post = fs.readFileSync('src/pages/community/detail/index.vue', 'utf8')
  assert.match(wish, /\{\{ reply\.content \}\}/)
  assert.match(wish, /\{\{ reply\.user_name \|\| \$t\('Someone'\) \}\}/)
  assert.match(post, /\{\{ post\.caption \}\}/)
  assert.ok(!chat.includes('$t(message.content)'))
})

test('language selection updates the active page navigation title', async () => {
  const titles = []
  globalThis.getCurrentPages = () => [{ route: 'pages/messages/index' }]
  uni.setNavigationBarTitle = ({ title }) => titles.push(title)
  const app = { config: { globalProperties: {} }, mixin: () => {} }
  install_i18n(app)
  set_app_language('ja')
  await nextTick()
  assert.equal(titles.at(-1), 'メッセージ')
  set_app_language('en')
  await nextTick()
  assert.equal(titles.at(-1), 'Messages')
  delete globalThis.getCurrentPages
})

test('shared legal route retains the document title when shown or translated', async () => {
  const titles = []
  let options = {}
  globalThis.getCurrentPages = () => [{ route: 'pages/profile/user-agreement', options }]
  uni.setNavigationBarTitle = ({ title }) => titles.push(title)
  let lifecycle
  const app = { config: { globalProperties: {} }, mixin: (hooks) => { lifecycle = hooks } }
  install_i18n(app)
  for (const [type, english, japanese] of [
    ['terms', 'Terms of Service', '利用規約'],
    ['eula', 'End User License Agreement', 'エンドユーザー使用許諾契約'],
    [undefined, 'End User License Agreement', 'エンドユーザー使用許諾契約']
  ]) {
    options = { type }
    set_app_language('en')
    await nextTick()
    lifecycle.onShow()
    assert.equal(titles.at(-1), english)
    set_app_language('ja')
    await nextTick()
    assert.equal(titles.at(-1), japanese)
  }
  delete globalThis.getCurrentPages
})

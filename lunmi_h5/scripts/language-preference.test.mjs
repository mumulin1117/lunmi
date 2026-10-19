import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APP_LANGUAGES,
  app_language_option,
  is_allowed_app_language
} from '../src/utils/languagePresentation.js'

test('language choices stay inside the design list', () => {
  assert.deepEqual(APP_LANGUAGES.map((item) => item.code), ['en', 'ja'])
  assert.equal(is_allowed_app_language('fr'), false)
  assert.equal(app_language_option('ja').native_name, '日本語')
  assert.equal(app_language_option('fr').code, 'en')
})

test('first launch follows the device; an explicit choice persists until reinstall', async () => {
  const storage = new Map()
  globalThis.uni = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value)
  }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'ja-JP', languages: ['ja-JP', 'en-US'] } })
  const preference = await import('../src/utils/languagePreference.js')
  assert.equal(preference.read_app_language(), 'ja')
  assert.equal(preference.write_app_language('fr'), false)
  assert.equal(preference.read_app_language(), 'ja')
  assert.equal(preference.write_app_language('ja'), true)
  assert.equal(preference.read_app_language(), 'ja')
  assert.equal(preference.read_app_language_label(), '日本語')
  storage.clear()
  assert.equal(storage.size, 0)
  assert.equal(preference.read_app_language(), 'ja')
  assert.equal(storage.size, 0, 'automatic detection must not become a manual preference')
  navigator.languages = ['en-GB']
  assert.equal(preference.read_app_language(), 'en')
  assert.equal(await preference.save_app_language_preference('en'), true)
  navigator.languages = ['ja-JP']
  assert.equal(preference.read_app_language(), 'en')
  assert.equal(preference.read_saved_app_language(), 'en')
  storage.clear()
  assert.equal(preference.read_app_language(), 'ja', 'new installation starts from the device language')
})

test('unsupported devices fall back to English and existing version 1 preferences remain valid', async () => {
  const storage = new Map()
  globalThis.uni = { getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value) }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'zh-CN', languages: ['zh-CN', 'ja-JP'] } })
  const preference = await import('../src/utils/languagePreference.js')
  assert.equal(preference.read_app_language(), 'en')
  storage.set('lunmi.app_language', { version: 1, code: 'ja' })
  assert.equal(preference.read_app_language(), 'ja')
  storage.set('lunmi.app_language', { version: 99, code: 'ja' })
  assert.equal(preference.read_app_language(), 'en')
  storage.set('lunmi.app_language', { version: 1, code: 'fr' })
  assert.equal(preference.read_app_language(), 'en')
})

test('cache clearing preserves only an explicit language preference', async () => {
  const storage = new Map()
  globalThis.uni = {
    getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value),
    clearStorageSync: () => storage.clear()
  }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'en-US', languages: ['en-US'] } })
  const preference = await import('../src/utils/languagePreference.js')
  const { clear_project_cache } = await import('../src/utils/projectCache.js')
  preference.write_app_language('ja')
  storage.set('temporary-cache', 'fixture')
  await clear_project_cache()
  assert.equal(storage.has('temporary-cache'), false)
  assert.equal(preference.read_app_language(), 'ja')
  storage.clear()
  await clear_project_cache()
  assert.equal(storage.size, 0)
})

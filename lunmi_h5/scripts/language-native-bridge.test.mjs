import assert from 'node:assert/strict'
import test from 'node:test'
import { receive_ios_message } from '../src/utils/iosBridge.js'
import { persist_native_app_language, read_native_language_state, subscribe_native_language } from '../src/utils/languageNativeBridge.js'
import { read_app_language, save_app_language_preference } from '../src/utils/languagePreference.js'

test('native device language takes priority over the WebView browser language', () => {
  globalThis.window = { LunmiNativeConfiguration: { APP_DEVICE_LANGUAGE: 'ja', APP_LANGUAGE_PREFERENCE: '' } }
  globalThis.uni = { getStorageSync: () => null }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'en-US' } })
  assert.equal(read_app_language(), 'ja')
  window.LunmiNativeConfiguration.APP_LANGUAGE_PREFERENCE = 'en'
  assert.equal(read_app_language(), 'en')
  delete globalThis.window
})

test('language saves correlate native acknowledgements, reject failures and roll back the web preference', async () => {
  const storage = new Map([['lunmi.app_language', { version: 1, code: 'en' }]])
  globalThis.uni = { getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value) }
  const requests = []
  let accept = false
  globalThis.window = {
    LunmiNativeConfiguration: { APP_LANGUAGE_BRIDGE_VERSION: '1', APP_DEVICE_LANGUAGE: 'en', APP_LANGUAGE_PREFERENCE: 'en' },
    addEventListener() {},
    webkit: { messageHandlers: { CommonTemplateBridge: { postMessage(message) {
      requests.push(message)
      receive_ios_message({ type: 'APP_LANGUAGE_SET_RESULT', data: { requestId: 'unrelated', success: true, code: message.data.code } })
      receive_ios_message({ type: 'APP_LANGUAGE_SET_RESULT', data: { requestId: message.data.requestId, success: accept, code: message.data.code } })
    } } } }
  }
  assert.equal(await save_app_language_preference('ja'), false)
  assert.equal(read_app_language(), 'en')
  accept = true
  assert.equal(await save_app_language_preference('ja'), true)
  assert.equal(read_app_language(), 'ja')
  assert(requests.every(message => message.type === 'APP_LANGUAGE_SET_REQUEST'))
  assert.equal(await save_app_language_preference('fr'), false)
  assert.equal(requests.length, 2)
  delete globalThis.window
})

test('language state accepts only supported codes, and browser-only settings need no native bridge', async () => {
  const updates = []
  globalThis.window = {
    LunmiNativeConfiguration: { APP_LANGUAGE_BRIDGE_VERSION: '1', APP_DEVICE_LANGUAGE: 'en' },
    addEventListener() {},
    webkit: { messageHandlers: { CommonTemplateBridge: { postMessage() {} } } }
  }
  const unsubscribe = subscribe_native_language(state => updates.push(state))
  receive_ios_message({ type: 'APP_LANGUAGE_STATE_UPDATE', data: { deviceLanguage: '../../ja', preferredLanguage: 'ja' } })
  assert.equal(updates.length, 0)
  receive_ios_message({ type: 'APP_LANGUAGE_STATE_UPDATE', data: { deviceLanguage: 'ja', preferredLanguage: 'fr' } })
  assert.deepEqual(read_native_language_state(), { deviceLanguage: 'ja', preferredLanguage: '' })
  unsubscribe()
  delete globalThis.window
  await persist_native_app_language('en')
})

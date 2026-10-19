import assert from 'node:assert/strict'
import test from 'node:test'
import { import_source } from './api-test-helpers.mjs'

test('system permission queries bypass old grants and preserve unified and legacy bridge options', async () => {
  const previous_window = globalThis.window
  const key = '__permission_query_test'
  const sent = []
  const store = { authRecord: { microphone: true }, setAuthRecord: (kind, granted) => { store.authRecord[kind] = granted } }
  globalThis[key] = store
  globalThis.window = {
    addEventListener() {},
    webkit: { messageHandlers: { CommonTemplateBridge: { postMessage: message => sent.push(message) } } }
  }
  try {
    const bridge = await import_source('src/utils/iosPermissionBridge.js', [
      ["import { storeGlobal } from '@/stores/store'", `const storeGlobal = () => globalThis.${key}`],
      ["import { t } from './i18n.js'", 'const t = value => value'],
      ["from './iosBridge.js'", `from '${new URL('../src/utils/iosBridge.js', import.meta.url).href}'`],
      ["from './iosMessageTypes.js'", `from '${new URL('../src/utils/iosMessageTypes.js', import.meta.url).href}'`]
    ])
    const pending = bridge.ensure_ios_permission('microphone', { check_only: true })
    assert.equal(sent.length, 1)
    assert.equal(sent[0].type, 'APP_MICROPHONE_PERMISSION_REQUEST')
    assert.equal(sent[0].data.checkOnly, true)
    window.CommonTemplateH5Bridge.receive({ type: 'APP_MICROPHONE_PERMISSION_RESULT', data: {
      requestId: sent[0].data.requestId, permission_status: 'denied'
    } })
    assert.equal((await pending).granted, false)
    assert.equal(store.authRecord.microphone, false)

    store.authRecord.microphone = true
    const fresh = bridge.ensure_ios_permission('microphone', { force_refresh: true })
    assert.equal(sent.length, 2)
    assert.equal(sent[1].data.checkOnly, false)
    window.CommonTemplateH5Bridge.receive({ type: 'APP_MICROPHONE_PERMISSION_RESULT', data: {
      requestId: sent[1].data.requestId, permission_status: 'denied'
    } })
    await fresh

    delete window.webkit.messageHandlers.CommonTemplateBridge
    window.webkit.messageHandlers.requestMicrophonePermission = { postMessage: message => sent.push(message) }
    assert.equal(bridge.request_ios_microphone_permission({ check_only: true }), true)
    assert.equal(sent.at(-1).checkOnly, true)
    assert.equal(sent.at(-1).callback, 'receiveIOSMicrophonePermissionResult')
  } finally {
    globalThis.window = previous_window
    delete globalThis[key]
  }
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { import_source } from './api-test-helpers.mjs'
import { read_permission_record, write_permission_record } from '../src/utils/permissionStorage.js'

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

test('removed permissions cannot dispatch requests or reuse cached grants', async () => {
  const previous_window = globalThis.window
  const key = '__removed_permission_test'
  const sent = []
  globalThis[key] = {
    authRecord: { contacts: true, face_id: true },
    setAuthRecord() { assert.fail('Removed permissions must not update authorization records') }
  }
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
    for (const permission of ['contacts', 'face_id']) {
      assert.equal(bridge.request_ios_permission(permission, { open_settings: true }), false)
      assert.equal(bridge.receive_ios_permission_result(permission, () => {}), null)
      await assert.rejects(bridge.ensure_ios_permission(permission), /Unsupported stored iOS permission/)
    }
    assert.deepEqual(sent, [])
  } finally {
    globalThis.window = previous_window
    delete globalThis[key]
  }
})

test('permission storage ignores retired grants and drops them on the next supported write', () => {
  const previous_uni = globalThis.uni
  let stored = { microphone: true, location: true, contacts: true, face_id: true }
  globalThis.uni = {
    getStorageSync: () => stored,
    setStorageSync: (_, value) => { stored = value }
  }
  try {
    const record = read_permission_record()
    assert.equal(record.microphone, true)
    assert.equal(record.location, true)
    assert.equal(Object.hasOwn(record, 'contacts'), false)
    assert.equal(Object.hasOwn(record, 'face_id'), false)
    assert.equal(write_permission_record('contacts', true), false)
    assert.equal(write_permission_record('face_id', true), false)
    assert.equal(write_permission_record('camera', true), true)
    assert.equal(stored.camera, true)
    assert.equal(stored.location, true)
    assert.equal(Object.hasOwn(stored, 'contacts'), false)
    assert.equal(Object.hasOwn(stored, 'face_id'), false)
  } finally {
    globalThis.uni = previous_uni
  }
})

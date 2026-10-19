import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const project_root = new URL('../', import.meta.url)

const import_storage = async () => {
  const source = await readFile(new URL('src/utils/caughtLanternPendingStorage.js', project_root), 'utf8')
  const source_url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Math.random()}`
  return import(source_url)
}

test('pending caught lantern storage scopes records to the scooper user', async () => {
  const memory = new Map()
  globalThis.uni = {
    getStorageSync: (key) => memory.get(key),
    setStorageSync: (key, value) => memory.set(key, value),
    removeStorageSync: (key) => memory.delete(key)
  }
  const storage = await import_storage()
  assert.equal(storage.save_pending_caught_lantern({
    user_id: 857705160659013,
    lantern_id: 857958431158341,
    lantern_scoop_id: 857973077839941,
    owner_user_id: 857700000000001,
    owner_user_name: 'Mia',
    owner_avatar_url: 'https://cdn.test/avatar.jpg'
  }), true)
  assert.deepEqual(storage.read_pending_caught_lantern(857705160659013), {
    user_id: '857705160659013',
    lantern_id: '857958431158341',
    lantern_scoop_id: '857973077839941',
    anonymous_display: false,
    owner_user_id: '857700000000001',
    owner_user_name: 'Mia',
    owner_avatar_url: 'https://cdn.test/avatar.jpg'
  })
  assert.equal(storage.read_pending_caught_lantern(1), null)
  assert.equal(memory.has('lunmi_caught_lantern_pending'), false)
  storage.save_pending_caught_lantern({
    user_id: '3',
    lantern_id: '8',
    lantern_scoop_id: '21',
    anonymous_display: true,
    owner_user_id: '9'
  })
  assert.equal(storage.read_pending_caught_lantern('3')?.anonymous_display, true)
  storage.clear_pending_caught_lantern()
  assert.equal(storage.read_pending_caught_lantern('3'), null)
  delete globalThis.uni
})

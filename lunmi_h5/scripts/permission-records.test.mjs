import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PERMISSION_RECORD_ROWS,
  next_permission_state,
  permission_notice_copy,
  permission_status_label,
  read_permission_source
} from '../src/utils/permissionRecordsPresentation.js'

test('authorization records list the host permissions and return to settings', () => {
  assert.deepEqual(PERMISSION_RECORD_ROWS.map((row) => row.key), ['microphone', 'location', 'camera', 'album'])
  assert.equal(read_permission_source({ sourcePage: '/pages/profile/settings' }), '/pages/profile/settings')
  assert.equal(read_permission_source({}), '/pages/profile/settings')
  assert.equal(read_permission_source({ sourcePage: 'https://evil.example' }), '/pages/profile/settings')
})

test('permission results keep granted, denied, blocked, and failed states apart', () => {
  assert.deepEqual(next_permission_state({ granted: true, permission_status: 'granted' }), {
    state: 'granted',
    granted: true,
    notice: ''
  })
  assert.equal(next_permission_state({ granted: false, permission_status: 'denied' }).state, 'denied')
  assert.equal(next_permission_state({ cancelled: true, permission_status: 'unavailable' }).state, 'denied')
  assert.equal(next_permission_state({ permanent: true, permission_status: 'denied' }).state, 'permanent')
  assert.equal(next_permission_state({ permission_status: 'unavailable', unavailable: true }).state, 'failure')
  assert.equal(permission_status_label('requesting'), 'Requesting...')
  assert.equal(permission_notice_copy('Microphone', 'kept').title, 'Microphone stays allowed')
  assert.equal(permission_notice_copy('Camera', 'permanent').message.includes('cannot be requested again'), true)
  assert.equal(permission_notice_copy('Photos', 'denied').message.includes('Settings'), false)
})

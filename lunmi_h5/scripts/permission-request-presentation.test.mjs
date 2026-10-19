import assert from 'node:assert/strict'
import test from 'node:test'
import { read_permission_request_definition } from '../src/utils/permissionRequestPresentation.js'

test('permission request definitions cover the in-app permission keys', () => {
  const location = read_permission_request_definition('location')
  assert.match(location.title, /Location/)
  assert.equal(location.can_allow, true)
  assert.ok(location.bridge_permission)

  const photos = read_permission_request_definition('photos')
  assert.match(photos.title, /Photos/)
  assert.ok(photos.bridge_permission)

  const camera = read_permission_request_definition('camera')
  assert.match(camera.title, /Camera/)

  const missing = read_permission_request_definition('unknown')
  assert.equal(missing.can_allow, false)
})

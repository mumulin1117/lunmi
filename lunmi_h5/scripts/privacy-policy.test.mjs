import test from 'node:test'
import assert from 'node:assert/strict'
import { PRIVACY_SECTIONS, read_privacy_source } from '../src/utils/privacyPolicyPresentation.js'

test('privacy policy includes account deletion, permissions, audience and privacy rights', () => {
  const copy = PRIVACY_SECTIONS.map((section) => section.content).join('\n')
  assert.match(copy, /Settings > Delete Account/)
  assert.match(copy, /Camera\./)
  assert.match(copy, /Microphone\./)
  assert.match(copy, /does not promise.*end-to-end encryption/s)
  assert.match(copy, /access to your information/)
  assert.match(copy, /lunmi_user@gmail\.com/)
  assert.doesNotMatch(copy, /precise location is never collected/)
})

test('privacy policy returns to the page that opened it', () => {
  assert.equal(read_privacy_source({ sourcePage: 'login' }), '/pages/login/index')
  assert.equal(read_privacy_source({ sourcePage: 'signup' }), '/pages/signup/index')
  assert.equal(read_privacy_source({ sourcePage: 'agreement' }), '/pages/profile/user-agreement?sourcePage=welcome')
  assert.equal(read_privacy_source({ sourcePage: '/pages/profile/settings' }), '/pages/profile/settings')
  assert.equal(read_privacy_source({}), '/pages/profile/settings')
})

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  APP_LANGUAGE_LABEL,
  LANGUAGE_PAGE_PATH,
  PROFILE_PAGE_PATH,
  SAFETY_PAGE_PATH,
  SETTINGS_PAGE_PATH,
  build_settings_url,
  build_terms_url,
  map_settings_account,
  read_settings_source
} from '../src/utils/settingsPresentation.js'

test('settings shows the signed-in account and returns to profile', () => {
  assert.deepEqual(map_settings_account({
    userName: 'moonlit_ferry',
    userEmail: 'lunmi@gmail.com',
    userImgUrl: '/avatar.png'
  }), {
    user_name: 'moonlit_ferry',
    email: 'lunmi@gmail.com',
    avatar_url: '/avatar.png'
  })
  assert.equal(read_settings_source({}), PROFILE_PAGE_PATH)
  assert.equal(read_settings_source({ sourcePage: 'https://evil.example' }), PROFILE_PAGE_PATH)
  assert.equal(APP_LANGUAGE_LABEL, 'English')
})

test('settings rows open language, safety, terms, and the other entries', () => {
  assert.equal(build_settings_url(LANGUAGE_PAGE_PATH), `${LANGUAGE_PAGE_PATH}?sourcePage=${encodeURIComponent(SETTINGS_PAGE_PATH)}`)
  assert.equal(build_settings_url(SAFETY_PAGE_PATH).includes('safety-support'), true)
  assert.equal(build_terms_url(), `/pages/profile/user-agreement?type=terms&sourcePage=${encodeURIComponent(SETTINGS_PAGE_PATH)}`)
})

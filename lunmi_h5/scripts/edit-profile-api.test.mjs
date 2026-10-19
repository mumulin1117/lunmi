import test from 'node:test'
import assert from 'node:assert/strict'
import {
  build_profile_update_params,
  map_edit_profile,
  validate_profile_username
} from '../src/utils/editProfilePresentation.js'

test('edit profile maps the saved account fields', () => {
  const profile = map_edit_profile({
    userName: ' moonlit_ferry ',
    userLocation: ' Lisbon ',
    userBrief: ' Night walks ',
    userEmail: 'Ferry@Example.com',
    userImgUrl: ' https://cdn.example/avatar.jpg '
  })
  assert.equal(profile.username, 'moonlit_ferry')
  assert.equal(profile.city, 'Lisbon')
  assert.equal(profile.bio, 'Night walks')
  assert.equal(profile.email, 'ferry@example.com')
  assert.equal(profile.avatar_url, 'https://cdn.example/avatar.jpg')
})

test('profile save keeps the existing email and city', () => {
  assert.equal(validate_profile_username(' a '), 'Username must contain at least 2 characters.')
  assert.equal(validate_profile_username('moonlit_ferry'), '')
  assert.deepEqual(build_profile_update_params({
    username: ' moonlit_ferry ',
    email: 'Ferry@Example.com',
    bio: ' Night walks ',
    city: ' Lisbon ',
    avatar_url: ' https://cdn.example/avatar.jpg '
  }), {
    userName: 'moonlit_ferry',
    userEmail: 'ferry@example.com',
    userBrief: 'Night walks',
    userLocation: 'Lisbon',
    userImgUrl: 'https://cdn.example/avatar.jpg'
  })
})

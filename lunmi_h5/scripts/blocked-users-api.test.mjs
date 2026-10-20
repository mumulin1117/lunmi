import test from 'node:test'
import assert from 'node:assert/strict'
import {
  build_unblock_params,
  map_blocked_users,
  read_blocked_source
} from '../src/utils/blockedUsersPresentation.js'

test('blocked users keep the relation identity fields', () => {
  assert.deepEqual(map_blocked_users([
    { userId: 8, userName: ' still_water_88 ', userImgUrl: ' https://cdn.example/a.jpg ' },
    { userId: '', userName: 'missing' }
  ]), [
    { user_id: '8', user_name: 'still_water_88', avatar_url: 'https://cdn.example/a.jpg' }
  ])
})

test('unblocking uses the block relation and returns to settings', () => {
  assert.deepEqual(build_unblock_params('8'), { beHandleUserId: '8', hanldeType: 2 })
  assert.equal(read_blocked_source({ sourcePage: '/pages/profile/settings' }), '/pages/profile/settings')
  assert.equal(read_blocked_source({}), '/pages/profile/settings')
})

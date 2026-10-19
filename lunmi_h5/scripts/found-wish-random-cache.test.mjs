import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { envelope, load_api } from './api-test-helpers.mjs'

const project_root = new URL('../', import.meta.url)

const import_cache_storage = async () => {
  const source = await readFile(new URL('src/utils/foundWishRandomCacheStorage.js', project_root), 'utf8')
  const source_url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Math.random()}`
  return import(source_url)
}
import {
  map_found_replies_from_random_detail,
  map_found_wish,
  map_owner_profile_from_random_detail,
  read_wish_id_from_random_detail
} from '../src/utils/foundWishPresentation.js'
import { read_random_find_wish_id } from '../src/utils/wishFindingPresentation.js'

const SAMPLE_DETAIL = {
  wishId: 42,
  ownerUserId: 9,
  content: 'May peace find you.',
  anonymousDisplay: 0,
  branchLevel: 'high',
  blessingCount: 2,
  replyCount: 1,
  replyEnabled: 1,
  deleted: 0,
  imgUrl: 'https://cdn.example/wish.jpg',
  publishedAt: '2026-01-02T10:00:00.000Z',
  expiresAt: '2026-02-02T10:00:00.000Z',
  ownerUserInfo: {
    userId: 9,
    userName: 'Luna',
    userImgUrl: 'https://cdn.example/avatar.jpg',
    userLocation: 'Seoul'
  },
  replyList: [{
    wishReplyId: 7,
    userId: 3,
    content: 'Sending light.',
    deleted: 0,
    moderationStatus: 'passed',
    userName: 'River',
    userImgUrl: 'https://cdn.example/r.jpg'
  }]
}

test('random wish detail maps wish id and presentation fields', () => {
  assert.equal(read_wish_id_from_random_detail(SAMPLE_DETAIL), '42')
  assert.equal(read_random_find_wish_id(SAMPLE_DETAIL), '42')
  assert.equal(read_wish_id_from_random_detail({ wishId: 1, deleted: 1 }), '')
  const mapped = map_found_wish(SAMPLE_DETAIL)
  assert.equal(mapped.wish_id, '42')
  assert.equal(mapped.img_url, 'https://cdn.example/wish.jpg')
  assert.equal(mapped.branch_label, 'HIGH')
  const owner = map_owner_profile_from_random_detail(SAMPLE_DETAIL)
  assert.equal(owner.author_name, 'Luna')
  assert.equal(owner.location_label, 'Seoul')
  const replies = map_found_replies_from_random_detail(SAMPLE_DETAIL)
  assert.equal(replies.length, 1)
  assert.equal(replies[0].user_name, 'River')
})

test('found wish random cache scopes detail to the finder user', async () => {
  const memory = new Map()
  globalThis.uni = {
    getStorageSync: (key) => memory.get(key),
    setStorageSync: (key, value) => memory.set(key, value),
    removeStorageSync: (key) => memory.delete(key)
  }
  const storage = await import_cache_storage()
  assert.equal(storage.save_found_wish_random_detail({
    user_id: 3,
    detail: SAMPLE_DETAIL
  }), true)
  assert.deepEqual(storage.read_found_wish_random_detail({
    expected_user_id: 3,
    wish_id: 42
  }), SAMPLE_DETAIL)
  assert.equal(storage.has_found_wish_random_detail({
    expected_user_id: 3,
    wish_id: 42
  }), true)
  assert.equal(storage.read_pending_found_wish_id(3), '42')
  assert.equal(storage.read_pending_found_wish_id(9), '')
  assert.equal(storage.read_found_wish_random_detail({
    expected_user_id: 9,
    wish_id: 42
  }), null)
  storage.clear_found_wish_random_detail()
  assert.equal(storage.read_found_wish_random_detail({ expected_user_id: 3, wish_id: 42 }), null)
})

test('selectRandomLmWish uses the documented endpoint', async () => {
  const wish_api = await load_api('src/api/wish.js', () => envelope(200000, SAMPLE_DETAIL))
  const result = await wish_api.api.selectRandomLmWish()
  assert.equal(result.success, true)
  assert.equal(wish_api.calls[0].endpoint, '/sj/lunmi/selectRandomLmWish')
  assert.deepEqual(wish_api.calls[0].data, {})
  assert.equal(read_random_find_wish_id(result.data), '42')
})

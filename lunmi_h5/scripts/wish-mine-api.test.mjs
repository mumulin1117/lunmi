import assert from 'node:assert/strict'
import test from 'node:test'
import { WISH_TREE_PATH } from '../src/utils/wishSheetPresentation.js'
import {
  MINE_PAGE_PATH,
  PROFILE_PAGE_PATH,
  build_make_wish_url,
  build_mine_detail_url,
  map_my_wishes,
  read_mine_source
} from '../src/utils/wishMinePresentation.js'

test('my wishes map answered and open cards from the owner query', () => {
  const wishes = map_my_wishes({
    records: [
      {
        wishId: 1,
        content: 'Telling him',
        branchLevel: 'high',
        blessingCount: 42,
        wishStatus: 'answered',
        expiresAt: '2026-09-23T12:00:00',
        deleted: 0
      },
      {
        wishId: 2,
        content: 'Asking her out',
        branchLevel: 'low',
        wishStatus: 'published',
        expiresAt: '2026-08-31T12:00:00',
        deleted: 0
      },
      { wishId: 3, wishStatus: 'deleted', deleted: 0 }
    ]
  }, Date.parse('2026-08-28T12:00:00'))
  assert.equal(wishes.length, 2)
  assert.equal(wishes[0].is_answered, true)
  assert.equal(wishes[0].badge, 'HIGH · 26D')
  assert.equal(wishes[0].blessing_count, 42)
  assert.equal(wishes[1].branch_label, 'LOW')
  assert.equal(wishes[1].meta, 'Low branch · 3 days left')
})

test('an empty wish list returns to the source and a card opens the detail', () => {
  assert.equal(read_mine_source({}), PROFILE_PAGE_PATH)
  assert.equal(read_mine_source({ sourcePage: '/pages/profile/index' }), PROFILE_PAGE_PATH)
  assert.equal(read_mine_source({ sourcePage: 'https://evil.example' }), PROFILE_PAGE_PATH)
  assert.equal(build_make_wish_url(), `${WISH_TREE_PATH}?compose=1`)
  assert.equal(
    build_mine_detail_url('9'),
    `/pages/wish/detail/index?wishId=9&sourcePage=${encodeURIComponent(MINE_PAGE_PATH)}`
  )
})

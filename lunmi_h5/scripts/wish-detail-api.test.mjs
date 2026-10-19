import assert from 'node:assert/strict'
import test from 'node:test'
import { WISH_TREE_PATH } from '../src/utils/wishSheetPresentation.js'
import {
  FULFILL_PAGE_PATH,
  build_fulfill_url,
  map_wish_detail,
  read_published_outcome,
  read_wish_detail_query
} from '../src/utils/wishDetailPresentation.js'

test('wish detail reads the wish, the branch badge, and a published outcome', () => {
  const query = read_wish_detail_query({ wishId: '9', sourcePage: '/pages/wish/mine/index' })
  assert.equal(query.wish_id, '9')
  assert.equal(query.source_page, '/pages/wish/mine/index')
  assert.equal(read_wish_detail_query({}).source_page, WISH_TREE_PATH)
  const wish = map_wish_detail({
    wishId: 9,
    ownerUserId: 4,
    content: 'I want to tell him.',
    branchLevel: 'high',
    blessingCount: 42,
    replyEnabled: 1,
    replyCount: 2,
    wishStatus: 'published',
    expiresAt: '2026-09-23T12:00:00',
    deleted: 0
  }, Date.parse('2026-08-28T12:00:00'))
  assert.equal(wish.badge, 'HIGH BRANCH · 26D')
  assert.equal(wish.waiting_label, '42 people are waiting with you')
  assert.equal(wish.is_published, true)
  assert.equal(wish.img_url, '')
  assert.equal(map_wish_detail({
    wishId: 10,
    imgUrl: 'https://cdn.test/wish.jpg',
    deleted: 0,
    wishStatus: 'published'
  }).img_url, 'https://cdn.test/wish.jpg')
  assert.equal(map_wish_detail({ wishId: 9, deleted: 1 }), null)
  assert.equal(read_published_outcome({
    records: [{ wishOutcomeId: 3, outcomeStatus: 'published', outcomeText: 'He stayed.', deleted: 0 }]
  }).outcome_text, 'He stayed.')
  assert.equal(read_published_outcome({
    records: [{ wishOutcomeId: 3, outcomeStatus: 'draft', deleted: 0 }]
  }), null)
})

test('it came true opens the fulfill page for this wish', () => {
  assert.equal(
    build_fulfill_url('9'),
    `${FULFILL_PAGE_PATH}?wishId=9&sourcePage=${encodeURIComponent('/pages/wish/detail/index?wishId=9')}`
  )
})

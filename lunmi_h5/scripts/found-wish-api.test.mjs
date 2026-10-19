import assert from 'node:assert/strict'
import test from 'node:test'
import { WISH_TREE_PATH } from '../src/utils/wishSheetPresentation.js'
import {
  WISH_DETAIL_PATH,
  build_blessing_params,
  build_found_detail_url,
  build_reply_params,
  format_days_left,
  format_place_line,
  format_wish_date,
  map_found_replies,
  map_found_wish,
  read_created_reply_id,
  user_has_blessed
} from '../src/utils/foundWishPresentation.js'

test('a found wish keeps published content and hides a deleted wish', () => {
  const wish = map_found_wish({
    wishId: 9,
    ownerUserId: 4,
    content: 'A wish',
    anonymousDisplay: 0,
    branchLevel: 'high',
    blessingCount: 42,
    replyCount: 2,
    replyEnabled: 1,
    publishedAt: '2026-08-28T12:00:00',
    expiresAt: '2026-09-23T12:00:00',
    deleted: 0
  })
  assert.equal(wish.wish_id, '9')
  assert.equal(wish.branch_label, 'HIGH')
  assert.equal(wish.reply_enabled, true)
  assert.equal(wish.published_label, 'Aug 28')
  assert.equal(format_days_left('2026-09-23T12:00:00', Date.parse('2026-08-28T12:00:00')), '26 days left')
  assert.equal(format_place_line('Lisbon', wish.published_label), 'Lisbon · Aug 28')
  assert.equal(map_found_wish({ wishId: 9, deleted: 1 }), null)
})

test('blessing and reply writes do not invent ids', () => {
  assert.deepEqual(build_blessing_params({
    user_id: 4,
    wish_id: 9,
    created_date: '2026-08-28T00:00:00.000Z'
  }), {
    userId: 4,
    wishId: 9,
    blessingStatus: 'active',
    createdDate: '2026-08-28T00:00:00.000Z'
  })
  assert.equal('wishBlessingId' in build_blessing_params({ user_id: 1, wish_id: 2, created_date: '' }), false)
  assert.equal(user_has_blessed({
    records: [{ userId: 4, deleted: 0, blessingStatus: 'active' }]
  }, 4), true)
  assert.equal(user_has_blessed({
    records: [{ userId: 4, deleted: 0, blessingStatus: 'cancelled' }]
  }, 4), false)
  const reply = build_reply_params({
    user_id: 4,
    wish_id: 9,
    content: 'Stay',
    created_date: '2026-08-28T00:00:00.000Z'
  })
  assert.equal(reply.content, 'Stay')
  assert.equal('wishReplyId' in reply, false)
  assert.equal(read_created_reply_id({}), '')
  assert.equal(read_created_reply_id({ wishReplyId: 15 }), '15')
})

test('replies skip deleted and rejected records, and detail URLs retain return ownership', () => {
  const replies = map_found_replies({
    records: [
      { wishReplyId: 1, userId: 2, content: 'Stay', deleted: 0 },
      { wishReplyId: 2, userId: 3, content: 'No', deleted: 1 },
      { wishReplyId: 3, userId: 4, content: 'Hidden', moderationStatus: 'rejected' }
    ]
  })
  assert.deepEqual(replies, [{ reply_id: '1', user_id: '2', content: 'Stay', is_local: false }])
  assert.equal(build_found_detail_url('9'), `${WISH_DETAIL_PATH}?wishId=9&sourcePage=${encodeURIComponent(WISH_TREE_PATH)}`)
})

test('backend millisecond timestamps display publication date and remaining days', () => {
  const now = Date.parse('2026-08-28T12:00:00Z')
  const expires = Date.parse('2026-09-23T12:00:00Z')
  assert.equal(format_wish_date(now), 'Aug 28')
  assert.equal(format_wish_date(`${now}`), 'Aug 28')
  assert.equal(format_days_left(expires, now), '26 days left')
  assert.equal(format_days_left(`${expires}`, now), '26 days left')
  assert.equal(format_days_left('2026-09-23 12:00:00', Date.parse('2026-08-28T12:00:00')), '26 days left')
  assert.equal(format_wish_date(null), '')
  assert.equal(format_days_left('invalid', now), '')
})

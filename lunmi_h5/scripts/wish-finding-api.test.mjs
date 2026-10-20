import assert from 'node:assert/strict'
import test from 'node:test'
import { WISH_TREE_PATH } from '../src/utils/wishSheetPresentation.js'
import {
  FINDING_PAGE_PATH,
  WISH_TOUCH_ANIMATION_VIDEO,
  build_found_tree_url,
  build_finding_url,
  pick_found_wish,
  read_finding_wish_id,
  read_found_wish_id,
  read_random_find_wish_id
} from '../src/utils/wishFindingPresentation.js'

test('finding opens from the wish tree and returns a found wish id', () => {
  assert.equal(WISH_TOUCH_ANIMATION_VIDEO, '/static/scenes/anim-wish-touch.mp4')
  assert.equal(build_finding_url(), FINDING_PAGE_PATH)
  assert.equal(read_finding_wish_id({ wishId: 'wish-9' }), 'wish-9')
  assert.equal(build_found_tree_url('wish-9'), `${WISH_TREE_PATH}?foundWishId=wish-9`)
  assert.equal(read_found_wish_id({ foundWishId: 'wish-9' }), 'wish-9')
})

test('random find reads wish id from aggregate detail', () => {
  assert.equal(read_random_find_wish_id({ wishId: 99, deleted: 0 }), '99')
  assert.equal(read_random_find_wish_id(null), '')
})

test('finding skips the current user and deleted wishes', () => {
  const page = {
    records: [
      { wishId: 'own', ownerUserId: 'me' },
      { wishId: 'gone', ownerUserId: 'other', deleted: 1 },
      { wishId: 'open', ownerUserId: 'other' }
    ]
  }
  assert.equal(pick_found_wish(page, { owner_user_id: 'me' }), 'open')
  assert.equal(pick_found_wish(page, { owner_user_id: 'me', preferred_id: 'own' }), 'open')
  assert.equal(pick_found_wish({ records: [{ wishId: 'own', ownerUserId: 'me' }] }, { owner_user_id: 'me' }), '')
})

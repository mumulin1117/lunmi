import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ALREADY_TOLD_TITLE,
  blessed_label,
  build_outcome_params,
  read_fulfill_query
} from '../src/utils/wishFulfillPresentation.js'

test('a wish can be told once and the outcome does not invent an id', () => {
  const query = read_fulfill_query({
    wishId: '9',
    sourcePage: '/pages/wish/detail/index?wishId=9'
  })
  assert.equal(query.wish_id, '9')
  assert.equal(query.return_page, '/pages/wish/detail/index?wishId=9')
  assert.equal(blessed_label(42), '42 people blessed this wish')
  assert.equal(blessed_label(1), '1 person blessed this wish')
  const params = build_outcome_params({
    wish_id: '9',
    owner_user_id: 4,
    outcome_text: 'He stayed.',
    published_at: '2026-08-28T00:00:00.000Z'
  })
  assert.equal(params.outcomeStatus, 'published')
  assert.equal(params.outcomeText, 'He stayed.')
  assert.equal(params.notifiedAt, '2026-08-28T00:00:00.000Z')
  assert.equal('wishOutcomeId' in params, false)
  assert.equal(ALREADY_TOLD_TITLE, 'You already told them')
})

test('a fulfill page without a wish returns to the wish tree', () => {
  assert.equal(read_fulfill_query({}).return_page, '/pages/wish/tree/index')
  assert.equal(read_fulfill_query({ sourcePage: 'https://evil.example', wishId: '9' }).return_page, '/pages/wish/detail/index?wishId=9')
})

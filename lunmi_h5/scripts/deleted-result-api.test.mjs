import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DELETED_RESULT_STATUS,
  can_verify_deleted_object,
  deleted_result_back_target,
  deleted_result_copy,
  is_account_deletion,
  read_deleted_result_query,
  result_is_removed
} from '../src/utils/deleteConfirmPresentation.js'

test('deleted result reads the previous delete route', () => {
  assert.deepEqual(read_deleted_result_query({
    objectType: 'lantern',
    objectId: '4',
    sourcePage: '/pages/lantern/detail/index',
    returnPage: '/pages/home/index'
  }), {
    object_type: 'lantern',
    object_id: '4',
    source_page: '/pages/lantern/detail/index',
    return_page: '/pages/home/index'
  })
})

test('deleted result returns to returnPage and refreshes that page', () => {
  assert.equal(deleted_result_back_target({
    return_page: '/pages/home/index',
    source_page: '/pages/lantern/detail/index'
  }), '/pages/home/index')
  assert.equal(deleted_result_back_target({ source_page: '/pages/community/index' }), '/pages/community/index')
})

test('lantern success copy matches the design', () => {
  const copy = deleted_result_copy('lantern', DELETED_RESULT_STATUS.SUCCESS)
  assert.equal(copy.title, 'You deleted this')
  assert.equal(copy.action, 'Back to my records')
  assert.match(copy.copy, /off the river/)
})

test('a missing record is already gone', () => {
  assert.equal(result_is_removed({ records: [] }), true)
  assert.equal(result_is_removed({ records: [{ lanternId: 4, deleted: 1 }] }), true)
  assert.equal(result_is_removed({ dynamicId: 9, deleted: 0 }), false)
  assert.equal(deleted_result_copy('lantern', DELETED_RESULT_STATUS.GONE).title, 'Already gone')
})

test('account deletion leaves for login instead of the result card', () => {
  assert.equal(is_account_deletion('account'), true)
  assert.equal(can_verify_deleted_object('comment'), false)
  assert.equal(can_verify_deleted_object('lantern'), true)
})

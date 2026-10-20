import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DELETE_COPY,
  DELETE_OBJECT,
  POST_DELETE_UNAVAILABLE,
  build_delete_lantern_params,
  build_delete_wish_params,
  build_deleted_result_url,
  can_delete_owned_object
} from '../src/utils/deleteConfirmPresentation.js'

test('lantern delete copy matches the design', () => {
  assert.equal(DELETE_COPY[DELETE_OBJECT.LANTERN].title, 'Delete this lantern?')
  assert.match(DELETE_COPY[DELETE_OBJECT.LANTERN].copy, /stops drifting/)
})

test('only the owner can open delete', () => {
  assert.equal(can_delete_owned_object('8', '8'), true)
  assert.equal(can_delete_owned_object('8', '9'), false)
  assert.equal(can_delete_owned_object('', '8'), false)
})

test('delete params use the documented id fields', () => {
  assert.deepEqual(build_delete_lantern_params(4), { lanternId: 4 })
  assert.deepEqual(build_delete_wish_params(7), { wishId: 7 })
})

test('successful delete opens the shared result page', () => {
  assert.equal(
    build_deleted_result_url({
      object_type: 'lantern',
      object_id: '4',
      source_page: '/pages/lantern/detail/index',
      return_page: '/pages/home/index'
    }),
    '/pages/common/deleted-result/index?objectType=lantern&objectId=4&sourcePage=%2Fpages%2Flantern%2Fdetail%2Findex&returnPage=%2Fpages%2Fhome%2Findex'
  )
})

test('post delete stays unavailable until an endpoint exists', () => {
  assert.equal(POST_DELETE_UNAVAILABLE, 'Deleting a post is not available yet.')
})

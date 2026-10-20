import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SUCCESS_TOAST,
  queue_success_toast,
  take_success_toast
} from '../src/utils/successToast.js'

test('a success toast is queued once and is not shown for an empty result', () => {
  queue_success_toast(SUCCESS_TOAST.fulfill)
  assert.equal(take_success_toast(), 'Wish came true')
  assert.equal(take_success_toast(), '')
  queue_success_toast('')
  assert.equal(take_success_toast(), '')
  assert.equal(SUCCESS_TOAST.lantern, 'Lantern released')
  assert.equal(SUCCESS_TOAST.report, 'Report sent')
  assert.equal(SUCCESS_TOAST.recharge, 'Coins added')
})

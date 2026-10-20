import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REPORT_REASONS,
  can_block_report_target,
  report_button_label,
  report_subtitle
} from '../src/utils/reportSheetPresentation.js'

test('report reasons match the design order', () => {
  assert.deepEqual(REPORT_REASONS.map((reason) => reason.label), [
    'Sexual content',
    'Harassment or hate',
    'Violence or self-harm',
    'Spam or scam',
    'Something else'
  ])
})

test('report button stays closed until a reason is chosen', () => {
  assert.equal(report_button_label(''), 'Choose a reason')
  assert.equal(report_button_label('Spam or scam'), 'Submit report')
})

test('report subtitle follows the reported object', () => {
  assert.equal(report_subtitle({ post_id: '9' }), 'Reporting this post · reviewed within 24 hours')
  assert.equal(report_subtitle({ comment_id: '3' }), 'Reporting this comment · reviewed within 24 hours')
  assert.equal(report_subtitle({}), 'Reporting this person · reviewed within 24 hours')
})

test('block is offered only when a target user id exists', () => {
  assert.equal(can_block_report_target(''), false)
  assert.equal(can_block_report_target(null), false)
  assert.equal(can_block_report_target(0), true)
  assert.equal(can_block_report_target('12'), true)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NOTICE_KIND,
  build_notice_detail_url,
  can_open_notice_sender,
  format_notice_detail_time,
  notice_detail_body,
  notice_detail_quote,
  read_notice_detail_id,
  read_notice_detail_source,
  resolve_notice_detail_kind
} from '../src/utils/noticeListPresentation.js'

const scooped = {
  notice_id: '32',
  message_classify: 2,
  user_id: '18',
  user_name: 'quiet_harbor',
  title: 'Your lantern was scooped',
  content: 'quiet_harbor picked up the lantern you released on Aug 29 and opened a conversation.',
  created_at: '2026-08-30T21:24:00'
}

test('notice detail chooses layouts from the message classification', () => {
  assert.equal(resolve_notice_detail_kind(scooped, ''), NOTICE_KIND.LANTERN_SCOOPED)
  assert.equal(resolve_notice_detail_kind(scooped, '1'), NOTICE_KIND.LANTERN_SCOOPED)
  assert.equal(resolve_notice_detail_kind({
    title: 'Release opens at 21:00',
    content: 'Lanterns drift farther at night.',
    user_id: '0'
  }, ''), NOTICE_KIND.ANNOUNCEMENT)
  assert.equal(resolve_notice_detail_kind({
    title: 'A wish you blessed came true',
    message_classify: 1,
    content: 'I want to tell him how I feel before he leaves.',
    user_id: '400'
  }, 'wish_fulfilled'), NOTICE_KIND.WISH_FULFILLED)
  assert.equal(notice_detail_body(scooped, NOTICE_KIND.LANTERN_SCOOPED), scooped.content)
  assert.equal(notice_detail_quote({
    title: 'The wish you blessed on Aug 28 has been answered.',
    wish_content: 'I want to tell him how I feel before he leaves.'
  }, NOTICE_KIND.WISH_FULFILLED), 'I want to tell him how I feel before he leaves.')
  assert.equal(notice_detail_body(scooped, NOTICE_KIND.WISH_FULFILLED), '')
  assert.equal(format_notice_detail_time('2026-08-30T21:24:00'), 'Aug 30, 9:24 PM')
  assert.equal(can_open_notice_sender(scooped), true)
  assert.equal(can_open_notice_sender({ user_id: '0' }), false)
  assert.equal(read_notice_detail_id({ notificationId: '32' }), '32')
  assert.equal(
    read_notice_detail_source('/pages/messages/notice?sourcePage=%2Fpages%2Fhome%2Findex'),
    '/pages/messages/notice?sourcePage=/pages/home/index'
  )
  assert.match(build_notice_detail_url({
    notice_id: 33,
    kind: NOTICE_KIND.ANNOUNCEMENT
  }), /type=1/)
})

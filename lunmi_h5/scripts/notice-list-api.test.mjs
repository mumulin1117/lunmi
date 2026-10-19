import assert from 'node:assert/strict'
import test from 'node:test'
import { map_notice_messages } from '../src/utils/messagePresentation.js'
import {
  ANNOUNCEMENT_DETAIL_TYPE,
  NOTICE_KIND,
  WISH_FULFILLED_DETAIL_TYPE,
  build_notice_detail_url,
  build_notice_page_url,
  decorate_notice_list,
  format_notice_relative_label,
  read_notice_message_id
} from '../src/utils/noticeListPresentation.js'

const now = Date.parse('2026-10-08T12:00:00.000Z')

test('notice list keeps announcements and notifications from the existing message fields', () => {
  const notices = decorate_notice_list(map_notice_messages([
    {
      content: 'The lantern you blessed is lit.',
      createDate: '2026-10-08T11:58:00.000Z',
      messageId: 31,
      messageClassify: 1,
      messageType: 3,
      readFlag: 0,
      sendUserId: '400',
      sendUserName: 'river_of_may',
      title: 'A wish you blessed came true'
    },
    {
      content: '',
      createDate: '2026-10-08T11:48:00.000Z',
      messageId: 32,
      messageClassify: 2,
      messageType: 3,
      readFlag: 1,
      sendUserId: '0',
      sendUserName: '',
      title: 'Your lantern was scooped'
    },
    {
      content: 'Tonight',
      createDate: '2026-10-08T08:00:00.000Z',
      messageId: 33,
      messageClassify: 3,
      messageType: 3,
      readFlag: 1,
      sendUserId: '0',
      sendUserName: 'Lunmi',
      title: 'Your wish was seen'
    },
    {
      content: 'The river is open tonight.',
      createDate: '2026-10-07T12:00:00.000Z',
      messageId: 34,
      messageClassify: 4,
      messageType: 3,
      readFlag: 0,
      sendUserId: '0',
      sendUserName: 'Lunmi',
      title: 'Community announcement'
    }
  ]), now)

  assert.deepEqual(notices.map((item) => item.kind), [
    NOTICE_KIND.WISH_FULFILLED,
    NOTICE_KIND.LANTERN_SCOOPED,
    NOTICE_KIND.WISH_VIEWED,
    NOTICE_KIND.ANNOUNCEMENT
  ])
  assert.equal(notices[0].headline, 'A wish you blessed came true')
  assert.equal(notices[0].meta_label, '2 min ago')
  assert.equal(notices[0].icon_src, '/static/icon/notiication_wish.png')
  assert.equal(notices[1].meta_label, '12 min ago')
  assert.equal(notices[1].icon_src, '/static/icon/notiication_lantern.png')
  assert.equal(notices[2].meta_label, '4 hours ago')
  assert.equal(notices[2].icon_src, '/static/icon/notiication_release.png')
  assert.equal(notices[3].icon_src, '/static/icon/message_notice.png')
  assert.equal(format_notice_relative_label('2026-10-08T11:59:30.000Z', now), '0 min ago')
  assert.equal(read_notice_message_id(notices[0]), 31)
  assert.equal(read_notice_message_id({ notice_id: '0' }), 0)
})

test('notice detail links keep the current message id and the planned type query', () => {
  const source = build_notice_page_url('/pages/home/index')
  assert.equal(source, '/pages/messages/notice?sourcePage=%2Fpages%2Fhome%2Findex')
  const wish = build_notice_detail_url({
    notice_id: 31,
    kind: NOTICE_KIND.WISH_FULFILLED
  }, source)
  assert.match(wish, /message_id=31/)
  assert.match(wish, /notificationId=31/)
  assert.match(wish, new RegExp(`type=${WISH_FULFILLED_DETAIL_TYPE}`))
  const announcement = build_notice_detail_url({
    notice_id: 34,
    kind: NOTICE_KIND.ANNOUNCEMENT
  }, source)
  assert.match(announcement, new RegExp(`type=${ANNOUNCEMENT_DETAIL_TYPE}`))
  const lantern = build_notice_detail_url({
    notice_id: 32,
    kind: NOTICE_KIND.LANTERN_SCOOPED
  }, source)
  assert.equal(lantern.includes('type='), false)
})

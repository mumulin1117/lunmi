import assert from 'node:assert/strict'
import test from 'node:test'
import { envelope, load_api } from './api-test-helpers.mjs'
import { build_select_reply_params } from '../src/utils/lanternDetailPresentation.js'
import {
  ONE_REPLY_CHAT_MODE,
  build_add_reply_params,
  build_one_reply_chat_url,
  quote_lantern_content,
  read_created_reply_id,
  reply_source_meta
} from '../src/utils/lanternReplyPresentation.js'

test('one reply payload keeps documented fields and omits a client id', () => {
  assert.deepEqual(build_add_reply_params({
    content: '  I saw it  ',
    lantern_id: 8,
    lantern_scoop_id: 21,
    sender_user_id: 9,
    sent_at: '2026-10-08T12:00:00.000Z'
  }), {
    content: 'I saw it',
    lanternId: 8,
    lanternScoopId: 21,
    senderUserId: 9,
    sentAt: '2026-10-08T12:00:00.000Z'
  })
  assert.equal(Object.hasOwn(build_add_reply_params({ content: 'Hi' }), 'lanternReplyId'), false)
  assert.equal(read_created_reply_id({ lanternReplyId: 4 }), 4)
  assert.equal(read_created_reply_id({}), '')
  assert.equal(quote_lantern_content('Night ferry'), '“Night ferry”')
  assert.match(reply_source_meta('Kyoto', '2026-08-29T00:00:00Z'), /Kyoto/)
  assert.equal(
    build_one_reply_chat_url({ user_id: 6, source_page: '/pages/home/index' }),
    `/pages/messages/chat?user_id=6&targetUserId=6&chatMode=${ONE_REPLY_CHAT_MODE}&sourcePage=%2Fpages%2Fhome%2Findex`
  )
})

test('reply page queries and sends the documented unique reply endpoints', async () => {
  const scoop_api = await load_api('src/api/scoop.js', (options) => {
    if (options.endpoint.includes('addLmLanternReply')) return envelope(200000, { lanternReplyId: 4 })
    return envelope(200000, { records: [{ lanternReplyId: 4, content: 'I saw it', lanternScoopId: 21 }] })
  })
  const listed = await scoop_api.api.selectLmLanternReplyPage(build_select_reply_params({
    lantern_scoop_id: 21
  }))
  assert.equal(listed.success, true)
  assert.equal(scoop_api.calls[0].endpoint, '/sj/lunmi/selectLmLanternReplyPage')
  assert.equal(scoop_api.calls[0].data.lanternScoopId, 21)

  const created = await scoop_api.api.addLmLanternReply(build_add_reply_params({
    content: 'I saw it',
    lantern_id: 8,
    lantern_scoop_id: 21,
    sender_user_id: 9,
    sent_at: '2026-10-08T12:00:00.000Z'
  }))
  assert.equal(created.success, true)
  assert.equal(scoop_api.calls[1].endpoint, '/sj/lunmi/addLmLanternReply')
  assert.equal(scoop_api.calls[1].data.content, 'I saw it')
  assert.equal(Object.hasOwn(scoop_api.calls[1].data, 'lanternReplyId'), false)
  assert.equal(read_created_reply_id(created.data), 4)
})

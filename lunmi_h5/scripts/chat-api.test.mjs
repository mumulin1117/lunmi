import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LOCKED_ONE_REPLY,
  OPEN_CHAT,
  WAITING_OTHER,
  YOUR_TURN,
  build_chat_page_url,
  build_chat_send_params,
  build_ringing_url,
  can_compose_chat,
  decorate_chat_messages,
  next_mode_after_send,
  read_chat_peer_id,
  read_chat_peer_profile,
  read_missing_send_message_fields,
  read_receive_user_id,
  resolve_chat_mode,
  shows_video_call
} from '../src/utils/chatPresentation.js'

test('chat mode follows the one-reply, waiting, and your-turn designs', () => {
  assert.equal(read_chat_peer_id({ targetUserId: 6 }), '6')
  assert.equal(read_chat_peer_id({ user_id: '8' }), '8')
  assert.equal(read_receive_user_id('8'), 8)
  assert.equal(`${read_receive_user_id('700828858110021')}`, '700828858110021')
  assert.equal(read_receive_user_id(''), null)
  assert.deepEqual(read_chat_peer_profile({
    user_id: '700828858110021',
    userName: 'Asdasd',
    userImg: 'https://cdn.example.com/a.jpg'
  }), {
    user_id: '700828858110021',
    user_name: 'Asdasd',
    user_avatar_url: 'https://cdn.example.com/a.jpg'
  })
  const send_params = build_chat_send_params({
    content: 'hello',
    receive_user_id: 200,
    receive_user_name: 'Peer',
    receive_user_img: 'peer.png',
    send_user_id: '100',
    send_user_name: 'Me',
    send_user_img_url: 'me.png'
  })
  assert.deepEqual(send_params, {
    content: 'hello',
    messageType: 1,
    receiveUserId: 200,
    receiveUserName: 'Peer',
    receiveUserImg: 'peer.png',
    sendUserId: '100',
    sendUserName: 'Me',
    sendUserImgUrl: 'me.png'
  })
  assert.deepEqual(read_missing_send_message_fields(send_params), [])
  assert.equal(
    build_chat_page_url({
      user_id: '700828858110021',
      user_name: 'Asdasd',
      user_avatar_url: 'https://cdn.example.com/a.jpg',
      source_page: '/pages/messages/index'
    }),
    '/pages/messages/chat?user_id=700828858110021&targetUserId=700828858110021&userName=Asdasd&userImg=https%3A%2F%2Fcdn.example.com%2Fa.jpg&sourcePage=%2Fpages%2Fmessages%2Findex'
  )
  const mine = { is_mine: true, message_type: 1, sender_id: '9' }
  const peer = { is_mine: false, message_type: 1, sender_id: '6' }
  assert.equal(resolve_chat_mode({
    requested_mode: 'one_reply',
    messages: []
  }), LOCKED_ONE_REPLY)
  assert.equal(resolve_chat_mode({ messages: [mine] }), LOCKED_ONE_REPLY)
  assert.equal(resolve_chat_mode({ messages: [mine, mine] }), WAITING_OTHER)
  assert.equal(resolve_chat_mode({ messages: [peer] }), YOUR_TURN)
  assert.equal(resolve_chat_mode({ messages: [mine, peer] }), YOUR_TURN)
  assert.equal(resolve_chat_mode({ messages: [peer, mine] }), OPEN_CHAT)
  assert.equal(can_compose_chat(YOUR_TURN), true)
  assert.equal(can_compose_chat(LOCKED_ONE_REPLY), false)
  assert.equal(shows_video_call(OPEN_CHAT), true)
  assert.equal(shows_video_call(LOCKED_ONE_REPLY), false)
  assert.equal(next_mode_after_send(YOUR_TURN), OPEN_CHAT)
  assert.equal(decorate_chat_messages([{ sender_id: '9', is_mine: false }], '9')[0].is_mine, true)
  const ringing_url = build_ringing_url({
    call_id: '6-1',
    callee_id: 6,
    source_page: '/pages/messages/chat'
  })
  assert.match(ringing_url, /^\/pages\/calls\/ringing\/index\?callId=6-1/)
  assert.match(ringing_url, /calleeId=6/)
  assert.match(ringing_url, /sourcePage=%2Fpages%2Fmessages%2Fchat/)
})

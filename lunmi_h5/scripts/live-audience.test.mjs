import assert from 'node:assert/strict'
import test from 'node:test'
import {
  audience_user_from_payload,
  audience_users_from_payload,
  is_audience_enter_signal,
  is_audience_leave_signal,
  merge_audience_users,
  upsert_audience_list
} from '../src/utils/liveAudience.js'
import { import_source } from './api-test-helpers.mjs'

const { parse_live_socket_event } = await import_source('src/utils/liveWebSocket.js', [
  ["from '@/config/api'", 'from "data:text/javascript,export const LIVE_WS_BASE_URL = \'ws://test\'"']
])

const backend_enter_envelope = (user) => ({
  code: 200000,
  message: '成功',
  messageType: 14,
  data: JSON.stringify({
    channelId: '1001',
    messageType: 14,
    userId: user.userId,
    userName: user.userName,
    userImgUrl: user.userImgUrl
  })
})

test('parses TalkMessage JSON in the live socket data envelope', () => {
  const user = { userId: 22, userName: 'B', userImgUrl: 'https://cdn.example/b.png' }
  const parsed = parse_live_socket_event({ data: JSON.stringify(backend_enter_envelope(user)) })
  assert.equal(parsed.type, 14)
  assert.deepEqual(audience_user_from_payload(parsed.payload, parsed.envelope), user)
})

test('reads nested type when the envelope omits messageType', () => {
  const user = { userId: 22, userName: 'B', userImgUrl: 'https://cdn.example/b.png' }
  const parsed = parse_live_socket_event({
    data: JSON.stringify({
      code: 200000,
      data: JSON.stringify({
        messageType: 14,
        userId: user.userId,
        userName: user.userName,
        userImgUrl: user.userImgUrl
      })
    })
  })
  assert.equal(parsed.type, 14)
  assert.equal(is_audience_enter_signal(parsed.type, parsed.payload), true)
  assert.deepEqual(audience_users_from_payload(parsed.payload, parsed.envelope), [user])
})

test('treats chat enter/leave control frames as presence', () => {
  assert.equal(is_audience_enter_signal(1, { message: 'enter', userId: 8 }), true)
  assert.equal(is_audience_leave_signal(1, { message: 'leave', userId: 8 }), true)
  assert.equal(is_audience_enter_signal(1, { message: 'hello', userId: 8 }), false)
})

test('merges a new joiner into an existing audience list', () => {
  const host = { userId: 11, userName: 'A', userImgUrl: 'https://cdn.example/a.png' }
  const guest = { userId: 22, userName: 'B', userImgUrl: 'https://cdn.example/b.png' }
  const seeded = upsert_audience_list([], host)
  const joined = merge_audience_users(seeded.list, [guest])
  assert.equal(joined.added, 1)
  assert.deepEqual(joined.list.map((item) => item.userId), [11, 22])
})

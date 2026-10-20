import assert from 'node:assert/strict'
import test from 'node:test'
import { CALL_CONNECTION_ENABLED } from '../src/config/callMedia.js'
import { SHOW_INCOME_CALL } from '../src/config/incomeControll.js'
import {
  build_connected_url,
  build_ringing_url,
  connected_end_toast,
  create_call_id,
  plan_connected_schedule,
  plan_ringing_schedule,
  read_call_route_context,
  ringing_end_toast,
  ringing_status_label,
  RINGING_END_REASON
} from '../src/utils/callPresentation.js'

test('call presentation urls and labels', () => {
  assert.equal(create_call_id('42', 1000), '42-1000')
  assert.equal(ringing_status_label(2), 'Calling..')
  assert.equal(ringing_end_toast(RINGING_END_REASON.timeout), 'No answer')
  assert.equal(connected_end_toast('peer_hangup'), 'They hung up')

  const ringing = build_ringing_url({
    call_id: '42-1000',
    callee_id: '42',
    callee_name: 'River',
    callee_avatar_url: 'https://cdn.example/a.png',
    caller_id: '9',
    source_page: '/pages/messages/chat?user_id=42'
  })
  assert.match(ringing, /^\/pages\/calls\/ringing\/index\?/)
  assert.match(ringing, /callId=42-1000/)
  assert.match(ringing, /calleeId=42/)
  assert.match(ringing, /callerId=9/)
  assert.match(ringing, /callState=ringing/)

  const connected = build_connected_url({
    call_id: '42-1000',
    callee_id: '42',
    source_page: '/pages/messages/chat'
  })
  assert.match(connected, /\/pages\/calls\/connected\/index\?/)
  assert.match(connected, /callState=connected/)

  const context = read_call_route_context({
    callId: '42-1000',
    calleeId: '42',
    calleeName: 'River',
    sourcePage: '/pages/messages/chat'
  })
  assert.equal(context.call_id, '42-1000')
  assert.equal(context.callee_id, '42')
  assert.equal(context.callee_name, 'River')
})

test('release calls never schedule a simulated connection or an automatic incoming call', () => {
  assert.equal(CALL_CONNECTION_ENABLED, false)
  assert.equal(SHOW_INCOME_CALL, false)
  for (const roll of [0, 0.1, 0.5, 0.99]) {
    const ringing = plan_ringing_schedule(() => roll)
    assert.equal(ringing.connect_ms, null)
    assert.equal(ringing.outcome_at_connect, RINGING_END_REASON.unavailable)
    assert.ok(ringing.timeout_ms >= 8000 && ringing.timeout_ms <= 12000)
  }
  assert.equal(ringing_end_toast(RINGING_END_REASON.unavailable), 'This call is unavailable.')
})

test('inactive connected-page schedule retains bounded durations', () => {
  const connected = plan_connected_schedule(() => 0.5)
  assert.ok(connected.peer_hangup_ms >= 28000)
  assert.ok(connected.network_check_ms >= 12000)
})

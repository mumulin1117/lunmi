import assert from 'node:assert/strict'
import test from 'node:test'
import {
  build_close_room_params,
  build_join_room_params,
  build_leave_room_params,
  build_select_live_info_params,
  build_select_room_messages_params,
  build_select_room_users_params,
  build_voice_seats,
  read_room_listener_count,
  read_voice_room_id,
  room_is_active,
  voice_room_confirm_copy
} from '../src/utils/voiceRoomDetailPresentation.js'

test('voice room detail keeps four seats and the existing room endpoints', () => {
  assert.equal(read_voice_room_id({ roomId: '8' }), '8')
  assert.equal(read_voice_room_id({ live_id: '9' }), '9')
  assert.deepEqual(build_select_live_info_params({ room_id: '8', live_password: 'night' }), {
    liveId: '8',
    livePassword: 'night'
  })
  assert.deepEqual(build_select_room_users_params('8'), { liveId: '8' })
  assert.deepEqual(build_select_room_messages_params('8'), {
    activityId: '8',
    current: 1,
    size: 20
  })
  assert.deepEqual(build_join_room_params('8'), { liveId: '8', addType: 1 })
  assert.deepEqual(build_leave_room_params('8'), { liveId: '8', addType: 2 })
  assert.deepEqual(build_close_room_params('8'), { liveId: '8' })

  const seats = build_voice_seats({
    userId: 3,
    userName: 'lantern_keeper',
    userImgUrl: 'host.png',
    liveUserNum: 214,
    liveTitle: 'Late night thoughts'
  }, [
    { userId: 3, userName: 'lantern_keeper', userImgUrl: 'host.png' },
    { userId: 4, userName: 'quiet_harbor', userImgUrl: 'a.png' },
    { userId: 5, userName: 'river_of_may', userImgUrl: 'b.png' }
  ])
  assert.equal(seats.length, 4)
  assert.equal(seats[0].member.user_name, 'lantern_keeper')
  assert.equal(seats[0].member.is_host, true)
  assert.equal(seats[1].member.user_name, 'quiet_harbor')
  assert.equal(seats[3].member, null)
  assert.equal(read_room_listener_count({ liveUserNum: 214 }, 3), 214)
  assert.equal(room_is_active({ liveStatus: 1 }), true)
  assert.equal(room_is_active({ liveStatus: 2 }), false)
  assert.equal(voice_room_confirm_copy(true).title, 'Close this room?')
  assert.equal(
    voice_room_confirm_copy(true).copy,
    'The room closes for everyone in it right now. This cannot be undone.'
  )
  assert.equal(voice_room_confirm_copy(true).confirm_label, 'Close room')
  assert.equal(voice_room_confirm_copy(true).pending_label, 'Closing...')
  assert.equal(voice_room_confirm_copy(false).title, 'Leave this room?')
  assert.equal(voice_room_confirm_copy(false).pending_label, 'Leaving...')
})

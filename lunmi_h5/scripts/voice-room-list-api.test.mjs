import assert from 'node:assert/strict'
import test from 'node:test'
import {
  build_select_voice_rooms_params,
  build_voice_room_detail_url,
  map_voice_rooms,
  read_live_page_has_more,
  read_voice_room_source
} from '../src/utils/voiceRoomListPresentation.js'

const now = Date.parse('2026-10-08T12:00:00.000Z')

test('voice room list maps the existing live page fields into the design cards', () => {
  const rooms = map_voice_rooms({
    records: [
      {
        liveId: 8,
        liveTitle: 'Late night thoughts',
        liveUserNum: 214,
        liveTime: '2026-10-07T12:00:00.000Z',
        liveClassify: 2,
        userId: 3,
        userName: 'quiet_harbor',
        userImgUrl: 'host.png'
      },
      {
        liveId: 9,
        liveTitle: 'Say hi, new here',
        liveUserNum: 31,
        liveTime: '2026-10-08T08:00:00.000Z',
        liveClassify: 1,
        userId: 4,
        userName: 'me',
        userImgUrl: ''
      },
      { liveTitle: 'Missing id' }
    ],
    current: 1,
    pages: 2,
    total: 21
  }, { current_user_id: '4', now })

  assert.equal(rooms.length, 2)
  assert.equal(rooms[0].title, 'Late night thoughts')
  assert.equal(rooms[0].listener_count, 214)
  assert.equal(rooms[0].badge_label, 'LIVE')
  assert.equal(rooms[0].is_mine, false)
  assert.equal(rooms[0].host_avatar, 'host.png')
  assert.match(rooms[0].cover_src, /^\/static\/icon\//)
  assert.equal(rooms[1].badge_label, 'NEW')
  assert.equal(rooms[1].is_mine, true)
  assert.equal(rooms[1].is_video, true)
  assert.equal(read_live_page_has_more({ pages: 2 }, { current: 1, size: 20, count: 2 }), true)
  assert.deepEqual(build_select_voice_rooms_params({ current: 1, size: 20 }), {
    liveStatus: 1,
    selectType: 1,
    current: 1,
    size: 20
  })
  assert.equal(
    build_voice_room_detail_url(rooms[0], '/pages/live-room/list?sourcePage=%2Fpages%2Fhome%2Findex'),
    '/pages/live-room/detail?roomId=8&live_id=8&sourcePage=%2Fpages%2Flive-room%2Flist%3FsourcePage%3D%252Fpages%252Fhome%252Findex'
  )
  assert.match(build_voice_room_detail_url(rooms[1]), /^\/pages\/live-room\/video\?/)
  assert.equal(read_voice_room_source('/pages/profile/index'), '/pages/profile/index')
  assert.equal(read_voice_room_source(''), '/pages/home/index')
})

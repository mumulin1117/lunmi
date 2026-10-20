import test from 'node:test'
import assert from 'node:assert/strict'
import {
  build_find_lantern_url,
  build_scooped_detail_url,
  count_scoop_replies,
  map_scooped_card,
  map_scooped_lanterns,
  read_scooped_source,
  scoop_reply_badge
} from '../src/utils/scoopedLanternPresentation.js'

test('scooped lanterns skip cancelled records and label replies', () => {
  const scoops = map_scooped_lanterns({
    records: [
      {
        lanternScoopId: 7,
        lanternId: 11,
        scoopStatus: 'active',
        scoopedAt: '2026-08-29T12:00:00Z',
        deleted: 0
      },
      { lanternScoopId: 8, lanternId: 12, scoopStatus: 'cancelled', deleted: 0 }
    ]
  })
  assert.equal(scoops.length, 1)
  assert.equal(count_scoop_replies({ records: [{ lanternReplyId: 3, deleted: 0 }] }), 1)
  assert.deepEqual(scoop_reply_badge(0), { label: 'New', tone: 'new' })
  assert.deepEqual(scoop_reply_badge(1), { label: '1 message', tone: 'messages' })
  const card = map_scooped_card({
    scoop: scoops[0],
    lantern: { anonymous_display: false, release_city_name: 'Kyoto' },
    user_name: 'quiet_harbor',
    avatar_url: 'https://cdn.example/a.jpg',
    reply_count: 0
  })
  assert.equal(card.name, 'quiet_harbor')
  assert.equal(card.meta, 'Kyoto · Aug 29')
  assert.equal(card.badge.label, 'New')
  assert.equal(map_scooped_card({
    scoop: scoops[0],
    lantern: { anonymous_display: true, release_city_name: 'Kyoto' },
    user_name: 'quiet_harbor',
    avatar_url: 'https://cdn.example/a.jpg'
  }).name, 'A quiet stranger')
})

test('scooped lantern routes open the caught detail and the home scoop', () => {
  assert.equal(read_scooped_source({}), '/pages/profile/index')
  assert.equal(build_find_lantern_url(), '/pages/home/index?scoop=1')
  assert.equal(
    build_scooped_detail_url('11'),
    '/pages/lantern/detail/index?lanternId=11&sourcePage=%2Fpages%2Flantern%2Fscooped%2Findex&mode=caught'
  )
})

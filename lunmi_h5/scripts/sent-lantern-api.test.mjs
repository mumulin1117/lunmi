import test from 'node:test'
import assert from 'node:assert/strict'
import {
  build_release_url,
  build_sent_detail_url,
  map_sent_lanterns,
  read_lantern_total,
  read_sent_source
} from '../src/utils/sentLanternPresentation.js'

test('sent lanterns keep owned drifting and scooped records', () => {
  const lanterns = map_sent_lanterns({
    total: 3,
    records: [
      { lanternId: 11, content: ' Almost said it ', lanternStatus: 'drifting', deleted: 0 },
      { lanternId: 12, content: 'Late-night thoughts', lanternStatus: 'scooped', deleted: 0 },
      { lanternId: 13, content: 'Gone', lanternStatus: 'deleted', deleted: 1 }
    ]
  })
  assert.deepEqual(lanterns, [
    { lantern_id: '11', content: 'Almost said it', status: 'drifting', badge: 'Drifting' },
    { lantern_id: '12', content: 'Late-night thoughts', status: 'scooped', badge: 'Scooped' }
  ])
  assert.equal(read_lantern_total({ total: 3 }), 3)
})

test('sent lantern routes return to profile and open release or detail', () => {
  assert.equal(read_sent_source({ sourcePage: '/pages/profile/index' }), '/pages/profile/index')
  assert.equal(read_sent_source({ sourcePage: 'https://example.com' }), '/pages/profile/index')
  assert.equal(build_release_url(), '/pages/home/index?release=1')
  assert.equal(
    build_sent_detail_url('11'),
    '/pages/lantern/detail/index?lanternId=11&sourcePage=%2Fpages%2Flantern%2Fmine%2Findex'
  )
})

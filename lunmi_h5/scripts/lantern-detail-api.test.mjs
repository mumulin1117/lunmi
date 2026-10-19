import assert from 'node:assert/strict'
import test from 'node:test'
import { envelope, load_api } from './api-test-helpers.mjs'
import { build_select_lantern_params } from '../src/utils/releaseLanternPresentation.js'
import {
  HOME_PAGE_PATH,
  build_lantern_reply_url,
  build_select_reply_params,
  build_select_scoop_params,
  format_lantern_date,
  is_caught_lantern_mode,
  lantern_owner_label,
  lantern_status_label,
  lantern_title_from_content,
  map_lantern_record,
  map_reply_record,
  map_scoop_record,
  read_page_records
} from '../src/utils/lanternDetailPresentation.js'

test('caught mode is only enabled by the documented query flag', () => {
  assert.equal(is_caught_lantern_mode({ mode: 'caught' }), true)
  assert.equal(is_caught_lantern_mode({ mode: 'releasing' }), false)
  assert.equal(is_caught_lantern_mode({}), false)
})

test('lantern detail maps documented fields into snake_case views', () => {
  const lantern = map_lantern_record({
    lanternId: 77,
    content: 'A quiet note for tonight.',
    lanternStatus: 'drifting',
    ownerUserId: 3,
    anonymousDisplay: 1,
    releasedAt: '2026-10-08T08:00:00Z'
  })
  assert.equal(lantern.lantern_id, 77)
  assert.equal(lantern.anonymous_display, true)
  assert.equal(lantern_owner_label(lantern), 'A quiet stranger')
  assert.equal(lantern_status_label('scooped'), 'Scooped')
  assert.equal(lantern_title_from_content('A quiet note'), 'A quiet note')
  assert.equal(lantern_title_from_content(lantern.content).endsWith('…'), true)
  assert.equal(format_lantern_date(''), '—')
  assert.match(format_lantern_date('2026-10-08T12:00:00Z'), /Oct/)
  assert.equal(map_scoop_record({ id: 9 }), null)
  assert.equal(map_scoop_record({ lanternScoopId: 12, lanternId: 77, scoopStatus: 'active' }).lantern_scoop_id, 12)
  assert.equal(map_reply_record({ lanternReplyId: 4, content: ' I saw it ' }).content, 'I saw it')
  assert.deepEqual(read_page_records({ records: [{ lanternReplyId: 4 }] })[0].lanternReplyId, 4)
})

test('reply navigation uses documented lanternId and targetUserId', () => {
  assert.deepEqual(build_select_scoop_params({ lantern_id: 77, scooper_user_id: 9 }), {
    current: 1,
    size: 1,
    lanternId: 77,
    scooperUserId: 9
  })
  assert.deepEqual(build_select_reply_params({ lantern_scoop_id: 12 }), {
    current: 1,
    size: 1,
    lanternScoopId: 12
  })
  assert.equal(
    build_lantern_reply_url({
      lantern_id: 77,
      target_user_id: 3,
      source_page: HOME_PAGE_PATH
    }),
    '/pages/lantern/reply/index?lanternId=77&targetUserId=3&sourcePage=%2Fpages%2Fhome%2Findex'
  )
})

test('detail page queries lantern, scoop, and unique reply endpoints', async () => {
  const lantern_api = await load_api('src/api/lantern.js', () => envelope(200000, {
    records: [{ lanternId: 77, content: 'Night ferry', lanternStatus: 'drifting' }]
  }))
  const lantern_result = await lantern_api.api.selectLmLanternPage(build_select_lantern_params({ lantern_id: 77 }))
  assert.equal(lantern_result.success, true)
  assert.equal(lantern_api.calls[0].endpoint, '/sj/lunmi/selectLmLanternPage')
  assert.equal(lantern_api.calls[0].data.lanternId, 77)

  const scoop_api = await load_api('src/api/scoop.js', (options) => {
    if (options.endpoint.includes('Reply')) {
      return envelope(200000, { records: [{ lanternReplyId: 4, content: 'I saw it' }] })
    }
    return envelope(200000, { records: [{ lanternScoopId: 12, lanternId: 77 }] })
  })
  const scoop_result = await scoop_api.api.selectLmLanternScoopPage(build_select_scoop_params({
    lantern_id: 77,
    scooper_user_id: 9
  }))
  assert.equal(scoop_result.success, true)
  assert.equal(scoop_api.calls[0].endpoint, '/sj/lunmi/selectLmLanternScoopPage')
  assert.equal(scoop_api.calls[0].data.scooperUserId, 9)

  const reply_result = await scoop_api.api.selectLmLanternReplyPage(build_select_reply_params({
    lantern_scoop_id: 12
  }))
  assert.equal(reply_result.success, true)
  assert.equal(scoop_api.calls[1].endpoint, '/sj/lunmi/selectLmLanternReplyPage')
  assert.equal(scoop_api.calls[1].data.lanternScoopId, 12)
})

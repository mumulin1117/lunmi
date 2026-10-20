import assert from 'node:assert/strict'
import test from 'node:test'
import { envelope, load_api } from './api-test-helpers.mjs'
import {
  ACTIVE_SCOOP_STATUS,
  DRIFTING_LANTERN_STATUS,
  build_add_scoop_params,
  build_caught_owner_snapshot,
  build_home_caught_url,
  build_select_drifting_params,
  build_select_user_scoops_params,
  collect_scooped_lantern_ids,
  match_created_scoop,
  pick_scoop_candidate,
  read_caught_route,
  read_created_scoop_id
} from '../src/utils/scoopLanternPresentation.js'

test('scoop candidate skips owned, deleted, and already caught lanterns', () => {
  const page = {
    records: [
      { lanternId: 1, lanternStatus: 'drifting', ownerUserId: 9, deleted: 0, content: 'Mine' },
      { lanternId: 2, lanternStatus: 'drifting', ownerUserId: 4, deleted: 1, content: 'Gone' },
      { lanternId: 3, lanternStatus: 'scooped', ownerUserId: 4, content: 'Taken' },
      { lanternId: 4, lanternStatus: 'drifting', ownerUserId: 5, content: 'Already caught' },
      { lanternId: 8, lanternStatus: 'drifting', ownerUserId: 6, content: 'Night ferry' }
    ]
  }
  const scooped = collect_scooped_lantern_ids({
    records: [{ lanternScoopId: 20, lanternId: 4, scoopStatus: 'active' }]
  })
  const candidate = pick_scoop_candidate(page, {
    owner_user_id: 9,
    scooped_lantern_ids: scooped
  })
  assert.equal(candidate.lantern_id, 8)
  assert.equal(candidate.content, 'Night ferry')
  assert.equal(pick_scoop_candidate({ records: [] }, { owner_user_id: 9 }), null)
})

test('caught owner snapshot keeps anonymous and profile fields', () => {
  assert.deepEqual(build_caught_owner_snapshot({
    owner_user_id: 9,
    anonymous_display: true
  }), {
    anonymous_display: true,
    owner_user_id: '9'
  })
  assert.deepEqual(build_caught_owner_snapshot({
    owner_user_id: 9,
    anonymous_display: false
  }, {
    user_id: 9,
    username: 'Mia',
    avatar_url: 'https://cdn.test/avatar.jpg'
  }), {
    anonymous_display: false,
    owner_user_id: '9',
    owner_user_name: 'Mia',
    owner_avatar_url: 'https://cdn.test/avatar.jpg'
  })
})

test('add scoop payload uses documented fields and omits a client id', () => {
  assert.deepEqual(build_add_scoop_params({
    lantern_id: 8,
    scooper_user_id: 9,
    scooped_at: '2026-10-08T12:00:00.000Z'
  }), {
    lanternId: 8,
    scooperUserId: 9,
    scoopStatus: ACTIVE_SCOOP_STATUS,
    scoopedAt: '2026-10-08T12:00:00.000Z'
  })
  assert.equal(build_select_drifting_params().lanternStatus, DRIFTING_LANTERN_STATUS)
  assert.deepEqual(read_caught_route({
    caughtLanternId: 8,
    lanternScoopId: 21
  }), {
    lantern_id: 8,
    lantern_scoop_id: 21
  })
  assert.equal(
    build_home_caught_url({ lantern_id: 8, lantern_scoop_id: 21 }),
    '/pages/home/index?caughtLanternId=8&lanternScoopId=21'
  )
})

test('created scoop id is read from the add response or the follow-up page', () => {
  assert.equal(read_created_scoop_id({ lanternScoopId: 21 }), 21)
  assert.equal(read_created_scoop_id({}), '')
  assert.equal(match_created_scoop({
    records: [{ lanternScoopId: 21, lanternId: 8, scoopStatus: 'active' }]
  }, 8).lantern_scoop_id, 21)
  assert.equal(match_created_scoop({
    records: [{ lanternScoopId: 22, lanternId: 8, scoopStatus: 'cancelled' }]
  }, 8), null)
})

test('scooping calls drifting lanterns, existing scoops, and addLmLanternScoop', async () => {
  const lantern_api = await load_api('src/api/lantern.js', () => envelope(200000, {
    records: [{ lanternId: 8, lanternStatus: 'drifting', ownerUserId: 4, content: 'Night ferry' }]
  }))
  const lantern_result = await lantern_api.api.selectLmLanternPage(build_select_drifting_params())
  assert.equal(lantern_result.success, true)
  assert.equal(lantern_api.calls[0].endpoint, '/sj/lunmi/selectLmLanternPage')
  assert.equal(lantern_api.calls[0].data.lanternStatus, 'drifting')

  const scoop_api = await load_api('src/api/scoop.js', (options) => {
    if (options.endpoint.includes('addLmLanternScoop')) return envelope(200000, { lanternScoopId: 21 })
    return envelope(200000, { records: [] })
  })
  const history = await scoop_api.api.selectLmLanternScoopPage(build_select_user_scoops_params({
    scooper_user_id: 9
  }))
  assert.equal(history.success, true)
  assert.equal(scoop_api.calls[0].endpoint, '/sj/lunmi/selectLmLanternScoopPage')
  assert.equal(scoop_api.calls[0].data.scooperUserId, 9)

  const created = await scoop_api.api.addLmLanternScoop(build_add_scoop_params({
    lantern_id: 8,
    scooper_user_id: 9,
    scooped_at: '2026-10-08T12:00:00.000Z'
  }))
  assert.equal(created.success, true)
  assert.equal(scoop_api.calls[1].endpoint, '/sj/lunmi/addLmLanternScoop')
  assert.equal(scoop_api.calls[1].data.lanternId, 8)
  assert.equal(Object.hasOwn(scoop_api.calls[1].data, 'lanternScoopId'), false)
  assert.equal(read_created_scoop_id(created.data), 21)
})

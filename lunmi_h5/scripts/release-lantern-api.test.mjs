import assert from 'node:assert/strict'
import test from 'node:test'
import { envelope, load_api } from './api-test-helpers.mjs'
import {
  BOOST_COIN_COST,
  HOME_PAGE_PATH,
  LANTERN_TYPES,
  build_add_lantern_media_params,
  build_add_lantern_params,
  build_add_media_asset_params,
  build_lantern_detail_url,
  build_lantern_release_url,
  build_select_lantern_params,
  is_release_flow_detail,
  read_route_lantern_type,
  RELEASE_ANIMATION_VIDEO,
  can_afford_boost,
  map_lantern_record,
  normalize_lantern_source_page,
  read_lantern_id,
  read_lantern_records,
  read_media_asset_id,
  read_route_lantern_id
} from '../src/utils/releaseLanternPresentation.js'

test('release lantern types and boost cost match the sheet contract', () => {
  assert.deepEqual([...LANTERN_TYPES], ['Late-night', 'Unsaid', 'Gratitude'])
  assert.equal(BOOST_COIN_COST, 100)
  assert.equal(can_afford_boost(100), true)
  assert.equal(can_afford_boost(99), false)
})

test('add lantern payload only uses documented fields', () => {
  const params = build_add_lantern_params({
    content: '  Almost said it  ',
    lantern_label: 'Unsaid',
    owner_user_id: 12,
    city_name: 'Kyoto'
  })
  assert.deepEqual(params, {
    anonymousDisplay: 1,
    content: 'Almost said it',
    lanternLabel: 'Unsaid',
    lanternStatus: 'drifting',
    ownerUserId: 12,
    releaseCityName: 'Kyoto'
  })
  assert.equal('lanternId' in params, false)
  assert.equal('scoopedAt' in params, false)
  assert.equal('lanternType' in params, false)
  assert.equal('boostEnabled' in params, false)
})

test('empty city and owner are omitted from the add lantern payload', () => {
  const params = build_add_lantern_params({ content: 'hi' })
  assert.deepEqual(params, {
    anonymousDisplay: 1,
    content: 'hi',
    lanternLabel: '',
    lanternStatus: 'drifting'
  })
})

test('media asset and lantern media payloads keep backend field names', () => {
  assert.deepEqual(build_add_media_asset_params({
    image_url: 'https://cdn.test/lantern.jpg',
    owner_user_id: 12,
    mime_type: 'image/jpeg',
    file_size: 2048
  }), {
    mediaType: 'image',
    publicUrl: 'https://cdn.test/lantern.jpg',
    ownerUserId: 12,
    mimeType: 'image/jpeg',
    fileSize: 2048
  })
  assert.deepEqual(build_add_lantern_media_params({
    lantern_id: 88,
    media_asset_id: 91
  }), {
    lanternId: 88,
    mediaAssetId: 91,
    sortNo: 1
  })
})

test('lantern and media ids are read only from the documented response fields', () => {
  assert.equal(read_lantern_id({ lanternId: 44 }), 44)
  assert.equal(read_lantern_id({ id: 44 }), '')
  assert.equal(read_media_asset_id({ mediaAssetId: 9 }), 9)
  assert.equal(read_media_asset_id({ id: 9 }), '')
})

test('add lantern and attach media call the documented endpoints', async () => {
  const { api, calls } = await load_api('src/api/lantern.js', () => envelope(200000, { lanternId: 77 }))
  const result = await api.addLmLantern(build_add_lantern_params({
    content: 'Night ferry',
    owner_user_id: 3
  }))
  assert.equal(result.success, true)
  assert.equal(calls[0].endpoint, '/sj/lunmi/addLmLantern')
  assert.equal(calls[0].data.lanternId, undefined)
  assert.equal(calls[0].data.content, 'Night ferry')

  const media = await api.addLmLanternMedia(build_add_lantern_media_params({
    lantern_id: 77,
    media_asset_id: 15
  }))
  assert.equal(media.success, true)
  assert.equal(calls[1].endpoint, '/sj/lunmi/addLmLanternMedia')
  assert.deepEqual(calls[1].data, {
    lanternId: 77,
    mediaAssetId: 15,
    sortNo: 1
  })
})

test('releasing page queries lanterns by documented lanternId and maps snake_case views', () => {
  assert.deepEqual(build_select_lantern_params({ lantern_id: 77 }), {
    current: 1,
    size: 1,
    lanternId: 77
  })
  assert.equal(read_route_lantern_id({ lanternId: 88 }), 88)
  assert.equal(read_route_lantern_id({ lantern_id: 88 }), '')
  assert.equal(normalize_lantern_source_page('%2Fpages%2Fhome%2Findex'), HOME_PAGE_PATH)
  const lantern = map_lantern_record({
    lanternId: 77,
    content: ' Night ferry ',
    lanternStatus: 'drifting',
    ownerUserId: 3,
    anonymousDisplay: 1,
    releaseCityName: 'Kyoto',
    releasedAt: '2026-10-08T08:00:00Z',
    deleted: 0
  })
  assert.equal(lantern.lantern_id, 77)
  assert.equal(lantern.content, 'Night ferry')
  assert.equal(lantern.anonymous_display, true)
  assert.equal(map_lantern_record({ id: 77 }), null)
  assert.deepEqual(read_lantern_records({ records: [{ lanternId: 1 }] })[0].lanternId, 1)
  assert.equal(
    build_lantern_detail_url({ lantern_id: 77, source_page: HOME_PAGE_PATH }),
    '/pages/lantern/detail/index?lanternId=77&sourcePage=%2Fpages%2Fhome%2Findex'
  )
  assert.equal(RELEASE_ANIMATION_VIDEO, '/static/scenes/anim-release.mp4')
  assert.equal(read_route_lantern_type({ lanternType: 'Gratitude' }), 'Gratitude')
  assert.equal(read_route_lantern_type({ lanternType: 'Other' }), '')
  assert.equal(is_release_flow_detail({ returnHome: '1' }), true)
  assert.equal(
    build_lantern_release_url({
      lantern_id: 77,
      lantern_type: 'Late-night',
      source_page: HOME_PAGE_PATH
    }),
    '/pages/lantern/release/index?lanternId=77&mode=releasing&lanternType=Late-night&sourcePage=%2Fpages%2Fhome%2Findex'
  )
  assert.match(
    build_lantern_detail_url({
      lantern_id: 77,
      lantern_type: 'Unsaid',
      return_home: true,
      released: true
    }),
    /returnHome=1/
  )
})

test('select lantern page uses the documented query endpoint', async () => {
  const { api, calls } = await load_api('src/api/lantern.js', () => envelope(200000, {
    records: [{ lanternId: 77, content: 'Night ferry', lanternStatus: 'drifting' }]
  }))
  const result = await api.selectLmLanternPage(build_select_lantern_params({ lantern_id: 77 }))
  assert.equal(result.success, true)
  assert.equal(calls[0].endpoint, '/sj/lunmi/selectLmLanternPage')
  assert.equal(calls[0].data.lanternId, 77)
  assert.equal(calls[0].data.current, 1)
  assert.equal(calls[0].data.size, 1)
})

test('media asset registration uses the documented Lunmi media endpoint', async () => {
  const { api, calls } = await load_api('src/api/mediaAsset.js', () => envelope(200000, { mediaAssetId: 15 }))
  const result = await api.addLmMediaAsset(build_add_media_asset_params({
    image_url: 'https://cdn.test/lantern.jpg',
    owner_user_id: 3
  }))
  assert.equal(result.success, true)
  assert.equal(read_media_asset_id(result.data), 15)
  assert.equal(calls[0].endpoint, '/sj/lunmi/addLmMediaAsset')
  assert.equal(calls[0].data.publicUrl, 'https://cdn.test/lantern.jpg')
  assert.equal(calls[0].data.mediaType, 'image')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  WISH_HANG_ANIMATION_VIDEO,
  branch_cost_label,
  branch_label,
  branch_option_cost_label,
  branch_visibility_label,
  filter_wish_sheet_branch_options,
  build_tree_published_url,
  build_wish_params,
  build_wishing_url,
  can_afford_branch,
  default_branch_level,
  map_branch_options,
  read_created_wish_id,
  read_wishing_query,
  wish_record_exists
} from '../src/utils/wishSheetPresentation.js'

test('branch options come from the config page and prefer the free branch', () => {
  const mapped = map_branch_options({
    records: [
      { branchLevel: 'low', visibilityDays: 0, coinCost: 99, isActive: 1, deleted: 0 },
      { branchLevel: 'low', visibilityDays: 7, coinCost: 99, isActive: 1, deleted: 0 },
      { branchLevel: 'high', visibilityDays: 30, coinCost: 1, isActive: 1, deleted: 0 },
      { branchLevel: 'mid', visibilityDays: 14, coinCost: 1, isActive: 1, deleted: 0 }
    ]
  })
  assert.deepEqual(mapped.map((item) => item.branch_level), ['high', 'mid', 'low', 'low'])
  const options = filter_wish_sheet_branch_options(mapped)
  assert.deepEqual(options.map((item) => item.visibility_days), [30, 14, 7])
  assert.equal(options.find((item) => item.visibility_days === 30)?.coin_cost, 300)
  assert.equal(options.find((item) => item.visibility_days === 14)?.coin_cost, 100)
  assert.equal(options.find((item) => item.visibility_days === 7)?.coin_cost, 0)
  assert.equal(default_branch_level(options), 'low')
  assert.equal(branch_label('high'), 'High')
  assert.equal(branch_cost_label(0), 'FREE')
  assert.equal(branch_cost_label(300), '300')
  assert.equal(branch_visibility_label({ visibility_days: 7 }), '7days')
  assert.equal(branch_visibility_label({ visibility_days: 30 }), '30 days')
  assert.equal(branch_option_cost_label({ branch_level: 'low', visibility_days: 7, coin_cost: 0 }), 'Free')
  assert.equal(branch_option_cost_label({ branch_level: 'high', visibility_days: 30, coin_cost: 300 }), '300')
})

test('a paid branch waits for enough coins', () => {
  assert.equal(can_afford_branch(480, 300), true)
  assert.equal(can_afford_branch(80, 100), false)
  assert.equal(can_afford_branch(0, 0), true)
})

test('wish publish uses the create contract and does not invent an id', () => {
  const params = build_wish_params({
    owner_user_id: 8,
    content: '  A quiet wish  ',
    branch: { branch_level: 'low', visibility_days: 7, coin_cost: 0 },
    reply_enabled: true,
    published_at: new Date('2026-08-30T12:00:00.000Z')
  })
  assert.equal(params.wishId, undefined)
  assert.equal(params.content, 'A quiet wish')
  assert.equal(params.anonymousDisplay, 1)
  assert.equal(params.branchLevel, 'low')
  assert.equal(params.visibilityDays, 7)
  assert.equal(params.replyEnabled, 1)
  assert.equal(params.wishStatus, 'published')
  assert.equal(params.imgUrl, undefined)
  assert.equal(build_wish_params({
    owner_user_id: 8,
    content: 'With photo',
    branch: { branch_level: 'low', visibility_days: 7, coin_cost: 0 },
    img_url: 'https://cdn.test/wish.jpg'
  }).imgUrl, 'https://cdn.test/wish.jpg')
  assert.equal(read_created_wish_id({ wishId: 15 }), '15')
  assert.equal(read_created_wish_id({}), '')
})

test('a finished rise returns to the tree with the published flag', () => {
  assert.equal(WISH_HANG_ANIMATION_VIDEO, '/static/scenes/anim-wish-hang.mp4')
  assert.equal(build_tree_published_url(), '/pages/wish/tree/index?wishPublished=1')
  assert.deepEqual(read_wishing_query({ mode: 'wishing', wishId: '15' }), {
    wish_id: '15',
    mode: 'wishing'
  })
  assert.equal(wish_record_exists({ records: [{ wishId: 15, deleted: 0 }] }, '15'), true)
  assert.equal(wish_record_exists({ records: [{ wishId: 15, deleted: 1 }] }, '15'), false)
  assert.equal(wish_record_exists({ records: [] }, '15'), false)
})

test('a published wish opens the wishing page', () => {
  assert.equal(
    build_wishing_url({ wish_id: '15', source_page: '/pages/wish/tree/index' }),
    '/pages/wish/create/index?mode=wishing&sourcePage=%2Fpages%2Fwish%2Ftree%2Findex&wishId=15'
  )
})

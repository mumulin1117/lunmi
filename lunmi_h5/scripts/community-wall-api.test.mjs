import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HOME_PAGE_PATH,
  build_like_post_params,
  build_wall_author_url,
  build_wall_create_url,
  build_wall_detail_url,
  build_wall_page_params,
  build_wall_page_url,
  map_wall_posts,
  read_wall_source,
  wall_place_chip
} from '../src/utils/wallPresentation.js'

test('wall maps existing dynamic fields and builds the design routes', () => {
  const posts = map_wall_posts({
    records: [
      {
        dynamicId: 12,
        userId: 7,
        userName: 'moonlit_ferry',
        userImgUrl: 'face.png',
        dynamicContent: 'Rehearsed it the whole walk here.',
        locationName: 'River',
        createDate: '2026-08-30T02:14:00',
        praiseNum: 18,
        commentNum: 3,
        storeFlag: 0,
        dynamicType: 1,
        dynamicImgList: ['night.png']
      },
      {
        dynamicId: 13,
        userId: 8,
        userName: '',
        dynamicTitle: 'Untitled',
        cityName: 'Tree',
        createdDate: '2026-08-30T23:41:00',
        praiseNum: '24',
        commentNum: 6,
        storeFlag: 1,
        dynamicType: 3,
        dynamicImgList: ['clip.mp4'],
        videoImgUrl: 'cover.png'
      },
      { userName: 'missing id' }
    ]
  })

  assert.equal(posts.length, 2)
  assert.equal(posts[0].author_name, 'moonlit_ferry')
  assert.equal(posts[0].caption, 'Rehearsed it the whole walk here.')
  assert.equal(posts[0].media_type, 'image')
  assert.equal(posts[0].is_liked, false)
  assert.equal(posts[0].like_count, 18)
  assert.equal(wall_place_chip(posts[0]), 'River · 02:14')
  assert.equal(posts[1].author_name, 'Anonymous')
  assert.equal(posts[1].caption, 'Untitled')
  assert.equal(posts[1].media_type, 'video')
  assert.equal(posts[1].media_poster, 'cover.png')
  assert.equal(posts[1].is_liked, true)
  assert.equal(wall_place_chip(posts[1]), 'Tree · 23:41')
  assert.equal(wall_place_chip({ created_at: '' }), '')
  assert.deepEqual(build_like_post_params(posts[0]), { dynamicId: '12' })
  assert.equal(
    build_wall_detail_url(posts[0], build_wall_page_url(HOME_PAGE_PATH)),
    '/pages/community/detail/index?dynamicId=12&sourcePage=%2Fpages%2Fcommunity%2Findex%3FsourcePage%3D%252Fpages%252Fhome%252Findex'
  )
  assert.equal(
    build_wall_create_url('/pages/community/index'),
    '/pages/community/create/index?sourcePage=%2Fpages%2Fcommunity%2Findex'
  )
  assert.equal(
    build_wall_author_url(posts[0], '/pages/community/index'),
    '/pages/community/user/index?user_id=7&targetUserId=7&sourcePage=%2Fpages%2Fcommunity%2Findex'
  )
  assert.equal(read_wall_source('%2Fpages%2Fhome%2Findex'), HOME_PAGE_PATH)
  assert.equal(read_wall_source('https://evil.example'), HOME_PAGE_PATH)
  assert.equal(read_wall_source(''), HOME_PAGE_PATH)
  assert.deepEqual(build_wall_page_params({ current: 2 }), { current: 2, size: 20 })
})

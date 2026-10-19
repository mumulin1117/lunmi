import assert from 'node:assert/strict'
import test from 'node:test'
import {
  build_delete_reply_params,
  build_detail_author_url,
  build_reply_params,
  format_post_stamp,
  is_real_comment_id,
  map_post_detail,
  post_place_chip,
  read_detail_back,
  read_detail_post_id
} from '../src/utils/postDetailPresentation.js'

test('post detail maps the existing dynamic and chooses the return page', () => {
  const post = map_post_detail({
    dynamicId: 44,
    userId: 7,
    userName: 'moonlit_ferry',
    userImgUrl: 'face.png',
    dynamicContent: 'Rehearsed it the whole walk here.',
    locationName: 'River',
    createDate: '2026-08-30T20:12:00',
    praiseNum: 18,
    commentNum: 1,
    storeFlag: 1,
    dynamicType: 1,
    dynamicImgList: ['night.png'],
    commentVoList: [
      {
        commentId: 9,
        replyUserId: 8,
        replyUserName: 'quiet_harbor',
        replyUserImgUrl: 'harbor.png',
        replyContent: 'This is the bench.'
      },
      { replyContent: 'Missing id' }
    ]
  })

  assert.equal(post.post_id, '44')
  assert.equal(post.author_name, 'moonlit_ferry')
  assert.equal(post.is_liked, true)
  assert.equal(post.like_count, 18)
  assert.equal(format_post_stamp(post.created_at), 'AUG 30 · 20:12')
  assert.equal(post_place_chip(post), 'River · 20:12')
  assert.equal(post.comments.length, 2)
  assert.equal(post.comments[0].author_name, 'quiet_harbor')
  assert.equal(is_real_comment_id(post.comments[0]), true)
  assert.equal(is_real_comment_id(post.comments[1]), false)
  assert.deepEqual(build_reply_params(post, 'Hello'), { dynamicId: '44', replyContent: 'Hello' })
  assert.deepEqual(build_delete_reply_params(post.comments[0]), { commentId: '9' })
  assert.equal(read_detail_post_id({ dynamicId: '44' }), '44')
  assert.deepEqual(read_detail_back({
    returnPage: '/pages/community/index'
  }), { page: '/pages/community/index', prefer_relaunch: true })
  assert.equal(read_detail_back({
    sourcePage: '/pages/community/index?sourcePage=%2Fpages%2Fhome%2Findex'
  }).prefer_relaunch, false)
  assert.equal(read_detail_back({ sourcePage: '/pages/publish/success' }).page, '/pages/community/index')
  assert.match(build_detail_author_url('7', '/pages/community/detail/index?dynamicId=44'), /user_id=7/)
})

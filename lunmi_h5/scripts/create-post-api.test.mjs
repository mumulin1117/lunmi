import assert from 'node:assert/strict'
import test from 'node:test'
import {
  build_image_post_params,
  build_publish_success_url,
  build_video_post_params,
  read_created_post_id,
  upload_prompt
} from '../src/utils/createPostPresentation.js'

test('create post builds the existing publish payload and success route', () => {
  assert.equal(upload_prompt('image'), 'UPLOAD IMAGE')
  assert.equal(upload_prompt('video'), 'UPLOAD VIDEO')
  assert.deepEqual(build_image_post_params({
    caption: 'Say something',
    image_url: 'https://cdn.example/photo.jpg'
  }), {
    dynamicClassify: 1,
    dynamicContent: 'Say something',
    dynamicType: 1,
    imgList: ['https://cdn.example/photo.jpg']
  })
  assert.deepEqual(build_video_post_params({
    caption: 'A night clip',
    video_url: 'https://cdn.example/clip.mp4',
    cover_url: 'https://cdn.example/cover.jpg',
    duration_seconds: 12.4
  }), {
    dynamicClassify: 2,
    dynamicContent: 'A night clip',
    dynamicType: 3,
    imgList: ['https://cdn.example/clip.mp4'],
    videoImgUrl: 'https://cdn.example/cover.jpg',
    fileTimes: 12
  })
  assert.equal(read_created_post_id({ dynamicId: 44 }), '44')
  assert.equal(read_created_post_id(44), '44')
  assert.equal(read_created_post_id(' 44 '), '44')
  assert.equal(read_created_post_id({}), '')
  assert.equal(read_created_post_id(null), '')
  assert.equal(
    build_publish_success_url({
      media_kind: 'video',
      post_id: '44',
      source_page: '/pages/community/index?sourcePage=%2Fpages%2Fhome%2Findex'
    }),
    '/pages/publish/success?content_type=video&dynamic_id=44&sourcePage=%2Fpages%2Fcommunity%2Findex%3FsourcePage%3D%252Fpages%252Fhome%252Findex'
  )
})

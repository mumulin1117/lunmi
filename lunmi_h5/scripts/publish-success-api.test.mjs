import assert from 'node:assert/strict'
import test from 'node:test'
import {
  build_published_detail_url,
  read_publish_return_page
} from '../src/utils/publishSuccessPresentation.js'

test('published page returns to the wall and opens the community post', () => {
  assert.equal(
    read_publish_return_page({
      source_page: '/pages/community/index?sourcePage=%2Fpages%2Fhome%2Findex'
    }),
    '/pages/community/index?sourcePage=/pages/home/index'
  )
  assert.equal(read_publish_return_page({ source: 'videos' }), '/pages/videos/index')
  assert.equal(read_publish_return_page({ source: 'discover' }), '/pages/discover/index')
  assert.equal(read_publish_return_page({}), '/pages/community/index')
  assert.equal(read_publish_return_page({ source_page: 'https://evil.example' }), '/pages/community/index')
  assert.equal(
    build_published_detail_url({
      post_id: '44',
      return_page: '/pages/community/index'
    }),
    '/pages/community/detail/index?dynamicId=44&sourcePage=%2Fpages%2Fpublish%2Fsuccess&returnPage=%2Fpages%2Fcommunity%2Findex'
  )
  assert.equal(
    build_published_detail_url({ post_id: '8', source: 'videos' }),
    '/pages/discover/detail?dynamicId=8&return_to=videos'
  )
  assert.equal(
    build_published_detail_url({ post_id: '9', source: 'discover' }),
    '/pages/discover/detail?dynamicId=9&return_to=discover'
  )
})

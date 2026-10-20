import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const project_root = new URL('../', import.meta.url)

const import_source = async (relative_path, replacements = []) => {
  let source = await readFile(new URL(relative_path, project_root), 'utf8')
  replacements.forEach(([from, to]) => {
    source = source.replace(from, to)
  })
  const source_url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Math.random()}`
  return import(source_url)
}

test('public profile mapping uses selectUserInfo fields and dynamic posts', async () => {
  globalThis.__user_info_http = {
    post: async () => ({ success: true, data: {}, error: '' })
  }
  const api = await import_source('src/utils/profilePresentation.js')
  const profile = api.map_public_user_profile({
    attentionFlag: 1,
    friendFlag: 2,
    historyNum: 4,
    likeNum: 12,
    userAttention: 8,
    userFans: 21,
    userFriends: 3,
    userBrief: 'Quiet days.',
    userId: 10086,
    userImgUrl: 'https://cdn.test/avatar.jpg',
    userName: 'Mia Chen',
    userDynamicVoList: [
      {
        commentNum: 2,
        createDate: '2026-09-01T12:00:00.000Z',
        dynamicClassify: 2,
        dynamicContent: 'Sunset ride.',
        dynamicId: 88,
        dynamicImgList: ['https://cdn.test/video.mp4'],
        dynamicType: 3,
        praiseNum: 9,
        videoImgUrl: 'https://cdn.test/cover.jpg',
        userId: 10086,
        userName: 'Mia Chen'
      },
      {
        dynamicId: 0,
        dynamicContent: 'Keep zero id',
        dynamicImgList: ['photo.jpg'],
        dynamicType: 1,
        praiseNum: 1,
        commentNum: 0,
        createDate: ''
      },
      {
        dynamicContent: 'Missing id'
      }
    ]
  })

  assert.equal(profile.user_id, '10086')
  assert.equal(profile.username, 'Mia Chen')
  assert.equal(profile.avatar_url, 'https://cdn.test/avatar.jpg')
  assert.equal(profile.signature, 'Quiet days.')
  assert.equal(profile.following_count, 8)
  assert.equal(profile.follower_count, 21)
  assert.equal(profile.attention_flag, 1)
  assert.equal(profile.friend_flag, 2)
  assert.equal(profile.posts.length, 2)
  assert.equal(profile.posts[0].content_type, 'video')
  assert.equal(profile.posts[0].media_url, 'https://cdn.test/video.mp4')
  assert.equal(profile.posts[0].cover_url, 'https://cdn.test/cover.jpg')
  assert.equal(profile.posts[0].like_count, 9)
  assert.equal(profile.posts[1].post_id, '0')
  assert.equal(profile.posts[1].content_type, 'image')
})

test('user base profile maps selectUserBaseInfo fields', async () => {
  const api = await import_source('src/utils/profilePresentation.js')
  const profile = api.map_user_base_profile({
    userId: 857700000000001,
    userName: 'Mia',
    userImgUrl: 'https://cdn.test/avatar.jpg'
  })
  assert.equal(profile.user_id, '857700000000001')
  assert.equal(profile.username, 'Mia')
  assert.equal(profile.avatar_url, 'https://cdn.test/avatar.jpg')
})

test('selectUserBaseInfo posts userId to /api/selectUserBaseInfo', async () => {
  const calls = []
  globalThis.__relation_http = {
    post: async (endpoint, params) => {
      calls.push({ endpoint, params })
      return { success: true, data: {}, error: '' }
    }
  }
  const common_api = await import_source('src/api/common.js', [
    ["import { http } from '@/api/service'", 'const http = globalThis.__relation_http']
  ])
  await common_api.selectUserBaseInfo({ userId: 857700000000001 }, {})
  assert.equal(calls[0].endpoint, '/api/selectUserBaseInfo')
  assert.deepEqual(calls[0].params, { userId: 857700000000001 })
})

test('selectUserInfo posts userId to /api/selectUserInfo', async () => {
  const calls = []
  globalThis.__relation_http = {
    post: async (endpoint, params) => {
      calls.push({ endpoint, params })
      return { success: true, data: {}, error: '' }
    }
  }
  const common_api = await import_source('src/api/common.js', [
    ["import { http } from '@/api/service'", 'const http = globalThis.__relation_http']
  ])
  await common_api.selectUserInfo({ userId: 0 }, {})
  assert.equal(calls[0].endpoint, '/api/selectUserInfo')
  assert.deepEqual(calls[0].params, { userId: 0 })
})

test('selectUserBalance posts an empty body to /api/selectUserBalance', async () => {
  const calls = []
  globalThis.__relation_http = {
    post: async (endpoint, params) => {
      calls.push({ endpoint, params })
      return { success: true, data: 0, error: '' }
    }
  }
  const common_api = await import_source('src/api/common.js', [
    ["import { http } from '@/api/service'", 'const http = globalThis.__relation_http']
  ])
  await common_api.selectUserBalance({}, {})
  assert.equal(calls[0].endpoint, '/api/selectUserBalance')
  assert.deepEqual(calls[0].params, {})
})

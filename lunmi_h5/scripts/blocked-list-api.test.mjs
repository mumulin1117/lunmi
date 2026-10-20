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

test('relation mapping uses selectUserRelation fields and drops empty user ids', async () => {
  globalThis.__blocked_http = {
    post: async () => ({ success: true, data: [], error: '' })
  }
  const api = await import_source('src/utils/profilePresentation.js')

  const users = api.map_relation_users([
    {
      attentionFlag: 0,
      friendFlag: 2,
      userBirthday: '1999-01-01',
      userBrief: 'Quiet days.',
      userId: 10086,
      userImgUrl: 'https://cdn.test/avatar.jpg',
      userLocation: 'Osaka',
      userName: 'Mia Chen'
    },
    {
      attentionFlag: 0,
      friendFlag: 0,
      userBirthday: '',
      userBrief: '',
      userId: 0,
      userImgUrl: '',
      userLocation: '',
      userName: ''
    },
    {
      userName: 'Missing id'
    }
  ])

  assert.equal(users.length, 2)
  assert.deepEqual(users[0], {
    user_id: '10086',
    user_name: 'Mia Chen',
    avatar_url: 'https://cdn.test/avatar.jpg',
    signature: 'Quiet days.',
    birthday: '1999-01-01',
    location: 'Osaka',
    attention_flag: 0,
    friend_flag: 2
  })
  assert.equal(users[1].user_id, '0')
  assert.equal(api.map_blocked_users, api.map_relation_users)
})

test('select blacklisted users posts selectType 3 to selectUserRelation', async () => {
  const calls = []
  globalThis.__relation_http = {
    post: async (endpoint, params, options) => {
      calls.push({ endpoint, options, params })
      return { success: true, data: [], error: '' }
    }
  }
  const common_api = await import_source('src/api/common.js', [
    ["import { http } from '@/api/service'", 'const http = globalThis.__relation_http']
  ])
  await common_api.selectBlacklistedUsers({})
  assert.equal(calls[0].endpoint, '/api/selectUserRelation')
  assert.deepEqual(calls[0].params, { selectType: 3 })
})

test('select following and follower helpers post selectType 1 and 2', async () => {
  const calls = []
  globalThis.__relation_http = {
    post: async (endpoint, params) => {
      calls.push({ endpoint, params })
      return { success: true, data: [], error: '' }
    }
  }
  const common_api = await import_source('src/api/common.js', [
    ["import { http } from '@/api/service'", 'const http = globalThis.__relation_http']
  ])
  await common_api.selectFollowingUsers({})
  await common_api.selectFollowerUsers({})
  assert.equal(calls[0].endpoint, '/api/selectUserRelation')
  assert.deepEqual(calls[0].params, { selectType: 1 })
  assert.deepEqual(calls[1].params, { selectType: 2 })
})

test('friendFlag 0/1/2 maps follow, one-way following, and friends', async () => {
  globalThis.__blocked_http = {
    post: async () => ({ success: true, data: [], error: '' })
  }
  const api = await import_source('src/utils/profilePresentation.js')
  const following_type = api.RELATION_SELECT_TYPE.following
  const followers_type = api.RELATION_SELECT_TYPE.followers
  assert.equal(api.is_following_friend_flag(0), false)
  assert.equal(api.is_following_friend_flag(1), true)
  assert.equal(api.is_following_friend_flag(2), true)
  assert.equal(api.is_self_following_relation({ friend_flag: 1 }, following_type), true)
  assert.equal(api.is_self_following_relation({ friend_flag: 1 }, followers_type), false)
  assert.equal(api.is_self_following_relation({ friend_flag: 1, attention_flag: 1 }, followers_type), true)
  assert.equal(api.is_self_following_relation({ friend_flag: 2 }, followers_type), true)
  assert.equal(api.next_friend_flag({ friend_flag: 0 }, following_type), api.FRIEND_FLAG.one_way)
  assert.equal(api.next_friend_flag({ friend_flag: 0 }, followers_type), api.FRIEND_FLAG.friends)
  assert.equal(api.next_friend_flag({ friend_flag: 1 }, following_type), api.FRIEND_FLAG.none)
  assert.equal(api.next_friend_flag({ friend_flag: 1 }, followers_type), api.FRIEND_FLAG.friends)
  assert.equal(api.next_friend_flag({ friend_flag: 2 }, following_type), api.FRIEND_FLAG.none)
  assert.equal(api.next_friend_flag({ friend_flag: 2 }, followers_type), api.FRIEND_FLAG.one_way)
})

test('follow toggle uses updateUserRelation hanldeType 1', async () => {
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
  await common_api.updateUserRelation({
    beHandleUserId: '10086',
    hanldeType: 1
  }, {})
  assert.equal(calls[0].endpoint, '/api/updateUserRelation')
  assert.deepEqual(calls[0].params, {
    beHandleUserId: '10086',
    hanldeType: 1
  })
})

test('unblock uses the same updateUserRelation payload as block', async () => {
  const calls = []
  globalThis.__relation_http = {
    post: async (endpoint, params, options) => {
      calls.push({ endpoint, options, params })
      return { success: true, data: {}, error: '' }
    }
  }
  const common_api = await import_source('src/api/common.js', [
    ["import { http } from '@/api/service'", 'const http = globalThis.__relation_http']
  ])
  const block_payload = {
    beHandleUserId: '10086',
    hanldeType: 2
  }
  await common_api.updateUserRelation(block_payload, {})
  await common_api.updateUserRelation(block_payload, {})
  assert.equal(calls.length, 2)
  assert.equal(calls[0].endpoint, '/api/updateUserRelation')
  assert.deepEqual(calls[0].params, block_payload)
  assert.deepEqual(calls[1].params, calls[0].params)
})

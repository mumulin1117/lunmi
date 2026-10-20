import assert from 'node:assert/strict'
import test from 'node:test'
import {
  build_profile_chat_url,
  build_profile_wish_params,
  build_profile_wish_url,
  map_profile_wishes,
  read_profile_back,
  read_profile_user_id,
  read_wish_total,
  relation_label,
  relation_state
} from '../src/utils/communityUserPresentation.js'

test('community profile maps relation, wishes, and the chat route', () => {
  assert.equal(read_profile_user_id({ targetUserId: '8' }), '8')
  assert.equal(read_profile_user_id({ user_id: '9' }), '9')
  assert.equal(relation_state({ friend_flag: 2, attention_flag: 1 }), 'mutual')
  assert.equal(relation_state({ friend_flag: 1, attention_flag: 1 }), 'requested')
  assert.equal(relation_state({ friend_flag: 0, attention_flag: 0 }), 'none')
  assert.equal(relation_label('mutual'), 'Mutual')
  assert.equal(relation_label('requested'), 'Requested')
  assert.equal(relation_label('none'), 'Follow')
  const wishes = map_profile_wishes({
    records: [
      { wishId: 3, content: 'Come out right', blessingCount: 31, deleted: 0 },
      { wishId: 4, content: 'Hidden', deleted: 1 }
    ],
    total: 5
  })
  assert.equal(wishes.length, 1)
  assert.equal(wishes[0].blessing_count, 31)
  assert.equal(read_wish_total({ total: 5 }, wishes), 5)
  assert.deepEqual(build_profile_wish_params('8'), { ownerUserId: '8', current: 1, size: 20 })
  assert.equal(
    build_profile_chat_url('8', '/pages/community/index'),
    '/pages/messages/chat?user_id=8&targetUserId=8&chatMode=open&sourcePage=%2Fpages%2Fcommunity%2Findex'
  )
  assert.equal(
    build_profile_chat_url('8', '/pages/community/index', {
      username: 'Mia',
      avatar_url: 'https://cdn.example.com/mia.png'
    }),
    '/pages/messages/chat?user_id=8&targetUserId=8&userName=Mia&userImg=https%3A%2F%2Fcdn.example.com%2Fmia.png&chatMode=open&sourcePage=%2Fpages%2Fcommunity%2Findex'
  )
  assert.match(build_profile_wish_url(wishes[0], '/pages/community/user/index'), /wishId=3/)
  assert.equal(read_profile_back({}), '/pages/community/index')
  assert.equal(
    read_profile_back({ sourcePage: '/pages/messages/chat?targetUserId=8' }),
    '/pages/messages/chat?targetUserId=8'
  )
})

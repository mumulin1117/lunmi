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

const load_message_api = async () => import_source('src/utils/messagePresentation.js')

const load_message_http = async (http_impl) => {
  globalThis.__message_http = { http: http_impl }
  return import_source('src/api/message.js', [
    [
      "import { http } from '@/api/service'",
      'const http = globalThis.__message_http.http'
    ]
  ])
}

const now = Date.parse('2026-09-15T16:00:00.000Z')

test('message list mapping accepts conversation summary rows from selectMessageList', async () => {
  const api = await load_message_api()
  const conversations = api.map_message_conversations([
    {
      userImg: 'http://www.example.com/avatar.jpg',
      lastMessage: 'Shshsh',
      unreadCount: 1,
      lastMessageTime: '2025-08-20 17:24:27',
      userName: 'Asdasd',
      userId: 700828858110021
    }
  ], { current_user_id: '100', now: Date.parse('2025-08-20T18:00:00.000Z') })

  assert.equal(conversations.length, 1)
  assert.equal(conversations[0].user_id, '700828858110021')
  assert.equal(conversations[0].user_name, 'Asdasd')
  assert.equal(conversations[0].user_avatar_url, 'http://www.example.com/avatar.jpg')
  assert.equal(conversations[0].preview, 'Shshsh')
  assert.equal(conversations[0].has_unread, true)
  assert.equal(conversations[0].chat_status, 'your_turn')
  assert.equal(conversations[0].updated_at, '2025-08-20 17:24:27')
  assert.match(conversations[0].updated_label, /^(now|\d+m|\d+h|\d+d|[A-Za-z]{3} \d+)$/)
})

test('message list mapping accepts paginated records and top-level messageUserVoList payloads', async () => {
  const api = await load_message_api()
  const grouped = {
    records: [
      {
        messageUserVoList: [
          {
            content: 'from records wrapper',
            createDate: '2026-09-15T15:58:00.000Z',
            messageId: 31,
            messageType: 1,
            readFlag: 1,
            receiveUserId: 200,
            receiveUserImgUrl: 'peer-from-records.png',
            receiveUserName: 'Isabella',
            sendUserId: '100',
            sendUserImgUrl: 'me.png',
            sendUserName: 'Me'
          }
        ]
      }
    ]
  }
  const from_records = api.map_message_conversations(grouped, { current_user_id: '100', now })
  assert.equal(from_records.length, 1)
  assert.equal(from_records[0].preview, 'from records wrapper')
  assert.equal(from_records[0].user_avatar_url, 'peer-from-records.png')

  const flat_list = {
    messageUserVoList: [
      {
        content: 'top-level list',
        createDate: '2026-09-15T15:59:00.000Z',
        messageId: 32,
        messageType: 1,
        readFlag: 1,
        targetUserId: 300,
        targetUserName: 'Sherry',
        targetUserImg: 'sherry.png',
        sendUserId: '100',
        sendUserName: 'Me'
      }
    ]
  }
  const from_top_level = api.map_message_conversations(flat_list, { current_user_id: '100', now })
  assert.equal(from_top_level.length, 1)
  assert.equal(from_top_level[0].user_id, '300')
  assert.equal(from_top_level[0].user_name, 'Sherry')
  assert.equal(from_top_level[0].user_avatar_url, 'sherry.png')
})

test('message list mapping uses the latest chat in each conversation and relative time labels', async () => {
  const api = await load_message_api()
  const conversations = api.map_message_conversations([
    {
      messageUserVoList: [
        {
          content: 'older note',
          createDate: '2026-09-15T12:00:00.000Z',
          messageId: 1,
          messageType: 1,
          readFlag: 1,
          receiveUserId: 200,
          receiveUserImg: 'peer.png',
          receiveUserName: 'Isabella',
          sendUserId: '100',
          sendUserImgUrl: 'me.png',
          sendUserName: 'Me'
        },
        {
          content: 'see you in the room tonight',
          createDate: '2026-09-15T15:58:00.000Z',
          messageId: 2,
          messageType: 1,
          readFlag: 0,
          receiveUserId: 200,
          receiveUserImg: 'peer.png',
          receiveUserName: 'Isabella',
          sendUserId: '100',
          sendUserImgUrl: 'me.png',
          sendUserName: 'Me'
        }
      ]
    }
  ], { current_user_id: '100', now })

  assert.equal(conversations.length, 1)
  assert.equal(conversations[0].user_id, '200')
  assert.equal(conversations[0].user_name, 'Isabella')
  assert.equal(conversations[0].user_avatar_url, 'peer.png')
  assert.equal(conversations[0].preview, 'see you in the room tonight')
  assert.equal(conversations[0].updated_label, '2m')
  assert.equal(conversations[0].has_unread, false)
  assert.equal(conversations[0].chat_status, 'open')
})

test('unread dots only count unread messages the peer sent to the current user', async () => {
  const api = await load_message_api()
  const outgoing_unread = api.map_message_conversations([
    {
      messageUserVoList: [
        {
          content: 'on my way',
          createDate: '2026-09-15T15:58:00.000Z',
          messageId: 21,
          messageType: 1,
          readFlag: 0,
          receiveUserId: 200,
          receiveUserImg: 'peer.png',
          receiveUserName: 'Isabella',
          sendUserId: '100',
          sendUserImgUrl: 'me.png',
          sendUserName: 'Me'
        }
      ]
    }
  ], { current_user_id: '100', now })
  assert.equal(outgoing_unread[0].has_unread, false)

  const incoming_unread = api.map_message_conversations([
    {
      messageUserVoList: [
        {
          content: 'are you there?',
          createDate: '2026-09-15T15:59:00.000Z',
          messageId: 22,
          messageType: 1,
          readFlag: 0,
          receiveUserId: 100,
          receiveUserImg: 'me.png',
          receiveUserName: 'Me',
          sendUserId: '200',
          sendUserImgUrl: 'peer.png',
          sendUserName: 'Isabella'
        }
      ]
    }
  ], { current_user_id: '100', now })
  assert.equal(incoming_unread[0].has_unread, true)
  assert.equal(incoming_unread[0].user_id, '200')
  assert.equal(incoming_unread[0].chat_status, 'your_turn')
})

test('message list mapping skips notice messages and labels media previews', async () => {
  const api = await load_message_api()
  const conversations = api.map_message_conversations([
    {
      messageUserVoList: [
        {
          content: '',
          createDate: '2026-09-15T15:00:00.000Z',
          messageId: 3,
          messageType: 3,
          readFlag: 0,
          receiveUserId: 100,
          receiveUserName: 'Me',
          sendUserId: '300',
          sendUserImgUrl: 'sherry.png',
          sendUserName: 'Sherry'
        },
        {
          content: '',
          createDate: '2026-09-15T15:00:00.000Z',
          messageId: 4,
          messageType: 4,
          readFlag: 1,
          receiveUserId: 100,
          receiveUserName: 'Me',
          sendUserId: '300',
          sendUserImgUrl: 'sherry.png',
          sendUserName: 'Sherry'
        }
      ]
    }
  ], { current_user_id: '100', now })

  assert.equal(conversations.length, 1)
  assert.equal(conversations[0].preview, 'sent a voice message')
  assert.equal(conversations[0].user_name, 'Sherry')
  assert.equal(conversations[0].has_unread, false)
  assert.equal(conversations[0].chat_status, 'your_turn')
})

test('notice mapping keeps one row per notice and uses clock time labels', async () => {
  const api = await load_message_api()
  const morning = '2026-09-15T10:09:00'
  const evening = '2026-09-15T18:09:00'
  const notices = api.map_notice_messages([
    {
      content: 'like your post: New year...',
      createDate: evening,
      messageId: 11,
      messageType: 3,
      readFlag: 0,
      sendUserId: '400',
      sendUserImgUrl: 'jeneva.png',
      sendUserName: 'Jeneva G Taylor',
      title: ''
    },
    {
      content: 'A gift from [Username] — check it out!',
      createDate: morning,
      messageId: 12,
      messageType: 3,
      readFlag: 1,
      sendUserId: '400',
      sendUserImgUrl: 'jeneva.png',
      sendUserName: 'Jeneva G Taylor',
      title: 'Gift'
    }
  ])

  assert.equal(notices.length, 2)
  assert.equal(notices[0].notice_id, '11')
  assert.equal(notices[0].user_id, '400')
  assert.equal(notices[0].user_name, 'Jeneva G Taylor')
  assert.equal(notices[0].user_avatar_url, 'jeneva.png')
  assert.equal(notices[0].content, 'like your post: New year...')
  assert.equal(notices[0].title, '')
  assert.equal(notices[0].preview, 'like your post: New year...')
  assert.equal(notices[0].has_unread, true)
  assert.equal(notices[0].created_label, api.format_notice_time_label(evening))
  assert.equal(notices[1].notice_id, '12')
  assert.equal(notices[1].title, 'Gift')
  assert.equal(notices[1].created_label, api.format_notice_time_label(morning))
  assert.match(notices[0].created_label, /^\d{2}:\d{2}$/)
  assert.equal(notices[1].has_unread, false)
  assert.equal(api.find_notice_message([
    {
      content: 'like your post: New year...',
      createDate: evening,
      messageId: 11,
      messageType: 3,
      readFlag: 0,
      sendUserId: '400',
      sendUserImgUrl: 'jeneva.png',
      sendUserName: 'Jeneva G Taylor',
      title: ''
    }
  ], '11')?.notice_id, '11')
})

test('chat mapping uses self, sendUserImg, timeText, and a flat message list', async () => {
  const api = await load_message_api()
  const mapped = api.map_chat_messages([
    {
      content: 'see you later',
      createDate: '2026-09-15T15:58:00.000Z',
      messageId: 2,
      messageType: 1,
      receiveUserId: 200,
      self: true,
      sendUserId: 100,
      sendUserImg: 'me.png',
      sendUserName: 'Me',
      showTime: false,
      timeText: ''
    },
    {
      content: 'hello there',
      createDate: '2026-09-15T15:50:00.000Z',
      messageId: 1,
      messageType: 1,
      receiveUserId: 100,
      self: false,
      sendUserId: 200,
      sendUserImg: 'peer.png',
      sendUserName: 'Isabella',
      showTime: true,
      timeText: '15:50'
    },
    {
      content: 'system notice',
      createDate: '2026-09-15T15:51:00.000Z',
      messageId: 3,
      messageType: 3,
      receiveUserId: 100,
      self: false,
      sendUserId: 0,
      sendUserImg: '',
      sendUserName: 'System',
      showTime: false,
      timeText: ''
    },
    {
      content: 'https://cdn.example.com/photo.jpg',
      createDate: '2026-09-15T15:59:00.000Z',
      messageId: 4,
      messageType: 5,
      receiveUserId: 100,
      self: false,
      sendUserId: 200,
      sendUserImg: 'peer.png',
      sendUserName: 'Isabella',
      showTime: true,
      timeText: '15:59'
    }
  ], { peer_user_id: '200' })

  assert.equal(mapped.messages.length, 3)
  assert.deepEqual(mapped.messages.map((message) => message.message_id), ['1', '2', '4'])
  assert.equal(mapped.messages[0].is_mine, false)
  assert.equal(mapped.messages[0].preview, 'hello there')
  assert.equal(mapped.messages[0].show_time, true)
  assert.equal(mapped.messages[0].created_label, '15:50')
  assert.equal(mapped.messages[1].is_mine, true)
  assert.equal(mapped.messages[1].show_time, false)
  assert.equal(mapped.messages[2].image_url, 'https://cdn.example.com/photo.jpg')
  assert.equal(mapped.peer.user_id, '200')
  assert.equal(mapped.peer.user_name, 'Isabella')
  assert.equal(mapped.peer.user_avatar_url, 'peer.png')
})

test('message.js posts select, notice, chat, send, and read endpoints', async () => {
  const calls = []
  const api = await load_message_http({
    post: async (endpoint, data, options = {}) => {
      calls.push({ endpoint, data, options })
      return { success: true, data: endpoint === '/api/updateMsgRead' ? true : [], error: '' }
    }
  })

  await api.selectMessageList({}, { id: 'list' })
  await api.selectMessageList({ receiveUserId: 200 }, { id: 'chat' })
  await api.selectNoticeMessageList({}, { id: 'notice' })
  await api.sendMessage({
    content: 'hi',
    messageType: 1,
    receiveUserId: 200,
    receiveUserName: 'Peer',
    receiveUserImg: 'peer.png',
    sendUserId: '100',
    sendUserName: 'Me',
    sendUserImgUrl: 'me.png',
    bundleId: 'com.example.app'
  })
  const read_result = await api.updateMsgRead({ targetUserId: 200 })

  assert.equal(calls[0].endpoint, '/api/selectMessageList')
  assert.deepEqual(calls[0].data, {})
  assert.equal(calls[1].endpoint, '/api/selectMessageList')
  assert.deepEqual(calls[1].data, { receiveUserId: 200 })
  assert.equal(calls[2].endpoint, '/api/selectNoticeMessageList')
  assert.equal(calls[3].endpoint, '/api/sendMessage')
  assert.equal(calls[4].endpoint, '/api/updateMsgRead')
  assert.deepEqual(calls[4].data, { targetUserId: 200 })
  assert.equal(read_result.data, true)
  await api.selectTargetUserMessageList({ receiveUserId: 200 }, { id: 'target-chat' })
  assert.equal(calls[5].endpoint, '/api/selectTargetUserMessageList')
})

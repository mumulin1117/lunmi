import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import * as vue from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { babelParse, parse } from '@vue/compiler-sfc'
import { envelope, import_source, load_api } from './api-test-helpers.mjs'
import * as legacy_presentation from '../src/utils/legacyPagePresentation.js'
import * as agreement_consent from '../src/utils/agreementConsent.js'

const root = new URL('../', import.meta.url)
const theme = JSON.parse(await readFile(new URL('src/config/theme.json', root), 'utf8'))
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
}
const profile_helpers = await import('../src/utils/profilePresentation.js')
const load_store = () => import_source('src/stores/store.js', [
    ["from 'pinia'", `from '${new URL('../node_modules/pinia/dist/pinia.mjs', import.meta.url).href}'`],
    ["from '@/config/api'", `from '${new URL('../src/config/api.js', import.meta.url).href}'`],
    ["from '@/utils/loginSession'", `from '${new URL('../src/utils/loginSession.js', import.meta.url).href}'`],
    ["from '@/utils/permissionStorage'", `from '${new URL('../src/utils/permissionStorage.js', import.meta.url).href}'`],
    ["from 'vue'", `from '${import.meta.resolve('vue')}'`]
  ])

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
const load_page = async (path, names, modules) => {
  const source = await readFile(new URL(path, root), 'utf8')
  let script = parse(source).descriptor.scriptSetup.content
  const imports = babelParse(script, { sourceType: 'module' }).program.body.filter((node) => node.type === 'ImportDeclaration')
  const unmount = []
  const dependencies = {
    '@/utils/legacyPagePresentation': legacy_presentation,
    '@/utils/agreementConsent': agreement_consent,
    '@/utils/i18n': { t: (source) => source },
    vue: { ...vue, onMounted: () => {}, onBeforeUnmount: (callback) => unmount.push(callback), watch: () => {} },
    '@dcloudio/uni-app': { onShow: () => {}, onHide: () => {}, onLoad: () => {}, onBackPress: () => {} },
    '@/config/theme.json': { default: theme },
    '@/utils/postMediaStorage': { revoke_post_media_url: () => {} },
    '@/utils/profilePresentation': profile_helpers,
    ...modules
  }
  const bindings = []
  for (const entry of imports) {
    for (const specifier of entry.specifiers) {
      const key = specifier.type === 'ImportDefaultSpecifier' ? 'default' : specifier.imported.name
      bindings.push(`const ${specifier.local.name} = modules[${JSON.stringify(entry.source.value)}]?.[${JSON.stringify(key)}];`)
    }
  }
  for (const entry of [...imports].reverse()) script = script.slice(0, entry.start) + script.slice(entry.end)
  const page = new Function('modules', bindings.join('\n') + '\n' + script + '\nreturn {' + names.join(',') + '}')(dependencies)
  return { ...page, unmount: () => unmount.forEach((callback) => callback()) }
}

test('login guards duplicate submissions, stores only success, and ignores late responses after unload', async () => {
  for (const scenario of ['success', 'failure', 'unmount']) {
    const pending = deferred()
    const { api, calls } = await load_api('src/api/auth.js', () => pending.promise)
    const applied = []
    const routes = []
    const page = await load_page('src/pages/login/index.vue', ['login', 'email', 'password', 'is_signing_in', 'login_error'], {
      '@/api/auth': api,
      '@/utils/routeTransition': {
        relaunch_route: options => routes.push(options.url)
      },
      '@/utils/useMainTabSkeleton': {
        prepare_main_tab_skeleton: () => {}
      },
      '@/stores/store': {
        storeGlobal: () => ({
          login: (token, data) => applied.push(data)
        })
      }
    })
    page.email.value = 'MIA@EXAMPLE.COM'
    page.password.value = 'password'
    const result = page.login()
    await page.login()
    assert.equal(calls.length, 1)
    assert.equal(calls[0].data.userEmail, 'mia@example.com')
    if (scenario === 'unmount') page.unmount()
    pending.resolve(envelope(scenario === 'failure' ? 400002 : 200000, { userId: 42, token: 'token' }))
    await result
    assert.equal(applied.length, scenario === 'success' ? 1 : 0)
    assert.equal(routes.length, scenario === 'success' ? 1 : 0)
    if (scenario !== 'unmount') assert.equal(page.is_signing_in.value, false)
  }
})

test('account Store keeps only the provided Pinia account state', async () => {
  setActivePinia(createPinia())
  const storage = new Map()
  const module = await load_store()
  const store = module.storeGlobal()
  store.login('secret', { userId: 42, userName: 'Mia', userBalance: 12 })
  assert.equal(store.token, 'secret')
  assert.equal(store.userInfo.userName, 'Mia')
  assert.equal(store.userId, 42)
  assert.equal(store.balance, 12)
  assert.equal(store.isLogin, true)
  store.updateUserInfo({ userBrief: 'Updated' })
  assert.equal(store.userInfo.userBrief, 'Updated')
  store.logout()
  assert.equal(store.token, '')
  assert.deepEqual(store.userInfo, {})
  assert.equal(store.balance, 0)
  assert.equal(store.isLogin, false)
})

test('image publishing submits one uploaded image without a second upload and preserves failed drafts', async () => {
  for (const successful of [true, false]) {
    const pending = deferred()
    const { api, calls } = await load_api('src/api/dynamic.js', () => pending.promise)
    const routes = []
    const page = await load_page('src/pages/discover/create.vue', ['publish_post', 'selected_images', 'content', 'is_publishing', 'page_transition'], {
      '@/api/dynamic': api,
      '@/api/media': { uploadImageFile: () => { throw new Error('Must not upload on publish') } },
      '@/utils/localImagePicker': { release_local_image_preview: () => {} }
    })
    page.content.value = '  Hello  '
    page.selected_images.value = [{ preview_url: 'blob:test', uploaded_url: 'https://cdn.test/photo.jpg' }]
    page.page_transition.value = { navigate_replace: (value) => routes.push(value.url) }
    const result = page.publish_post()
    await page.publish_post()
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].data, { dynamicClassify: 1, dynamicContent: 'Hello', dynamicType: 1, imgList: ['https://cdn.test/photo.jpg'] })
    pending.resolve(envelope(successful ? 200000 : 500000, { dynamicId: 88 }))
    await result
    assert.equal(page.is_publishing.value, false)
    assert.equal(page.selected_images.value.length, successful ? 0 : 1)
    assert.equal(routes.length, successful ? 1 : 0)
    if (successful) assert.match(routes[0], /dynamic_id=88/)
  }
})

test('image/video publish cannot run before media upload is ready', async () => {
  const { api, calls } = await load_api('src/api/dynamic.js', envelope())
  const image = await load_page('src/pages/discover/create.vue', ['publish_post', 'selected_images', 'content'], { '@/api/dynamic': api })
  image.content.value = 'Hello'
  image.selected_images.value = [{ preview_url: 'blob:pending' }]
  await image.publish_post()
  const video = await load_page('src/pages/videos/create.vue', ['confirm_draft', 'selected_video_file', 'video_preview_url', 'content'], { '@/api/dynamic': api })
  video.content.value = 'Hello'
  video.video_preview_url.value = 'blob:pending'
  video.selected_video_file.value = new Blob(['video'])
  await video.confirm_draft()
  assert.equal(calls.length, 0)
})

test('voice publishing submits the uploaded recording as a voice dynamic', async () => {
  const { api, calls } = await load_api('src/api/dynamic.js', envelope(200000, { dynamicId: 91 }))
  const routes = []
  const page = await load_page('src/pages/discover/create.vue', [
    'publish_post',
    'selected_images',
    'content',
    'voice_draft',
    'voice_duration',
    'page_transition'
  ], {
    '@/api/dynamic': api,
    '@/api/media': { uploadAudioFile: () => { throw new Error('Must not upload on publish') } },
    '@/utils/localImagePicker': { release_local_image_preview: () => {} }
  })
  page.content.value = 'Voice note'
  page.voice_draft.value = { url: 'https://cdn.test/voice.aac' }
  page.voice_duration.value = 8
  page.page_transition.value = { navigate_replace: (value) => routes.push(value.url) }
  await page.publish_post()
  assert.deepEqual(calls[0].data, {
    dynamicClassify: 1,
    dynamicContent: 'Voice note',
    dynamicType: 2,
    fileTimes: 8,
    imgList: [],
    videoImgUrl: 'https://cdn.test/voice.aac'
  })
  assert.match(routes[0], /content_type=audio/)
  assert.match(routes[0], /dynamic_id=91/)
})

test('video publish uses uploaded cover/duration and direct dynamicId from response', async () => {
  const { api, calls } = await load_api('src/api/dynamic.js', envelope(200000, { dynamicId: 99 }))
  const routes = []
  const page = await load_page('src/pages/videos/create.vue', ['confirm_draft', 'selected_video_file', 'video_preview_url', 'uploaded_media', 'content', 'page_transition'], {
    '@/api/dynamic': api,
    '@/utils/mediaPlayback': { stop_active_media: () => {}, clear_media: () => {} }
  })
  page.content.value = 'Video'
  page.selected_video_file.value = new Blob(['video'])
  page.video_preview_url.value = 'blob:preview'
  page.uploaded_media.value = { video_url: 'https://cdn.test/video.mp4', cover_url: 'https://cdn.test/cover.jpg', duration_seconds: 12 }
  page.page_transition.value = { navigate_replace: (value) => routes.push(value.url) }
  await page.confirm_draft()
  assert.deepEqual(calls[0].data, { dynamicClassify: 2, dynamicContent: 'Video', dynamicType: 3, fileTimes: 12, imgList: ['https://cdn.test/video.mp4'], videoImgUrl: 'https://cdn.test/cover.jpg' })
  assert.match(routes[0], /dynamic_id=99/)
})

test('failed chat sends preserve text and release pending; repeated clicks send once', async () => {
  const pending = deferred()
  const { api, calls } = await load_api('src/api/message.js', () => pending.promise)
  const page = await load_page('src/pages/messages/chat.vue', ['send_text', 'draft', 'peer_user_id', 'peer_name', 'peer_avatar_url', 'is_sending', 'send_error', 'page_messages'], {
    '@/api/message': api,
    '@/stores/store': {
      storeGlobal: () => ({
        userId: '42',
        bundleId: 'com.test.app',
        userInfo: { userName: 'Mia', userImgUrl: 'https://cdn.test/me.png' }
      }),
      use_moderation_store: () => ({
        blocked_user_ids: new Set()
      })
    }
  })
  page.draft.value = 'hello'
  page.peer_user_id.value = '7'
  page.peer_name.value = 'Peer'
  page.peer_avatar_url.value = 'https://cdn.test/peer.png'
  const result = page.send_text()
  assert.equal(page.page_messages.value[0].preview, 'hello')
  assert.equal(page.draft.value, '')
  await page.send_text()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].data.receiveUserId, 7)
  pending.resolve(envelope(500000))
  await result
  assert.equal(page.page_messages.value.length, 0)
  assert.equal(page.draft.value, 'hello')
  assert.equal(page.is_sending.value, false)
  assert.ok(page.send_error.value)
})

test('unblock updates the blocked list only after API success', async () => {
  for (const successful of [false, true]) {
    const { api } = await load_api('src/api/common.js', (options) => envelope(
      successful ? 200000 : 500000,
      options.endpoint === '/api/selectUserRelation' ? [] : {}
    ))
    const page = await load_page('src/pages/profile/blocked-list.vue', ['unblock_user', 'users', 'pending_ids', 'action_message'], {
      '@/api/common': api,
      '@/utils/blockedUsersPresentation': await import('../src/utils/blockedUsersPresentation.js'),
      '@/utils/settingsPresentation': await import('../src/utils/settingsPresentation.js')
    })
    page.users.value = [{ user_id: '7', user_name: 'still_water_88', avatar_url: '' }]
    await page.unblock_user(page.users.value[0])
    assert.equal(page.pending_ids.value.size, 0)
    assert.equal(page.users.value.length, successful ? 0 : 1)
    if (!successful) assert.ok(page.action_message.value)
  }
})


test('like and unlike are visible before response and failed writes roll back only their own post', async () => {
  for (const path of ['src/pages/discover/index.vue', 'src/pages/videos/index.vue']) {
    for (const liked of [false, true]) {
      for (const successful of [false, true]) {
        const pending = deferred()
        const { api, calls } = await load_api('src/api/dynamic.js', () => pending.promise)
        const page = await load_page(path, ['toggle_like', 'page_posts', 'liked_post_ids', 'is_post_liked'], {
          '@/api/dynamic': api,
          '@/utils/useMainTabSkeleton': {
            use_main_tab_skeleton: () => ({})
          },
          '@/utils/mediaPlayback': {
            stop_active_media: () => {},
            clear_media: () => {}
          },
          '@/stores/store': {
            storeGlobal: () => ({
              userId: '42'
            }),
            use_content_store: () => ({}),
            use_moderation_store: () => ({
              blocked_user_ids: new Set()
            })
          }
        })
        page.page_posts.value = [{ dynamicId: 7, praiseNum: 12, storeFlag: liked ? 1 : 0 }]
        page.liked_post_ids.value = new Set(liked ? ['7'] : [])
        const operation = page.toggle_like(page.page_posts.value[0])
        assert.equal(page.is_post_liked(page.page_posts.value[0]), !liked)
        assert.equal(page.page_posts.value[0].praiseNum, liked ? 11 : 13)
        await page.toggle_like(page.page_posts.value[0])
        assert.equal(calls.length, 1)
        pending.resolve(envelope(successful ? 200000 : 500000, null))
        await operation
        assert.equal(page.is_post_liked(page.page_posts.value[0]), successful ? !liked : liked)
        assert.equal(page.page_posts.value[0].praiseNum, successful ? (liked ? 11 : 13) : 12)
        page.unmount()
      }
    }
  }
})

test('comments render before response, reconcile server IDs and roll back failure/cancellation', async () => {
  for (const scenario of ['success', 'empty', 'failure', 'cancel', 'unmount']) {
    const pending = deferred()
    const { api, calls } = await load_api('src/api/dynamic.js', () => pending.promise)
    const page = await load_page('src/pages/discover/detail.vue', ['submit_comment', 'comment_draft', 'cached_post', 'cached_comments', 'is_comment_submitting'], {
      '@/api/dynamic': api,
      '@/utils/mediaPlayback': {
        stop_active_media: () => {},
        clear_media: () => {}
      },
      '@/stores/store': {
        storeGlobal: () => ({
          userId: '42',
          userInfo: { userName: 'Mia' }
        }),
        use_moderation_store: () => ({
          blocked_user_ids: new Set()
        })
      }
    })
    page.cached_post.value = { dynamicId: 7, commentNum: 0, commentVoList: [] }
    page.comment_draft.value = 'hello'
    const operation = page.submit_comment()
    assert.equal(page.cached_comments.value[0].content, 'hello')
    assert.equal(page.cached_post.value.commentNum, 1)
    assert.equal(page.comment_draft.value, '')
    await page.submit_comment()
    assert.equal(calls.length, 1)
    if (scenario === 'unmount') page.unmount()
    if (scenario === 'cancel') pending.reject(Object.assign(new Error('Request cancelled.'), { kind: 'cancelled' }))
    else pending.resolve(envelope(scenario === 'failure' ? 500000 : 200000, scenario === 'success' ? { commentId: 99 } : null))
    await operation
    assert.equal(page.cached_comments.value.length, ['failure', 'cancel'].includes(scenario) ? 0 : 1)
    if (scenario === 'success') assert.equal(page.cached_comments.value[0].comment_id, '99')
    if (scenario === 'empty') assert.equal(page.cached_comments.value[0].is_temporary, true)
    if (scenario === 'failure') {
      assert.equal(page.comment_draft.value, 'hello')
      assert.equal(page.cached_post.value.commentNum, 0)
    }
    page.unmount()
  }
})


test('chat confirms without a second read, rejects stale reads, and ignores late writes after unload', async () => {
  for (const scenario of ['success', 'empty', 'unmount', 'timeout', 'cancel']) {
    const pending = deferred()
    const reading = deferred()
    const { api, calls } = await load_api('src/api/message.js', (options) => options.endpoint === '/api/sendMessage' ? pending.promise : reading.promise)
    const page = await load_page('src/pages/messages/chat.vue', ['send_text', 'load_messages', 'draft', 'peer_user_id', 'peer_name', 'peer_avatar_url', 'page_messages', 'is_sending'], {
      '@/api/message': api,
      '@/utils/messagePresentation': await import('../src/utils/messagePresentation.js'),
      '@/stores/store': {
        storeGlobal: () => ({
          userId: '42',
          bundleId: 'com.test.app',
          userInfo: { userName: 'Mia', userImgUrl: 'https://cdn.test/me.png' }
        }),
        use_moderation_store: () => ({
          blocked_user_ids: new Set()
        })
      }
    })
    page.peer_user_id.value = '7'
    page.peer_name.value = 'Peer'
    page.peer_avatar_url.value = 'https://cdn.test/peer.png'
    const read = page.load_messages()
    page.draft.value = 'hello'
    const send = page.send_text()
    reading.resolve(envelope(200000, []))
    await read
    assert.equal(page.page_messages.value[0].preview, 'hello')
    if (scenario === 'unmount') page.unmount()
    if (scenario === 'timeout' || scenario === 'cancel') pending.reject(Object.assign(new Error('Network failed'), { kind: scenario === 'cancel' ? 'cancelled' : 'timeout' }))
    else pending.resolve(envelope(200000, scenario === 'empty' ? null : { messageId: 99 }))
    await send
    assert.equal(calls.length, 2)
    if (scenario === 'success') assert.equal(page.page_messages.value[0].message_id, '99')
    if (scenario === 'empty' || scenario === 'unmount') assert.match(page.page_messages.value[0].message_id, /^pending-message-/)
    if (scenario === 'timeout' || scenario === 'cancel') {
      assert.equal(page.page_messages.value.length, 0)
      assert.equal(page.draft.value, 'hello')
    }
    page.unmount()
  }
})

test('authorization records follow the host permission result', async () => {
  const records = { microphone: false, camera: false, location: false, album: false }
  const store = { getAuthRecord: (key) => Boolean(records[key]) }
  let result = { granted: false, success: false, permission_status: 'denied', permanent: false, cancelled: false }
  const page = await load_page('src/pages/profile/permission-records/index.vue', [
    'rows',
    'notice',
    'action_message',
    'load_records',
    'toggle_permission',
    'close_notice'
  ], {
    '@/stores/store': { storeGlobal: () => store },
    '@/utils/iosPermissionBridge': { ensure_ios_permission: async () => result },
    '@/utils/permissionRecordsPresentation': await import('../src/utils/permissionRecordsPresentation.js')
  })
  page.load_records()
  assert.equal(page.rows.value.find((row) => row.key === 'microphone').state, 'not_granted')
  await page.toggle_permission('microphone')
  assert.equal(page.rows.value.find((row) => row.key === 'microphone').state, 'denied')
  assert.equal(page.rows.value.find((row) => row.key === 'microphone').granted, false)
  assert.match(page.notice.value.title, /Microphone/)
  page.close_notice()
  result = { granted: false, permission_status: 'unavailable', unavailable: true, error: 'Microphone permission request timed out.' }
  await page.toggle_permission('microphone')
  assert.equal(page.rows.value.find((row) => row.key === 'microphone').state, 'failure')
  assert.equal(page.rows.value.find((row) => row.key === 'microphone').granted, false)
  assert.match(page.action_message.value, /Microphone/)
  records.microphone = true
  page.load_records()
  result = { granted: true, success: true, permission_status: 'granted' }
  await page.toggle_permission('microphone')
  assert.equal(page.rows.value.find((row) => row.key === 'microphone').granted, true)
  assert.equal(page.notice.value.title, 'Microphone stays allowed')
  page.unmount()
})

test('logout leaves settings only after the session is cleared', async () => {
  const store = {
    token: 'session-token',
    userInfo: { userId: '42', userName: 'Mia' },
    balance: 8,
    isLogin: true,
    login(token, userInfo) {
      this.token = token
      this.userInfo = userInfo
      this.isLogin = true
    },
    setBalance(value) {
      this.balance = value
    },
    setLoginStatus(value) {
      this.isLogin = value
    }
  }
  let cleared = 0
  const page = await load_page('src/pages/profile/settings.vue', [
    'confirm_logout',
    'cancel_logout',
    'is_logout_visible',
    'is_logging_out',
    'logout_error',
    'page_transition'
  ], {
    '@/api/common': { selectUserInfo: async () => ({ success: true, data: {} }) },
    '@/utils/auth': {
      clear_login_state: () => {
        cleared += 1
        store.token = ''
        store.userInfo = {}
        store.balance = 0
        store.isLogin = false
      }
    },
    '@/stores/store': { storeGlobal: () => store },
    '@/utils/languagePreference': { read_app_language_label: () => 'English' },
    '@/utils/settingsPresentation': await import('../src/utils/settingsPresentation.js')
  })
  page.is_logout_visible.value = true
  page.cancel_logout()
  assert.equal(page.is_logout_visible.value, false)
  assert.equal(cleared, 0)
  page.is_logout_visible.value = true
  let fail = null
  page.page_transition.value = {
    navigate_relaunch: (options) => {
      fail = options.fail
      return true
    }
  }
  page.confirm_logout()
  assert.equal(cleared, 1)
  assert.equal(page.is_logging_out.value, true)
  assert.equal(store.isLogin, false)
  page.cancel_logout()
  assert.equal(page.is_logout_visible.value, true)
  fail()
  assert.equal(store.token, 'session-token')
  assert.equal(store.isLogin, true)
  assert.equal(store.balance, 8)
  assert.equal(store.userInfo.userName, 'Mia')
  assert.equal(page.is_logging_out.value, false)
  assert.equal(page.logout_error.value, 'Unable to log out.')
  page.page_transition.value = { navigate_relaunch: () => false }
  page.confirm_logout()
  assert.equal(store.token, 'session-token')
  assert.equal(page.is_logging_out.value, false)
  const routes = []
  page.page_transition.value = {
    navigate_relaunch: (options) => {
      routes.push(options.url)
      return true
    }
  }
  page.confirm_logout()
  assert.deepEqual(routes, ['/pages/login/index'])
  assert.equal(store.token, '')
  assert.equal(page.is_logging_out.value, true)
  page.unmount()
})

test('logout resets the provided Pinia account state', async () => {
  setActivePinia(createPinia())
  const module = await load_store()
  const store = module.storeGlobal()
  store.login('session-token', { userId: '42', userName: 'Mia' })
  store.logout()
  assert.equal(store.token, '')
  assert.deepEqual(store.userInfo, {})
  assert.equal(store.isLogin, false)
})

test('login session survives a new Pinia instance through the session adapter', async () => {
  const storage = new Map()
  const previous_uni = globalThis.uni
  globalThis.uni = {
    getStorageSync: (key) => storage.get(key) ?? '',
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => { storage.delete(key) }
  }
  try {
    const module = await load_store()
    setActivePinia(createPinia())
    module.storeGlobal().login('session-token', { userId: '42', userName: 'Mia', userBalance: 8 })
    setActivePinia(createPinia())
    const restored = module.storeGlobal()
    restored.initLoginStatus()
    assert.equal(restored.token, 'session-token')
    assert.equal(restored.isLogin, true)
    assert.equal(restored.userId, '42')
    assert.equal(restored.userInfo.userName, 'Mia')
    assert.equal(restored.balance, 8)
    restored.logout()
    setActivePinia(createPinia())
    const after_logout = module.storeGlobal()
    after_logout.initLoginStatus()
    assert.equal(after_logout.token, '')
    assert.equal(after_logout.isLogin, false)
  } finally {
    if (previous_uni === undefined) delete globalThis.uni
    else globalThis.uni = previous_uni
  }
})

test('signup saves a successful session through store.js and leaves bundleId to request.js', async () => {
  for (const scenario of ['success', 'failure', 'unmount']) {
    setActivePinia(createPinia())
    const module = await load_store()
    const pending = deferred()
    const { api, calls } = await load_api('src/api/auth.js', () => pending.promise)
    const storage = new Map()
    const routes = []
    globalThis.uni = { setStorageSync: (key, value) => storage.set(key, value) }
    try {
      const page = await load_page('src/pages/signup/index.vue', ['create_account', 'username', 'email', 'password', 'is_terms_agreed', 'is_creating'], {
        '@/api/auth': api,
        '@/api/response': await import('../src/api/response.js'),
        '@/stores/store': module,
        '@/utils/routeTransition': { relaunch_route: (options) => routes.push(options.url) },
        '@/utils/useMainTabSkeleton': { prepare_main_tab_skeleton() {} }
      })
      page.username.value = 'Mia'
      page.email.value = 'MIA@EXAMPLE.COM'
      page.password.value = 'password'
      page.is_terms_agreed.value = true
      const operation = page.create_account()
      await page.create_account()
      assert.equal(calls.length, 1)
      assert.equal('bundleId' in calls[0].data, false)
      assert.equal(calls[0].data.userEmail, 'mia@example.com')
      assert.equal(module.storeGlobal().isLogin, false)
      if (scenario === 'unmount') page.unmount()
      pending.resolve(envelope(scenario === 'failure' ? 400003 : 200000, { userId: 42, userName: 'Mia', token: 'registered' }))
      await operation
      assert.equal(module.storeGlobal().isLogin, scenario === 'success')
      assert.equal(routes.length, scenario === 'success' ? 1 : 0)
    } finally {
      delete globalThis.uni
    }
  }
})

test('coins page observes the shared server balance even when delivery completes after navigation', async () => {
  for (const scenario of ['success', 'zero', 'failure', 'unmount']) {
    const pending = deferred()
    const { api, calls } = await load_api('src/api/common.js', () => pending.promise)
    const account_state = vue.reactive({
      userInfo: { userId: 42 }, userId: 42, token: 'session', balance: 12,
      setBalance(value) { this.balance = Number(value) || 0 },
      updateUserInfo(value) { Object.assign(this.userInfo, value) }
    })
    const sync = await import_source('src/utils/coinPurchaseSync.js', [
      ["import { storeGlobal } from '@/stores/store'", 'const storeGlobal = () => globalThis.__coin_test_store'],
      ["import { selectUserBalance } from '@/api/common'", 'const selectUserBalance = (...args) => globalThis.__coin_test_api.selectUserBalance(...args)'],
      ["import { API_BASE_URL } from '@/config/api'", "const API_BASE_URL = 'https://api.example.test'"],
      ["from './iosBridge.js'", `from '${new URL('../src/utils/iosBridge.js', import.meta.url).href}'`],
      ["from './iosMessageTypes.js'", `from '${new URL('../src/utils/iosMessageTypes.js', import.meta.url).href}'`],
      ["from 'vue'", `from '${import.meta.resolve('vue')}'`]
    ])
    globalThis.__coin_test_store = account_state
    globalThis.__coin_test_api = api
    const page = await load_page('src/pages/coins/index.vue', ['load_user_balance', 'current_coin_balance'], {
      '@/stores/store': { storeGlobal: () => account_state },
      '@/utils/coinPurchaseSync': sync,
      '@/utils/iapBridge': { request_ios_coin_purchase: async () => ({ transaction_id: 'tx' }) },
      '@/utils/coinPackageConfig': { load_coin_package_config: async () => ({ coin_packages: [] }) }
    })
    assert.equal(page.current_coin_balance.value, 12)
    const operation = page.load_user_balance()
    await Promise.resolve()
    assert.equal(calls[0].endpoint, '/api/selectUserBalance')
    if (scenario === 'unmount') page.unmount()
    pending.resolve(scenario === 'failure' ? envelope(500000, 0) : envelope(200000, scenario === 'zero' ? 0 : 88))
    await operation
    assert.equal(account_state.balance, scenario === 'failure' ? 12 : scenario === 'zero' ? 0 : 88)
    assert.equal(page.current_coin_balance.value, account_state.balance)
    delete globalThis.__coin_test_store
    delete globalThis.__coin_test_api
  }
})

test('profile coin display reacts to a credited balance without reopening the page', async () => {
  const store = vue.reactive({ balance: 20 })
  const page = await load_page('src/pages/profile/index.vue', ['coin_label'], {
    '@/stores/store': { storeGlobal: () => store },
    '@/utils/coinPurchaseSync': { refresh_account_coin_balance: async () => true },
    '@/utils/myProfilePresentation': { format_profile_count: (count) => count.toLocaleString('en-US') }
  })
  assert.equal(page.coin_label.value, '20')
  store.balance = 300
  assert.equal(page.coin_label.value, '300')
})

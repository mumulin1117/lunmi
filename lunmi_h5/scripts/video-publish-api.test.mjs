import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const project_root = new URL('../', import.meta.url)

const import_source = async (relative_path, replacements = []) => {
  let source = (await readFile(new URL(relative_path, project_root), 'utf8')).replaceAll('\r\n', '\n')
  replacements.forEach(([from, to]) => { source = source.replace(from, to) })
  const source_url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Math.random()}`
  return import(source_url)
}

test('video upload uses multipart file field, injects the session token, and supports cancellation', async () => {
  let upload_options = null
  let was_aborted = false
  globalThis.__request_config = {
    API_BUNDLE_ID: 'test.bundle',
    API_REQUEST_TIMEOUT_MS: 15000,
    resolve_api_url: (endpoint) => `https://example.test${endpoint}`
  }
  globalThis.uni = {
    getStorageSync: () => ({ token: 'session-token' }),
    uploadFile: (options) => {
      upload_options = options
      queueMicrotask(() => options.success({
        statusCode: 200,
        header: {},
        data: JSON.stringify({ code: 200000, data: { videoUrl: 'video.mp4' }, message: 'Request success' })
      }))
      return { abort: () => { was_aborted = true } }
    }
  }

  const request_module = await import_source('src/api/request.js', [
    ["import { storeGlobal } from '@/stores/store'", "const storeGlobal = () => ({ token: 'session-token' })"],
    [
      "import { API_BUNDLE_ID, API_REQUEST_TIMEOUT_MS, resolve_api_url } from '@/config/api'",
      'const { API_REQUEST_TIMEOUT_MS, resolve_api_url, API_BUNDLE_ID } = globalThis.__request_config'
    ]
  ])
  const file = new Blob(['video'], { type: 'video/mp4' })
  const response = await request_module.request_multipart({
    endpoint: '/api/fileVideoUpload',
    file,
    file_path: 'blob:preview',
    request_context: {}
  })

  assert.equal(upload_options.url, 'https://example.test/api/fileVideoUpload')
  assert.equal(upload_options.name, 'file')
  assert.equal(upload_options.file, file)
  assert.deepEqual(upload_options.formData, { bundleId: 'test.bundle' })
  assert.equal(upload_options.header.token, 'session-token')
  assert.equal(upload_options.header.Authorization, undefined)
  assert.equal(response.body.data.videoUrl, 'video.mp4')
  assert.equal(was_aborted, false)

  let cancel_options = null
  globalThis.uni.uploadFile = (options) => {
    cancel_options = options
    return { abort: () => { was_aborted = true } }
  }
  const request_context = {}
  const pending_request = request_module.request_multipart({
    endpoint: '/api/fileVideoUpload',
    file,
    file_path: 'blob:preview',
    request_context
  })
  request_context.cancel()
  await assert.rejects(pending_request, (error) => error.kind === 'cancelled')
  assert.ok(cancel_options)
  assert.equal(was_aborted, true)
})

test('video upload response and publish payload keep only the required fields', async () => {
  const calls = []
  globalThis.__api_config = {
    API_ENDPOINTS: {
      dynamic_add: '/api/addDynamic',
      video_upload: '/api/fileVideoUpload'
    },
    resolve_api_url: (endpoint) => endpoint
  }
  globalThis.__response_helpers = {
    API_SUCCESS_CODE: 200000,
    get_response_error_message: () => 'Request failed.'
  }
  globalThis.__http = {
    upload: async (endpoint, options) => {
      calls.push({ endpoint, options, type: 'upload' })
      return {
        success: true,
        data: {
          coverImgUrl: 'https://cdn.test/cover.jpg',
          videoDuration: 12.6,
          videoUrl: 'https://cdn.test/video.mp4',
          ignored: 'value'
        },
        error: ''
      }
    },
    post: async (endpoint, data, options) => {
      calls.push({ data, endpoint, options, type: 'post' })
      return { success: true, data: {}, error: '' }
    }
  }

  const media_module = await import_source('src/api/media.js', [
    [
      "import { API_ENDPOINTS, resolve_api_url } from '@/config/api'",
      'const { API_ENDPOINTS, resolve_api_url } = globalThis.__api_config'
    ],
    [
      "import { API_SUCCESS_CODE, get_response_error_message } from '@/api/response'",
      'const { API_SUCCESS_CODE, get_response_error_message } = globalThis.__response_helpers'
    ],
    ["import { http } from '@/api/service'", 'const http = globalThis.__http']
  ])
  const dynamic_module = await import_source('src/api/dynamic.js', [
    ["import { http } from '@/api/service'", 'const http = globalThis.__http'],
    ["import { API_ENDPOINTS } from '@/config/api'", 'const { API_ENDPOINTS } = globalThis.__api_config']
  ])

  const file = new Blob(['video'], { type: 'video/mp4' })
  const upload_result = await media_module.uploadVideoFile({
    file,
    filePath: 'blob:preview',
    request_context: {}
  })
  await dynamic_module.addDynamic({
    dynamicClassify: 2,
    dynamicContent: 'New clip',
    dynamicType: 3,
    imgList: [upload_result.data.video_url],
    videoImgUrl: upload_result.data.cover_url,
    fileTimes: upload_result.data.duration_seconds
  }, {})

  assert.deepEqual(upload_result.data, {
    video_url: 'https://cdn.test/video.mp4',
    cover_url: 'https://cdn.test/cover.jpg',
    duration_seconds: 13
  })
  assert.equal(calls[0].endpoint, '/api/fileVideoUpload')
  assert.equal(calls[0].options.name, 'file')
  assert.equal(calls[1].endpoint, '/api/addDynamic')
  assert.deepEqual(calls[1].data, {
    dynamicClassify: 2,
    dynamicContent: 'New clip',
    dynamicType: 3,
    fileTimes: 13,
    imgList: ['https://cdn.test/video.mp4'],
    videoImgUrl: 'https://cdn.test/cover.jpg'
  })
})

test('request.js injects bundleId for empty and business parameters without changing callers', async () => {
  const calls = []
  globalThis.uni = {
    request: (options) => {
      calls.push(options)
      queueMicrotask(() => options.success({ statusCode: 200, data: { code: 200000, data: [], message: 'Request success' } }))
      return { abort() {} }
    }
  }
  try {
    const module = await import_source('src/api/request.js', [
      ["import { API_BUNDLE_ID, API_REQUEST_TIMEOUT_MS, resolve_api_url } from '@/config/api'", "const API_REQUEST_TIMEOUT_MS = 15000; const API_BUNDLE_ID = 'test.bundle'; const resolve_api_url = (endpoint) => endpoint"],
      ["import { storeGlobal } from '@/stores/store'", "const storeGlobal = () => ({ token: 'from-pinia' })"]
    ])
    for (const data of [{}, { dynamicId: 7 }]) {
      const original = structuredClone(data)
      await module.request_json({ endpoint: '/api/test', method: 'POST', data })
      assert.deepEqual(calls.at(-1).data, { ...data, bundleId: 'test.bundle' })
      assert.deepEqual(data, original)
      assert.equal(calls.at(-1).header.token, 'from-pinia')
    }
    await module.request_json({ endpoint: '/api/emailLogin', method: 'POST', data: {}, with_auth: false })
    assert.equal(calls.at(-1).header.token, undefined)
    assert.deepEqual(calls.at(-1).data, { bundleId: 'test.bundle' })
  } finally {
    delete globalThis.uni
  }
})

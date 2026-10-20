import { API_BUNDLE_ID, API_REQUEST_TIMEOUT_MS, resolve_api_url } from '@/config/api'
import { storeGlobal } from '@/stores/store'

export class ApiTransportError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'ApiTransportError'
    Object.assign(this, details)
  }
}

const read_access_token = () => {
  return `${storeGlobal().token || ''}`.trim()
}

const parse_response_body = (body) => {
  if (body && typeof body === 'object') return body
  if (typeof body !== 'string' || !body.trim()) {
    throw new ApiTransportError('The API returned an empty response.', { kind: 'invalid_response' })
  }
  try {
    return JSON.parse(body)
  } catch (error) {
    throw new ApiTransportError('The API returned invalid JSON.', {
      kind: 'invalid_response',
      cause: error
    })
  }
}

const build_request_headers = (header = {}, with_auth = true) => {
  const access_token = with_auth ? read_access_token() : ''
  return {
    ...(access_token ? { token: access_token } : {}),
    ...header
  }
}

const can_use_browser_fetch = () => (
  typeof window !== 'undefined'
  && typeof fetch === 'function'
  && typeof AbortController === 'function'
)

const network_error_kind = (error_message) => {
  if (/timeout/i.test(error_message)) return 'timeout'
  if (/abort|cancel/i.test(error_message)) return 'cancelled'
  return 'network'
}

const read_fetch_headers = (headers) => {
  const result = {}
  if (!headers || typeof headers.forEach !== 'function') return result
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

const attach_cancel = (request_promise, request_context) => {
  if (request_context && typeof request_context === 'object') {
    request_context.cancel = request_promise.cancel
  }
  return request_promise
}

const request_json_with_fetch = ({
  url,
  method,
  header,
  data,
  timeout,
  request_context
}) => {
  const abort_controller = new AbortController()
  let settled = false
  let timed_out = false
  let timeout_id = null
  let reject_request = null
  const payload = method === 'GET' ? undefined : JSON.stringify(data)
  const request_promise = new Promise((resolve, reject) => {
    reject_request = reject
    timeout_id = setTimeout(() => {
      timed_out = true
      abort_controller.abort()
    }, timeout)
    fetch(url, {
      method,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      headers: header,
      body: payload,
      signal: abort_controller.signal
    }).then(async (response) => {
      if (settled) return
      settled = true
      clearTimeout(timeout_id)
      try {
        const raw_body = await response.text()
        resolve({
          http_status: Number(response.status || 0),
          headers: read_fetch_headers(response.headers),
          body: parse_response_body(raw_body)
        })
      } catch (error) {
        reject(error)
      }
    }).catch((error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout_id)
      const error_message = `${error?.message || error?.errMsg || ''}`.trim()
      const kind = timed_out
        ? 'timeout'
        : abort_controller.signal.aborted
          ? 'cancelled'
          : network_error_kind(error_message)
      reject(new ApiTransportError(
        kind === 'timeout'
          ? 'Unable to connect to the API service.'
          : error_message || 'Unable to connect to the API service.',
        {
          kind,
          raw_error: error
        }
      ))
    })
  })
  request_promise.cancel = () => {
    if (settled) return
    settled = true
    clearTimeout(timeout_id)
    abort_controller.abort()
    reject_request?.(new ApiTransportError('Request cancelled.', { kind: 'cancelled' }))
  }
  return attach_cancel(request_promise, request_context)
}

export const request_json = ({
  endpoint,
  method = 'GET',
  data,
  header = {},
  timeout = API_REQUEST_TIMEOUT_MS,
  with_auth = true,
  request_context = null
} = {}) => {
  const url = resolve_api_url(endpoint)
  const request_header = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...build_request_headers(header, with_auth)
  }
  const request_data = {
    ...data,
    bundleId: API_BUNDLE_ID
  }
  if (can_use_browser_fetch()) {
    return request_json_with_fetch({
      url,
      method,
      header: request_header,
      data: request_data,
      timeout,
      request_context
    })
  }
  let request_task = null
  let settled = false
  let reject_request = null

  const request_promise = new Promise((resolve, reject) => {
    reject_request = reject
    if (typeof uni === 'undefined' || typeof uni.request !== 'function') {
      reject(new ApiTransportError('The request API is unavailable.', { kind: 'unavailable' }))
      return
    }

    request_task = uni.request({
      url,
      method,
      timeout,
      withCredentials: false,
      header: request_header,
      data: request_data,
      success(response) {
        if (settled) return
        settled = true
        try {
          resolve({
            http_status: Number(response?.statusCode || 0),
            headers: response?.header || {},
            body: parse_response_body(response?.data)
          })
        } catch (error) {
          reject(error)
        }
      },
      fail(error) {
        if (settled) return
        settled = true
        const error_message = `${error?.errMsg || ''}`.trim()
        reject(new ApiTransportError(error_message || 'Unable to connect to the API service.', {
          kind: network_error_kind(error_message),
          raw_error: error
        }))
      }
    })
  })

  request_promise.cancel = () => {
    if (settled) return
    settled = true
    request_task?.abort?.()
    reject_request?.(new ApiTransportError('Request cancelled.', { kind: 'cancelled' }))
  }

  return attach_cancel(request_promise, request_context)
}

export const request_multipart = ({
  endpoint,
  file,
  file_path = '',
  name = 'file',
  form_data = {},
  header = {},
  timeout = API_REQUEST_TIMEOUT_MS,
  with_auth = true,
  request_context = null
} = {}) => {
  const url = resolve_api_url(endpoint)
  const resolved_file_path = file_path || file?.path || file?.tempFilePath || ''
  let upload_task = null
  let settled = false
  let reject_request = null

  const request_promise = new Promise((resolve, reject) => {
    reject_request = reject
    if (typeof uni === 'undefined' || typeof uni.uploadFile !== 'function') {
      reject(new ApiTransportError('The upload API is unavailable.', { kind: 'unavailable' }))
      return
    }
    if (!file && !resolved_file_path) {
      reject(new ApiTransportError('Choose a media file first.', { kind: 'invalid_file' }))
      return
    }

    const upload_options = {
      url,
      name,
      formData: {
        ...form_data,
        bundleId: API_BUNDLE_ID
      },
      timeout,
      withCredentials: false,
      header: build_request_headers(header, with_auth),
      success(response) {
        if (settled) return
        settled = true
        try {
          resolve({
            http_status: Number(response?.statusCode || 0),
            headers: response?.header || {},
            body: parse_response_body(response?.data)
          })
        } catch (error) {
          reject(error)
        }
      },
      fail(error) {
        if (settled) return
        settled = true
        const error_message = `${error?.errMsg || ''}`.trim()
        reject(new ApiTransportError(error_message || 'Unable to upload this file.', {
          kind: network_error_kind(error_message),
          raw_error: error
        }))
      }
    }
    if (file) upload_options.file = file
    if (resolved_file_path) upload_options.filePath = resolved_file_path
    upload_task = uni.uploadFile(upload_options)
  })

  request_promise.cancel = () => {
    if (settled) return
    settled = true
    upload_task?.abort?.()
    reject_request?.(new ApiTransportError('Request cancelled.', { kind: 'cancelled' }))
  }

  return attach_cancel(request_promise, request_context)
}

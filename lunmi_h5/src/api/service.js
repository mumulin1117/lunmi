import { request_json, request_multipart } from '@/api/request'
import { RESPONSE_TYPE_CODES, normalize_response_envelope } from '@/api/response'
import { clear_login_state } from '@/utils/auth'
import { open_api_error_dialog } from '@/utils/apiFeedback'
import { redirect_to_login } from '@/utils/routeGuard'

const normalize_service_response = (transport) => {
  const response = normalize_response_envelope(transport)
  if (response.success) return { success: true, data: response.data, error: '' }
  const failure_data = response.data && typeof response.data === 'object'
    ? response.data
    : {}
  if (response.code === RESPONSE_TYPE_CODES.USER_NOT_LOGIN) {
    clear_login_state()
    redirect_to_login(2500)
    return {
      success: false,
      data: failure_data,
      error: 'Your session has expired. Please log in again.',
      code: response.code
    }
  }
  const notice_title = response.code === RESPONSE_TYPE_CODES.PARAM_ERROR
    ? 'PARAMETER_ERROR'
    : 'Error'
  open_api_error_dialog(response.error, notice_title)
  return {
    success: false,
    data: failure_data,
    error: response.error,
    code: response.code
  }
}

const normalize_service_error = (error) => {
  if (error?.kind === 'cancelled') {
    return { success: false, data: {}, error: 'Request cancelled.' }
  }
  const error_message = error?.message || 'Unable to complete the request.'
  open_api_error_dialog(error_message)
  return { success: false, data: {}, error: error_message }
}

export const service_request = async ({
  endpoint,
  method = 'GET',
  data,
  header = {},
  with_auth = true,
  timeout,
  request_context
} = {}) => {
  try {
    const transport = await request_json({ endpoint, method, data, header, with_auth, timeout, request_context })
    return normalize_service_response(transport)
  } catch (error) {
    return normalize_service_error(error)
  }
}

export const service_upload = async ({
  endpoint,
  file,
  file_path,
  name = 'file',
  form_data = {},
  header = {},
  with_auth = true,
  timeout,
  request_context
} = {}) => {
  try {
    const transport = await request_multipart({
      endpoint,
      file,
      file_path,
      name,
      form_data,
      header,
      with_auth,
      timeout,
      request_context
    })
    return normalize_service_response(transport)
  } catch (error) {
    return normalize_service_error(error)
  }
}

export const http = {
  request: service_request,
  get: (endpoint, options = {}) => service_request({ ...options, endpoint, method: 'GET' }),
  post: (endpoint, data, options = {}) => service_request({ ...options, endpoint, data, method: 'POST' }),
  upload: (endpoint, options = {}) => service_upload({ ...options, endpoint })
}

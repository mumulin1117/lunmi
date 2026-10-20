export const API_SUCCESS_CODE = 200000

export const RESPONSE_TYPE_CODES = Object.freeze({
  REQUEST_FAIL: 200001,
  PARAM_ERROR: 300000,
  RSA_GET_ERROR: 300001,
  RSA_DECODE_ERROR: 300002,
  NOT_FOUND_ERROR: 300003,
  USER_NOT_EXIST: 400000,
  USER_HAS_LOCKED: 400001,
  USER_PASSWORD_INVALID: 400002,
  USER_NAME_HAS_EXIST: 400003,
  USER_NOT_LOGIN: 400004,
  USER_NOT_SET_TRANS_PWD: 400005,
  USER_TRANS_PWD_ERROR: 400006,
  BALANCE_NOT_ENOUGH: 400007,
  NOT_AUTH: 400008,
  OLD_PASSWORD_INVALID: 400009,
  MAST_CREATE_USER: 400010,
  USER_DISABLE: 400011,
  ERROR: 500000,
  HANDLE_MANY_ERROR: 500001,
  FILE_UPLOAD_ERROR: 500002,
  NO_RESULT: 500003,
  NUM_NOT_ENOUGH: 500004,
  CONTENT_EXITS: 500005,
  FILE_TYPE_ERROR: 500006,
  COMMON_TYPE_ERROR: 500007,
  IOS_CHECK_ERROR: 600100,
  IOS_ORDER_HAS_CHECK_ERROR: 600101,
  IOS_ORDER_NOT_EXIST_ERROR: 600102
})

const response_error_messages = Object.freeze({
  [RESPONSE_TYPE_CODES.REQUEST_FAIL]: 'The request could not be validated.',
  [RESPONSE_TYPE_CODES.PARAM_ERROR]: 'Please check the submitted parameters.',
  [RESPONSE_TYPE_CODES.NOT_FOUND_ERROR]: 'The requested resource was not found.',
  [RESPONSE_TYPE_CODES.USER_NOT_EXIST]: 'This account does not exist.',
  [RESPONSE_TYPE_CODES.USER_HAS_LOCKED]: 'This account is locked.',
  [RESPONSE_TYPE_CODES.USER_PASSWORD_INVALID]: 'Invalid email or password.',
  [RESPONSE_TYPE_CODES.USER_NAME_HAS_EXIST]: 'This username is already in use.',
  [RESPONSE_TYPE_CODES.USER_NOT_LOGIN]: 'Your session has expired. Please log in again.',
  [RESPONSE_TYPE_CODES.NOT_AUTH]: 'You do not have permission to perform this action.',
  [RESPONSE_TYPE_CODES.USER_DISABLE]: 'This account has been deleted and can no longer sign in.',
  [RESPONSE_TYPE_CODES.HANDLE_MANY_ERROR]: 'Too many requests. Please try again later.',
  [RESPONSE_TYPE_CODES.FILE_UPLOAD_ERROR]: 'The file upload failed.',
  [RESPONSE_TYPE_CODES.FILE_TYPE_ERROR]: 'This file type is not supported.',
  [RESPONSE_TYPE_CODES.ERROR]: 'The service could not complete the request.'
})

const normalize_message = (message) => `${message || ''}`.trim()

export const get_response_error_message = (code, message = '') => (
  response_error_messages[code]
  || normalize_message(message)
  || 'Unable to complete the request.'
)

export const normalize_response_envelope = ({ http_status = 0, body } = {}, { success_codes = [API_SUCCESS_CODE] } = {}) => {
  const response_body = body && typeof body === 'object' && !Array.isArray(body) ? body : null
  const code = Number.isInteger(response_body?.code) ? response_body.code : null
  const message = normalize_message(response_body?.message)
  const data = response_body?.data ?? null
  const re_res_json = response_body?.reResJson
  const has_http_error = http_status < 200 || http_status >= 300
  const has_invalid_envelope = !response_body || code === null || !Object.prototype.hasOwnProperty.call(response_body, 'message')
  const success = !has_http_error && !has_invalid_envelope && success_codes.includes(code)

  return {
    success,
    code,
    data,
    message,
    re_res_json,
    http_status,
    error: success
      ? ''
      : get_response_error_message(code, message)
  }
}

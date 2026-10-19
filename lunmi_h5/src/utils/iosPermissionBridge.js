import { storeGlobal } from '@/stores/store'
import { t } from './i18n.js'
import {
  create_ios_request_id,
  receive_ios_message,
  send_ios_message,
  subscribe_ios_message
} from './iosBridge.js'
import {
  IOS_CAMERA_PERMISSION_REQUEST_HANDLER_NAME,
  IOS_CAMERA_PERMISSION_RESULT_RECEIVER_NAME,
  IOS_LOCATION_PERMISSION_REQUEST_HANDLER_NAME,
  IOS_LOCATION_PERMISSION_RESULT_RECEIVER_NAME,
  IOS_MESSAGE_TYPE,
  IOS_MICROPHONE_PERMISSION_REQUEST_HANDLER_NAME,
  IOS_MICROPHONE_PERMISSION_RESULT_RECEIVER_NAME,
  IOS_PERMISSION,
  IOS_PERMISSION_STATUS,
  IOS_PHOTO_LIBRARY_PERMISSION_REQUEST_HANDLER_NAME,
  IOS_PHOTO_LIBRARY_PERMISSION_RESULT_RECEIVER_NAME,
  IOS_NATIVE_REQUEST_TIMEOUT_MS
} from './iosMessageTypes.js'

const permission_message_configuration = Object.freeze({
  [IOS_PERMISSION.CAMERA]: {
    request_type: IOS_MESSAGE_TYPE.CAMERA_PERMISSION_REQUEST,
    result_type: IOS_MESSAGE_TYPE.CAMERA_PERMISSION_RESULT,
    handler_name: IOS_CAMERA_PERMISSION_REQUEST_HANDLER_NAME,
    receiver_name: IOS_CAMERA_PERMISSION_RESULT_RECEIVER_NAME,
    label: 'Camera',
    store_key: 'camera',
    reason: 'Allow this app to use the camera.'
  },
  [IOS_PERMISSION.PHOTO_LIBRARY]: {
    request_type: IOS_MESSAGE_TYPE.PHOTO_LIBRARY_PERMISSION_REQUEST,
    result_type: IOS_MESSAGE_TYPE.PHOTO_LIBRARY_PERMISSION_RESULT,
    handler_name: IOS_PHOTO_LIBRARY_PERMISSION_REQUEST_HANDLER_NAME,
    receiver_name: IOS_PHOTO_LIBRARY_PERMISSION_RESULT_RECEIVER_NAME,
    label: 'Photo library',
    store_key: 'album',
    reason: 'Allow this app to access your photos.'
  },
  [IOS_PERMISSION.MICROPHONE]: {
    request_type: IOS_MESSAGE_TYPE.MICROPHONE_PERMISSION_REQUEST,
    result_type: IOS_MESSAGE_TYPE.MICROPHONE_PERMISSION_RESULT,
    handler_name: IOS_MICROPHONE_PERMISSION_REQUEST_HANDLER_NAME,
    receiver_name: IOS_MICROPHONE_PERMISSION_RESULT_RECEIVER_NAME,
    label: 'Microphone',
    store_key: 'microphone',
    reason: 'Allow this app to use the microphone.'
  },
  [IOS_PERMISSION.LOCATION]: {
    request_type: IOS_MESSAGE_TYPE.LOCATION_PERMISSION_REQUEST,
    result_type: IOS_MESSAGE_TYPE.LOCATION_PERMISSION_RESULT,
    handler_name: IOS_LOCATION_PERMISSION_REQUEST_HANDLER_NAME,
    receiver_name: IOS_LOCATION_PERMISSION_RESULT_RECEIVER_NAME,
    label: 'Location',
    store_key: 'location',
    reason: 'Use your location to recommend lanterns from your area when you select Nearby.'
  }
})

const granted_statuses = new Set([
  IOS_PERMISSION_STATUS.AUTHORIZED,
  IOS_PERMISSION_STATUS.AUTHORIZED_WHEN_IN_USE,
  IOS_PERMISSION_STATUS.AUTHORIZED_ALWAYS,
  IOS_PERMISSION_STATUS.LIMITED,
  'granted',
  'success'
])

const active_request_ids = new Map()
const registered_legacy_receivers = new Set()

const parse_payload = (payload) => {
  if (typeof payload !== 'string') return payload
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

const normalize_text = (value) => typeof value === 'string' ? value.trim() : ''
const normalize_status = (data = {}) => {
  const raw_status = data.permission_status
    || data.permissionStatus
    || data.authorization_status
    || data.authorizationStatus
    || data.status
  const numeric_status = Number(raw_status)
  if (raw_status !== '' && raw_status !== null && raw_status !== undefined && Number.isInteger(numeric_status)) {
    if (numeric_status === 3) return IOS_PERMISSION_STATUS.AUTHORIZED
    if (numeric_status === 4) return IOS_PERMISSION_STATUS.LIMITED
    if ([1, 2].includes(numeric_status)) return IOS_PERMISSION_STATUS.DENIED
    if (numeric_status === 0) return IOS_PERMISSION_STATUS.NOT_DETERMINED
  }
  const status = normalize_text(raw_status)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (status) return status
  if (data.granted === true || data.success === true) return IOS_PERMISSION_STATUS.AUTHORIZED
  if (data.granted === false || data.success === false) return IOS_PERMISSION_STATUS.DENIED
  return ''
}

const normalize_permission_result = (permission, payload) => {
  const parsed = parse_payload(payload)
  const data = typeof parsed === 'boolean'
    ? { success: parsed, granted: parsed }
    : parsed && typeof parsed === 'object' ? parsed : {}
  const status = normalize_status(data)
  const granted = granted_statuses.has(status)
  const permanent = status === IOS_PERMISSION_STATUS.RESTRICTED
  const cancelled = status === IOS_PERMISSION_STATUS.NOT_DETERMINED
  const denied = [IOS_PERMISSION_STATUS.DENIED, IOS_PERMISSION_STATUS.RESTRICTED].includes(status)
  return {
    request_id: normalize_text(data.requestId || data.request_id),
    permission,
    success: granted,
    granted,
    permanent,
    cancelled,
    permission_status: granted ? 'granted' : denied ? 'denied' : 'unavailable',
    status: granted ? 'granted' : denied ? 'denied' : 'unavailable',
    ...(data.error || data.errorMessage || data.error_message || data.message
      ? { error: String(data.error || data.errorMessage || data.error_message || data.message) }
      : {})
  }
}

const ensure_legacy_receiver = (permission) => {
  const item = permission_message_configuration[permission]
  if (!item || registered_legacy_receivers.has(permission) || typeof window === 'undefined') return
  window[item.receiver_name] = (payload) => {
    const result = normalize_permission_result(permission, payload)
    receive_ios_message({
      type: item.result_type,
      data: { ...result, requestId: result.request_id || active_request_ids.get(permission) || '' }
    })
  }
  registered_legacy_receivers.add(permission)
}

export const request_ios_permission = (permission, options = {}) => {
  const item = permission_message_configuration[permission]
  if (!item) return false
  ensure_legacy_receiver(permission)
  const request_options = typeof options === 'string' ? { reason: options } : options || {}
  const request_id = create_ios_request_id(`${permission}_permission`)
  active_request_ids.set(permission, request_id)
  const request_data = {
    requestId: request_id,
    permission,
    reason: t(normalize_text(request_options.reason) || item.reason),
    openSettings: Boolean(request_options.open_settings ?? request_options.openSettings),
    checkOnly: Boolean(request_options.check_only ?? request_options.checkOnly)
  }
  return send_ios_message(item.request_type, request_data, {
    fallback_handler_name: item.handler_name,
    fallback_payload: {
      callback: item.receiver_name,
      requestId: request_id,
      permission,
      reason: request_data.reason,
      openSettings: request_data.openSettings,
      checkOnly: request_data.checkOnly
    }
  })
}

export const receive_ios_permission_result = (permission, on_result) => {
  const item = permission_message_configuration[permission]
  if (!item || typeof window === 'undefined' || typeof on_result !== 'function') return null
  ensure_legacy_receiver(permission)
  return subscribe_ios_message(item.result_type, (message) => {
    const result = normalize_permission_result(permission, message.data)
    const active_request_id = active_request_ids.get(permission) || ''
    if (result.request_id && active_request_id && result.request_id !== active_request_id) return
    active_request_ids.delete(permission)
    on_result(result)
  })
}

const store_key_for_permission = (permission) => permission_message_configuration[permission]?.store_key || ''

export const ensure_ios_permission = (permission, options = {}) => {
  const store_key = store_key_for_permission(permission)
  if (!store_key) return Promise.reject(new Error(`Unsupported stored iOS permission: ${permission || 'unknown'}.`))
  const account_store = storeGlobal()
  const must_check_system = options.force_refresh || options.check_only || options.checkOnly
    || options.open_settings || options.openSettings
  if (!must_check_system && account_store.authRecord?.[store_key]) {
    return Promise.resolve({
      permission,
      success: true,
      granted: true,
      permission_status: 'granted',
      cached: true
    })
  }

  return new Promise((resolve) => {
    let settled = false
    let unsubscribe = null
    let timeout_id = null
    const finish = (result = {}) => {
      if (settled) return
      settled = true
      clearTimeout(timeout_id)
      unsubscribe?.()
      const granted = result.success === true && result.granted !== false && result.permission_status === 'granted'
      account_store.setAuthRecord(store_key, granted)
      resolve({
        ...result,
        permission,
        success: granted,
        granted,
        unavailable: result.permission_status === 'unavailable'
      })
    }

    timeout_id = setTimeout(() => finish({
      permission_status: 'unavailable',
      error: `${permission} permission request timed out.`
    }), IOS_NATIVE_REQUEST_TIMEOUT_MS)
    unsubscribe = receive_ios_permission_result(permission, finish)
    if (!unsubscribe || !request_ios_permission(permission, options)) {
      finish({ permission_status: 'unavailable', error: 'iOS permission bridge is unavailable.' })
      return
    }
  })
}

export const ensure_ios_permissions = async (permissions = [], options = {}) => {
  for (const permission of permissions) {
    const result = await ensure_ios_permission(permission, options)
    if (!result.granted) return result
  }
  return { success: true, granted: true, permission_status: 'granted' }
}

export const request_ios_camera_permission = (options) => request_ios_permission(IOS_PERMISSION.CAMERA, options)
export const request_ios_photo_library_permission = (options) => request_ios_permission(IOS_PERMISSION.PHOTO_LIBRARY, options)
export const request_ios_microphone_permission = (options) => request_ios_permission(IOS_PERMISSION.MICROPHONE, options)
export const request_ios_location_permission = (options) => request_ios_permission(IOS_PERMISSION.LOCATION, options)
export const receive_ios_camera_permission_result = (callback) => receive_ios_permission_result(IOS_PERMISSION.CAMERA, callback)
export const receive_ios_photo_library_permission_result = (callback) => receive_ios_permission_result(IOS_PERMISSION.PHOTO_LIBRARY, callback)
export const receive_ios_microphone_permission_result = (callback) => receive_ios_permission_result(IOS_PERMISSION.MICROPHONE, callback)
export const receive_ios_location_permission_result = (callback) => receive_ios_permission_result(IOS_PERMISSION.LOCATION, callback)

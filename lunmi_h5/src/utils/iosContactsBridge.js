import { storeGlobal } from '@/stores/store'
import {
  create_ios_request_id,
  receive_ios_message,
  send_ios_message,
  subscribe_ios_message
} from './iosBridge.js'
import {
  IOS_CONTACTS_MAXIMUM_COUNT,
  IOS_CONTACTS_RECEIVER_NAME,
  IOS_CONTACTS_REQUEST_HANDLER_NAME,
  IOS_MESSAGE_TYPE
} from './iosMessageTypes.js'

let active_request_id = ''
let legacy_receiver_registered = false

const parse_payload = (payload) => {
  if (typeof payload !== 'string') return payload
  try {
    let parsed = JSON.parse(payload)
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    return parsed
  } catch {
    return null
  }
}

const normalize_contacts_result = (payload) => {
  const parsed = parse_payload(payload)
  const result = Array.isArray(parsed) ? { contacts: parsed } : parsed
  const nested = result?.result && typeof result.result === 'object' ? result.result : null
  const contacts = [result?.contacts, result?.data, result?.items, nested?.contacts, nested?.data]
    .find((value) => Array.isArray(value))
  const raw_status = result?.permission_status
    ?? result?.permissionStatus
    ?? result?.authorization_status
    ?? result?.authorizationStatus
    ?? result?.status
    ?? nested?.permission_status
    ?? nested?.permissionStatus
  const status_key = typeof raw_status === 'number'
    ? raw_status
    : String(raw_status || '').trim().toLowerCase()
  const permission_status = [3, 'authorized', 'authorization', 'full', 'granted', 'success'].includes(status_key)
    ? 'granted'
    : [4, 'limited'].includes(status_key)
      ? 'limited'
      : [1, 2, 'denied', 'restricted'].includes(status_key)
        ? 'denied'
        : contacts
          ? 'granted'
          : 'unavailable'
  const success_value = result?.success ?? nested?.success
  const success = typeof success_value === 'boolean'
    ? success_value && ['granted', 'limited'].includes(permission_status)
    : ['granted', 'limited'].includes(permission_status) && Boolean(contacts)
  return {
    request_id: String(result?.requestId || result?.request_id || nested?.requestId || nested?.request_id || ''),
    success,
    permission_status,
    contacts: Array.isArray(contacts) ? contacts : [],
    ...((result?.error || nested?.error) ? { error: String(result?.error || nested?.error) } : {})
  }
}

const ensure_legacy_receiver = () => {
  if (legacy_receiver_registered || typeof window === 'undefined') return
  window[IOS_CONTACTS_RECEIVER_NAME] = (payload) => {
    const result = normalize_contacts_result(payload)
    receive_ios_message({
      type: IOS_MESSAGE_TYPE.CONTACTS_PERMISSION_RESULT,
      data: { ...result, requestId: result.request_id || active_request_id }
    })
  }
  legacy_receiver_registered = true
}

export const request_ios_contacts = ({ open_settings = false } = {}) => {
  ensure_legacy_receiver()
  active_request_id = create_ios_request_id('contacts_permission')
  const data = {
    requestId: active_request_id,
    permission: 'contacts',
    openSettings: Boolean(open_settings),
    fields: ['identifier', 'givenName', 'familyName', 'phoneNumbers'],
    maximumContacts: IOS_CONTACTS_MAXIMUM_COUNT
  }
  return send_ios_message(IOS_MESSAGE_TYPE.CONTACTS_PERMISSION_REQUEST, data, {
    fallback_handler_name: IOS_CONTACTS_REQUEST_HANDLER_NAME,
    fallback_payload: {
      callback: IOS_CONTACTS_RECEIVER_NAME,
      openSettings: data.openSettings,
      fields: data.fields,
      maximumContacts: data.maximumContacts
    }
  })
}

export const receive_ios_contacts = (on_contacts) => {
  if (typeof window === 'undefined' || typeof on_contacts !== 'function') return null
  ensure_legacy_receiver()
  return subscribe_ios_message(IOS_MESSAGE_TYPE.CONTACTS_PERMISSION_RESULT, (message) => {
    const result = normalize_contacts_result(message.data)
    if (result.request_id && active_request_id && result.request_id !== active_request_id) return
    active_request_id = ''
    storeGlobal().setAuthRecord('contacts', ['granted', 'limited'].includes(result.permission_status))
    on_contacts(result)
  })
}

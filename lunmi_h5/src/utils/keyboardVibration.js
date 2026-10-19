import { send_ios_message } from './iosBridge.js'
import {
  IOS_HAPTIC_HANDLER_NAME,
  IOS_MESSAGE_TYPE
} from './iosMessageTypes.js'

export { request_ios_contacts, receive_ios_contacts } from './iosContactsBridge.js'
export {
  request_ios_camera_permission,
  receive_ios_camera_permission_result,
  request_ios_contacts_permission,
  receive_ios_contacts_permission_result,
  request_ios_face_id_permission,
  receive_ios_face_id_permission_result,
  request_ios_location_permission,
  receive_ios_location_permission_result,
  request_ios_microphone_permission,
  receive_ios_microphone_permission_result,
  request_ios_photo_library_permission,
  receive_ios_photo_library_permission_result,
  ensure_ios_permission,
  ensure_ios_permissions
} from './iosPermissionBridge.js'
export {
  IOS_SHARE_APP_ICON,
  IOS_SHARE_APP_NAME,
  open_ios_share_activity
} from './iosShareBridge.js'
export {
  IOS_CAMERA_PERMISSION_REQUEST_HANDLER_NAME,
  IOS_CAMERA_PERMISSION_RESULT_RECEIVER_NAME,
  IOS_CONTACTS_MAXIMUM_COUNT,
  IOS_CONTACTS_RECEIVER_NAME,
  IOS_CONTACTS_REQUEST_HANDLER_NAME,
  IOS_FACE_ID_PERMISSION_REQUEST_HANDLER_NAME,
  IOS_FACE_ID_PERMISSION_RESULT_RECEIVER_NAME,
  IOS_HAPTIC_HANDLER_NAME,
  IOS_LOCATION_PERMISSION_REQUEST_HANDLER_NAME,
  IOS_LOCATION_PERMISSION_RESULT_RECEIVER_NAME,
  IOS_MICROPHONE_PERMISSION_REQUEST_HANDLER_NAME,
  IOS_MICROPHONE_PERMISSION_RESULT_RECEIVER_NAME,
  IOS_PHOTO_LIBRARY_PERMISSION_REQUEST_HANDLER_NAME,
  IOS_PHOTO_LIBRARY_PERMISSION_RESULT_RECEIVER_NAME,
  IOS_SHARE_ACTIVITY_HANDLER_NAME
} from './iosMessageTypes.js'

export const KEYBOARD_HAPTIC_STYLE = 'selection'

export const perform_ios_haptic = (style = 'heavy') => send_ios_message(
  IOS_MESSAGE_TYPE.HAPTIC_REQUEST,
  { style },
  {
    fallback_handler_name: IOS_HAPTIC_HANDLER_NAME,
    fallback_payload: style
  }
)

export const vibrate_on_keyboard_input = () => perform_ios_haptic(KEYBOARD_HAPTIC_STYLE)

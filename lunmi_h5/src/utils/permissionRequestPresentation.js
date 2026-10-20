import { IOS_PERMISSION } from './iosMessageTypes.js'

export const PERMISSION_REQUEST_DEFINITIONS = Object.freeze({
  microphone: {
    title: '“Lunmi” Would Like to Access the Microphone',
    description: 'Speak in voice rooms. You join muted, and nothing is recorded.',
    deny_label: 'Deny',
    can_allow: true,
    bridge_permission: IOS_PERMISSION.MICROPHONE,
    reason: 'Speak in voice rooms. You join muted, and nothing is recorded.'
  },
  notifications: {
    title: '“Lunmi” Would Like to Send You Notifications',
    description: 'Be told when your lantern is scooped, someone replies, or a wish you blessed comes true.',
    deny_label: "Don't Allow",
    can_allow: true,
    bridge_permission: '',
    reason: ''
  },
  location: {
    title: 'Allow “Lunmi” to Use Your Location?',
    description: 'Use your location to recommend lanterns from your area when you select Nearby.',
    deny_label: 'Deny',
    can_allow: true,
    bridge_permission: IOS_PERMISSION.LOCATION,
    reason: 'Use your location to recommend lanterns from your area when you select Nearby.'
  },
  photos: {
    title: '“Lunmi” Would Like to Access Your Photos',
    description: 'Attach a photo to the lantern or wish you are releasing. Lunmi never reads your library in the background.',
    deny_label: 'Deny',
    can_allow: true,
    bridge_permission: IOS_PERMISSION.PHOTO_LIBRARY,
    reason: 'Attach a photo to the lantern or wish you are releasing.'
  },
  camera: {
    title: '“Lunmi” Would Like to Access the Camera',
    description: 'Take a photo for your lantern, wish or profile.',
    deny_label: 'Deny',
    can_allow: true,
    bridge_permission: IOS_PERMISSION.CAMERA,
    reason: 'Take a photo for your lantern, wish or profile.'
  }
})

const unavailable_permission = Object.freeze({
  title: 'This permission is unavailable',
  description: 'Choose microphone, notifications, location, photos, or camera.',
  deny_label: 'Go back',
  can_allow: false,
  bridge_permission: '',
  reason: ''
})

export const read_permission_request_definition = (permission_key = '') => (
  PERMISSION_REQUEST_DEFINITIONS[`${permission_key || ''}`.trim()] || unavailable_permission
)

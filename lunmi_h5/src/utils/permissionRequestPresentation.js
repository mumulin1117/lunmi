import { IOS_PERMISSION } from './iosMessageTypes.js'

export const PERMISSION_REQUEST_DEFINITIONS = Object.freeze({
  microphone: {
    title: 'Microphone',
    description: 'Speak in voice rooms. You join muted, and nothing is recorded.',
    bridge_permission: IOS_PERMISSION.MICROPHONE,
    reason: 'Speak in voice rooms. You join muted, and nothing is recorded.'
  },
  notifications: {
    title: 'Notifications',
    description: 'Be told when your lantern is scooped, someone replies, or a wish you blessed comes true.',
    bridge_permission: '',
    reason: ''
  },
  location: {
    title: 'Nearby lanterns',
    description: 'Use your location to recommend lanterns from your area when you select Nearby.',
    prompt_note: 'You choose whether to allow access in the next iOS prompt.',
    settings_title: 'Location access is off',
    settings_description: 'Location access is off. You can change it in Settings, or keep using All lanterns.',
    bridge_permission: IOS_PERMISSION.LOCATION,
    reason: 'Use your location to recommend lanterns from your area when you select Nearby.'
  },
  photos: {
    title: 'Photos',
    description: 'Attach a photo to the lantern or wish you are releasing. Lunmi never reads your library in the background.',
    bridge_permission: IOS_PERMISSION.PHOTO_LIBRARY,
    reason: 'Attach a photo to the lantern or wish you are releasing.'
  },
  camera: {
    title: 'Camera',
    description: 'Take a photo for your lantern, wish or profile.',
    bridge_permission: IOS_PERMISSION.CAMERA,
    reason: 'Take a photo for your lantern, wish or profile.'
  }
})

const unavailable_permission = Object.freeze({
  title: 'This permission is unavailable',
  description: 'Choose microphone, notifications, location, photos, or camera.',
  bridge_permission: '',
  reason: ''
})

export const read_permission_request_definition = (permission_key = '') => (
  PERMISSION_REQUEST_DEFINITIONS[`${permission_key || ''}`.trim()] || unavailable_permission
)

import { IOS_PERMISSION } from './iosMessageTypes.js'

export const PERMISSION_RECORD_PAGE_PATH = '/pages/profile/permission-records/index'
const SETTINGS_PAGE_PATH = '/pages/profile/settings'

export const PERMISSION_RECORD_ROWS = Object.freeze([
  {
    key: 'microphone',
    bridge: IOS_PERMISSION.MICROPHONE,
    title: 'Microphone',
    copy: 'Speak in voice rooms. You join muted, and nothing is recorded.',
    icon: '/static/icon/voice_room_microphone.png'
  },
  {
    key: 'location',
    bridge: IOS_PERMISSION.LOCATION,
    title: 'Location',
    copy: 'Show lanterns near the city you choose. Precise location stays private.',
    icon: '/static/icon/profile_location.png'
  },
  {
    key: 'camera',
    bridge: IOS_PERMISSION.CAMERA,
    title: 'Camera',
    copy: 'Take a photo for a lantern, a wish, or a video call.',
    icon: '/static/icon/profile_camera.png'
  },
  {
    key: 'album',
    bridge: IOS_PERMISSION.PHOTO_LIBRARY,
    title: 'Photos',
    copy: 'Attach a photo from your library. Lunmi does not read it in the background.',
    icon: '/static/icon/release_lantern_photo.png'
  }
])

const safe_page = (value) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  if (!path.startsWith('/pages/') || path.includes('..')) return SETTINGS_PAGE_PATH
  return path
}

export const read_permission_source = (query = {}) => safe_page(query.sourcePage)

export const permission_status_label = (state) => ({
  granted: 'Allowed',
  not_granted: 'Not allowed',
  requesting: 'Requesting...',
  denied: 'Denied',
  permanent: 'Blocked',
  failure: 'Unable to check'
}[state] || 'Not allowed')

export const next_permission_state = (result = {}) => {
  if (result.cancelled) return { state: 'denied', granted: false, notice: 'denied' }
  if (result.permanent) return { state: 'permanent', granted: false, notice: 'permanent' }
  if (result.granted === true && result.permission_status === 'granted') {
    return { state: 'granted', granted: true, notice: '' }
  }
  if (result.permission_status === 'denied') return { state: 'denied', granted: false, notice: 'denied' }
  return { state: 'failure', granted: null, notice: '' }
}

export const permission_notice_copy = (title, kind) => {
  if (kind === 'permanent') {
    return {
      title: `${title} stays blocked`,
      message: `${title} access is blocked for Lunmi and cannot be requested again from here.`
    }
  }
  if (kind === 'kept') {
    return {
      title: `${title} stays allowed`,
      message: 'Lunmi cannot turn this system permission off. The switch stays on while access is still allowed.'
    }
  }
  return {
    title: `${title} access is needed`,
    message: `Allow ${title} when Lunmi asks, so this part of the app can work.`
  }
}

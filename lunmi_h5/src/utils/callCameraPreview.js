import { ensure_ios_permission } from './iosPermissionBridge.js'

const stop_stream = (stream) => stream?.getTracks?.().forEach((track) => track.stop())

const request_camera_stream = async (facing) => {
  const permission = await ensure_ios_permission('camera', {
    reason: 'Allow this app to use the camera for video calls.'
  })
  if (!permission.granted && !permission.unavailable) {
    const error = new Error('Camera permission is required to start the video call.')
    error.name = 'NotAllowedError'
    throw error
  }
  const facing_mode = facing === 'back' ? 'environment' : 'user'
  const attempts = [
    {
      video: {
        facingMode: { ideal: facing_mode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 }
      },
      audio: false
    },
    { video: { facingMode: { ideal: facing_mode } }, audio: false },
    { video: true, audio: false }
  ]
  let last_error = null
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (stream?.getVideoTracks?.().length > 0) return stream
      stop_stream(stream)
      last_error = new Error('A camera track is required.')
    } catch (error) {
      last_error = error
      if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError', 'AbortError'].includes(error?.name)) throw error
    }
  }
  throw last_error || new Error('Unable to open the camera.')
}

const attach_stream = async (host_id, stream, facing) => {
  if (typeof document === 'undefined') return
  const host = document.getElementById(host_id)
  if (!host) throw new Error('Camera preview is unavailable.')
  host.replaceChildren()
  const video = document.createElement('video')
  video.autoplay = true
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.setAttribute('aria-label', facing === 'front' ? 'Front camera preview' : 'Back camera preview')
  video.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;transform:${facing === 'front' ? 'scaleX(-1)' : 'none'};`
  video.srcObject = stream
  host.appendChild(video)
  try {
    await video.play()
  } catch {
    throw new Error('Unable to start the camera preview.')
  }
}

const remove_preview = (host_id) => {
  if (typeof document === 'undefined') return
  const host = document.getElementById(host_id)
  const video = host?.querySelector?.('video')
  if (video) video.srcObject = null
  host?.replaceChildren?.()
}

export const create_call_camera_preview = ({ host_id } = {}) => {
  let stream = null
  let current_facing = 'front'
  let generation = 0
  let disposed = false

  const open = async (facing = 'front') => {
    if (disposed || !globalThis.navigator?.mediaDevices?.getUserMedia) {
      throw new Error('Unable to open the camera on this device.')
    }
    const token = ++generation
    stop_stream(stream)
    stream = null
    remove_preview(host_id)
    const next_stream = await request_camera_stream(facing)
    if (disposed || token !== generation) {
      stop_stream(next_stream)
      throw new DOMException('Camera preview cancelled.', 'AbortError')
    }
    try {
      await attach_stream(host_id, next_stream, facing)
    } catch (error) {
      stop_stream(next_stream)
      throw error
    }
    stream = next_stream
    current_facing = facing
    return { success: true, facing: current_facing }
  }

  const switch_camera = async () => open(current_facing === 'front' ? 'back' : 'front')

  const stop = () => {
    generation += 1
    stop_stream(stream)
    stream = null
    remove_preview(host_id)
  }

  return { open, switch_camera, stop }
}

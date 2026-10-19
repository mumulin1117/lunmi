import { has_ios_message_handler, send_ios_message } from './iosBridge.js'
import { IOS_MESSAGE_TYPE } from './iosMessageTypes.js'

let delivered_launch_id = ''

// Only the initial, mounted page dismisses the native cover. Business requests
// and looping videos do not block it; local images, posters and fonts do.
export const observe_native_launch_ready = (root) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}
  const launch_id = window.LunmiNativeConfiguration?.APP_LAUNCH_ID
  if (!launch_id || launch_id === delivered_launch_id || !root || !has_ios_message_handler()) return () => {}
  const entry_hash = window.location.hash
  let stopped = false
  let frame_id = null
  let timeout_id = null
  const cleanups = []
  const dispose = () => {
    stopped = true
    window.cancelAnimationFrame(frame_id)
    window.clearTimeout(timeout_id)
    cleanups.splice(0).forEach(cleanup => cleanup())
  }
  const is_current = () => !stopped && root.isConnected && window.location.hash === entry_hash
  const is_painted = () => {
    const bounds = root.getBoundingClientRect()
    const style = window.getComputedStyle(root)
    return bounds.width > 0 && bounds.height > 0 && style.display !== 'none'
      && style.visibility === 'visible' && Number(style.opacity) >= 0.99
      && Math.abs(bounds.left) < 1 && Math.abs(bounds.top) < 1
      && !root.closest('[aria-hidden="true"]')
  }
  const wait_for_image = (image) => new Promise(resolve => {
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      image.removeEventListener('load', finish)
      image.removeEventListener('error', finish)
      resolve()
    }
    cleanups.push(finish)
    image.addEventListener('load', finish, { once: true })
    image.addEventListener('error', finish, { once: true })
    if (image.complete) finish()
  }).then(() => image.naturalWidth > 0 ? image.decode?.().catch(() => {}) : undefined)
  const is_local = (src) => {
    try {
      const url = new URL(src, window.location.href)
      return url.protocol === window.location.protocol && url.host === window.location.host
    } catch { return false }
  }
  const notify_after_paint = (frames_remaining = 2) => {
    if (!is_current()) return dispose()
    if (!is_painted()) {
      frame_id = window.requestAnimationFrame(() => notify_after_paint(2))
      return
    }
    if (frames_remaining > 0) {
      frame_id = window.requestAnimationFrame(() => notify_after_paint(frames_remaining - 1))
      return
    }
    if (launch_id !== delivered_launch_id && send_ios_message(IOS_MESSAGE_TYPE.CONTENT_READY, { launchId: launch_id })) {
      delivered_launch_id = launch_id
    }
    dispose()
  }
  frame_id = window.requestAnimationFrame(() => {
    if (!is_current()) return dispose()
    const images = [...root.querySelectorAll('img')].filter(image => is_local(image.currentSrc || image.src))
    const posters = [...root.querySelectorAll('video[poster]')].map(video => video.poster).filter(is_local)
    for (const poster of new Set(posters)) {
      const image = new Image()
      image.src = poster
      images.push(image)
    }
    const resources = Promise.allSettled([
      ...images.map(wait_for_image),
      document.fonts?.ready
    ])
    // Missing assets must not leave the user on a permanent splash screen.
    const deadline = new Promise(resolve => { timeout_id = window.setTimeout(resolve, 3000) })
    Promise.race([resources, deadline]).then(() => {
      window.clearTimeout(timeout_id)
      cleanups.splice(0).forEach(cleanup => cleanup())
      notify_after_paint()
    })
  })
  return dispose
}

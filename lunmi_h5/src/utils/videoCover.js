const revoke_url = (url = '') => {
  if (String(url).startsWith('blob:') && typeof URL !== 'undefined') URL.revokeObjectURL(url)
}

export const create_video_second_cover_blob = (file) => new Promise((resolve, reject) => {
  if (!(file instanceof Blob) || typeof document === 'undefined' || typeof URL === 'undefined') {
    reject(new Error('Video cover generation is unavailable in this runtime.'))
    return
  }

  const video = document.createElement('video')
  const video_url = URL.createObjectURL(file)
  let is_complete = false
  let is_capture_started = false
  let target_time = 0
  let timeout_id = null

  const cleanup = () => {
    if (timeout_id) clearTimeout(timeout_id)
    video.pause()
    video.removeAttribute('src')
    video.remove()
    video.load()
    revoke_url(video_url)
  }

  const finish = (callback) => {
    if (is_complete) return
    is_complete = true
    cleanup()
    callback()
  }

  const capture_frame = () => {
    if (is_capture_started || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
    is_capture_started = true

    const canvas = document.createElement('canvas')
    const source_width = video.videoWidth || 720
    const source_height = video.videoHeight || 1280
    const scale = Math.min(1, 1280 / source_width)
    canvas.width = Math.max(1, Math.round(source_width * scale))
    canvas.height = Math.max(1, Math.round(source_height * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      finish(() => reject(new Error('Unable to generate a video cover.')))
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (blob) finish(() => resolve(blob))
      else finish(() => reject(new Error('Unable to generate a video cover.')))
    }, 'image/jpeg', 0.88)
  }

  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;'
  video.onloadedmetadata = () => {
    target_time = Math.min(2, Math.max(0, (Number(video.duration) || 0) - 0.1))
    if (target_time <= 0) capture_frame()
    else video.currentTime = target_time
  }
  video.onloadeddata = () => {
    if (target_time <= 0) capture_frame()
  }
  video.oncanplay = () => {
    if (target_time <= 0) capture_frame()
  }
  video.onseeked = capture_frame
  video.onerror = () => finish(() => reject(new Error('Unable to read this video file.')))

  document.body.appendChild(video)
  timeout_id = setTimeout(() => finish(() => reject(new Error('Generating the video cover timed out.'))), 12000)
  video.src = video_url
  video.load()
})

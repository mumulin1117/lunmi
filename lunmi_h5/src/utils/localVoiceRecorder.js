import { ensure_ios_permission } from './iosPermissionBridge.js'

export const VOICE_RECORDING_LIMIT_MS = 60000

const stop_stream = (stream) => stream?.getTracks?.().forEach((track) => track.stop())

const audio_mime_type = (file_path = '') => {
  const extension = String(file_path).split(/[?#]/)[0].split('.').pop().toLowerCase()
  if (extension === 'aac') return 'audio/aac'
  if (extension === 'mp3') return 'audio/mpeg'
  if (extension === 'wav') return 'audio/wav'
  if (['m4a', 'mp4'].includes(extension)) return 'audio/mp4'
  return 'audio/mp4'
}

const array_buffer_blob = (value, type) => {
  if (value instanceof ArrayBuffer) return new Blob([value], { type })
  if (ArrayBuffer.isView(value)) {
    return new Blob([value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)], { type })
  }
  return null
}

const read_temporary_audio_blob = async (result = {}) => {
  if (result.audio_blob instanceof Blob && result.audio_blob.size) return result.audio_blob
  const direct_blob = array_buffer_blob(result.arrayBuffer || result.data, audio_mime_type(result.tempFilePath))
  if (direct_blob?.size) return direct_blob
  const file_path = String(result.tempFilePath || '').trim()
  if (!file_path) throw new Error('The recorder did not return an audio file.')

  if (/^(blob:|data:|https?:)/i.test(file_path) && typeof fetch === 'function') {
    const response = await fetch(file_path)
    if (!response.ok && response.status) throw new Error('Unable to read the recorded audio file.')
    const blob = await response.blob()
    if (blob.size) return blob.type ? blob : new Blob([blob], { type: audio_mime_type(file_path) })
  }

  const file_system = typeof globalThis.uni?.getFileSystemManager === 'function'
    ? globalThis.uni.getFileSystemManager()
    : null
  if (file_system?.readFile) {
    const data = await new Promise((resolve, reject) => file_system.readFile({
      filePath: file_path,
      success: (response) => resolve(response?.data),
      fail: (error) => reject(new Error(error?.errMsg || 'Unable to read the recorded audio file.'))
    }))
    const blob = array_buffer_blob(data, audio_mime_type(file_path))
    if (blob?.size) return blob
  }

  if (typeof fetch === 'function') {
    const response = await fetch(file_path)
    if (!response.ok && response.status) throw new Error('Unable to read the recorded audio file.')
    const blob = await response.blob()
    if (blob.size) return blob.type ? blob : new Blob([blob], { type: audio_mime_type(file_path) })
  }
  throw new Error('Unable to read the recorded audio file.')
}

const create_web_recorder = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  if (!stream?.getAudioTracks?.().length) {
    stop_stream(stream)
    throw new Error('No audio input is available.')
  }

  const recorder = new MediaRecorder(stream)
  const chunks = []
  let discarded = false
  let settled = false
  let stop_resolve = null
  let stop_reject = null
  let stop_promise = null

  const settle = (callback, value) => {
    if (settled) return
    settled = true
    stop_stream(stream)
    callback?.(value)
  }
  const ensure_stop_promise = () => {
    if (!stop_promise) {
      stop_promise = new Promise((resolve, reject) => {
        stop_resolve = resolve
        stop_reject = reject
      })
    }
    return stop_promise
  }

  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data)
  }
  recorder.onerror = () => {
    const pending = ensure_stop_promise()
    settle(stop_reject, new Error('Unable to record audio.'))
    return pending
  }
  recorder.onstop = () => {
    if (discarded) {
      settle(stop_resolve, null)
      return
    }
    const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/mp4' })
    if (!blob.size) {
      settle(stop_reject, new Error('The recording did not contain audio data.'))
      return
    }
    settle(stop_resolve, blob)
  }

  recorder.start(250)
  return {
    stop: async () => {
      const pending = ensure_stop_promise()
      if (recorder.state !== 'inactive') recorder.stop()
      return pending
    },
    cancel: async () => {
      discarded = true
      const pending = ensure_stop_promise()
      if (recorder.state !== 'inactive') recorder.stop()
      await pending.catch(() => null)
    }
  }
}

const create_uni_recorder = async () => {
  const manager = typeof globalThis.uni?.getRecorderManager === 'function'
    ? globalThis.uni.getRecorderManager()
    : null
  if (!manager?.start || !manager?.stop) throw new Error('Recording is not available on this device.')

  let discarded = false
  let settled = false
  let stop_resolve = null
  let stop_reject = null
  let stop_promise = null
  const cleanup_handlers = () => {
    manager.offStop?.(handle_stop)
    manager.offError?.(handle_error)
  }
  const settle = (callback, value) => {
    if (settled) return
    settled = true
    cleanup_handlers()
    callback?.(value)
  }
  const ensure_stop_promise = () => {
    if (!stop_promise) {
      stop_promise = new Promise((resolve, reject) => {
        stop_resolve = resolve
        stop_reject = reject
      })
    }
    return stop_promise
  }
  const handle_stop = async (result = {}) => {
    if (discarded) {
      settle(stop_resolve, null)
      return
    }
    try {
      settle(stop_resolve, await read_temporary_audio_blob(result))
    } catch (error) {
      settle(stop_reject, error)
    }
  }
  const handle_error = (error) => {
    settle(stop_reject, new Error(error?.errMsg || 'Unable to record audio.'))
  }

  manager.onStop(handle_stop)
  manager.onError(handle_error)
  try {
    manager.start({
      duration: VOICE_RECORDING_LIMIT_MS,
      sampleRate: 44100,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'aac'
    })
  } catch (error) {
    cleanup_handlers()
    throw error
  }

  return {
    stop: async () => {
      const pending = ensure_stop_promise()
      try { manager.stop() } catch (error) { settle(stop_reject, error) }
      return pending
    },
    cancel: async () => {
      discarded = true
      const pending = ensure_stop_promise()
      try { manager.stop() } catch { settle(stop_resolve, null) }
      await pending.catch(() => null)
    }
  }
}

export const start_local_voice_recording = async () => {
  const permission = await ensure_ios_permission('microphone', {
    reason: 'Allow this app to use the microphone for voice posts.'
  })
  if (!permission.granted && !permission.unavailable) {
    throw new Error('Microphone permission is required to record audio.')
  }
  if (
    typeof globalThis.navigator !== 'undefined'
    && navigator.mediaDevices?.getUserMedia
    && typeof globalThis.MediaRecorder !== 'undefined'
  ) return create_web_recorder()
  return create_uni_recorder()
}

const CALL_SOUND_PATHS = Object.freeze({
  video: '/static/assets/call-waiting-video.wav',
  audio: '/static/assets/call-waiting-voice.mp3',
  ended: '/static/assets/call-ended.wav'
})

const dispose_audio = (context) => {
  if (!context) return
  try {
    context.stop?.()
  } catch {}
  try {
    context.destroy?.()
  } catch {}
}

const create_audio = ({ src, loop, volume }) => {
  if (typeof uni === 'undefined' || typeof uni.createInnerAudioContext !== 'function') return null
  const context = uni.createInnerAudioContext()
  context.src = src
  context.loop = loop
  context.volume = volume
  return context
}

export const create_call_sound_controller = () => {
  let waiting_audio = null
  let ended_audio = null

  const stop_waiting = () => {
    dispose_audio(waiting_audio)
    waiting_audio = null
  }

  const stop_ended = () => {
    dispose_audio(ended_audio)
    ended_audio = null
  }

  const start_waiting = (call_mode) => {
    stop_waiting()
    const context = create_audio({
      src: call_mode === 'audio' ? CALL_SOUND_PATHS.audio : CALL_SOUND_PATHS.video,
      loop: true,
      volume: 0.55
    })
    if (!context) return false
    waiting_audio = context
    context.onError?.(() => {
      if (waiting_audio !== context) return
      dispose_audio(context)
      waiting_audio = null
    })
    try {
      context.play()
      return true
    } catch {
      stop_waiting()
      return false
    }
  }

  const play_ended = () => {
    stop_waiting()
    stop_ended()
    const context = create_audio({ src: CALL_SOUND_PATHS.ended, loop: false, volume: 0.7 })
    if (!context) return false
    ended_audio = context
    const dispose_current = () => {
      if (ended_audio !== context) return
      dispose_audio(context)
      ended_audio = null
    }
    context.onEnded?.(dispose_current)
    context.onError?.(dispose_current)
    try {
      context.play()
      return true
    } catch {
      dispose_current()
      return false
    }
  }

  const stop_all = () => {
    stop_waiting()
    stop_ended()
  }

  return { start_waiting, stop_waiting, play_ended, stop_all }
}

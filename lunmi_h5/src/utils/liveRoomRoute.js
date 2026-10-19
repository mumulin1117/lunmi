export const LIVE_CLASSIFY_VIDEO = 1
export const LIVE_CLASSIFY_VOICE = 2

export const is_video_live_room = (room = {}) => (
  Number(room?.liveClassify) === LIVE_CLASSIFY_VIDEO
)

export const live_room_page_url = ({
  live_id = '',
  live_password = '',
  live_classify = LIVE_CLASSIFY_VOICE
} = {}) => {
  const path = Number(live_classify) === LIVE_CLASSIFY_VIDEO
    ? '/pages/live-room/video'
    : '/pages/live-room/detail'
  const query = [`live_id=${encodeURIComponent(live_id || '')}`]
  if (live_password) query.push(`live_password=${encodeURIComponent(live_password)}`)
  return `${path}?${query.join('&')}`
}

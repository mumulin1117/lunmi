export const HOME_PAGE_PATH = '/pages/home/index'
export const VOICE_ROOM_LIST_PATH = '/pages/live-room/list'
export const VOICE_ROOM_DETAIL_PATH = '/pages/live-room/detail'
export const VIDEO_ROOM_PATH = '/pages/live-room/video'
export const LIVE_STATUS_ACTIVE = 1
export const LIVE_CLASSIFY_VIDEO = 1
export const NEW_ROOM_WINDOW_MS = 12 * 60 * 60 * 1000
export const MAX_ROOM_USER_AVATARS = 3

const COVER_SCENES = [
  '/static/icon/lantern_detail_scene.png',
  '/static/icon/wish_tree_scene.png',
  '/static/icon/lantern_home_scene.png',
  '/static/icon/lantern_release_scene.png'
]

export const build_select_voice_rooms_params = ({ current = 1, size = 20 } = {}) => ({
  // liveStatus: LIVE_STATUS_ACTIVE,
  selectType: 1,
  current,
  size
})

export const read_live_page_records = (data) => {
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data)) return data
  return []
}

export const read_live_page_has_more = (data, { current = 1, size = 20, count = 0 } = {}) => {
  const pages = Number(data?.pages)
  if (Number.isFinite(pages) && pages > 0) return current < pages
  const total = Number(data?.total)
  if (Number.isFinite(total) && total >= 0) return current * size < total
  return count >= size
}

const read_host_id = (room) => `${room?.userId || room?.liveUserId || room?.createUserId || ''}`

const cover_for_room = (room_id) => {
  const digits = `${room_id}`.replace(/\D/g, '')
  const index = Number(digits || 0) % COVER_SCENES.length
  return COVER_SCENES[index]
}

const map_room_users = (user_list) => (
  (Array.isArray(user_list) ? user_list : [])
    .filter((user) => user && typeof user === 'object' && !Array.isArray(user))
    .slice(0, MAX_ROOM_USER_AVATARS)
    .map((user) => ({
      room_user_id: `${user.liveUserId ?? ''}`,
      user_id: `${user.userId ?? ''}`,
      user_name: `${user.userName || ''}`.trim(),
      avatar_url: `${user.userImgUrl || ''}`.trim()
    }))
)

export const map_voice_room = (room, { current_user_id = '', now = Date.now() } = {}) => {
  const room_id = `${room?.liveId || ''}`
  if (!room_id) return null
  const started_at = Date.parse(room?.liveTime || '')
  const is_new = Number.isFinite(started_at) && now - started_at >= 0 && now - started_at <= NEW_ROOM_WINDOW_MS
  const host_id = read_host_id(room)
  return {
    room_id,
    title: `${room?.liveTitle || ''}`.trim() || 'Voice room',
    host_id,
    host_name: `${room?.userName || ''}`.trim(),
    host_avatar: `${room?.userImgUrl || ''}`.trim(),
    room_users: map_room_users(room?.userList),
    listener_count: Math.max(0, Number(room?.liveUserNum) || 0),
    cover_src: cover_for_room(room_id),
    is_new,
    badge_label: is_new ? 'NEW' : 'LIVE',
    is_mine: Boolean(host_id) && host_id === `${current_user_id || ''}`,
    is_video: Number(room?.liveClassify) === LIVE_CLASSIFY_VIDEO
  }
}

export const map_voice_rooms = (data, options = {}) => (
  read_live_page_records(data)
    .map((room) => map_voice_room(room, options))
    .filter(Boolean)
)

export const read_voice_room_source = (value) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  if (!path.startsWith('/pages/') || path.includes('..')) return HOME_PAGE_PATH
  return path
}

export const build_voice_room_list_url = (source_page = HOME_PAGE_PATH) => (
  `${VOICE_ROOM_LIST_PATH}?sourcePage=${encodeURIComponent(source_page || HOME_PAGE_PATH)}`
)

export const build_voice_room_detail_url = (room, source_page = VOICE_ROOM_LIST_PATH) => {
  const room_id = `${room?.room_id || ''}`
  const params = [
    `roomId=${encodeURIComponent(room_id)}`,
    `live_id=${encodeURIComponent(room_id)}`
  ]
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  return `${VOICE_ROOM_DETAIL_PATH}?${params.join('&')}`
}

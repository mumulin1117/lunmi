export const VOICE_ROOM_LIST_PATH = '/pages/live-room/list'
export const SEAT_COUNT = 4
export const ROOM_NOTICE = 'Voice only. Keep it kind — reports are reviewed within 24 hours.'
export const ROOM_COVER = '/static/icon/lantern_detail_scene.png'

export const read_room_cover = (room = {}) => `${room.liveCoverImg || ''}`.trim() || ROOM_COVER

export const read_voice_room_id = (query = {}) => `${query.roomId || query.live_id || query.liveId || ''}`.trim()

export const read_voice_room_password = (query = {}) => `${query.live_password || query.livePassword || ''}`.trim()

export const read_voice_room_source = (value) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  if (!path.startsWith('/pages/') || path.includes('..')) return VOICE_ROOM_LIST_PATH
  return path
}

export const build_select_live_info_params = ({ room_id = '', live_password = '' } = {}) => {
  const params = { liveId: room_id }
  if (live_password) params.livePassword = live_password
  return params
}

export const build_select_room_users_params = (room_id = '') => ({ liveId: room_id })

export const build_select_room_messages_params = (room_id = '') => ({
  activityId: room_id,
  current: 1,
  size: 20
})

export const build_join_room_params = (room_id = '') => ({ liveId: room_id, addType: 1 })

export const build_leave_room_params = (room_id = '') => ({ liveId: room_id, addType: 2 })

export const build_close_room_params = (room_id = '') => ({ liveId: room_id })

export const read_room_host_id = (room = {}) => `${room.userId || room.liveUserId || room.createUserId || ''}`

export const read_room_listener_count = (room = {}, member_count = 0) => {
  const count = Number(room.liveUserNum)
  if (Number.isFinite(count) && count >= 0) return count
  return member_count
}

export const room_is_active = (room = {}) => {
  if (room.liveStatus === undefined || room.liveStatus === null || room.liveStatus === '') return true
  return Number(room.liveStatus) === 1
}

const map_member = (user) => {
  if (!user || typeof user !== 'object') return null
  const user_id = `${user.userId || ''}`
  if (!user_id) return null
  return {
    user_id,
    user_name: `${user.userName || ''}`.trim() || 'Guest',
    user_name_is_placeholder: !(`${user.userName || ''}`.trim()),
    avatar_url: `${user.userImgUrl || ''}`.trim(),
    is_host: false
  }
}

export const read_room_members = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data?.users)) return data.users
  return []
}

export const build_voice_seats = (room = {}, members = []) => {
  const host_id = read_room_host_id(room)
  const host = {
    user_id: host_id,
    user_name: `${room.userName || ''}`.trim() || 'Host',
    user_name_is_placeholder: !(`${room.userName || ''}`.trim()),
    avatar_url: `${room.userImgUrl || ''}`.trim(),
    is_host: true
  }
  const others = read_room_members(members)
    .map(map_member)
    .filter(Boolean)
    .filter((member) => member.user_id !== host_id)
  const occupied = host_id || room.userName ? [host, ...others] : others
  return Array.from({ length: SEAT_COUNT }, (_, index) => ({
    seat_index: index,
    member: occupied[index] || null
  }))
}

export const voice_room_confirm_copy = (is_host = false) => (
  is_host
    ? {
      title: 'Close this room?',
      copy: 'The room closes for everyone in it right now. This cannot be undone.',
      confirm_label: 'Close room',
      pending_label: 'Closing...',
      confirm_kind: 'danger'
    }
    : {
      title: 'Leave this room?',
      copy: 'You will stop listening. You can join again while the room is still open.',
      confirm_label: 'Leave',
      pending_label: 'Leaving...',
      confirm_kind: 'primary'
    }
)

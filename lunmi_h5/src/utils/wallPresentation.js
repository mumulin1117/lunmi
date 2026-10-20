export const HOME_PAGE_PATH = '/pages/home/index'
export const WALL_PAGE_PATH = '/pages/community/index'
export const WALL_DETAIL_PATH = '/pages/community/detail/index'
export const WALL_CREATE_PATH = '/pages/community/create/index'
export const WALL_USER_PATH = '/pages/community/user/index'

export const read_wall_source = (value) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  if (!path.startsWith('/pages/') || path.includes('..')) return HOME_PAGE_PATH
  return path
}

export const WALL_PAGE_SIZE = 20

export const build_wall_page_params = ({ current = 1, size = WALL_PAGE_SIZE } = {}) => ({
  current,
  size
})

export const read_wall_records = (data) => {
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data)) return data
  return []
}

export const format_wall_clock = (value) => {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return ''
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp))
}

export const map_wall_post = (item) => {
  const post_id = `${item?.dynamicId ?? ''}`
  if (!post_id) return null
  const images = Array.isArray(item.dynamicImgList) ? item.dynamicImgList.filter(Boolean) : []
  const is_video = Number(item.dynamicType) === 3 && Boolean(images[0])
  return {
    post_id,
    author_id: `${item.userId ?? ''}`,
    author_name: `${item.userName || ''}`.trim() || 'Anonymous',
    author_name_is_placeholder: !(`${item.userName || ''}`.trim()),
    author_avatar: `${item.userImgUrl || ''}`.trim(),
    caption: `${item.dynamicContent || item.dynamicTitle || ''}`.trim(),
    place_label: `${item.locationName || item.cityName || ''}`.trim(),
    created_at: item.createDate || item.createdDate || '',
    like_count: Math.max(0, Number(item.praiseNum) || 0),
    comment_count: Math.max(0, Number(item.commentNum) || 0),
    is_liked: Number(item.storeFlag) === 1,
    media_url: images[0] || '',
    media_poster: `${item.videoImgUrl || ''}`.trim(),
    media_type: is_video ? 'video' : (images[0] ? 'image' : '')
  }
}

export const map_wall_posts = (data) => read_wall_records(data).map(map_wall_post).filter(Boolean)

export const wall_place_chip = (post) => {
  const clock = format_wall_clock(post?.created_at)
  const place = `${post?.place_label || ''}`.trim()
  if (place && clock) return `${place} · ${clock}`
  return place || clock
}

export const build_wall_page_url = (source_page = HOME_PAGE_PATH) => (
  `${WALL_PAGE_PATH}?sourcePage=${encodeURIComponent(source_page || HOME_PAGE_PATH)}`
)

export const build_wall_detail_url = (post, source_page = WALL_PAGE_PATH) => {
  const params = [`dynamicId=${encodeURIComponent(post?.post_id || '')}`]
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  return `${WALL_DETAIL_PATH}?${params.join('&')}`
}

export const build_wall_create_url = (source_page = WALL_PAGE_PATH) => (
  `${WALL_CREATE_PATH}?sourcePage=${encodeURIComponent(source_page || WALL_PAGE_PATH)}`
)

export const build_wall_author_url = (post, source_page = WALL_PAGE_PATH) => {
  const author_id = `${post?.author_id || ''}`
  const params = [
    `user_id=${encodeURIComponent(author_id)}`,
    `targetUserId=${encodeURIComponent(author_id)}`
  ]
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  return `${WALL_USER_PATH}?${params.join('&')}`
}

export const build_like_post_params = (post) => ({ dynamicId: post?.post_id })

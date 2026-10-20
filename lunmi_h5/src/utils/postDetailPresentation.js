import { WALL_DETAIL_PATH, WALL_PAGE_PATH, wall_place_chip } from './wallPresentation.js'

export const REPLY_MAX_LENGTH = 200
export const PUBLISH_SUCCESS_PATH = '/pages/publish/success'

const safe_page = (value) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  if (!path.startsWith('/pages/') || path.includes('..')) return ''
  return path
}

export const read_detail_post_id = (query = {}) => `${query.dynamicId || query.post_id || ''}`.trim()

export const read_detail_back = (query = {}) => {
  const return_page = safe_page(query.returnPage)
  if (return_page) return { page: return_page, prefer_relaunch: true }
  const source_page = safe_page(query.sourcePage)
  if (source_page && !source_page.startsWith(PUBLISH_SUCCESS_PATH)) {
    return { page: source_page, prefer_relaunch: false }
  }
  return { page: WALL_PAGE_PATH, prefer_relaunch: false }
}

export const format_post_stamp = (value) => {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return ''
  const date = new Date(timestamp)
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase()
  const clock = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
  return `${month} ${date.getDate()} · ${clock}`
}

const map_comment = (item, index) => {
  const comment_id = `${item?.commentId ?? ''}`
  const content = `${item?.replyContent || item?.commentContent || ''}`.trim()
  if (!comment_id && !content) return null
  return {
    comment_id: comment_id || `pending-local-${index}`,
    author_id: `${item.replyUserId ?? item.userId ?? ''}`,
    author_name: `${item.replyUserName || item.userName || ''}`.trim() || 'Anonymous',
    author_name_is_placeholder: !(`${item.replyUserName || item.userName || ''}`.trim()),
    author_avatar: `${item.replyUserImgUrl || item.userImgUrl || ''}`.trim(),
    content,
    created_at: item.createDate || item.createdDate || '',
    is_pending: !comment_id
  }
}

export const map_post_comments = (list) => (
  (Array.isArray(list) ? list : []).map(map_comment).filter(Boolean)
)

export const map_post_detail = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const post_id = `${data.dynamicId ?? ''}`
  if (!post_id) return null
  const images = Array.isArray(data.dynamicImgList) ? data.dynamicImgList.filter(Boolean) : []
  const is_video = Number(data.dynamicType) === 3 && Boolean(images[0])
  return {
    post_id,
    author_id: `${data.userId ?? ''}`,
    author_name: `${data.userName || ''}`.trim() || 'Anonymous',
    author_name_is_placeholder: !(`${data.userName || ''}`.trim()),
    author_avatar: `${data.userImgUrl || ''}`.trim(),
    caption: `${data.dynamicContent || data.dynamicTitle || ''}`.trim(),
    place_label: `${data.locationName || data.cityName || ''}`.trim(),
    created_at: data.createDate || data.createdDate || '',
    like_count: Math.max(0, Number(data.praiseNum) || 0),
    comment_count: Math.max(0, Number(data.commentNum) || 0),
    is_liked: Number(data.storeFlag) === 1,
    media_url: images[0] || '',
    media_poster: `${data.videoImgUrl || ''}`.trim(),
    media_type: is_video ? 'video' : (images[0] ? 'image' : ''),
    comments: map_post_comments(data.commentVoList)
  }
}

export const post_place_chip = (post) => wall_place_chip(post)

export const build_detail_author_url = (author_id, source_page = WALL_DETAIL_PATH) => {
  const user_id = `${author_id || ''}`
  return [
    `/pages/community/user/index?user_id=${encodeURIComponent(user_id)}`,
    `targetUserId=${encodeURIComponent(user_id)}`,
    `sourcePage=${encodeURIComponent(source_page || WALL_DETAIL_PATH)}`
  ].join('&')
}

export const build_like_detail_params = (post) => ({ dynamicId: post?.post_id })

export const build_reply_params = (post, content) => ({
  dynamicId: post?.post_id,
  replyContent: content
})

export const build_delete_reply_params = (comment) => ({ commentId: comment?.comment_id })

export const is_real_comment_id = (comment) => {
  const comment_id = `${comment?.comment_id || ''}`
  return Boolean(comment_id) && !comment?.is_pending && !comment_id.startsWith('pending-')
}

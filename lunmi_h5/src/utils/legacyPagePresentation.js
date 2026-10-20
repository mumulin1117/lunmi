// Preserve existing legacy page mappings at the API/presentation boundary.
export const map_legacy_discover_comments = (comment_list = [], post_id = '') => comment_list.map((comment, index) => ({
  comment_id: String(comment.commentId ?? comment.comment_id ?? `${post_id}-comment-${index}`),
  user_id: String(comment.replyUserId ?? comment.userId ?? comment.user_id ?? ''),
  user_name: comment.replyUserName || comment.userName || comment.user_name || '',
  user_avatar_url: comment.replyUserImgUrl || comment.userImgUrl || comment.user_avatar_url || '',
  content: comment.replyContent || comment.commentContent || comment.content || comment.dynamicContent || '',
  is_temporary: Boolean(comment.is_temporary),
  created_at: comment.createDate || comment.created_at || new Date().toISOString()
}))

export const map_legacy_video_comments = (items = [], post_id = '') => items.map((item, index) => ({
  comment_id: String(item.commentId ?? item.comment_id ?? `${post_id}-comment-${index}`),
  user_id: String(item.replyUserId ?? item.userId ?? item.user_id ?? ''),
  user_name: item.replyUserName || item.userName || item.user_name || '',
  user_avatar_url: item.replyUserImgUrl || item.userImgUrl || item.user_avatar_url || '',
  content: item.replyContent || item.commentContent || item.content || '',
  is_temporary: Boolean(item.is_temporary),
  created_at: item.createDate || item.created_at || new Date().toISOString()
}))

export const read_legacy_comment_id = (comment, post_id, index) => String(comment.commentId ?? comment.comment_id ?? `${post_id}-comment-${index}`)
export const read_legacy_post_id = (query = {}) => String(query.dynamicId ?? query.post_id ?? '')
export const read_legacy_blocked_user_ids = (users = []) => new Set(users.map((item) => `${item.userId ?? item.user_id}`).filter(Boolean))
export const is_insufficient_gift_balance = (result) => Number(result?.code) === 400007
export const read_legacy_live_room_id = (options = {}) => `${options.live_id || options.liveId || ''}`

export const map_legacy_discover_feed_item = (item) => ({
        ...item,
        post_id: `${item.dynamicId ?? item.post_id ?? ''}`,
        owner_user_id: `${item.userId ?? item.owner_user_id ?? ''}`,
        author_name: item.userName || item.author_name || '',
        author_avatar: item.userImgUrl || item.author_avatar || '',
        content: item.dynamicContent || item.content || '',
        content_type: Number(item.dynamicType) === 3 ? 'video' : (item.dynamicType === 2 ? 'audio' : 'image'),
        media_url: Array.isArray(item.dynamicImgList) ? item.dynamicImgList.find(Boolean) || '' : item.media_url || '',
        media_urls: Array.isArray(item.dynamicImgList) ? item.dynamicImgList.filter(Boolean) : [],
        like_count: Number(item.praiseNum ?? item.like_count ?? 0),
        comment_count: Number(item.commentNum ?? item.comment_count ?? 0),
        store_count: Number(item.storeNum ?? item.store_count ?? 0)
      })

export const merge_legacy_video_detail = (mapped, data) => ({
    ...mapped,
    ...data,
    post_id: mapped?.post_id || `${data.dynamicId}`,
    owner_user_id: mapped?.owner_user_id || `${data.userId || ''}`,
    author_name: data.userName || '',
    author_avatar: data.userImgUrl || '',
    media_url: mapped?.media_url || '',
    cover_url: mapped?.cover_url || '',
    content: mapped?.content || '',
    content_type: mapped?.content_type || 'image',
    like_count: Number(data.praiseNum || 0),
    comment_count: Number(data.commentNum || 0)
  })

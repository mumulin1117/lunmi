// 资料与关系列表的展示适配；页面直接调用 common.js 获取数据。

export const RELATION_SELECT_TYPE = Object.freeze({
  following: 1,
  followers: 2,
  blocked: 3
})

export const FRIEND_FLAG = Object.freeze({
  none: 0,
  one_way: 1,
  friends: 2
})

export const is_following_friend_flag = (friend_flag) => {
  const flag = Number(friend_flag || 0)
  return flag === FRIEND_FLAG.one_way || flag === FRIEND_FLAG.friends
}

export const is_self_following_relation = (item = {}, select_type) => {
  const friend_flag = Number(item.friend_flag || 0)
  const attention_flag = Number(item.attention_flag || 0)
  if (Number(select_type) === RELATION_SELECT_TYPE.followers) {
    return friend_flag === FRIEND_FLAG.friends || attention_flag === 1
  }
  return is_following_friend_flag(friend_flag) || attention_flag === 1
}

export const next_friend_flag = (item = {}, select_type) => {
  const following = is_self_following_relation(item, select_type)
  const on_followers = Number(select_type) === RELATION_SELECT_TYPE.followers
  if (!following) {
    return on_followers ? FRIEND_FLAG.friends : FRIEND_FLAG.one_way
  }
  return on_followers ? FRIEND_FLAG.one_way : FRIEND_FLAG.none
}

const normalize_id = (value) => (
  value === undefined || value === null ? '' : `${value}`.trim()
)
const normalize_text = (value) => `${value || ''}`.trim()

export const map_relation_users = (data) => {
  const list = Array.isArray(data) ? data : []
  return list
    .map((item = {}) => ({
      user_id: normalize_id(item.userId),
      user_name: normalize_text(item.userName),
      avatar_url: normalize_text(item.userImgUrl),
      signature: normalize_text(item.userBrief),
      birthday: normalize_text(item.userBirthday),
      location: normalize_text(item.userLocation),
      attention_flag: Number(item.attentionFlag || 0),
      friend_flag: Number(item.friendFlag || 0)
    }))
    .filter((item) => item.user_id !== '')
}

export const map_blocked_users = map_relation_users

export const to_user_id_param = (value) => {
  const text = normalize_id(value)
  if (text === '') return null
  const numeric = Number(text)
  if (Number.isFinite(numeric) && `${numeric}` === text) return numeric
  return text
}

const first_media_url = (list) => {
  const urls = Array.isArray(list) ? list.map((item) => normalize_text(item)).filter(Boolean) : []
  return urls[0] || ''
}

const is_video_dynamic = (item = {}) => (
  Number(item.dynamicType) === 3 || Number(item.dynamicClassify) === 2
)

export const map_user_dynamic_post = (item = {}, profile = {}) => {
  const post_id = normalize_id(item.dynamicId)
  if (post_id === '') return null
  const media_url = first_media_url(item.dynamicImgList)
  const content_type = is_video_dynamic(item) ? 'video' : 'image'
  return {
    post_id,
    owner_user_id: normalize_id(item.userId) || normalize_id(profile.userId),
    content: normalize_text(item.dynamicContent || item.dynamicTitle),
    content_type,
    media_url,
    cover_url: normalize_text(item.videoImgUrl),
    like_count: Math.max(0, Number(item.praiseNum || 0)),
    comment_count: Math.max(0, Number(item.commentNum || 0)),
    created_at: normalize_text(item.createDate),
    source: {
      ...item,
      userId: item.userId || profile.userId,
      userName: item.userName || profile.userName,
      userImgUrl: item.userImgUrl || profile.userImgUrl
    }
  }
}

export const map_user_base_profile = (data = {}) => ({
  user_id: normalize_id(data.userId),
  username: normalize_text(data.userName),
  avatar_url: normalize_text(data.userImgUrl || data.userImg)
})

export const map_public_user_profile = (data = {}) => {
  const user_id = normalize_id(data.userId)
  const posts = (Array.isArray(data.userDynamicVoList) ? data.userDynamicVoList : [])
    .map((item) => map_user_dynamic_post(item, data))
    .filter(Boolean)
  return {
    user_id,
    username: normalize_text(data.userName),
    avatar_url: normalize_text(data.userImgUrl || data.userImg),
    signature: normalize_text(data.userBrief),
    location: normalize_text(data.userLocation),
    birthday: normalize_text(data.userBirthday),
    like_count: Math.max(0, Number(data.likeNum || 0)),
    following_count: Math.max(0, Number(data.userAttention || 0)),
    follower_count: Math.max(0, Number(data.userFans || 0)),
    friend_count: Math.max(0, Number(data.userFriends || 0)),
    history_count: Math.max(0, Number(data.historyNum || 0)),
    attention_flag: Number(data.attentionFlag || 0),
    friend_flag: Number(data.friendFlag || 0),
    posts
  }
}

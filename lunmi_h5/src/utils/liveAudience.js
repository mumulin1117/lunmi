// 直播间观看人数与在线用户展示适配；不发起请求、不保存业务状态。

export const audience_user_id = (user) => `${user?.userId || ''}`

export const as_audience_user = (user = {}) => ({
  userId: user.userId,
  userName: user.userName,
  userImgUrl: user.userImgUrl
})

export const upsert_audience_list = (list = [], user = {}) => {
  const current = Array.isArray(list) ? list : []
  const next_user = as_audience_user(user)
  const user_id = audience_user_id(next_user)
  if (!user_id) return { list: current, added: false }
  if (current.some((item) => audience_user_id(item) === user_id)) {
    return { list: current, added: false }
  }
  return {
    list: [...current, next_user],
    added: true
  }
}

export const remove_audience_list = (list = [], user_id) => {
  const current = Array.isArray(list) ? list : []
  const id = `${user_id || ''}`
  if (!id) return { list: current, removed: false }
  const next = current.filter((item) => audience_user_id(item) !== id)
  return {
    list: next,
    removed: next.length !== current.length
  }
}

export const seed_watch_count = (live_user_num, audience_size) => (
  Math.max(0, Number(live_user_num) || 0, Number(audience_size) || 0)
)

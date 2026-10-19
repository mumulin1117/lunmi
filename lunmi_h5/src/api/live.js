import { http } from '@/api/service'

/** Create a voice room for the current user. */
export const addLive = (params = {}, request_context = null) => (
  http.post('/sj/live/addLive', params, { request_context })
)

/** Close the current user's room. */
export const finishLive = (params = {}, request_context = null) => (
  http.post('/sj/live/finishLive', params, { request_context })
)

/** Read room metadata. */
export const selectLiveInfo = (params = {}, request_context = null) => (
  http.post('/sj/live/selectLiveInfo', params, { request_context })
)

/** Read the paged list of live rooms. `liveStatus: 1` filters to rooms in progress. */
export const selectLivePage = (params = {}, request_context = null) => (
  http.post('/sj/live/selectLivePage', params, { request_context })
)

/** Add/remove the current user from the room's persisted audience list. */
export const addQuitLive = (params = {}, request_context = null) => (
  http.post('/sj/live/addQuitLive', params, { request_context })
)

/**
 * Read users currently in the room.
 * @param {object} params
 * @param {number|string} params.liveId 直播 ID
 * @param {string} [params.selectContent] 按用户名筛选
 */
export const selectRoomUsers = (params = {}, request_context = null) => (
  http.post('/sj/live/selectUserListForTalkRoom', params, { request_context })
)

/** Fetch configured gifts. */
export const selectGiftList = (params = {}, request_context = null) => (
  http.post('/sj/giftconfig/selectGiftList', params, { request_context })
)

/** Persist gift delivery through the existing backend contract. */
export const sendGift = (params = {}, request_context = null) => (
  http.post('/sj/giftrecord/sendGift', params, { request_context })
)

/** Read the Agora token used by the voice transport when configured. */
export const getLiveToken = (params = {}, request_context = null) => (
  http.post('/sj/common/getLiveToken', params, { request_context })
)

/** Read the last messages persisted for the room. */
export const selectRoomMessages = (params = {}, request_context = null) => (
  http.post('/sj/talkroom/selectTalkRoomPage', params, { request_context })
)

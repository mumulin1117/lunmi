import { http } from '@/api/service'

/**
 * 查询当前用户的所有聊天消息。
 *
 * @param {object} params
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: Array, error: string}>}
 */
export const selectMessageList = (params = {}, request_context = null) => (
  http.post('/api/selectMessageList', params, { request_context })
)


/**
 * 查询聊天消息。不传 receiveUserId 时查询当前用户全部会话，传入时查询与指定用户的聊天记录。
 *
 * @param {object} params
 * @param {number} [params.receiveUserId] 对方用户 ID
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: Array, error: string}>}
 */
export const selectTargetUserMessageList = (params = {}, request_context = null) => (
  http.post('/api/selectTargetUserMessageList', params, { request_context })
)


/**
 * 查询通知消息列表。
 *
 * @param {object} params
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: Array, error: string}>}
 */
export const selectNoticeMessageList = (params = {}, request_context = null) => (
  http.post('/api/selectNoticeMessageList', params, { request_context })
)

/**
 * 发送聊天消息。
 *
 * @param {object} params
 * @param {number|string} params.receiveUserId 接收消息用户 ID
 * @param {string} params.receiveUserName 接收消息用户姓名
 * @param {string} params.receiveUserImg 接收消息用户头像
 * @param {string} params.content 消息内容
 * @param {string} params.sendUserId 消息发送者 ID
 * @param {string} params.sendUserName 消息发送者姓名
 * @param {string} params.sendUserImgUrl 消息发送者头像
 * @param {string} params.bundleId bundle_id
 * @param {number} params.messageType 消息类型：1 聊天，2 通话，3 通知，4 音频，5 图片，6 视频
 * @param {number|string} [params.messageClassify] 当前消息的二级类型，有值时原样传递，0 也是有效值
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: object, error: string}>}
 */
export const sendMessage = (params = {}, request_context = null) => (
  http.post('/api/sendMessage', params, { request_context })
)

/**
 * 将消息标记为已读。传入 targetUserId 时已读与该用户的全部聊天消息。
 *
 * @param {object} params
 * @param {number} [params.messageId] 消息 ID，传 0 时已读全部消息
 * @param {number} [params.targetUserId] 目标用户 ID
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: boolean, error: string}>}
 */
export const updateMsgRead = (params = {}, request_context = null) => (
  http.post('/api/updateMsgRead', params, { request_context })
)

import { http } from '@/api/service'

/** 注销当前登录账号；无需业务参数，用户身份由请求鉴权获取。 */
export const destroyCount = (params = {}, request_context = null) => (
  http.post('/api/destroyCount', params, { request_context })
)

/**
 * 更新当前用户与目标用户的关系。
 *
 * @param {object} params
 * @param {number|string} params.beHandleUserId 目标用户 ID
 * @param {number} params.hanldeType 关系类型：1 关注，2 拉黑
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: object, error: string}>}
 */
export const updateUserRelation = (params = {}, request_context = null) => (
  http.post('/api/updateUserRelation', params, { request_context })
)

/**
 * 查询当前用户的关注、粉丝或黑名单用户。
 *
 * @param {object} params
 * @param {number} params.selectType 查询类型：1 关注，2 粉丝，3 黑名单
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: Array<UserRelation>, error: string}>}
 */
export const selectUserRelation = (params = {}, request_context = null) => (
  http.post('/api/selectUserRelation', params, { request_context })
)

/**
 * @typedef {object} UserRelation
 * @property {number} attentionFlag 是否已关注：0 未关注，1 已关注
 * @property {number} friendFlag 朋友关系：0 未关注，1 单方面关注，2 互相关注
 * @property {number|string} userId 用户 ID
 * @property {string} userImgUrl 用户头像
 * @property {string} userName 用户名
 */

/** 查询当前用户关注的用户。 */
export const selectFollowingUsers = (request_context = null) => (
  selectUserRelation({ selectType: 1 }, request_context)
)

/** 查询当前用户的粉丝。 */
export const selectFollowerUsers = (request_context = null) => (
  selectUserRelation({ selectType: 2 }, request_context)
)

/** 查询当前用户拉黑的用户。 */
export const selectBlacklistedUsers = (request_context = null) => (
  selectUserRelation({ selectType: 3 }, request_context)
)

/**
 * 查询指定用户的资料与动态。
 *
 * @param {object} params
 * @param {number|string} params.userId 目标用户 ID
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: object, error: string}>}
 */
export const selectUserInfo = (params = {}, request_context = null) => (
  http.post('/api/selectUserInfo', params, { request_context })
)

/**
 * 查询目标用户的基础资料。
 *
 * @param {object} params
 * @param {number|string} params.userId 目标用户 ID
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: object, error: string}>}
 */
export const selectUserBaseInfo = (params = {}, request_context = null) => (
  http.post('/api/selectUserBaseInfo', params, { request_context })
)

/**
 * 查询当前登录用户余额。
 *
 * @param {object} params
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: number, error: string}>}
 */
export const selectUserBalance = (params = {}, request_context = null) => (
  http.post('/api/selectUserBalance', params, { request_context })
)

/**
 * 更新当前登录用户余额（充值或消费后调用）。
 *
 * @param {object} params
 * @param {number} params.balance 更新后的余额
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: object, error: string}>}
 */
export const updateUserBalance = (params = {}, request_context = null) => (
  http.post('/api/updateUserBalance', params, { request_context })
)

/**
 * 添加用户余额流水记录（充值或消费后调用）。
 *
 * @param {object} params
 * @param {string} [params.balanceContent] 余额变化内容
 * @param {number} [params.balanceCurrent] 变化后的当前余额
 * @param {number} [params.balanceVal] 余额变化值
 * @param {string} [params.bundleId] appid
 * @param {number} [params.changeType] 变化类型：1 收入，2 支出
 * @param {number|string} [params.userId] 用户 id
 * @param {object|null} request_context 请求取消上下文
 * @returns {Promise<{success: boolean, data: object, error: string}>}
 */
export const addUserBalanceRecord = (params = {}, request_context = null) => (
  http.post('/api/addUserBalanceRecord', params, { request_context })
)


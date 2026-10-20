import { http } from '@/api/service'

/**
 * 邮箱登录/注册，返回 UserVo；会话由调用方在成功后保存。
 * @param {object} params
 * @param {string} params.userEmail 邮箱
 * @param {string} params.password 密码
 * @param {number} params.type 登录类型
 * @param {string} [params.userName] 注册用户名
 * @param {object|null} request_context 请求取消上下文
 */
export const emailLogin = (params = {}, request_context = null) => (
  http.post('/api/emailLogin', params, { with_auth: false, request_context })
)

/**
 * 保存当前用户资料，返回 UserVo 或空数据。
 * @param {object} params
 * @param {string} params.userName 用户名
 * @param {string} params.userEmail 邮箱
 * @param {string} params.userBrief 简介
 * @param {string} params.userLocation 城市
 * @param {string} params.userImgUrl 已上传的头像 URL
 * @param {object|null} request_context 请求取消上下文
 */
export const updateUser = (params = {}, request_context = null) => (
  http.post('/api/updateUser', params, { request_context })
)


import { http } from '@/api/service'

export const selectDynamicList = (params = {}, request_context = null) => (
  http.post('/api/selectDynamicList', params, { request_context })
)

export const selectDynamicInfo = (params = {}, request_context = null) => (
  http.post('/api/selectDynamicInfo', params, { request_context })
)

export const updateDynamicStore = (params = {}, request_context = null) => (
  http.post('/api/updateDynamicStore', params, { request_context })
)

export const commentDynamic = (params = {}, request_context = null) => (
  http.post('/api/commentDynamic', params, { request_context })
)

export const deleteComment = (params = {}, request_context = null) => (
  http.post('/api/deleteComment', params, { request_context })
)

/**
 * 发布动态，返回服务端创建结果（可能为空）。
 * @param {object} params
 * @param {number} params.dynamicClassify 1 图文或语音，2 视频
 * @param {string} params.dynamicContent 动态内容
 * @param {number} params.dynamicType 1 图文，2 语音，3 视频
 * @param {string[]} params.imgList 已上传图片 URL，视频只传一条视频 URL
 * @param {string} [params.videoImgUrl] 视频封面
 * @param {number} [params.fileTimes] 媒体时长（秒）
 * @param {object|null} request_context 请求取消上下文
 */
export const addDynamic = (params = {}, request_context = null) => (
  http.post('/api/addDynamic', params, { request_context })
)

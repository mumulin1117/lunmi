import { http } from '@/api/service'

/** AI 问答：参数 question，返回回答字符串；不使用本地模拟回答。 */
export const aiChat = (params = {}, request_context = null) => (
  http.post('/sj/aic/aiChat', params, { timeout: 60000, request_context })
)

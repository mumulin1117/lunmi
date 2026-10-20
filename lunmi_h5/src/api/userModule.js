import { http } from '@/api/service'

/** Read a target user's profile, relationships, wishes and sent blessings. */
export const selectLmUserInfo = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectLmUserInfo',
  params,
  { request_context }
)

/** Read the signed-in user's remaining scoop and wish attempts. */
export const selectLmUserModuleDataPage = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectLmUserModuleDataPage',
  { current: 1, size: 20, ...params },
  { request_context }
)

/** Persist remaining scoop and wish-find attempts. */
export const saveLmUserModuleData = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/saveLmUserModuleData',
  params,
  { request_context }
)

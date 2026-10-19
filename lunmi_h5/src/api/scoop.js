import { http } from '@/api/service'

export const selectLmLanternScoopPage = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectLmLanternScoopPage',
  { current: 1, size: 20, ...params },
  { request_context }
)

/** Scoop a lantern in one request; returns the scoop, lantern, owner, reply and remaining attempts. */
export const addLmLanternScoop = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/addLmLanternScoop',
  params,
  { request_context }
)

/** Read the unique reply attached to a scoop record. */
export const selectLmLanternReplyPage = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectLmLanternReplyPage',
  { current: 1, size: 20, ...params },
  { request_context }
)

/** Send the one reply allowed for a caught lantern. */
export const addLmLanternReply = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/addLmLanternReply',
  params,
  { request_context }
)

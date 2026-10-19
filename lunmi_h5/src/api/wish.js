import { http } from '@/api/service'

export const selectLmWishPage = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectLmWishPage',
  { current: 1, size: 20, ...params },
  { request_context }
)

export const selectRandomLmWish = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectRandomLmWish',
  params,
  { request_context }
)

export const addLmWish = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/addLmWish',
  params,
  { request_context }
)

export const selectLmWishBranchConfigPage = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectLmWishBranchConfigPage',
  { current: 1, size: 20, isActive: 1, ...params },
  { request_context }
)

export const selectLmWishBlessingPage = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectLmWishBlessingPage',
  { current: 1, size: 20, ...params },
  { request_context }
)

export const addLmWishBlessing = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/addLmWishBlessing',
  params,
  { request_context }
)

export const selectLmWishReplyPage = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectLmWishReplyPage',
  { current: 1, size: 20, ...params },
  { request_context }
)

export const addLmWishReply = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/addLmWishReply',
  params,
  { request_context }
)

export const deleteLmWishReply = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/deleteLmWishReply',
  params,
  { request_context }
)

export const deleteLmWishById = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/deleteLmWishById',
  params,
  { request_context }
)

export const addLmWishOutcome = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/addLmWishOutcome',
  params,
  { request_context }
)

export const selectLmWishOutcomePage = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectLmWishOutcomePage',
  { current: 1, size: 20, ...params },
  { request_context }
)

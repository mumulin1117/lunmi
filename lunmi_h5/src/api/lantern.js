import { http } from '@/api/service'

/** Persist a new lantern through the Lunmi backend contract. */
export const addLmLantern = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/addLmLantern',
  params,
  { request_context }
)

/** Attach an uploaded media asset to a lantern. */
export const addLmLanternMedia = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/addLmLanternMedia',
  params,
  { request_context }
)

/** Read lantern records for the current bundle. */
export const selectLmLanternPage = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/selectLmLanternPage',
  { current: 1, size: 20, ...params },
  { request_context }
)

export const deleteLmLanternById = (lanternId, request_context = null) => http.post(
  '/sj/lunmi/deleteLmLanternById',
  { lanternId },
  { request_context }
)

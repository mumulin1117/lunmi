import { http } from '@/api/service'

/** Register an uploaded file as a Lunmi media asset. */
export const addLmMediaAsset = (params = {}, request_context = null) => http.post(
  '/sj/lunmi/addLmMediaAsset',
  params,
  { request_context }
)

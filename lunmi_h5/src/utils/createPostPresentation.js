import { WALL_PAGE_PATH } from './wallPresentation.js'

export const PUBLISH_SUCCESS_PATH = '/pages/publish/success'
export const CREATE_POST_PATH = '/pages/community/create/index'

export const upload_prompt = (media_kind) => (
  media_kind === 'video' ? 'UPLOAD VIDEO' : 'UPLOAD IMAGE'
)

export const read_created_post_id = (data) => {
  const post_id = typeof data === 'number' || typeof data === 'string'
    ? data
    : data?.dynamicId
  if (post_id === undefined || post_id === null || `${post_id}`.trim() === '') return ''
  return `${post_id}`.trim()
}

export const build_image_post_params = ({ caption, image_url }) => ({
  dynamicClassify: 1,
  dynamicContent: caption,
  dynamicType: 1,
  imgList: [image_url]
})

export const build_video_post_params = ({
  caption,
  video_url,
  cover_url,
  duration_seconds
}) => ({
  dynamicClassify: 2,
  dynamicContent: caption,
  dynamicType: 3,
  imgList: [video_url],
  videoImgUrl: cover_url || '',
  fileTimes: Math.max(0, Math.round(Number(duration_seconds) || 0))
})

export const build_publish_success_url = ({
  media_kind,
  post_id,
  source_page
} = {}) => {
  const params = [
    `content_type=${media_kind === 'video' ? 'video' : 'image'}`,
    `dynamic_id=${encodeURIComponent(post_id || '')}`,
    `sourcePage=${encodeURIComponent(source_page || WALL_PAGE_PATH)}`
  ]
  return `${PUBLISH_SUCCESS_PATH}?${params.join('&')}`
}

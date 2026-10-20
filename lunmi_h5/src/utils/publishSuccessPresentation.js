import { WALL_PAGE_PATH } from './wallPresentation.js'

export const VIDEOS_PAGE_PATH = '/pages/videos/index'
export const DISCOVER_PAGE_PATH = '/pages/discover/index'
export const COMMUNITY_DETAIL_PATH = '/pages/community/detail/index'
export const DISCOVER_DETAIL_PATH = '/pages/discover/detail'
export const PUBLISH_SUCCESS_PATH = '/pages/publish/success'

const safe_page = (value, fallback) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  if (!path.startsWith('/pages/') || path.includes('..')) return fallback
  return path
}

export const read_publish_return_page = ({ source = '', source_page = '' } = {}) => {
  if (source_page) return safe_page(source_page, WALL_PAGE_PATH)
  if (source === 'videos') return VIDEOS_PAGE_PATH
  if (source === 'discover') return DISCOVER_PAGE_PATH
  return WALL_PAGE_PATH
}

export const build_published_detail_url = ({
  post_id,
  source = '',
  return_page = WALL_PAGE_PATH
} = {}) => {
  const dynamic_id = encodeURIComponent(post_id || '')
  if (source === 'videos') {
    return `${DISCOVER_DETAIL_PATH}?dynamicId=${dynamic_id}&return_to=videos`
  }
  if (source === 'discover') {
    return `${DISCOVER_DETAIL_PATH}?dynamicId=${dynamic_id}&return_to=discover`
  }
  return [
    `${COMMUNITY_DETAIL_PATH}?dynamicId=${dynamic_id}`,
    `sourcePage=${encodeURIComponent(PUBLISH_SUCCESS_PATH)}`,
    `returnPage=${encodeURIComponent(return_page || WALL_PAGE_PATH)}`
  ].join('&')
}

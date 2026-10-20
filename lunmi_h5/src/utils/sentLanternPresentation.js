import { build_lantern_detail_url } from './releaseLanternPresentation.js'

export const SENT_LANTERNS_PATH = '/pages/lantern/mine/index'
export const PROFILE_PAGE_PATH = '/pages/profile/index'
export const HOME_PAGE_PATH = '/pages/home/index'
export const SENT_LANTERN_COVER = '/static/icon/lantern_detail_scene.png'
export const EMPTY_MARK = '/static/icon/release_empty.png'
export const EMPTY_TITLE = 'No lanterns yet'
export const EMPTY_COPY = 'Write down what you cannot say out loud and let the river carry it.'

const STATUS_LABEL = Object.freeze({
  drifting: 'Drifting',
  scooped: 'Scooped'
})

const read_records = (page) => (
  Array.isArray(page?.records) ? page.records : Array.isArray(page) ? page : []
)

const safe_page = (value, fallback) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  path = path.split('?')[0]
  if (!path.startsWith('/pages/') || path.includes('..')) return fallback
  return path
}

export const read_sent_source = (query = {}) => safe_page(query.sourcePage, PROFILE_PAGE_PATH)

export const build_release_url = () => `${HOME_PAGE_PATH}?release=1`

export const should_open_home_release_sheet = (query = {}) => `${query.release || ''}` === '1'

export const build_sent_detail_url = (lantern_id) => build_lantern_detail_url({
  lantern_id,
  source_page: SENT_LANTERNS_PATH
})

export const read_lantern_total = (page) => {
  const total = Number(page?.total)
  return Number.isFinite(total) && total > 0 ? total : 0
}

export const map_sent_lanterns = (page) => read_records(page)
  .filter((item) => item?.lanternId && Number(item.deleted) !== 1 && item.lanternStatus !== 'deleted')
  .map((item) => {
    const status = `${item.lanternStatus || ''}`.trim()
    return {
      lantern_id: `${item.lanternId}`,
      content: `${item.content || ''}`.trim(),
      status,
      badge: STATUS_LABEL[status] || ''
    }
  })

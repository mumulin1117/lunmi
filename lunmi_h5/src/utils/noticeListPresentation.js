export const MESSAGES_PAGE_PATH = '/pages/messages/index'
export const NOTICE_PAGE_PATH = '/pages/messages/notice'
export const NOTICE_DETAIL_PATH = '/pages/messages/notice-detail'
export const ANNOUNCEMENT_DETAIL_TYPE = '1'
export const WISH_FULFILLED_DETAIL_TYPE = 'wish_fulfilled'

export const NOTICE_KIND = {
  ANNOUNCEMENT: 'announcement',
  WISH_FULFILLED: 'wish_fulfilled',
  LANTERN_SCOOPED: 'lantern_scooped',
  WISH_VIEWED: 'wish_viewed'
}

export const NOTICE_ICON = {
  [NOTICE_KIND.ANNOUNCEMENT]: '/static/icon/message_notice.png',
  [NOTICE_KIND.WISH_FULFILLED]: '/static/icon/notiication_wish.png',
  [NOTICE_KIND.LANTERN_SCOOPED]: '/static/icon/notiication_lantern.png',
  [NOTICE_KIND.WISH_VIEWED]: '/static/icon/notiication_release.png'
}

export const classify_notice_kind = (notice) => {
  switch (Number(notice?.message_classify)) {
    case 1: return NOTICE_KIND.WISH_FULFILLED
    case 2: return NOTICE_KIND.LANTERN_SCOOPED
    case 3: return NOTICE_KIND.WISH_VIEWED
    default: return NOTICE_KIND.ANNOUNCEMENT
  }
}

const NOTICE_CARD_ASSET = {
  [NOTICE_KIND.WISH_FULFILLED]: '/static/icon/notice_list_wish_cametrue.png',
  [NOTICE_KIND.LANTERN_SCOOPED]: '/static/icon/notice_list_lantern_scooped.png',
  [NOTICE_KIND.WISH_VIEWED]: '/static/icon/notice_list_release_open.png'
}

export const format_notice_relative_label = (create_date, now = Date.now()) => {
  const date_text = `${create_date ?? ''}`.trim()
  if (!date_text) return ''
  const timestamp = /^\d+$/.test(date_text)
    ? new Date(Number(date_text)).getTime()
    : Date.parse(date_text.replace(' ', 'T'))
  if (!Number.isFinite(timestamp) || timestamp <= 0 || !Number.isFinite(now)) return ''
  const delta = Math.max(0, now - timestamp)
  const minute = 60 * 1000
  const hour = 60 * minute
  if (delta < hour) {
    const minutes = Math.floor(delta / minute)
    return `${minutes} min ago`
  }
  if (delta < 24 * hour) {
    const hours = Math.floor(delta / hour)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }
  const days = Math.floor(delta / (24 * hour))
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

export const notice_headline = (notice) => {
  const title = `${notice?.title || ''}`.trim()
  if (title) return title
  return `${notice?.content || ''}`.trim()
}

export const notice_meta_label = (notice, now = Date.now()) => {
  return format_notice_relative_label(notice?.created_at, now)
}

export const decorate_notice_list = (notices, now = Date.now()) => (
  (Array.isArray(notices) ? notices : []).map((notice) => {
    const kind = classify_notice_kind(notice)
    const decorated = { ...notice, kind }
    return {
      ...decorated,
      headline: notice_headline(notice),
      meta_label: notice_meta_label(decorated, now),
      icon_src: NOTICE_ICON[kind],
      card_asset: NOTICE_CARD_ASSET[kind] || ''
    }
  })
)

export const read_notice_message_id = (notice) => {
  const notice_id = Number(notice?.notice_id)
  if (!Number.isFinite(notice_id) || notice_id <= 0) return 0
  return notice_id
}

export const build_notice_page_url = (source_page = MESSAGES_PAGE_PATH) => (
  `${NOTICE_PAGE_PATH}?sourcePage=${encodeURIComponent(source_page || MESSAGES_PAGE_PATH)}`
)

export const build_notice_detail_url = (notice, source_page = NOTICE_PAGE_PATH) => {
  const notice_id = `${notice?.notice_id || ''}`
  const params = [
    `message_id=${encodeURIComponent(notice_id)}`,
    `notificationId=${encodeURIComponent(notice_id)}`
  ]
  if (notice?.kind === NOTICE_KIND.ANNOUNCEMENT) {
    params.push(`type=${ANNOUNCEMENT_DETAIL_TYPE}`)
  }
  if (notice?.kind === NOTICE_KIND.WISH_FULFILLED) params.push(`type=${WISH_FULFILLED_DETAIL_TYPE}`)
  if (notice?.message_classify) params.push(`messageClassify=${encodeURIComponent(notice.message_classify)}`)
  if (source_page) params.push(`sourcePage=${encodeURIComponent(source_page)}`)
  return `${NOTICE_DETAIL_PATH}?${params.join('&')}`
}

export const NOTICE_DETAIL_TITLE = {
  [NOTICE_KIND.ANNOUNCEMENT]: 'Announcement',
  [NOTICE_KIND.WISH_FULFILLED]: 'It came true',
  [NOTICE_KIND.WISH_VIEWED]: 'Notification',
  [NOTICE_KIND.LANTERN_SCOOPED]: 'Notification'
}

export const COMMUNITY_NOTICE_LABEL = 'Community'
export const WISH_FULFILLED_CHIP = 'IT CAME TRUE'
export const SEE_WISH_LABEL = 'See the wish'

export const read_notice_detail_source = (value) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  if (!path.startsWith('/pages/') || path.includes('..')) return NOTICE_PAGE_PATH
  return path
}

export const read_notice_detail_id = (query = {}) => `${query.message_id || query.notificationId || ''}`.trim()

export const resolve_notice_detail_kind = (notice, type = '') => {
  if (notice) return classify_notice_kind(notice)
  const requested = `${type || ''}`.trim()
  if (requested === ANNOUNCEMENT_DETAIL_TYPE || requested === NOTICE_KIND.ANNOUNCEMENT) {
    return NOTICE_KIND.ANNOUNCEMENT
  }
  if (requested === WISH_FULFILLED_DETAIL_TYPE) return NOTICE_KIND.WISH_FULFILLED
  return NOTICE_KIND.ANNOUNCEMENT
}

export const format_notice_detail_time = (create_date) => {
  const text = `${create_date ?? ''}`.trim()
  if (!text) return ''
  const timestamp = /^\d+$/.test(text) ? new Date(Number(text)).getTime() : Date.parse(text.replace(' ', 'T'))
  if (!Number.isFinite(timestamp)) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(timestamp))
}

export const notice_detail_body = (notice, kind) => {
  if (kind === NOTICE_KIND.WISH_FULFILLED) return ''
  const title = `${notice?.title || ''}`.trim()
  const content = `${notice?.content || ''}`.trim()
  if (!content || content === title) return ''
  return content
}

export const notice_detail_quote = (notice, kind) => {
  if (kind !== NOTICE_KIND.WISH_FULFILLED) return ''
  return `${notice?.wish_content || ''}`.trim()
}

export const notice_viewer_label = (notice) => {
  const count = notice?.viewer_count
  if (!Number.isInteger(count) || count < 1) return ''
  const others = count - 1
  return others === 0 ? 'You were waiting for this.' : `You and ${others} ${others === 1 ? 'other' : 'others'} were waiting for this.`
}

export const can_open_notice_sender = (notice) => {
  const user_id = `${notice?.user_id || ''}`.trim()
  return Boolean(user_id && user_id !== '0')
}

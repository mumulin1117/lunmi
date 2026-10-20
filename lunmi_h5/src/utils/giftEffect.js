// 礼物展示适配；不发起请求、不保存业务状态。使用接口原字段。

const as_text = (value) => `${value || ''}`.trim()

export const gift_catalog_key = (gift = {}) => (
  `${gift.giftConfigId || gift.gitfName || gift.ribbonCall || gift.giftName || ''}`
)

export const gift_display_name = (gift = {}) => (
  as_text(gift.gitfName || gift.ribbonCall || gift.giftName) || 'Gift'
)

export const gift_thumb_url = (gift = {}) => (
  as_text(gift.gitfImgUrl || gift.relicThumbnail || gift.giftImgUrl)
)

export const gift_effect_url = (gift = {}) => (
  as_text(gift.amberIcon || gift.gitfImgUrl || gift.giftImgUrl || gift.relicThumbnail)
)

export const gift_price_value = (gift = {}) => Number(gift.gitfVal ?? gift.amberCost ?? gift.giftPrice ?? 0)

export const gift_effect_kind = (url) => {
  const value = as_text(url).split('?')[0].split('#')[0].toLowerCase()
  const ext = value.includes('.') ? value.slice(value.lastIndexOf('.') + 1) : ''
  if (ext === 'svga') return 'svga'
  if (ext === 'mp4' || ext === 'webm' || ext === 'mov' || ext === 'm4v') return 'video'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || ext === 'gif' || ext === 'bmp' || ext === 'apng') {
    return 'image'
  }
  return 'banner'
}

let svga_runtime_promise = null
let eva_runtime_promise = null

export const load_svga_runtime = () => {
  svga_runtime_promise ??= import('svgaplayerweb').then((mod) => {
    const runtime = mod?.default || mod
    return {
      Parser: runtime.Parser || mod.Parser,
      Player: runtime.Player || mod.Player
    }
  })
  return svga_runtime_promise
}

export const load_eva_runtime = () => {
  eva_runtime_promise ??= import('yyeva')
  return eva_runtime_promise
}

export const create_native_element = (tag) => {
  if (typeof document === 'undefined') return null
  try {
    return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
  } catch {
    return document.createElement(tag)
  }
}

export const GIFT_VIDEO_ELEMENT_ID = 'live-gift-effect-video'

export const find_inline_video_element = (root_id) => {
  if (typeof document === 'undefined') return null
  const host = document.getElementById(root_id)
  if (!host) return null
  if (`${host.tagName || ''}`.toUpperCase() === 'VIDEO') return host
  return host.querySelector('video')
}

export const prepare_inline_autoplay_video = (video, options = {}) => {
  if (!video || `${video.tagName || ''}`.toUpperCase() !== 'VIDEO') return null
  const muted = Boolean(options.muted)
  video.muted = muted
  video.defaultMuted = muted
  video.autoplay = true
  video.playsInline = true
  if (muted) video.setAttribute('muted', '')
  else video.removeAttribute('muted')
  video.setAttribute('autoplay', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  return video
}

const play_html_video = (video) => {
  const play_result = video?.play?.()
  if (!play_result || typeof play_result.then !== 'function') return Promise.resolve(Boolean(video))
  return play_result.then(() => true).catch(() => false)
}

export const start_inline_autoplay_video = async (video, options = {}) => {
  const prefer_muted = Boolean(options.muted)
  const first = prepare_inline_autoplay_video(video, { muted: prefer_muted })
  if (!first) return false
  if (await play_html_video(first)) return true
  const second = prepare_inline_autoplay_video(video, { muted: !prefer_muted })
  if (!second) return false
  return play_html_video(second)
}

export const merge_gift_payload = (payload = {}, catalog = []) => {
  const list = Array.isArray(catalog) ? catalog : []
  const matched = list.find((gift) => (
    `${gift.giftConfigId || ''}` === `${payload.giftConfigId || ''}` && payload.giftConfigId
  )) || list.find((gift) => (
    gift_display_name(gift) === as_text(payload.giftName || payload.gitfName || payload.ribbonCall)
  )) || list.find((gift) => (
    gift_thumb_url(gift) && gift_thumb_url(gift) === as_text(payload.giftImgUrl || payload.gitfImgUrl)
  ))
  const gift = {
    ...(matched || {}),
    ...payload,
    amberIcon: payload.amberIcon || matched?.amberIcon,
    relicThumbnail: payload.relicThumbnail || matched?.relicThumbnail,
    gitfImgUrl: payload.gitfImgUrl || payload.giftImgUrl || matched?.gitfImgUrl,
    gitfName: payload.gitfName || payload.giftName || payload.ribbonCall || matched?.gitfName,
    tributeKind: payload.tributeKind ?? matched?.tributeKind,
    hatchRelease: payload.hatchRelease ?? matched?.hatchRelease
  }
  const effect_url = gift_effect_url(gift)
  return {
    giftConfigId: gift.giftConfigId || matched?.giftConfigId || '',
    giftName: gift_display_name(gift),
    thumbUrl: gift_thumb_url(gift),
    effectUrl: effect_url,
    kind: gift_effect_kind(effect_url),
    giftNum: Number(gift.giftNum || 1) || 1,
    tributeKind: Number(gift.tributeKind ?? 0),
    hatchRelease: as_text(gift.hatchRelease),
    userName: as_text(gift.userName) || 'Someone',
    userImgUrl: as_text(gift.userImgUrl)
  }
}

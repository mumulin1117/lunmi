let active_media = null

export const find_media_element = (id) => {
  if (typeof document === 'undefined') return null
  const media_nodes = document.querySelectorAll('[data-media-id]')
  return [...media_nodes].find((node) => node.dataset.mediaId === `${id}`) || null
}

export const activate_media = ({ id, pause, get_element } = {}) => {
  if (!id || typeof pause !== 'function') return
  if (active_media && active_media.id !== id) active_media.pause?.()
  active_media = { id: `${id}`, pause, get_element }
}

export const clear_media = (id) => {
  if (!active_media || `${active_media.id}` !== `${id}`) return
  active_media = null
}

export const stop_active_media = () => {
  active_media?.pause?.()
  active_media = null
}

export const stop_active_media_if_hidden = (container) => {
  if (!active_media || !container?.getBoundingClientRect) return
  const element = active_media.get_element?.()
  if (!element?.getBoundingClientRect) return
  const container_rect = container.getBoundingClientRect()
  const media_rect = element.getBoundingClientRect()
  const is_hidden = media_rect.bottom <= container_rect.top
    || media_rect.top >= container_rect.bottom
    || media_rect.right <= container_rect.left
    || media_rect.left >= container_rect.right
  if (is_hidden) stop_active_media()
}

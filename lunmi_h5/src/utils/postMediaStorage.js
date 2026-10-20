const local_media_prefix = 'indexeddb://'
// This legacy avatar host serves the same image paths over HTTPS. Using its
// HTTP URLs prevents iOS from loading participant photos under the app's ATS policy.
const https_media_hosts = new Set(['www.pumqewy2345.xyz'])

export const is_stored_post_media_url = (value = '') => String(value).startsWith(local_media_prefix)

/**
 * 媒体文件必须通过上传 API 获取线上 URL，禁止写入本地业务缓存。
 */
export const save_post_media_file = async () => {
  throw new Error('Media files must be uploaded through the media API.')
}

export const resolve_post_media_url = async (media_url = '') => {
  if (is_stored_post_media_url(media_url)) return ''
  const source = `${media_url || ''}`
  try {
    const url = new URL(source)
    if (url.protocol === 'http:' && https_media_hosts.has(url.hostname)
      && !url.port && !url.username && !url.password) {
      url.protocol = 'https:'
      return url.href
    }
  } catch {
    // Bundled relative paths do not need URL conversion.
  }
  return source
}

export const revoke_post_media_url = (object_url = '') => {
  if (String(object_url).startsWith('blob:') && typeof URL !== 'undefined') URL.revokeObjectURL(object_url)
}

export const clear_post_media_storage = async () => ({ success: true, data: {}, error: '' })

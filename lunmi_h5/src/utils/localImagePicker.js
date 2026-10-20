import { ensure_ios_permissions } from './iosPermissionBridge.js'

const extract_image_blob = async (result) => {
  const selected_file = result?.tempFiles?.[0]
  if (typeof Blob !== 'undefined' && selected_file instanceof Blob) return selected_file
  if (typeof Blob !== 'undefined' && selected_file?.file instanceof Blob) return selected_file.file

  const temporary_path = selected_file?.path || result?.tempFilePaths?.[0] || ''
  if (!temporary_path || typeof fetch !== 'function') {
    throw new Error('Unable to read the selected image.')
  }
  const response = await fetch(temporary_path)
  if (!response.ok) throw new Error('Unable to read the selected image.')
  return response.blob()
}

export const choose_local_image = async () => {
  const permission = await ensure_ios_permissions(['photo_library', 'camera'], {
    reason: 'Allow this app to access photos and camera for your profile or post.'
  })
  if (!permission.granted && !permission.unavailable) {
    throw new Error('Photo library and camera permission are required to choose an image.')
  }
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (result) => {
        try {
          const blob = await extract_image_blob(result)
          const temporary_path = result?.tempFiles?.[0]?.path || result?.tempFilePaths?.[0] || ''
          const preview_url = typeof URL !== 'undefined' && URL.createObjectURL
            ? URL.createObjectURL(blob)
            : temporary_path
          resolve({ blob, preview_url })
        } catch (error) {
          reject(error)
        }
      },
      fail: (error) => {
        if (/cancel/i.test(error?.errMsg || '')) {
          reject(new Error('Image selection was cancelled.'))
          return
        }
        reject(new Error('Unable to choose an image.'))
      }
    })
  })
}

export const release_local_image_preview = (preview_url = '') => {
  if (!String(preview_url).startsWith('blob:') || typeof URL === 'undefined') return
  URL.revokeObjectURL(preview_url)
}

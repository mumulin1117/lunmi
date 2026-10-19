import { API_ENDPOINTS, resolve_api_url } from '@/config/api'
import { API_SUCCESS_CODE, get_response_error_message } from '@/api/response'
import { http } from '@/api/service'

const extract_url = (data) => `${data?.url || data?.fileUrl || data?.file_url || data?.data?.url || ''}`.trim()

export const upload_oss_file = ({ file, kind = 'image', request_context = null } = {}) => {
  if (!file) return Promise.resolve({ success: false, data: {}, error: 'Choose a media file first.' })
  let upload_task = null
  const promise = new Promise((resolve) => {
    upload_task = uni.uploadFile({
      url: resolve_api_url(API_ENDPOINTS.oss_hai_upload),
      filePath: file.path || file.tempFilePath,
      name: 'file',
      formData: { type: kind },
      success: ({ statusCode, data }) => {
        let body
        try { body = typeof data === 'string' ? JSON.parse(data) : data } catch { body = null }
        const code = Number(body?.code)
        const url = extract_url(body?.data)
        resolve(code === API_SUCCESS_CODE && url
          ? { success: true, data: { url, code }, error: '' }
          : { success: false, data: { code, http_status: statusCode }, error: get_response_error_message(code, body?.message) })
      },
      fail: (error) => resolve({ success: false, data: {}, error: error?.errMsg || 'Unable to upload media.' })
    })
  })
  if (request_context && typeof request_context === 'object') request_context.cancel = () => upload_task?.abort?.()
  return promise
}

export const uploadVideoFile = async ({
  file,
  filePath = '',
  request_context = null
} = {}) => {
  const result = await http.upload(API_ENDPOINTS.video_upload, {
    file,
    file_path: filePath,
    name: 'file',
    request_context
  })
  if (!result.success) return result

  const video_url = `${result.data?.videoUrl || ''}`.trim()
  if (!video_url) {
    return {
      success: false,
      data: {},
      error: 'The video upload did not return a video URL.'
    }
  }

  return {
    success: true,
    data: {
      video_url,
      cover_url: `${result.data?.coverImgUrl || ''}`.trim(),
      duration_seconds: Math.max(0, Math.round(Number(result.data?.videoDuration) || 0))
    },
    error: ''
  }
}

export const uploadImageFile = async ({
  file,
  filePath = '',
  request_context = null
} = {}) => {
  const result = await http.upload(API_ENDPOINTS.image_upload, {
    file,
    file_path: filePath,
    name: 'file',
    request_context
  })
  if (!result.success) return result

  const response_data = result.data
  const image_url = `${typeof response_data === 'string'
    ? response_data
    : extract_url(response_data)}`.trim()
  if (!image_url) {
    return {
      success: false,
      data: {},
      error: 'The image upload did not return an image URL.'
    }
  }

  return {
    success: true,
    data: { image_url },
    error: ''
  }
}

export const uploadAudioFile = async ({
  file,
  filePath = '',
  request_context = null
} = {}) => {
  const result = await http.upload(API_ENDPOINTS.image_upload, {
    file,
    file_path: filePath,
    name: 'file',
    request_context
  })
  if (!result.success) return result

  const response_data = result.data
  const audio_url = `${typeof response_data === 'string'
    ? response_data
    : extract_url(response_data)}`.trim()
  if (!audio_url) {
    return {
      success: false,
      data: {},
      error: 'The audio upload did not return an audio URL.'
    }
  }

  return {
    success: true,
    data: { audio_url },
    error: ''
  }
}

import { reactive } from 'vue'

const API_ERROR_DIALOG_VISIBLE_MS = 2000

export const api_error_dialog = reactive({
  visible: false,
  title: 'Request failed',
  message: '',
  timer: null
})

export const open_api_error_dialog = (message, title = 'Request failed') => {
  if (api_error_dialog.timer) clearTimeout(api_error_dialog.timer)
  api_error_dialog.title = title
  api_error_dialog.message = `${message || 'Unable to complete the request.'}`
  api_error_dialog.visible = true
  api_error_dialog.timer = setTimeout(() => {
    api_error_dialog.visible = false
    api_error_dialog.timer = null
  }, API_ERROR_DIALOG_VISIBLE_MS)
}

export const close_api_error_dialog = () => {
  if (api_error_dialog.timer) clearTimeout(api_error_dialog.timer)
  api_error_dialog.timer = null
  api_error_dialog.visible = false
}

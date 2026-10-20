export const SUCCESS_TOAST_MS = 2000

export const SUCCESS_TOAST = Object.freeze({
  lantern: 'Lantern released',
  wish: 'Your wish is on the tree.',
  fulfill: 'Wish came true',
  report: 'Report sent',
  deleted: 'Deleted',
  recharge: 'Charged successfully',
})

let queued_message = ''

export const queue_success_toast = (message) => {
  queued_message = `${message || ''}`.trim()
}

export const take_success_toast = () => {
  const message = queued_message
  queued_message = ''
  return message
}

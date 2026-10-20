export const DELETE_OBJECT = Object.freeze({
  LANTERN: 'lantern',
  POST: 'post',
  COMMENT: 'comment',
  WISH: 'wish'
})

export const DELETE_KEEP_LABEL = 'Keep'
export const DELETE_CONFIRM_LABEL = 'Delete'
export const DELETE_PENDING_LABEL = 'Deleting...'
export const POST_DELETE_UNAVAILABLE = 'Deleting a post is not available yet.'
export const DELETED_RESULT_PATH = '/pages/common/deleted-result/index'
export const DELETED_RESULT_HOME = '/pages/home/index'
export const LOGIN_PAGE_PATH = '/pages/login/index'
export const DELETED_RESULT_ACCOUNT = 'account'

export const DELETED_RESULT_STATUS = Object.freeze({
  SUCCESS: 'success',
  GONE: 'gone',
  FAILURE: 'failure'
})

export const DELETED_RESULT_COPY = Object.freeze({
  [DELETE_OBJECT.LANTERN]: Object.freeze({
    title: 'You deleted this',
    copy: 'It is off the river and out of everyone\'s records. Replies it already received were removed too.',
    action: 'Back to my records'
  }),
  [DELETE_OBJECT.POST]: Object.freeze({
    title: 'You deleted this',
    copy: 'It is off the wall. Replies on it were removed too.',
    action: 'Back to the wall'
  }),
  [DELETE_OBJECT.COMMENT]: Object.freeze({
    title: 'You deleted this',
    copy: 'The reply is gone. The post stays.',
    action: 'Back'
  }),
  [DELETE_OBJECT.WISH]: Object.freeze({
    title: 'You deleted this',
    copy: 'It has left the tree. Blessings already sent stay.',
    action: 'Back to the tree'
  })
})

export const ALREADY_GONE_COPY = Object.freeze({
  title: 'Already gone',
  copy: 'This no longer has a record to open.',
  action: 'Back'
})

export const read_deleted_result_query = (query = {}) => ({
  object_type: `${query.objectType || ''}`.trim(),
  object_id: `${query.objectId || ''}`.trim(),
  source_page: `${query.sourcePage || ''}`.trim(),
  return_page: `${query.returnPage || ''}`.trim()
})

export const is_account_deletion = (object_type = '') => object_type === DELETED_RESULT_ACCOUNT

export const can_verify_deleted_object = (object_type = '') => (
  object_type === DELETE_OBJECT.LANTERN
  || object_type === DELETE_OBJECT.WISH
  || object_type === DELETE_OBJECT.POST
)

export const deleted_result_back_target = ({ return_page = '', source_page = '' } = {}) => (
  return_page || source_page || DELETED_RESULT_HOME
)

export const deleted_result_copy = (object_type = '', status = DELETED_RESULT_STATUS.SUCCESS) => {
  if (status === DELETED_RESULT_STATUS.GONE) return ALREADY_GONE_COPY
  return DELETED_RESULT_COPY[object_type] || DELETED_RESULT_COPY[DELETE_OBJECT.LANTERN]
}

export const read_result_records = (data) => {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.records)) return data.records.filter(Boolean)
  if (Array.isArray(data)) return data.filter(Boolean)
  if (data.dynamicId || data.lanternId || data.wishId || data.commentId) return [data]
  return []
}

export const record_is_removed = (record) => {
  if (!record || typeof record !== 'object') return true
  if (Number(record.deleted) === 1) return true
  const status = `${record.lanternStatus || record.wishStatus || ''}`.trim()
  return status === 'deleted'
}

export const result_is_removed = (data) => {
  const records = read_result_records(data)
  if (!records.length) return true
  return records.every(record_is_removed)
}

export const DELETE_COPY = Object.freeze({
  [DELETE_OBJECT.LANTERN]: Object.freeze({
    title: 'Delete this lantern?',
    copy: 'It stops drifting and no one can pick it up again. Conversations it already started stay.'
  }),
  [DELETE_OBJECT.POST]: Object.freeze({
    title: 'Delete this post?',
    copy: 'It will be removed from the wall. This cannot be undone.'
  }),
  [DELETE_OBJECT.COMMENT]: Object.freeze({
    title: 'Delete this reply?',
    copy: 'This reply will be removed. The post stays.'
  }),
  [DELETE_OBJECT.WISH]: Object.freeze({
    title: 'Delete this wish?',
    copy: 'It leaves the tree. Blessings already sent stay.'
  })
})

export const can_delete_owned_object = (owner_user_id, current_user_id) => {
  if (owner_user_id === '' || owner_user_id == null) return false
  if (current_user_id === '' || current_user_id == null) return false
  return `${owner_user_id}` === `${current_user_id}`
}

export const build_delete_lantern_params = (lantern_id) => ({ lanternId: lantern_id })

export const build_delete_wish_params = (wish_id) => ({ wishId: wish_id })

export const build_deleted_result_url = ({
  object_type = '',
  object_id = '',
  source_page = '',
  return_page = ''
} = {}) => {
  const params = [
    `objectType=${encodeURIComponent(object_type)}`,
    `objectId=${encodeURIComponent(object_id)}`,
    `sourcePage=${encodeURIComponent(source_page)}`,
    `returnPage=${encodeURIComponent(return_page)}`
  ]
  return `${DELETED_RESULT_PATH}?${params.join('&')}`
}

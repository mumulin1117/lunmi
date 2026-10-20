/** 举报 API 尚未纳入当前接口契约，禁止用本地状态伪装提交成功。 */
export const submit_post_report = () => ({
  success: false,
  data: {},
  error: 'The report API is not configured.'
})

export const block_user = () => ({ success: true, data: {}, error: '' })

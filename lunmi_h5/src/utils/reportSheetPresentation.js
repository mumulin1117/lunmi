export const REPORT_REASONS = Object.freeze([
  { id: 'sexual', label: 'Sexual content' },
  { id: 'harassment', label: 'Harassment or hate' },
  { id: 'violence', label: 'Violence or self-harm' },
  { id: 'spam', label: 'Spam or scam' },
  { id: 'other', label: 'Something else' }
])

export const REPORT_REVIEW_NOTE = 'We review every report within 24 hours and remove content or restrict accounts that break the rules. False reports may limit your own account.'

export const report_button_label = (reason = '') => (
  `${reason || ''}`.trim() ? 'Submit report' : 'Choose a reason'
)

export const report_subtitle = ({ post_id = '', comment_id = '' } = {}) => {
  if (`${comment_id || ''}`.trim()) return 'Reporting this comment · reviewed within 24 hours'
  if (`${post_id || ''}`.trim()) return 'Reporting this post · reviewed within 24 hours'
  return 'Reporting this person · reviewed within 24 hours'
}

export const can_block_report_target = (user_id) => {
  const value = user_id
  return value !== '' && value !== null && value !== undefined
}

// One-use visual handoffs come only from successful publish callbacks, never
// from a route flag. They are transient and isolated to the current account.
const pending = new Map()
export const remember_ritual = (kind, user_id, entity_id, branch_level = 'mid') => {
  if (!['release', 'wish'].includes(kind) || !user_id || !entity_id) return
  pending.set(kind, { user_id: `${user_id}`, entity_id: `${entity_id}`, branch_level: `${branch_level}`, created_at: Date.now() })
}
export const take_ritual = (kind, user_id, entity_id = '') => {
  const record = pending.get(kind)
  if (!record || record.user_id !== `${user_id}` || (entity_id && record.entity_id !== `${entity_id}`)) return null
  pending.delete(kind)
  return Date.now() - record.created_at <= 60000 ? record : null
}

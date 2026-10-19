import { read_module_common_field } from './lanternHomePresentation.js'

const format_count = (count) => new Intl.NumberFormat('en-US').format(count)

export const read_wish_tree = (page) => {
  const records = Array.isArray(page?.records) ? page.records : []
  const total = Number(page?.total)
  const wish_count = Number.isFinite(total) ? Math.max(0, total) : records.length
  const first_wish = records.find((item) => item.wishId) || null
  return {
    wish_count,
    wish_count_label: format_count(wish_count),
    first_wish_id: first_wish ? `${first_wish.wishId}` : ''
  }
}

export const read_branch_day_label = (page) => {
  const days = (Array.isArray(page?.records) ? page.records : [])
    .map((item) => Number(item.visibilityDays))
    .filter((value) => Number.isFinite(value) && value > 0)
  if (!days.length) return ''
  const shortest = Math.min(...days)
  const longest = Math.max(...days)
  return shortest === longest ? `${shortest} DAYS` : `${shortest}-${longest} DAYS`
}

export const read_find_remaining = (page) => {
  const records = Array.isArray(page?.records) ? page.records : []
  const record = records.find((item) => Number(item.moduleType) === 1) || null
  if (!record) return 0
  const remaining = Number(read_module_common_field(record, 2))
  if (!Number.isFinite(remaining)) return 0
  return Math.max(0, remaining)
}

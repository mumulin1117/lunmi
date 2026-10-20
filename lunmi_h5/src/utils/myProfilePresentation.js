const read_page_total = (page) => {
  const total = Number(page?.total)
  if (Number.isFinite(total)) return Math.max(0, total)
  const records = Array.isArray(page?.records) ? page.records : []
  return records.length
}

export const read_profile_counts = ({ lantern_page, scoop_page, wish_page } = {}) => ({
  lanterns_sent: read_page_total(lantern_page),
  lanterns_caught: read_page_total(scoop_page),
  wishes_hung: read_page_total(wish_page),
  rooms_joined: 0
})

export const read_coin_balance = (data) => {
  if (typeof data === 'number') return Math.max(0, data)
  const amount = Number(data?.userBalance ?? data)
  if (!Number.isFinite(amount)) return 0
  return Math.max(0, amount)
}

export const format_profile_count = (count) => new Intl.NumberFormat('en-US').format(count)

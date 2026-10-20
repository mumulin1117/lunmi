import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const project_root = new URL('../', import.meta.url)

const import_source = async (relative_path) => {
  const source = await readFile(new URL(relative_path, project_root), 'utf8')
  const source_url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Math.random()}`
  return import(source_url)
}

test('profile counts use lantern, scoop and wish page totals', async () => {
  const api = await import_source('src/utils/myProfilePresentation.js')
  const counts = api.read_profile_counts({
    lantern_page: { total: 6, records: [{}] },
    scoop_page: { total: 4, records: [] },
    wish_page: { total: 5, records: [{}, {}] }
  })
  assert.equal(counts.lanterns_sent, 6)
  assert.equal(counts.lanterns_caught, 4)
  assert.equal(counts.wishes_hung, 5)
  assert.equal(counts.rooms_joined, 0)
})

test('coin balance reads a numeric selectUserBalance payload', async () => {
  const api = await import_source('src/utils/myProfilePresentation.js')
  assert.equal(api.read_coin_balance(480), 480)
  assert.equal(api.read_coin_balance({ userBalance: 12 }), 12)
  assert.equal(api.format_profile_count(480), '480')
})

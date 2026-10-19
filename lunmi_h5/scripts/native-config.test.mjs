import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/config/api.js', import.meta.url), 'utf8')
const load_config = async (vite, native) => {
  const code = source
    .replace(/^const vite_env = .*$/m, `const vite_env = ${JSON.stringify(vite)}`)
    .replace(/^const native_env = .*$/m, `const native_env = ${JSON.stringify(native)}`)
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
}

test('native endpoint configuration works without rebuilding H5; Vite values retain precedence', async () => {
  const native = { VITE_API_BASE_URL: 'https://api.example.test/', VITE_LIVE_WS_URL: 'wss://live.example.test', VITE_BUNDLE_ID: '6101415' }
  const config = await load_config({}, native)
  assert.equal(config.resolve_api_url('/api/emailLogin'), 'https://api.example.test/api/emailLogin')
  assert.equal(config.LIVE_WS_BASE_URL, 'wss://live.example.test')
  assert.equal(config.API_BUNDLE_ID, '6101415')
  const overridden = await load_config({ VITE_API_BASE_URL: 'https://staging.example.test' }, native)
  assert.equal(overridden.API_BASE_URL, 'https://staging.example.test')
})

test('missing production API configuration fails explicitly', async () => {
  const config = await load_config({}, {})
  assert.throws(() => config.resolve_api_url('/api/emailLogin'), /not configured/)
})

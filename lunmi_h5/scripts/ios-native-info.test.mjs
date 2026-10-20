import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { render_native_info, native_info_state, synchronize_native_info } from './ios-native-info.mjs'

const base = '<?xml version="1.0"?><plist version="1.0">\n<dict>\n\t<key>CFBundleDisplayName</key><string>Lunmi</string>\n</dict>\n</plist>\n'
const configuration = url => `struct Example {\n    let portatoSolace = ${JSON.stringify(url)}\n}\n`

test('HTTP configuration generates only the specific API host exception and preserves existing metadata', () => {
  const info = render_native_info(base, configuration('http://example.invalid:8080/api'))
  assert.match(info, /<key>example\.invalid<\/key>/)
  assert.match(info, /<key>NSIncludesSubdomains<\/key>\s*<false\/>/)
  assert.match(info, /<key>NSExceptionAllowsInsecureHTTPLoads<\/key>\s*<true\/>/)
  assert.match(info, /<key>CFBundleDisplayName<\/key><string>Lunmi<\/string>/)
  assert.doesNotMatch(info, /NSAllowsArbitraryLoads|:8080/)
  assert.equal(render_native_info(info, configuration('http://example.invalid:8080/api')), info)
})

test('changing the API host replaces the exception and HTTPS removes the old HTTP exception', () => {
  const original = render_native_info(base, configuration('http://first.invalid/api'))
  const changed = render_native_info(original, configuration('http://second.invalid/api'))
  assert.doesNotMatch(changed, /first\.invalid/)
  assert.match(changed, /second\.invalid/)
  const secure = render_native_info(changed, configuration('https://second.invalid/api'))
  assert.doesNotMatch(secure, /NSAppTransportSecurity|NSExceptionDomains|second\.invalid/)
  assert.equal(render_native_info(secure, configuration('https://second.invalid/api')), secure)
})

test('the existing Swift string decoder format is accepted without changing its literal', () => {
  const url = 'http://encoded.invalid/api'
  const literal = Array.from(url, scalar => scalar + 'q').join('')
  const source = `let portatoSolace = LucentWonderment.glenAquarelle("${literal}")`
  assert.match(render_native_info(base, source), /<key>encoded\.invalid<\/key>/)
})

test('Xcode may discard comments without invalidating an otherwise identical API transport dictionary', () => {
  const config = configuration('http://example.invalid/api')
  const info = render_native_info(base, config)
  const savedByXcode = info.replace(/\t<!--[^]*?-->\n?/g, '')
  assert.match(savedByXcode, /NSAppTransportSecurity/)
  const restored = render_native_info(savedByXcode, config)
  assert.match(restored, /Lunmi API transport: managed/)
  assert.equal((restored.match(/<key>NSAppTransportSecurity<\/key>/g) || []).length, 1)
  assert.equal(render_native_info(restored, config), restored)
  assert.throws(() => render_native_info(savedByXcode, configuration('http://different.invalid/api')), /Unmanaged/)
})

test('invalid or ambiguous API declarations and unsafe URL forms fail explicitly', () => {
  for (const url of ['not a URL', 'ftp://example.invalid/api', 'https://name:secret@example.invalid/api',
    'https://example.invalid/api?query=1', 'https://example.invalid/api#fragment']) {
    assert.throws(() => render_native_info(base, configuration(url)), /native API URL/)
  }
  assert.throws(() => render_native_info(base, ''), /single Swift declaration/)
  assert.throws(() => render_native_info(base, configuration('https://first.invalid') + configuration('https://second.invalid')), /single Swift declaration/)
})

test('unmanaged, duplicate and malformed transport sections are not silently overwritten', () => {
  const info = render_native_info(base, configuration('http://example.invalid'))
  const unmanaged = base.replace('</dict>', '<key>NSAppTransportSecurity</key><dict/>\n</dict>')
  assert.throws(() => render_native_info(unmanaged, configuration('https://example.invalid')), /Unmanaged/)
  assert.throws(() => render_native_info(info + info, configuration('https://example.invalid')), /Invalid managed/)
  assert.throws(() => render_native_info(info.replace('End Lunmi API transport.', 'broken'), configuration('https://example.invalid')), /Invalid managed/)
})

test('sync updates checked-in Info.plist and check detects native changes even when the H5 bundle is current', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lunmi-native-info-'))
  try {
    await writeFile(path.join(root, 'Info.plist'), base)
    await writeFile(path.join(root, 'PersistentPivotGlow.swift'), configuration('http://example.invalid/api'))
    assert.equal((await native_info_state(root)).current, false)
    await synchronize_native_info(root)
    assert.equal((await native_info_state(root)).current, true)
    await writeFile(path.join(root, 'PersistentPivotGlow.swift'), configuration('https://example.invalid/api'))
    assert.equal((await native_info_state(root)).current, false)
    await synchronize_native_info(root)
    assert.doesNotMatch(await readFile(path.join(root, 'Info.plist'), 'utf8'), /NSExceptionDomains/)
    assert.equal((await native_info_state(root)).current, true)
  } finally { await rm(root, { recursive: true, force: true }) }
})

import { readFile, writeFile, rename, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { read_native_string_declarations } from './lunimcenter-package.mjs'

const begin = '\t<!-- Lunmi API transport: managed by pnpm sync:ios. -->'
const end = '\t<!-- End Lunmi API transport. -->'
const escape_xml = value => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
})[character])

export const render_native_info = (source, configuration) => {
  const declarations = read_native_string_declarations(configuration, 'portatoSolace')
  if (declarations.length !== 1) throw new Error('The native API URL must have a single Swift declaration.')
  let url
  try { url = new URL(declarations[0]) } catch { throw new Error('The native API URL is invalid.') }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.search || url.hash) {
    throw new Error('The native API URL must be HTTP(S), without credentials, query or fragment.')
  }
  const transport = url.protocol === 'http:' ? [
    '\t<key>NSAppTransportSecurity</key>',
    '\t<dict>',
    '\t\t<key>NSExceptionDomains</key>',
    '\t\t<dict>',
    `\t\t\t<key>${escape_xml(url.hostname)}</key>`,
    '\t\t\t<dict>',
    '\t\t\t\t<key>NSExceptionAllowsInsecureHTTPLoads</key>',
    '\t\t\t\t<true/>',
    '\t\t\t\t<key>NSIncludesSubdomains</key>',
    '\t\t\t\t<false/>',
    '\t\t\t</dict>',
    '\t\t</dict>',
    '\t</dict>'
  ] : []
  const block = [begin, ...transport, end].join('\n')
  const start = source.indexOf(begin)
  const finish = source.indexOf(end)
  if (start >= 0 || finish >= 0) {
    if (start < 0 || finish < start || source.indexOf(begin, start + begin.length) >= 0
      || source.indexOf(end, finish + end.length) >= 0) throw new Error('Invalid managed API transport section in Info.plist.')
    const outside = source.slice(0, start) + source.slice(finish + end.length)
    if (/<key>\s*NSAppTransportSecurity\s*<\/key>/.test(outside)) throw new Error('Duplicate API transport configuration in Info.plist.')
    return source.slice(0, start) + block + source.slice(finish + end.length)
  }
  const unmanaged = [...source.matchAll(/<key\s*>\s*NSAppTransportSecurity\s*<\/key\s*>/g)]
  if (unmanaged.length) {
    const compact = value => value.replace(/>\s+</g, '><').trim()
    // Xcode can remove XML comments. Accept only the exact current exception,
    // preserving the user's file instead of claiming ownership of its ATS block.
    if (unmanaged.length === 1 && transport.length
      && compact(source).includes(compact(transport.join('\n')))) return source
    throw new Error('Unmanaged API transport configuration in Info.plist.')
  }
  const closing = source.lastIndexOf('</dict>')
  if (closing < 0 || !source.slice(closing).includes('</plist>')) throw new Error('Invalid Info.plist root dictionary.')
  return source.slice(0, closing) + block + '\n' + source.slice(closing)
}

export const native_info_state = async root => {
  const filename = path.join(root, 'Info.plist')
  const [source, configuration] = await Promise.all([
    readFile(filename, 'utf8'), readFile(path.join(root, 'PersistentPivotGlow.swift'), 'utf8')
  ])
  const expected = render_native_info(source, configuration)
  return { filename, expected, current: source === expected }
}

export const synchronize_native_info = async root => {
  const state = await native_info_state(root)
  if (state.current) return
  const temporary = state.filename + '.' + randomUUID() + '.tmp'
  try {
    await writeFile(temporary, state.expected)
    await rename(temporary, state.filename)
  } finally { await rm(temporary, { force: true }) }
  console.log('Synchronized native Info.plist API transport configuration.')
}

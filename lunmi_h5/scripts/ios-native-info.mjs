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
  const unmanaged = [...source.matchAll(/<key>\s*NSAppTransportSecurity\s*<\/key>/g)]
  if (unmanaged.length) {
    // Xcode/plutil can discard XML comments when saving Info.plist. Recover
    // ownership only when the full existing transport dictionary is identical
    // to the narrow current API exception; never replace unrelated settings.
    const key = unmanaged[0]
    const valueStart = key.index + key[0].length
    const value = /^\s*<dict>/.exec(source.slice(valueStart))
    let depth = 0, valueEnd = -1
    if (unmanaged.length === 1 && value) {
      for (const tag of source.slice(valueStart).matchAll(/<\/?dict>/g)) {
        depth += tag[0] === '<dict>' ? 1 : -1
        if (depth === 0) { valueEnd = valueStart + tag.index + tag[0].length; break }
      }
    }
    const compact = xml => xml.replace(/>\s+</g, '><').trim()
    if (valueEnd < 0 || compact(source.slice(key.index, valueEnd)) !== compact(transport.join('\n'))) {
      throw new Error('Unmanaged API transport configuration in Info.plist.')
    }
    const lineStart = source.lastIndexOf('\n', key.index) + 1
    const replaceStart = /^\s*$/.test(source.slice(lineStart, key.index)) ? lineStart : key.index
    return source.slice(0, replaceStart) + block + source.slice(valueEnd)
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

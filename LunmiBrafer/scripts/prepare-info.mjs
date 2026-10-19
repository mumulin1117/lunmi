import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const read_plist = (filename) => JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', filename], { encoding: 'utf8' }))
const source_root = process.env.SRCROOT
const output_root = process.env.DERIVED_FILE_DIR
if (!source_root || !output_root) throw new Error('Xcode SRCROOT and DERIVED_FILE_DIR are required.')
const info = read_plist(path.join(source_root, 'LunmiBrafer/Info.plist'))
const configuration = readFileSync(path.join(source_root, 'LunmiBrafer/NativeConfiguration.swift'), 'utf8')
const api_declarations = [...configuration.matchAll(/^\s*let apiBaseURL\s*=\s*("(?:[^"\\]|\\.)*")\s*$/gm)]
if (api_declarations.length !== 1) throw new Error('NativeConfiguration.apiBaseURL must be a single string literal.')
const api_base_url = JSON.parse(api_declarations[0][1])
const url = new URL(api_base_url)
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
  throw new Error('NativeConfiguration.apiBaseURL must be an HTTP(S) API URL without credentials, query or fragment.')
}
if (url.protocol === 'http:') {
  info.NSAppTransportSecurity ||= {}
  info.NSAppTransportSecurity.NSExceptionDomains ||= {}
  info.NSAppTransportSecurity.NSExceptionDomains[url.hostname] = {
    NSExceptionAllowsInsecureHTTPLoads: true,
    NSIncludesSubdomains: false
  }
  console.log('Configured API HTTP exception for ' + url.hostname)
}
mkdirSync(output_root, { recursive: true })
execFileSync('/usr/bin/plutil', ['-convert', 'xml1', '-o', path.join(output_root, 'LunmiBrafer-Info.plist'), '-'], { input: JSON.stringify(info) })

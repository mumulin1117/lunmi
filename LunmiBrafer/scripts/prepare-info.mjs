import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { read_native_string_declarations } from '../../lunmi_h5/scripts/lunimcenter-package.mjs'

const read_plist = (filename) => JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', filename], { encoding: 'utf8' }))
const source_root = process.env.SRCROOT
const output_root = process.env.DERIVED_FILE_DIR
if (!source_root || !output_root) throw new Error('Xcode SRCROOT and DERIVED_FILE_DIR are required.')
const info = read_plist(path.join(source_root, 'LunmiBrafer/Info.plist'))
const configuration = readFileSync(path.join(source_root, 'LunmiBrafer/PersistentPivotGlow.swift'), 'utf8')
const api_declarations = read_native_string_declarations(configuration, 'portatoSolace')
if (api_declarations.length !== 1) throw new Error('NativeConfiguration.apiBaseURL must be a single string literal.')
const api_base_url = api_declarations[0]
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

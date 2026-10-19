import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const read_plist = (filename) => JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', filename], { encoding: 'utf8' }))
const source_root = process.env.SRCROOT
const output_root = process.env.DERIVED_FILE_DIR
if (!source_root || !output_root) throw new Error('Xcode SRCROOT and DERIVED_FILE_DIR are required.')
const info = read_plist(path.join(source_root, 'LunmiBrafer/Info.plist'))
const configuration = read_plist(path.join(source_root, 'LunmiBrafer/Configuration.plist'))
const api_base_url = configuration.APIBaseURL
if (api_base_url) {
  const url = new URL(api_base_url)
  if (url.protocol === 'http:' && !url.username && !url.password) {
    info.NSAppTransportSecurity ||= {}
    info.NSAppTransportSecurity.NSExceptionDomains ||= {}
    info.NSAppTransportSecurity.NSExceptionDomains[url.hostname] = {
      NSExceptionAllowsInsecureHTTPLoads: true,
      NSIncludesSubdomains: false
    }
    console.log('Configured API HTTP exception for ' + url.hostname)
  }
}
mkdirSync(output_root, { recursive: true })
execFileSync('/usr/bin/plutil', ['-convert', 'xml1', '-o', path.join(output_root, 'LunmiBrafer-Info.plist'), '-'], { input: JSON.stringify(info) })

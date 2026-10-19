import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { source_fingerprint } from './ios-sync-lib.mjs'
import { PACKAGE_NAME, check_package, package_web_bundle, read_package_key } from './lunimcenter-package.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ios_root = path.resolve(root, '../LunmiBrafer/LunmiBrafer')
const destination = path.join(ios_root, PACKAGE_NAME)
const key_path = path.join(ios_root, 'LunimcenterArchive.swift')
const output = path.join(root, 'dist/build/h5')
const checking = process.argv.includes('--check')
const force = process.argv.includes('--force')
const separator = process.argv.indexOf('--')
const build_args = separator >= 0 ? process.argv.slice(separator + 1) : ['build']

const run_build = () => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(root, 'scripts/run-uni.cjs'), ...build_args], {
    cwd: root, stdio: 'inherit', env: { ...process.env, LUNMI_SKIP_IOS_SYNC: '1' }
  })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error('H5 build failed; the previous iOS bundle was preserved.')))
  const forward = (signal) => child.kill(signal)
  const on_interrupt = () => forward('SIGINT')
  const on_terminate = () => forward('SIGTERM')
  process.once('SIGINT', on_interrupt)
  process.once('SIGTERM', on_terminate)
  child.once('exit', () => { process.removeListener('SIGINT', on_interrupt); process.removeListener('SIGTERM', on_terminate) })
})

const acquire_lock = async (lock) => {
  const started = Date.now()
  let reported = false
  while (true) {
    try { await mkdir(lock); return } catch (error) {
      if (error.code !== 'EEXIST') throw error
      if (Date.now() - started > 120000) throw new Error('iOS sync lock timed out. Remove .web-sync-lock only after confirming no sync process remains.')
      if (!reported) { console.log('Waiting for the current iOS synchronization to finish...'); reported = true }
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
}

const main = async () => {
  let fingerprint = await source_fingerprint(root)
  let key = await read_package_key(key_path)
  const current = await check_package({ destination, key, source_sha256: fingerprint })
  const is_current = Boolean(current)
  if (checking) {
    if (!is_current) throw new Error('iOS resources are stale. Run pnpm sync:ios in lunmi_h5.')
    console.log('LunmiBrafer encrypted package matches H5 source and decrypted content fingerprints (' + current.fileCount + ' files).')
    return
  }
  if (is_current && !force) { console.log('LunmiBrafer encrypted H5 package is current.'); return }
  await mkdir(ios_root, { recursive: true })
  const lock = path.join(ios_root, '.web-sync-lock')
  await acquire_lock(lock)
  try {
    fingerprint = await source_fingerprint(root)
    key = await read_package_key(key_path)
    if (!force && await check_package({ destination, key, source_sha256: fingerprint })) {
      console.log('LunmiBrafer encrypted H5 package is current.')
      return
    }
    await run_build()
    const after_build = await source_fingerprint(root)
    if (after_build !== fingerprint) throw new Error('H5 source changed during the build. Run sync again to avoid packaging mixed versions.')
    if (!(await read_package_key(key_path)).equals(key)) throw new Error('Packaging key changed during the build. Run sync again.')
    const result = await package_web_bundle({ source: output, destination, source_sha256: fingerprint, key })
    if (await source_fingerprint(root) !== fingerprint || !(await read_package_key(key_path)).equals(key)) {
      throw new Error('H5 source or packaging key changed during synchronization. Run sync again.')
    }
    // Remove the former generated plaintext resources only after the encrypted
    // replacement has passed its compression/decryption/content round trip.
    await rm(path.join(ios_root, 'Web'), { recursive: true, force: true })
    await rm(path.join(ios_root, 'WebBundleManifest.json'), { force: true })
    await rm(path.join(ios_root, 'lunimcenter'), { recursive: true, force: true })
    console.log('Synchronized ' + result.fileCount + ' H5 files into ' + result.archiveName + ' (embedded encrypted manifest, two compression layers, AES-256-GCM).')
  } finally { await rm(lock, { recursive: true, force: true }) }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, mkdir, readFile, writeFile, copyFile, readdir, rm, chmod } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import test, { before, after } from 'node:test'
import { package_web_bundle, read_package_key, PACKAGE_NAME } from './lunimcenter-package.mjs'
import { source_fingerprint, source_directories, source_files } from './ios-sync-lib.mjs'

const run = promisify(execFile)
const ios = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../LunmiBrafer')
const nativeFiles = ['LucentWonderment.swift', 'PersistentPivotGlow.swift', 'ApogeeAwakenSpark.swift']
let temporary, tool, key

before(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'lunmi-portable-'))
  tool = path.join(temporary, 'prepare-resources')
  key = await read_package_key(path.join(ios, 'LunmiBrafer'))
  const { stdout } = await run('/usr/bin/xcrun', ['--sdk', 'macosx', '--show-sdk-path'])
  await run('/usr/bin/xcrun', ['--sdk', 'macosx', 'swiftc', '-sdk', stdout.trim(),
    '-swift-version', '5', '-module-cache-path', path.join(temporary, 'ModuleCache'), '-parse-as-library',
    path.join(ios, 'scripts/prepare-resources.swift'), ...nativeFiles.map(name => path.join(ios, 'LunmiBrafer', name)), '-o', tool])
})
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }) })

const fixture = async (withSource = false, packageKey = key) => {
  const root = await mkdtemp(path.join(temporary, 'handoff with spaces-'))
  const project = path.join(root, 'LunmiBrafer')
  const derived = path.join(root, 'Derived files')
  const h5 = path.join(root, 'lunmi_h5')
  const dist = path.join(root, 'build')
  await mkdir(path.join(project, 'LunmiBrafer'), { recursive: true })
  await mkdir(dist)
  await writeFile(path.join(dist, 'index.html'), '<html>portable fixture</html>')
  await copyFile(path.join(ios, 'LunmiBrafer/Info.plist'), path.join(project, 'LunmiBrafer/Info.plist'))
  if (withSource) {
    for (const directory of source_directories) await mkdir(path.join(h5, directory), { recursive: true })
    for (const filename of source_files) await writeFile(path.join(h5, filename), '{}')
    for (const filename of ['src/願い🌙.js', 'src/\u{10000}.js', 'src/\ue000.js', 'static/leaf.svg', '.env', '.env.production']) {
      await writeFile(path.join(h5, filename), 'fixture')
    }
    await writeFile(path.join(h5, 'src/.DS_Store'), 'ignored')
  }
  const bundle = path.join(project, 'LunmiBrafer', PACKAGE_NAME)
  await package_web_bundle({ source: dist, destination: bundle,
    source_sha256: withSource ? await source_fingerprint(h5) : 'not-distributed', key: packageKey })
  const environment = { ...process.env, SRCROOT: project, DERIVED_FILE_DIR: derived }
  return { root, project, derived, h5, bundle, environment }
}

const stageBuildTool = async entry => {
  await mkdir(path.join(entry.project, 'scripts'))
  for (const filename of ['sync-h5.sh', 'prepare-resources.swift']) {
    await copyFile(path.join(ios, 'scripts', filename), path.join(entry.project, 'scripts', filename))
  }
  for (const filename of nativeFiles) {
    await copyFile(path.join(ios, 'LunmiBrafer', filename), path.join(entry.project, 'LunmiBrafer', filename))
  }
}

test('an iOS-only handoff builds its configuration without invoking Node or needing the H5 directory', async () => {
  const entry = await fixture()
  await stageBuildTool(entry)
  const forbiddenNode = path.join(entry.root, 'unavailable-node')
  await writeFile(forbiddenNode, '#!/bin/sh\necho "Node must not be invoked" >&2\nexit 99\n')
  await chmod(forbiddenNode, 0o755)
  const result = await run('/bin/sh', [path.join(entry.project, 'scripts/sync-h5.sh')], {
    env: { ...entry.environment, NODE_BINARY: forbiddenNode }
  })
  assert.match(result.stdout, /Verified bundled H5/)
  const info = JSON.parse((await run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', path.join(entry.derived, 'LunmiBrafer-Info.plist')])).stdout)
  const domains = info.NSAppTransportSecurity?.NSExceptionDomains
  assert.equal(Object.keys(domains).length, 1)
  assert.equal(Object.values(domains)[0].NSIncludesSubdomains, false)
  assert.equal(info.NSAppTransportSecurity.NSAllowsArbitraryLoads, undefined)
  assert.equal((await readdir(path.join(entry.derived, 'LunmiBuildResources'))).some(name => name.startsWith('Validation-')), false)
})

test('Swift source fingerprints match Node for environment files, Unicode paths and public Vite variables', async () => {
  const previous = process.env.VITE_LUNMI_PORTABILITY_CHECK
  process.env.VITE_LUNMI_PORTABILITY_CHECK = 'fixture'
  try {
    const entry = await fixture(true)
    const result = await run(tool, { env: entry.environment })
    assert.match(result.stdout, /Verified bundled H5/)
  } finally {
    if (previous === undefined) delete process.env.VITE_LUNMI_PORTABILITY_CHECK
    else process.env.VITE_LUNMI_PORTABILITY_CHECK = previous
  }
})

test('missing Node can use current source, while unsynchronized source and environment changes fail', async () => {
  const entry = await fixture(true)
  await stageBuildTool(entry)
  await run('/bin/sh', [path.join(entry.project, 'scripts/sync-h5.sh')], {
    env: { ...entry.environment, NODE_BINARY: path.join(entry.root, 'node-not-installed') }
  })
  for (const filename of ['src/extra.js', 'static/extra.svg', 'scripts/extra.mjs', '.env.extra']) {
    await writeFile(path.join(entry.h5, filename), 'changed')
    await assert.rejects(run(tool, { env: entry.environment }), error => /do not match the included source/.test(error.stderr))
    await rm(path.join(entry.h5, filename))
  }
  await assert.rejects(run(tool, { env: { ...entry.environment, VITE_LUNMI_PORTABILITY_OTHER: 'changed' } }),
    error => /do not match the included source/.test(error.stderr))
  await run(tool, { env: entry.environment })
})

test('missing, damaged and wrong-key packages cannot pass an iOS-only build', async () => {
  const entry = await fixture()
  const archive = await readFile(entry.bundle)
  archive[archive.length - 1] ^= 1
  await writeFile(entry.bundle, archive)
  await assert.rejects(run(tool, { env: entry.environment }), error => /missing, damaged, or paired/.test(error.stderr))
  await rm(entry.bundle)
  await assert.rejects(run(tool, { env: entry.environment }), error => /missing, damaged, or paired/.test(error.stderr))
  const wrongKey = await fixture(false, randomBytes(32))
  await assert.rejects(run(tool, { env: wrongKey.environment }), error => /missing, damaged, or paired/.test(error.stderr))
})

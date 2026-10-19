import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { copy_web_bundle, directory_fingerprint, source_fingerprint, source_files } from './ios-sync-lib.mjs'

test('source fingerprint detects edits to locales, assets and environment configuration', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lunmi-source-'))
  try {
    for (const directory of ['src', 'static', 'scripts']) await mkdir(path.join(root, directory))
    for (const filename of source_files) await writeFile(path.join(root, filename), '{}')
    let previous = await source_fingerprint(root)
    for (const filename of ['src/ja.json', 'static/lantern.svg', '.env.production', 'scripts/build.mjs']) {
      await writeFile(path.join(root, filename), 'changed')
      const next = await source_fingerprint(root)
      assert.notEqual(previous, next, filename)
      previous = next
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('bundle replaces removed files, verifies content and rolls back on manifest failure', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lunmi-bundle-'))
  try {
    const source = path.join(root, 'dist')
    const destination = path.join(root, 'Web')
    const manifest_path = path.join(root, 'manifest.json')
    await mkdir(source)
    await writeFile(path.join(source, 'index.html'), '<html>first</html>')
    await writeFile(path.join(source, 'old.js'), 'old')
    const first = await copy_web_bundle({ source, destination, manifest_path, source_sha256: 'first' })
    assert.equal(first.contentSHA256, (await directory_fingerprint(destination)).sha256)
    await rm(path.join(source, 'old.js'))
    await writeFile(path.join(source, 'index.html'), '<html>second</html>')
    const second = await copy_web_bundle({ source, destination, manifest_path, source_sha256: 'second' })
    assert.equal(second.fileCount, 1)
    assert.notEqual(first.contentSHA256, second.contentSHA256)
    await assert.rejects(readFile(path.join(destination, 'old.js')))
    await writeFile(path.join(source, 'index.html'), '<html>third</html>')
    await assert.rejects(copy_web_bundle({ source, destination, manifest_path: path.join(root, 'missing', 'manifest.json'), source_sha256: 'third' }))
    assert.equal(await readFile(path.join(destination, 'index.html'), 'utf8'), '<html>second</html>')
    assert.equal(JSON.parse(await readFile(manifest_path, 'utf8')).sourceSHA256, 'second')
  } finally { await rm(root, { recursive: true, force: true }) }
})

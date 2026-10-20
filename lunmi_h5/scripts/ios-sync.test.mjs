import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rename, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import { directory_fingerprint, source_fingerprint, source_files } from './ios-sync-lib.mjs'
import { check_package, package_web_bundle, unpack_package, read_package_manifest, read_package_key, decode_native_string, read_native_string_declarations, PACKAGE_NAME } from './lunimcenter-package.mjs'

test('native package key lookup survives Swift file renames and rejects ambiguous declarations', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lunmi-native-key-'))
  const key = randomBytes(32)
  const first = path.join(root, 'Original.swift')
  const renamed = path.join(root, 'ApogeeAwakenSpark.swift')
  const declaration = `enum Example {\n    static let scatteringSable = "${key.toString('base64')}"\n}\n`
  try {
    await writeFile(first, declaration)
    assert.ok((await read_package_key(first)).equals(key))
    assert.ok((await read_package_key(root)).equals(key))
    await rename(first, renamed)
    assert.ok((await read_package_key(root)).equals(key))
    const interleaved = Array.from(key.toString('base64'), value => value + 'q').join('')
    for (const decoder of ['glenAquarelle', 'willowSonority']) {
      await writeFile(renamed, `enum Example {\n    static let scatteringSable = LucentWonderment.${decoder}("${interleaved}")\n}\n`)
      assert.ok((await read_package_key(root)).equals(key))
    }
    await writeFile(path.join(root, 'Duplicate.swift'), declaration)
    await assert.rejects(read_package_key(root), /valid 256-bit/)
    await rm(renamed)
    await rm(path.join(root, 'Duplicate.swift'))
    await assert.rejects(read_package_key(root), /valid 256-bit/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('native string decoding preserves Unicode scalars and supports encoded build configuration', () => {
  const encode = value => Array.from(value, scalar => scalar + 'q').join('')
  for (const value of ['', 'abc', '\0\n"\\', '願い🌙e\u0301👨‍👩‍👧']) {
    assert.equal(decode_native_string(encode(value)), value)
  }
  const api = 'https://example.invalid/api'
  const encoded = encode(api)
  for (const decoder of ['glenAquarelle', 'willowSonority']) {
    assert.deepEqual(read_native_string_declarations(`let example = LucentWonderment.${decoder}("${encoded}")`, 'example'), [api])
    assert.throws(() => read_native_string_declarations(`let example = LucentWonderment.${decoder}("x")`, 'example'), /Invalid interleaved/)
  }
  assert.deepEqual(read_native_string_declarations(`let example = "${api}"`, 'example'), [api])
})

const sha256 = data => createHash('sha256').update(data).digest('hex')
const open_section = (box, key, aad) => {
  const decipher = createDecipheriv('aes-256-gcm', key, box.subarray(0, 12))
  decipher.setAAD(aad)
  decipher.setAuthTag(box.subarray(-16))
  return Buffer.concat([decipher.update(box.subarray(12, -16)), decipher.final()])
}
const seal_section = (data, key, aad) => {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  cipher.setAAD(aad)
  return Buffer.concat([nonce, cipher.update(data), cipher.final(), cipher.getAuthTag()])
}
// Construct deliberately malformed but correctly authenticated fixtures so path
// and decompression limits are tested independently of authentication failure.
const rewrite_package = (archive, key, mutate_payload, mutate_metadata = value => value) => {
  const header = archive.subarray(0, 12)
  const metadata_size = header.readUInt32LE(8)
  let manifest = JSON.parse(open_section(archive.subarray(12, 12 + metadata_size), key, header))
  const aad = Buffer.concat([header.subarray(0, 8), Buffer.from('payload')])
  const payload = inflateRawSync(inflateRawSync(open_section(archive.subarray(12 + metadata_size), key, aad)))
  mutate_payload(payload, manifest)
  const inner = deflateRawSync(payload)
  const encrypted = seal_section(deflateRawSync(inner), key, aad)
  manifest = mutate_metadata({ ...manifest, innerSize: inner.length, payloadSize: payload.length,
    payloadSHA256: sha256(payload), ciphertextSHA256: sha256(encrypted) })
  const metadata = Buffer.from(JSON.stringify(manifest))
  const next_header = Buffer.from(header)
  next_header.writeUInt32LE(metadata.length + 28, 8)
  return Buffer.concat([next_header, seal_section(metadata, key, next_header), encrypted])
}

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

test('one opaque file contains the encrypted manifest and all resources; failed builds preserve it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lunmi-bundle-'))
  try {
    const source = path.join(root, 'dist')
    const destination = path.join(root, PACKAGE_NAME)
    const key = randomBytes(32)
    await mkdir(source)
    await writeFile(path.join(source, 'index.html'), '<html>first</html>')
    await writeFile(path.join(source, 'old.js'), 'old')
    await writeFile(path.join(source, '..-vendor.js'), 'legal generated chunk filename')
    const first = await package_web_bundle({ source, destination, source_sha256: 'first', key })
    assert.equal(first.contentSHA256, (await directory_fingerprint(source)).sha256)
    const packed = await readFile(destination)
    assert.equal(packed.includes(Buffer.from('<html>first</html>')), false)
    assert.equal(packed.includes(Buffer.from('sourceSHA256')), false)
    const { files, manifest } = unpack_package(packed, key)
    assert.equal(manifest.version, 3)
    assert.equal(manifest.sourceSHA256, 'first')
    assert.equal(files.find(file => file.path === 'index.html').data.toString(), '<html>first</html>')
    assert.equal((await check_package({ destination, source_sha256: 'first', key })).fileCount, 3)
    assert.equal(await check_package({ destination, source_sha256: 'changed', key }), null)
    assert.deepEqual((await readdir(root)).sort(), ['dist', PACKAGE_NAME].sort())
    await rm(path.join(source, 'old.js'))
    await rm(path.join(source, '..-vendor.js'))
    await writeFile(path.join(source, 'index.html'), '<html>second</html>')
    const second = await package_web_bundle({ source, destination, source_sha256: 'second', key })
    assert.equal(second.fileCount, 1)
    assert.notEqual(first.contentSHA256, second.contentSHA256)
    assert.deepEqual(unpack_package(await readFile(destination), key).files.map(file => file.path), ['index.html'])
    const previous = await readFile(destination)
    await rm(path.join(source, 'index.html'))
    await assert.rejects(package_web_bundle({ source, destination, source_sha256: 'third', key }))
    assert.deepEqual(await readFile(destination), previous)
    assert.equal(read_package_manifest(previous, key).sourceSHA256, 'second')
    assert.equal((await check_package({ destination, source_sha256: 'second', key })).contentSHA256, second.contentSHA256)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('wrong keys, metadata changes, length-header changes and payload changes are rejected', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lunmi-auth-'))
  try {
    const source = path.join(root, 'dist')
    const destination = path.join(root, PACKAGE_NAME)
    await mkdir(source)
    await writeFile(path.join(source, 'index.html'), '<html>authenticated</html>')
    const key = randomBytes(32)
    await package_web_bundle({ source, destination, source_sha256: 'test', key })
    const packed = await readFile(destination)
    assert.throws(() => unpack_package(packed, randomBytes(32)))
    for (const position of [8, 24, packed.length - 1]) {
      const changed = Buffer.from(packed)
      changed[position] ^= 1
      assert.throws(() => unpack_package(changed, key))
    }
    assert.throws(() => unpack_package(packed.subarray(0, -12), key))
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('authenticated traversal paths and oversized decompression metadata are rejected', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lunmi-path-'))
  try {
    const source = path.join(root, 'dist')
    const destination = path.join(root, PACKAGE_NAME)
    await mkdir(source)
    await writeFile(path.join(source, 'index.html'), '<html>safe</html>')
    const key = randomBytes(32)
    await package_web_bundle({ source, destination, source_sha256: 'test', key })
    const packed = await readFile(destination)
    const oversized = rewrite_package(packed, key, () => {}, manifest => ({ ...manifest, payloadSize: 1024 ** 3 }))
    assert.throws(() => unpack_package(oversized, key))
    const traversal = rewrite_package(packed, key, (payload, manifest) => {
      Buffer.from('../xx.html').copy(payload, 56)
      manifest.files[0].path = '../xx.html'
    })
    assert.throws(() => unpack_package(traversal, key), /path/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

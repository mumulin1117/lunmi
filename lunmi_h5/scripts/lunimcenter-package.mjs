import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { files_under } from './ios-sync-lib.mjs'

export const PACKAGE_NAME = 'lunimcenter.bundledata'
const envelope_magic = Buffer.from('LUNIMC02')
const payload_aad = Buffer.concat([envelope_magic, Buffer.from('payload')])
const maximum_manifest_size = 8 * 1024 * 1024
const payload_magic = Buffer.from('LNCFILES')
const maximum_size = 512 * 1024 * 1024
const maximum_files = 20000
const sha256 = value => createHash('sha256').update(value).digest('hex')
const key_id = key => sha256(key)

export const read_package_key = async filename => {
  const source = await readFile(filename, 'utf8')
  const encoded = source.match(/static let base64 = "([A-Za-z0-9+/]{43}=)"/)?.[1]
  const key = Buffer.from(encoded || '', 'base64')
  if (!encoded || key.length !== 32) throw new Error('A valid 256-bit lunimcenter package key is required.')
  return key
}

const safe_path = name => typeof name === 'string' && name.length > 0
  && Buffer.byteLength(name) <= 4096 && !name.includes('\\') && !/[\u0000-\u001f]/.test(name)
  && name.split('/').every(part => part.length > 0 && part !== '.' && part !== '..')

const content_digest = files => {
  const hash = createHash('sha256')
  for (const file of files) hash.update(file.path).update('\0').update(file.data).update('\0')
  return hash.digest('hex')
}

const seal = (data, key, aad) => {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  cipher.setAAD(aad)
  return Buffer.concat([nonce, cipher.update(data), cipher.final(), cipher.getAuthTag()])
}

const open = (box, key, aad) => {
  if (box.length < 28) throw new Error('Truncated encrypted package section.')
  const decipher = createDecipheriv('aes-256-gcm', key, box.subarray(0, 12))
  decipher.setAAD(aad)
  decipher.setAuthTag(box.subarray(-16))
  return Buffer.concat([decipher.update(box.subarray(12, -16)), decipher.final()])
}

// Both the manifest and double-compressed payload are authenticated sections of
// one file. Only the small version/length header is stored in plaintext.
const open_package = (archive, key) => {
  if (key.length !== 32 || archive.length < 68 || archive.length > maximum_size
    || !archive.subarray(0, 8).equals(envelope_magic)) throw new Error('Invalid lunimcenter package header.')
  const manifest_size = archive.readUInt32LE(8)
  if (manifest_size < 28 || manifest_size > maximum_manifest_size
    || 12 + manifest_size + 28 > archive.length) throw new Error('Invalid encrypted manifest size.')
  const manifest = JSON.parse(open(archive.subarray(12, 12 + manifest_size), key, archive.subarray(0, 12)).toString('utf8'))
  const encrypted_payload = archive.subarray(12 + manifest_size)
  if (manifest?.version !== 3 || manifest.project !== 'LunmiBrafer' || manifest.archiveName !== PACKAGE_NAME
    || manifest.keyID !== key_id(key) || manifest.encryption !== 'AES-256-GCM'
    || JSON.stringify(manifest.compression) !== '["deflate-raw","deflate-raw"]'
    || manifest.fileCount < 1 || manifest.fileCount > maximum_files
    || manifest.files?.length !== manifest.fileCount
    || ![manifest.payloadSize, manifest.innerSize].every(size => Number.isSafeInteger(size) && size > 0 && size <= maximum_size)
    || sha256(encrypted_payload) !== manifest.ciphertextSHA256) {
    throw new Error('Invalid lunimcenter package metadata or ciphertext hash.')
  }
  return { manifest: { ...manifest, archiveSHA256: sha256(archive) }, encrypted_payload }
}

export const read_package_manifest = (archive, key) => open_package(archive, key).manifest

// --check also decodes both compression layers and checks every file; the
// embedded source fingerprint alone is not considered sufficient.
export const unpack_package = (archive, key) => {
  const { manifest, encrypted_payload } = open_package(archive, key)
  const compressed = open(encrypted_payload, key, payload_aad)
  const inner = inflateRawSync(compressed, { maxOutputLength: manifest.innerSize })
  const payload = inflateRawSync(inner, { maxOutputLength: manifest.payloadSize })
  if (inner.length !== manifest.innerSize || payload.length !== manifest.payloadSize
    || sha256(payload) !== manifest.payloadSHA256 || !payload.subarray(0, 8).equals(payload_magic)
    || payload.readUInt32LE(8) !== manifest.fileCount) throw new Error('Invalid decompressed lunimcenter payload.')
  let cursor = 12
  const seen = new Set()
  const files = manifest.files.map(expected => {
    if (cursor + 44 > payload.length) throw new Error('Truncated resource record.')
    const name_size = payload.readUInt32LE(cursor)
    const size64 = payload.readBigUInt64LE(cursor + 4)
    if (size64 > BigInt(maximum_size) || name_size > 4096) throw new Error('Resource exceeds size limit.')
    const size = Number(size64)
    const digest = payload.subarray(cursor + 12, cursor + 44).toString('hex')
    cursor += 44
    if (cursor + name_size + size > payload.length) throw new Error('Truncated resource data.')
    const name = payload.subarray(cursor, cursor + name_size).toString('utf8')
    cursor += name_size
    const data = payload.subarray(cursor, cursor + size)
    cursor += size
    const normalized = name.normalize('NFC').toLowerCase()
    if (!safe_path(name) || seen.has(normalized) || name !== expected.path || size !== expected.size
      || digest !== expected.sha256 || sha256(data) !== digest) throw new Error('Invalid resource path or content.')
    seen.add(normalized)
    return { path: name, data }
  })
  const entry = files.find(file => file.path === 'index.html')
  if (cursor !== payload.length || !entry?.data.length || sha256(entry.data) !== manifest.entrySHA256
    || content_digest(files) !== manifest.contentSHA256) throw new Error('Resource content fingerprint mismatch.')
  return { manifest, files }
}

export const check_package = async ({ destination, key, source_sha256 }) => {
  try {
    const { manifest } = unpack_package(await readFile(destination), key)
    if (manifest.sourceSHA256 !== source_sha256) return null
    return manifest
  } catch { return null }
}

export const package_web_bundle = async ({ source, destination, source_sha256, key }) => {
  if (key.length !== 32) throw new Error('The packaging key must contain exactly 32 random bytes.')
  const names = await files_under(source)
  if (names.length < 1 || names.length > maximum_files) throw new Error('Invalid resource file count.')
  const files = []
  const parts = [payload_magic, Buffer.alloc(4)]
  parts[1].writeUInt32LE(names.length)
  let payload_size = 12
  const seen = new Set()
  for (const filename of names) {
    const name = path.relative(source, filename).split(path.sep).join('/')
    const normalized = name.normalize('NFC').toLowerCase()
    if (!safe_path(name) || seen.has(normalized)) throw new Error('Invalid or duplicate H5 resource path: ' + name)
    seen.add(normalized)
    const data = await readFile(filename)
    const encoded = Buffer.from(name)
    payload_size += 44 + encoded.length + data.length
    if (payload_size > maximum_size) throw new Error('H5 resources exceed the package size limit.')
    const digest = sha256(data)
    const header = Buffer.alloc(44)
    header.writeUInt32LE(encoded.length)
    header.writeBigUInt64LE(BigInt(data.length), 4)
    Buffer.from(digest, 'hex').copy(header, 12)
    parts.push(header, encoded, data)
    files.push({ path: name, size: data.length, sha256: digest, data })
  }
  const entry = files.find(file => file.path === 'index.html')
  if (!entry?.data.length) throw new Error('The H5 entry file is empty or missing.')
  const payload = Buffer.concat(parts)
  const inner = deflateRawSync(payload, { level: 9 })
  const compressed = deflateRawSync(inner, { level: 9 })
  const encrypted_payload = seal(compressed, key, payload_aad)
  const manifest = {
    version: 3, project: 'LunmiBrafer', archiveName: PACKAGE_NAME,
    encryption: 'AES-256-GCM', compression: ['deflate-raw', 'deflate-raw'], keyID: key_id(key),
    sourceSHA256: source_sha256, contentSHA256: content_digest(files),
    entrySHA256: sha256(entry.data), ciphertextSHA256: sha256(encrypted_payload), payloadSHA256: sha256(payload),
    payloadSize: payload.length, innerSize: inner.length, fileCount: files.length,
    files: files.map(({ data: _data, ...metadata }) => metadata), generatedAt: new Date().toISOString()
  }
  const metadata = Buffer.from(JSON.stringify(manifest))
  const header = Buffer.alloc(12)
  envelope_magic.copy(header)
  header.writeUInt32LE(metadata.length + 28, 8)
  if (metadata.length + 28 > maximum_manifest_size) throw new Error('Resource manifest exceeds the package size limit.')
  const archive = Buffer.concat([header, seal(metadata, key, header), encrypted_payload])
  // A round trip is required before replacing the previous usable package.
  const verified = unpack_package(archive, key).manifest
  await mkdir(path.dirname(destination), { recursive: true })
  const staging = destination + '.staging-' + process.pid
  await rm(staging, { recursive: true, force: true })
  try {
    await writeFile(staging, archive)
    // POSIX replacement within one directory is atomic: readers see either the
    // previous complete file or the new verified file, never a partial package.
    await rename(staging, destination)
  } finally {
    await rm(staging, { force: true })
  }
  return verified
}

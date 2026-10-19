import { createHash } from 'node:crypto'
import { readdir, readFile, mkdir, rm, cp, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const source_directories = ['src', 'static', 'scripts']
export const source_files = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'vite.config.js', 'index.html']

export const files_under = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.sort((a, b) => a.name.localeCompare(b.name)).map(async (entry) => {
    if (entry.name === '.DS_Store') return []
    const filename = path.join(directory, entry.name)
    return entry.isDirectory() ? files_under(filename) : entry.isFile() ? [filename] : []
  }))
  return files.flat()
}

export const directory_fingerprint = async (directory) => {
  const hash = createHash('sha256')
  const files = await files_under(directory)
  for (const filename of files) {
    hash.update(path.relative(directory, filename).split(path.sep).join('/'))
    hash.update('\0')
    hash.update(await readFile(filename))
    hash.update('\0')
  }
  return { sha256: hash.digest('hex'), files: files.length }
}

export const source_fingerprint = async (root) => {
  const hash = createHash('sha256')
  const directories = await Promise.all(source_directories.map((name) => files_under(path.join(root, name))))
  const environment_files = (await readdir(root)).filter((name) => /^\.env(?:\.|$)/.test(name))
  const files = [...directories.flat(), ...[...source_files, ...environment_files].map((name) => path.join(root, name))].sort()
  for (const filename of files) {
    hash.update(path.relative(root, filename).split(path.sep).join('/'))
    hash.update('\0')
    hash.update(await readFile(filename))
    hash.update('\0')
  }
  // Public Vite build variables can also be supplied by a build environment.
  for (const key of Object.keys(process.env).filter((key) => key.startsWith('VITE_')).sort()) {
    hash.update(key + '=' + process.env[key] + '\0')
  }
  return hash.digest('hex')
}

export const read_manifest = async (filename) => {
  try { return JSON.parse(await readFile(filename, 'utf8')) } catch { return null }
}

export const copy_web_bundle = async ({ source, destination, manifest_path, source_sha256 }) => {
  const entry = await readFile(path.join(source, 'index.html'))
  if (!entry.length) throw new Error('The H5 entry file is empty.')
  await mkdir(path.dirname(destination), { recursive: true })
  const staging = destination + '.staging-' + process.pid
  const previous = destination + '.previous-' + process.pid
  await rm(staging, { recursive: true, force: true })
  await cp(source, staging, { recursive: true, dereference: false })
  const content = await directory_fingerprint(staging)
  const original = await directory_fingerprint(source)
  if (content.sha256 !== original.sha256) throw new Error('H5 bundle copy verification failed.')
  let has_previous = false
  try { await rename(destination, previous); has_previous = true } catch (error) { if (error.code !== 'ENOENT') throw error }
  try {
    await rename(staging, destination)
    const manifest = {
      version: 1, project: 'LunmiBrafer', sourceSHA256: source_sha256,
      contentSHA256: content.sha256, fileCount: content.files,
      entrySHA256: createHash('sha256').update(entry).digest('hex'),
      generatedAt: new Date().toISOString()
    }
    const temporary_manifest = manifest_path + '.tmp'
    await writeFile(temporary_manifest, JSON.stringify(manifest, null, 2) + '\n')
    await rename(temporary_manifest, manifest_path)
    if (has_previous) await rm(previous, { recursive: true, force: true })
    return manifest
  } catch (error) {
    await rm(destination, { recursive: true, force: true })
    if (has_previous) await rename(previous, destination)
    throw error
  } finally { await rm(staging, { recursive: true, force: true }) }
}

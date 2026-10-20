import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export const source_directories = ['src', 'static', 'scripts']
export const source_files = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'vite.config.js', 'index.html']

export const files_under = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.sort((a, b) => a.name.localeCompare(b.name)).map(async (entry) => {
    if (entry.name === '.DS_Store') return []
    const filename = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error('Resource symlinks are not supported: ' + filename)
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



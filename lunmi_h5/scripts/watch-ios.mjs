import { watch } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { source_directories, source_files } from './ios-sync-lib.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let timer = null
let child = null
let dirty = false
let stopped = false
const run = () => {
  if (stopped) return
  if (child) { dirty = true; return }
  dirty = false
  child = spawn(process.execPath, [path.join(root, 'scripts/sync-ios.mjs')], { cwd: root, stdio: 'inherit' })
  child.on('error', (error) => console.error('Could not start iOS synchronization: ' + error.message))
  child.on('exit', (code) => {
    child = null
    if (code) console.error('iOS synchronization failed; waiting for the next edit or manual retry.')
    if (dirty && !stopped) run()
  })
}
const schedule = () => { clearTimeout(timer); timer = setTimeout(run, 600) }
const watchers = source_directories.map((name) => watch(path.join(root, name), { recursive: true }, schedule))
watchers.push(watch(root, (_event, filename) => {
  if (source_files.includes(String(filename)) || /^\.env(?:\.|$)/.test(String(filename))) schedule()
}))
const stop = () => { stopped = true; clearTimeout(timer); watchers.forEach((watcher) => watcher.close()); child?.kill('SIGTERM') }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
console.log('Watching Lunmi H5 source; edits rebuild and synchronize LunmiBrafer automatically.')
run()

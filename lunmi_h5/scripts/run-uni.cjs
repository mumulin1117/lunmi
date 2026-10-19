const path = require('node:path')
const { spawn } = require('node:child_process')

const project_root = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
const synchronize_build = args.includes('build') && process.env.LUNMI_SKIP_IOS_SYNC !== '1'
const executable = synchronize_build
  ? path.join(project_root, 'scripts/sync-ios.mjs')
  : require.resolve('@dcloudio/vite-plugin-uni/bin/uni.js')
const child = spawn(process.execPath, [executable, ...(synchronize_build ? ['--force', '--', ...args] : args)], {
  cwd: project_root,
  env: { ...process.env, UNI_INPUT_DIR: path.join(project_root, 'src') },
  stdio: 'inherit'
})
child.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
child.on('exit', (code, signal) => {
  if (signal) { process.kill(process.pid, signal); return }
  process.exitCode = code ?? 1
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))

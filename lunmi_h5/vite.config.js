import { defineConfig, loadEnv } from 'vite'
import uniPlugin from '@dcloudio/vite-plugin-uni'
import { cpSync, existsSync } from 'node:fs'
import path from 'node:path'

const uni = uniPlugin.default || uniPlugin
const DEFAULT_API_ORIGIN = 'http://localhost:10003'

const read_api_origin = (api_base_url) => {
  const normalized = `${api_base_url || ''}`.trim().replace(/\/+$/, '')
  if (!normalized) return DEFAULT_API_ORIGIN
  try {
    return new URL(normalized).origin
  } catch {
    return DEFAULT_API_ORIGIN
  }
}

const copy_static_directory_plugin = () => {
  let output_directory = ''

  return {
    name: 'common-template-copy-static-directory',
    apply: 'build',
    configResolved(config) {
      output_directory = config.build.outDir
    },
    closeBundle() {
      const source_directory = path.resolve(process.cwd(), 'static')
      if (!existsSync(source_directory) || !output_directory) return

      cpSync(source_directory, path.resolve(output_directory, 'static'), {
        recursive: true,
        force: true
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const api_base_url = `${env.VITE_API_BASE_URL || ''}`.trim().replace(/\/+$/, '')
  const api_origin = read_api_origin(api_base_url)
  const upload_target = /\/api$/i.test(api_base_url) ? api_base_url : api_origin
  const ws_target = `${env.VITE_LIVE_WS_URL || ''}`.trim() || `${api_origin.replace(/^http/i, 'ws')}/ws`
  return {
    base: './',
    plugins: [uni(), copy_static_directory_plugin()],
    optimizeDeps: {
      include: ['svgaplayerweb', 'yyeva']
    },
    server: {
      host: '0.0.0.0',
      port: 12007,
      strictPort: false,
      proxy: {
        '/api': {
          target: api_base_url || DEFAULT_API_ORIGIN,
          changeOrigin: true,
          secure: false
        },
        '/sj': {
          target: upload_target,
          changeOrigin: true,
          secure: false
        },
        '/websocket': {
          target: ws_target,
          changeOrigin: true,
          ws: true
        }
      }
    }
  }
})

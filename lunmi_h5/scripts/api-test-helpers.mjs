import { readFile } from 'node:fs/promises'

const project_root = new URL('../', import.meta.url)
export const module_url = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`

export const import_source = async (relative_path, replacements = []) => {
  let source = await readFile(new URL(relative_path, project_root), 'utf8')
  for (const [from, to] of replacements) source = source.replace(from, to)
  return import(module_url(source) + '#' + Math.random())
}

// 业务 API 和 service 使用真实实现，只在传输/反馈边界注入测试替身。
export const load_api = async (path, transport) => {
  const calls = []
  const feedback = []
  const dependencies = {
    request_json: async (options) => {
      calls.push(options)
      return typeof transport === 'function' ? transport(options) : transport
    },
    request_multipart: async () => { throw new Error('Unexpected upload') },
    clear_login_state: () => feedback.push('clear'),
    open_api_error_dialog: (...args) => feedback.push(['dialog', ...args]),
    redirect_to_login: (delay) => feedback.push(['redirect', delay])
  }
  const key = '__api_test_' + Math.random().toString(36).slice(2)
  globalThis[key] = dependencies
  const response_source = await readFile(new URL('src/api/response.js', project_root), 'utf8')
  let service_source = await readFile(new URL('src/api/service.js', project_root), 'utf8')
  service_source = service_source
    .replace("import { request_json, request_multipart } from '@/api/request'", `const { request_json, request_multipart } = globalThis['${key}']`)
    .replace("from '@/api/response'", `from '${module_url(response_source)}'`)
    .replace("import { clear_login_state } from '@/utils/auth'", `const { clear_login_state } = globalThis['${key}']`)
    .replace("import { open_api_error_dialog } from '@/utils/apiFeedback'", `const { open_api_error_dialog } = globalThis['${key}']`)
    .replace("import { redirect_to_login } from '@/utils/routeGuard'", `const { redirect_to_login } = globalThis['${key}']`)
  const api = await import_source(path, [
    ["from '@/api/service'", `from '${module_url(service_source)}'`]
  ])
  delete globalThis[key]
  return { api, calls, feedback }
}

export const envelope = (code = 200000, data = {}, http_status = 200) => ({
  http_status,
  body: { code, data, message: code === 200000 ? 'Request success' : 'Request failed' }
})

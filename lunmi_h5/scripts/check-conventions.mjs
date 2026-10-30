import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const script_directory = path.dirname(fileURLToPath(import.meta.url))
const project_root = path.resolve(script_directory, '..')
const project_root_with_separator = `${project_root}${path.sep}`
const required_convention_files = [
  'AGENTS.md',
  'DEVELOPMENT_CONVENTIONS.md',
  'INTERACTION_CONVENTIONS.md',
  'conventions/00-core-platform.md',
  'conventions/01-page-data.md',
  'conventions/02-theme-and-ui.md',
  'conventions/03-page-structure.md',
  'conventions/04-feedback-and-loading.md',
  'conventions/05-post-and-media.md',
  'conventions/06-social-moderation-messaging.md',
  'conventions/07-navigation-and-transition.md',
  'conventions/08-ios-webview-and-safe-area.md',
  'conventions/09-code-style-and-assets.md',
  'conventions/10-validation-and-regression.md',
  'conventions/11-api-and-network.md'
]
const source_extensions = new Set(['.vue', '.js', '.mjs', '.cjs', '.scss', '.css'])
const store_state_keys = new Set(['token', 'isLogin', 'userInfo', 'authRecord', 'balance'])
const store_member_names = new Set([
  'token',
  'isLogin',
  'userInfo',
  'authRecord',
  'balance',
  'hasToken',
  'userId',
  'hasAuthPermission',
  'setToken',
  'getToken',
  'clearToken',
  'setLoginStatus',
  'persistLoginSession',
  'login',
  'logout',
  'setUserInfo',
  'updateUserInfo',
  'clearUserInfo',
  'setBalance',
  'addBalance',
  'subtractBalance',
  'clearBalance',
  'setAuthRecord',
  'getAuthRecord',
  'initLoginStatus',
  '$patch',
  '$reset',
  '$subscribe',
  '$onAction',
  '$dispose'
])
const storage_infrastructure_files = new Set([
  'src/utils/agreementConsent.js',
  'src/utils/caughtLanternPendingStorage.js',
  'src/utils/foundWishRandomCacheStorage.js',
  'src/utils/languagePreference.js',
  'src/utils/loginSession.js',
  'src/utils/permissionStorage.js',
  'src/utils/profileSetupStorage.js',
  'src/utils/profileGuideStorage.js',
  'src/utils/projectCache.js'
])
const bridge_infrastructure_files = new Set([
  'src/utils/iosBridge.js'
])
const field_alias_pairs = Object.freeze([
  ['userId', 'user_id'],
  ['userName', 'user_name'],
  ['userImgUrl', 'avatar_url'],
  ['userName', 'sender_name'],
  ['userImgUrl', 'user_avatar_url'],
  ['userImgUrl', 'sender_avatar_url'],
  ['sendUserId', 'sender_id'],
  ['receiveUserId', 'user_id'],
  ['sendUserName', 'sender_name'],
  ['receiveUserName', 'user_name'],
  ['sendUserImg', 'sender_avatar_url'],
  ['sendUserImgUrl', 'sender_avatar_url'],
  ['receiveUserImg', 'user_avatar_url'],
  ['dynamicId', 'post_id'],
  ['dynamicId', 'dynamic_id'],
  ['commentId', 'comment_id'],
  ['messageId', 'message_id'],
  ['conversationId', 'conversation_id'],
  ['liveId', 'live_id'],
  ['likeNum', 'like_count'],
  ['commentNum', 'comment_count'],
  ['createDate', 'created_at']
])
const presentation_field_names = new Set([
  'user_id',
  'post_id',
  'comment_id',
  'message_id',
  'conversation_id',
  'live_id',
  'avatar_url',
  'user_name',
  'user_avatar_url',
  'sender_name',
  'sender_avatar_url',
  'sender_id',
  'dynamic_id',
  'like_count',
  'comment_count',
  'created_at',
  'updated_at',
  'notice_id',
  'media_url',
  'cover_url',
  'content_type'
])
const errors = []
const warnings = []

const to_project_path = (file_path) => path.relative(project_root, file_path).replaceAll('\\', '/')

const add_issue = (list, rule, file_path, message, line = 0) => {
  list.push({ rule, file_path: to_project_path(file_path), message, line })
}

const read_text = (relative_path) => {
  const file_path = path.join(project_root, relative_path)
  return existsSync(file_path) ? readFileSync(file_path, 'utf8') : ''
}

const get_line_number = (source, index) => source.slice(0, index).split('\n').length

const normalize_input_path = (input_path) => {
  const resolved_path = path.resolve(project_root, input_path)
  if (resolved_path !== project_root && !resolved_path.startsWith(project_root_with_separator)) {
    throw new Error(`检查路径必须位于当前项目内：${input_path}`)
  }
  return to_project_path(resolved_path)
}

const run_git = (arguments_list) => {
  try {
    return execFileSync('git', ['-C', project_root, ...arguments_list], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch {
    return ''
  }
}

const collect_git_scope = () => {
  const modified_files = run_git(['diff', '--name-only', '--relative', '--diff-filter=ACMRTUXB', 'HEAD', '--', '.'])
  const tracked_files = run_git(['ls-files', '--', '.'])
  const untracked_files = tracked_files.trim()
    ? run_git(['ls-files', '--others', '--exclude-standard', '--', '.'])
    : ''
  return [...modified_files.split(/\r?\n/), ...untracked_files.split(/\r?\n/)]
    .map((file_path) => file_path.trim().replaceAll('\\', '/'))
    .filter(Boolean)
}

const parse_scope = () => {
  const raw_arguments = process.argv.slice(2)
  const explicit_paths = []
  let reading_files = false

  raw_arguments.forEach((argument) => {
    if (argument === '--') return
    if (argument === '--files') {
      reading_files = true
      return
    }
    if (argument.startsWith('--files=')) {
      explicit_paths.push(...argument.slice('--files='.length).split(','))
      reading_files = false
      return
    }
    if (reading_files || !argument.startsWith('-')) {
      explicit_paths.push(argument)
      reading_files = false
    }
  })

  const scope = explicit_paths.length ? explicit_paths : collect_git_scope()
  return [...new Set(scope.map(normalize_input_path))]
}

const check_required_files = () => {
  required_convention_files.forEach((relative_path) => {
    if (!existsSync(path.join(project_root, relative_path))) {
      add_issue(errors, 'required-convention-file', path.join(project_root, relative_path), '缺少项目约定文件。')
    }
  })
}

const check_markdown_links = (relative_path) => {
  const file_path = path.join(project_root, relative_path)
  const source = read_text(relative_path)
  if (!source.trim()) {
    add_issue(errors, 'empty-convention-file', file_path, '约定文件不能为空。')
    return
  }

  const link_pattern = /\[[^\]]+\]\((\.?\.?\/[^)#]+\.md)(?:#[^)]+)?\)/g
  for (const match of source.matchAll(link_pattern)) {
    const linked_path = path.resolve(path.dirname(file_path), match[1])
    if (!existsSync(linked_path)) {
      add_issue(errors, 'broken-convention-link', file_path, `约定文件链接不存在：${match[1]}`, get_line_number(source, match.index))
    }
  }
}

const check_convention_routes = () => {
  const development_index_path = path.join(project_root, 'DEVELOPMENT_CONVENTIONS.md')
  const development_index_source = read_text('DEVELOPMENT_CONVENTIONS.md')
  required_convention_files.slice(3).forEach((relative_path) => {
    if (!development_index_source.includes(`./${relative_path}`)) {
      add_issue(errors, 'convention-route', development_index_path, `开发约定索引缺少模块路由：${relative_path}`)
    }
  })

  required_convention_files.slice(3).forEach((relative_path) => {
    const module_path = path.join(project_root, relative_path)
    const module_source = read_text(relative_path)
    const required_labels = ['## 模块路由', '- 适用场景：', '- 前置模块：', '- 本模块负责：', '- 本模块不负责：', '- 读取要求：']
    required_labels.forEach((label) => {
      if (!module_source.includes(label)) {
        add_issue(errors, 'convention-module-route', module_path, `模块缺少路由字段：${label}`)
      }
    })
    if (!module_source.includes('../DEVELOPMENT_CONVENTIONS.md')) {
      add_issue(errors, 'convention-module-route', module_path, '模块必须提供返回开发约定索引的链接。')
    }
  })
}

const check_agents_contract = () => {
  const agents_path = path.join(project_root, 'AGENTS.md')
  const source = read_text('AGENTS.md')
  const required_markers = [
    'DEVELOPMENT_CONVENTIONS.md',
    'INTERACTION_CONVENTIONS.md',
    'corepack pnpm check:conventions',
    '当前任务修改或新增',
    '线上 API',
    '统一请求客户端'
  ]
  required_markers.forEach((marker) => {
    if (!source.includes(marker)) {
      add_issue(errors, 'agents-api-contract', agents_path, `AGENTS.md 缺少强制规则：${marker}`)
    }
  })
  if (!source.includes('反馈模块第 4.1 节')) {
    add_issue(errors, 'optimistic-write-contract', agents_path, 'AGENTS.md 必须引用点赞、私聊和评论的即时呈现规则。')
  }
  if (source.includes('使用定时器模拟接口时')) {
    add_issue(errors, 'agents-api-contract', agents_path, 'AGENTS.md 不得允许使用定时器模拟线上接口。')
  }
  if (source.includes('src/utils` 的业务接口')) {
    add_issue(errors, 'agents-api-contract', agents_path, 'AGENTS.md 不得使用宽泛的 src/utils 作为业务数据入口。')
  }
}

const check_convention_semantics = () => {
  const semantic_contracts = [
    {
      relative_path: 'conventions/00-core-platform.md',
      references: ['storeGlobal', 'Token', 'API 为权威', '禁止保存']
    },
    {
      relative_path: 'conventions/01-page-data.md',
      references: ['./00-core-platform.md', './04-feedback-and-loading.md#41-即时呈现的业务写入', 'API 请求、API 原始响应', 'snake_case']
    },
    {
      relative_path: 'conventions/03-page-structure.md',
      references: ['./01-page-data.md', './11-api-and-network.md', '骨架']
    },
    {
      relative_path: 'conventions/04-feedback-and-loading.md',
      references: ['本节是点赞/取消点赞、私聊发送、评论发送的实现规则唯一所有者']
    },
    {
      relative_path: 'conventions/10-validation-and-regression.md',
      references: ['./04-feedback-and-loading.md#41-即时呈现的业务写入']
    }
  ]

  semantic_contracts.forEach(({ relative_path, references }) => {
    const file_path = path.join(project_root, relative_path)
    const source = read_text(relative_path)
    references.forEach((reference) => {
      if (!source.includes(reference)) {
        add_issue(errors, 'convention-semantic-contract', file_path, `约定缺少语义契约或规则所有者引用：${reference}`)
      }
    })
  })

  const module_sources = required_convention_files.slice(3).map((relative_path) => ({
    relative_path,
    source: read_text(relative_path)
  }))
  const duplicated_normative_text = new Map()
  module_sources.forEach(({ relative_path, source }) => {
    source.split(/\r?\n/).forEach((line, index) => {
      const normalized = line
        .trim()
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .replace(/[`*_]/g, '')
        .replace(/\s+/g, ' ')
      if (normalized.length < 80 || /^(适用场景|前置模块|本模块负责|本模块不负责|读取要求)：/.test(normalized)) return
      const entries = duplicated_normative_text.get(normalized) || []
      entries.push({ relative_path, line: index + 1 })
      duplicated_normative_text.set(normalized, entries)
    })
  })
  duplicated_normative_text.forEach((entries, normalized) => {
    const distinct_files = new Set(entries.map((entry) => entry.relative_path))
    if (distinct_files.size < 2) return
    const locations = entries.map((entry) => `${entry.relative_path}:${entry.line}`).join(', ')
    warnings.push({
      rule: 'duplicate-normative-text',
      file_path: locations,
      message: `发现跨约定模块重复的规范正文，保留唯一规则所有者并改为引用：${normalized.slice(0, 140)}`,
      line: 0
    })
  })
}

const check_package_contract = () => {
  const package_path = path.join(project_root, 'package.json')
  const package_source = read_text('package.json')
  if (!package_source) return
  try {
    const package_json = JSON.parse(package_source)
    ;['check:conventions', 'build:h5'].forEach((script_name) => {
      if (!package_json.scripts?.[script_name]) {
        add_issue(errors, 'package-script', package_path, `package.json 缺少 ${script_name} 脚本。`)
      }
    })
    Object.entries(package_json.scripts || {}).forEach(([script_name, command]) => {
      for (const match of command.matchAll(/scripts\/[\w./*-]+\.(?:mjs|cjs|js)/g)) {
        if (match[0].includes('*')) continue
        if (!existsSync(path.join(project_root, match[0]))) {
          add_issue(errors, 'missing-script-target', package_path, `${script_name} 引用了不存在的脚本：${match[0]}`)
        }
      }
    })
  } catch (error) {
    add_issue(errors, 'valid-json', package_path, `package.json 解析失败：${error.message}`)
  }
}

const check_store_contract = (relative_path, source, file_path) => {
  if (!relative_path.startsWith('src/stores/')) return
  if (relative_path !== 'src/stores/store.js') {
    add_issue(errors, 'store-single-file', file_path, 'Pinia 只能保留 src/stores/store.js，禁止新增或恢复其他 Store 文件。')
    return
  }
  if (!source.includes('defineStore')) {
    add_issue(errors, 'store-definition', file_path, 'src/stores/store.js 必须使用 Pinia defineStore 定义全局 Store。')
    return
  }

  const state_match = source.match(/state\s*:\s*\(\s*\)\s*=>\s*\(\{([\s\S]*?)^\s{2}\}\)\s*,/m)
  if (!state_match) return
  const state_body = state_match[1]
  for (const match of state_body.matchAll(/^\s{4}([A-Za-z_$][\w$]*)\s*:/gm)) {
    const state_key = match[1]
    if (!store_state_keys.has(state_key)) {
      add_issue(errors, 'store-business-data-boundary', file_path, `storeGlobal.state 不允许保存 ${state_key}；只允许 Token、登录状态、基础用户身份、余额和权限授权记录。`, get_line_number(source, state_match.index + match.index))
    }
  }
}

const escape_regular_expression = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const check_store_usage = (source, file_path) => {
  const store_aliases = new Set(['storeGlobal'])
  for (const match of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*storeGlobal\s*\(/g)) {
    store_aliases.add(match[1])
  }

  store_aliases.forEach((alias) => {
    const alias_pattern = escape_regular_expression(alias)
    const member_pattern = new RegExp(`\\b${alias_pattern}\\s*\\.\\s*([A-Za-z_$][\\w$]*)`, 'g')
    for (const match of source.matchAll(member_pattern)) {
      const member_name = match[1]
      if (!store_member_names.has(member_name)) {
        add_issue(errors, 'store-business-data-boundary', file_path, `storeGlobal 不允许读写业务成员 ${member_name}；业务数据必须来自线上 API。`, get_line_number(source, match.index))
      }
    }

    const assignment_pattern = new RegExp(`\\b${alias_pattern}\\s*\\.\\s*([A-Za-z_$][\\w$]*)\\s*(?:=|\\+=|-=|\\*=|\\/=)`, 'g')
    for (const match of source.matchAll(assignment_pattern)) {
      add_issue(errors, 'store-write-boundary', file_path, `禁止页面或组件直接赋值 storeGlobal.${match[1]}；通过 store.js 的允许方法更新会话投影。`, get_line_number(source, match.index))
    }
  })

  const direct_member_pattern = /\bstoreGlobal\s*\([^)]*\)\s*\.\s*([A-Za-z_$][\w$]*)/g
  for (const match of source.matchAll(direct_member_pattern)) {
    if (!store_member_names.has(match[1])) {
      add_issue(errors, 'store-business-data-boundary', file_path, `storeGlobal 不允许读写业务成员 ${match[1]}；业务数据必须来自线上 API。`, get_line_number(source, match.index))
    }
  }
  const direct_assignment_pattern = /\bstoreGlobal\s*\([^)]*\)\s*\.\s*([A-Za-z_$][\w$]*)\s*(?:=|\+=|-=|\*=|\/=)/g
  for (const match of source.matchAll(direct_assignment_pattern)) {
    add_issue(errors, 'store-write-boundary', file_path, `禁止页面或组件直接赋值 storeGlobal.${match[1]}；通过 store.js 的允许方法更新会话投影。`, get_line_number(source, match.index))
  }
}

const check_field_naming_contract = (relative_path, source, file_path) => {
  const is_api_module = /^src\/api\/(?!request\.|media\.|response\.|service\.).+\.js$/.test(relative_path)
  const is_page_or_component = /^src\/(pages|components)\/.*\.vue$/.test(relative_path)
  const is_presentation_adapter = /^src\/utils\/.*Presentation\.js$/.test(relative_path)
  if (!is_api_module && !is_page_or_component && !is_presentation_adapter) return

  if (!is_presentation_adapter) {
    field_alias_pairs.forEach(([api_field, presentation_field]) => {
      const mixed_pattern = new RegExp(`\\.${api_field}\\s*(?:\\?\\?|\\|\\|)[^\\n;]{0,160}\\.${presentation_field}\\b|\\.${presentation_field}\\s*(?:\\?\\?|\\|\\|)[^\\n;]{0,160}\\.${api_field}\\b`, 'g')
      for (const match of source.matchAll(mixed_pattern)) {
        add_issue(errors, 'field-naming-boundary', file_path, `禁止混用 API 字段 ${api_field} 与页面字段 ${presentation_field}；请在 Presentation 适配器中完成一次转换。`, get_line_number(source, match.index))
      }
    })
  }

  if (!is_api_module && !is_page_or_component) return
  const api_import_names = new Set()
  for (const import_match of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]@\/api\/[^'"]+['"]/g)) {
    import_match[1].split(',').forEach((item) => {
      const name = item.trim().split(/\s+as\s+/).pop()?.trim()
      if (name) api_import_names.add(name)
    })
  }

  const check_payload = (payload_source, payload_offset) => {
    for (const match of payload_source.matchAll(/\b([A-Za-z_$][\w$]*)\s*:/g)) {
      if (!presentation_field_names.has(match[1])) continue
      add_issue(errors, 'api-field-naming', file_path, `API 请求参数不能使用页面字段 ${match[1]}；请使用后端契约中的 camelCase 字段。`, get_line_number(source, payload_offset + match.index))
    }
  }

  if (is_api_module) {
    const object_property_match = /\b([A-Za-z_$][\w$]*)\s*:/g
    for (const match of source.matchAll(object_property_match)) {
      if (presentation_field_names.has(match[1])) {
        add_issue(errors, 'api-field-naming', file_path, `src/api 不得定义页面字段 ${match[1]}；业务 API 应透传后端原字段。`, get_line_number(source, match.index))
      }
    }
    return
  }

  api_import_names.forEach((api_name) => {
    const call_pattern = new RegExp(`\\b${escape_regular_expression(api_name)}\\s*\\(\\s*\\{([\\s\\S]{0,800}?)\\}`, 'g')
    for (const match of source.matchAll(call_pattern)) {
      check_payload(match[1], match.index + match[0].indexOf(match[1]))
    }
  })
}

const check_source_file = (relative_path) => {
  const file_path = path.join(project_root, relative_path)
  const source = read_text(relative_path)
  check_store_contract(relative_path, source, file_path)

  if (relative_path.startsWith('src/')) {
    const direct_storage_match = source.match(/\b(?:window\.)?(?:localStorage|sessionStorage)\b|\bindexedDB\b|\buni\.(?:getStorageSync|getStorage|setStorageSync|setStorage|removeStorageSync|removeStorage|clearStorageSync|clearStorage)\b/)
    if (direct_storage_match && !storage_infrastructure_files.has(relative_path)) {
      add_issue(errors, 'storage-boundary', file_path, '本地存储只能由已登记的基础设施模块管理，业务页面、组件和工具不得直接访问 storage/IndexedDB。', get_line_number(source, direct_storage_match.index))
    }

    const native_bridge_match = source.match(/\bwindow\.webkit\?\.messageHandlers|\bwindow\.webkit\.messageHandlers\b/)
    if (native_bridge_match && !bridge_infrastructure_files.has(relative_path)) {
      add_issue(errors, 'ios-bridge-boundary', file_path, 'iOS WebView 消息只能通过 src/utils/iosBridge.js 等统一桥接模块发送，页面和业务工具不得直接访问 messageHandlers。', get_line_number(source, native_bridge_match.index))
    }
    if (source.includes('storeGlobal')) check_store_usage(source, file_path)
    check_field_naming_contract(relative_path, source, file_path)
  }

  if (/^src\/(?:pages|components)\//.test(relative_path)
    || /^src\/api\/(?!request\.|media\.|response\.|service\.)/.test(relative_path)) {
    const bundle_match = source.match(/\bAPI_BUNDLE_ID\b|\bbundleId\s*:/)
    if (bundle_match) {
      add_issue(errors, 'bundle-id-injection', file_path, 'bundleId 由 request.js 统一注入；普通调用方只传业务字段，只有 bundleId 时传 {}。', get_line_number(source, bundle_match.index))
    }
  }
  if (/^src\/api\/.*\.js$/.test(relative_path) && !/^src\/api\/(?:media|request|response|service)\.js$/.test(relative_path)) {
    const bypass_match = source.match(/\b(?:uni\.(?:request|uploadFile)|fetch|request_json|request_multipart|normalize_response_envelope)\s*\(/)
    if (bypass_match) {
      add_issue(errors, 'business-api-boundary', file_path, '业务 API 应像 common.js 一样调用 http，不能自行解析响应或绕过统一请求链。', get_line_number(source, bypass_match.index))
    }
    if (!/\bhttp\.(?:get|post|put|delete|request|upload)\s*\(/.test(source)) {
      add_issue(errors, 'business-api-wrapper', file_path, 'src/api 业务模块必须通过 http 调用统一请求客户端，不能只在业务模块自行实现请求。')
    }
  }
  const is_page_or_component = /^src\/(pages|components)\/.*\.vue$/.test(relative_path)
  if (!is_page_or_component) return

  const direct_service_import_match = source.match(/from\s+['"]@\/api\/(?:request|service|response)['"]|require\(\s*['"]@\/api\/(?:request|service|response)['"]\s*\)/)
  if (direct_service_import_match) {
    add_issue(errors, 'api-layer-boundary', file_path, '页面和组件只能导入 src/api 业务 API，不得直接依赖 request/service/response 基础设施。', get_line_number(source, direct_service_import_match.index))
  }
  const direct_http_match = source.match(/\bhttp\.(?:get|post|put|delete|request|upload)\s*\(/)
  if (direct_http_match) {
    add_issue(errors, 'api-layer-boundary', file_path, '页面和组件不得直接调用 http；应调用 src/api 中与业务语义对应的 API 方法。', get_line_number(source, direct_http_match.index))
  }
  const raw_response_code_match = source.match(/\b(?:result|response|res)\s*(?:\?\.|\.)\s*code\b/)
  if (raw_response_code_match) {
    add_issue(errors, 'response-envelope-boundary', file_path, '页面和组件不得读取原始响应 code；service/API 层应转换为 result.success、result.data 和 result.error。', get_line_number(source, raw_response_code_match.index))
  }

  if (/<script\b/i.test(source) && !/<script\s+setup(?:\s|>)/i.test(source)) {
    add_issue(errors, 'vue-script-setup', file_path, '页面和组件必须使用 Vue 3 <script setup>。')
  }
  const forbidden_api_match = source.match(/\b(?:uni\.request|fetch\s*\()/)
  if (forbidden_api_match) {
    add_issue(errors, 'request-boundary', file_path, '页面和组件不得直接调用底层网络 API，应直接调用业务 API 和统一请求层。', get_line_number(source, forbidden_api_match.index))
  }
  const native_confirm_match = source.match(/\b(?:window\.)?confirm\s*\(|\buni\.showModal\s*\(/)
  if (native_confirm_match) {
    add_issue(errors, 'custom-confirm-dialog', file_path, '禁止使用原生确认弹窗，应复用自定义 ConfirmDialog。', get_line_number(source, native_confirm_match.index))
  }
}

const print_issues = (title, list) => {
  if (!list.length) return
  console.log(`\n${title} (${list.length})`)
  list.forEach((issue) => {
    const location = issue.line ? `${issue.file_path}:${issue.line}` : issue.file_path
    console.log(`- [${issue.rule}] ${location}: ${issue.message}`)
  })
}

let scope
try {
  scope = parse_scope()
} catch (error) {
  console.error(`约定检查失败：${error.message}`)
  process.exit(1)
}

if (!scope.length) {
  console.log('约定检查跳过：当前任务没有检测到修改或新增文件。')
  process.exit(0)
}

const convention_files_are_in_scope = scope.some((relative_path) => (
  relative_path === 'AGENTS.md'
  || required_convention_files.includes(relative_path)
  || relative_path.startsWith('conventions/')
))

if (convention_files_are_in_scope) {
  check_required_files()
  required_convention_files.forEach(check_markdown_links)
  check_convention_routes()
  check_convention_semantics()
}

if (scope.includes('AGENTS.md')) check_agents_contract()
if (scope.includes('package.json')) check_package_contract()
scope.filter((relative_path) => source_extensions.has(path.extname(relative_path))).forEach(check_source_file)

print_issues('约定错误', errors)
print_issues('约定警告', warnings)

if (errors.length) {
  console.error(`\n约定检查失败：${errors.length} 个错误，${warnings.length} 个警告。`)
  process.exit(1)
}

console.log(`\n约定检查通过：仅检查当前任务范围内的 ${scope.length} 个文件，${warnings.length} 个警告。`)

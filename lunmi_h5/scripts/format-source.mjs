import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { babelParse, compileTemplate, parse } from '@vue/compiler-sfc'

const project_root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const indent = (depth) => '  '.repeat(depth)

const apply_edits = (source, edits) => edits.sort((a, b) => b.start - a.start)
  .reduce((result, edit) => result.slice(0, edit.start) + edit.text + result.slice(edit.end), source)

// Ignore parser locations, but compare every executable AST field before writing.
const ast_signature = (source) => JSON.stringify(babelParse(source, { sourceType: 'module' }), (key, value) => (
  ['start', 'end', 'loc', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)
    ? undefined
    : value
))

export const format_javascript = (source) => {
  const ast = babelParse(source, { sourceType: 'module' })
  const edits = []
  const visit = (node, added_depth = 0) => {
    if (!node || typeof node !== 'object') return
    let child_depth = added_depth
    if (node.type === 'BlockStatement' && node.body.length > 1
      && node.body.some((statement, index) => index > 0
        && node.body[index - 1].loc.end.line === statement.loc.start.line)) {
      const line_start = source.lastIndexOf('\n', node.start - 1) + 1
      const base_indent = source.slice(line_start, node.start).match(/^\s*/)[0] + indent(added_depth)
      const boundaries = [
        [node.start + 1, node.body[0].start, base_indent + indent(1)],
        ...node.body.slice(1).map((statement, index) => [node.body[index].end, statement.start, base_indent + indent(1)]),
        [node.body.at(-1).end, node.end - 1, base_indent]
      ]
      for (const [start, end, spacing] of boundaries) {
        if (/^\s*$/.test(source.slice(start, end))) edits.push({ start, end, text: '\n' + spacing })
      }
      if (node.loc.start.line === node.loc.end.line) child_depth += 1
    }
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'extra', 'tokens', 'comments'].includes(key)) continue
      if (Array.isArray(value)) value.forEach((child) => visit(child, child_depth))
      else if (value && typeof value === 'object') visit(value, child_depth)
    }
  }
  visit(ast)
  const result = apply_edits(source, edits)
  assert.equal(ast_signature(result), ast_signature(source), 'Formatting must not change JavaScript behavior')
  return result
}

const opening_tag_end = (source) => {
  let quote = ''
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (character === quote) quote = ''
    } else if (character === '"' || character === "'") quote = character
    else if (character === '>') return index + 1
  }
  throw new Error('Unclosed template tag')
}

const render_template_node = (node, depth) => {
  const raw = node.loc.source
  const spacing = indent(depth)
  if (node.type !== 1) return spacing + raw.trim()
  const opening_end = opening_tag_end(raw)
  const opening = raw.slice(0, opening_end)
  // Attributes and expressions are copied verbatim, including quoted > or <.
  const lines = opening.split('\n')
  const formatted_opening = lines.map((line, index) => spacing
    + (index > 0 && !/^\s*\/?>/.test(line) ? indent(1) : '') + line.trim()).join('\n')
  if (node.isSelfClosing || opening_end === raw.length) return formatted_opening

  const closing_start = raw.lastIndexOf('</')
  const closing = raw.slice(closing_start)
  const children = node.children.filter((child) => child.type !== 2 || child.content.trim())
  const has_structure = children.some((child) => child.type === 1 || child.type === 3)
  if (!has_structure) return spacing + raw
  if (!children.length) return formatted_opening + '\n' + spacing + closing

  const content = []
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]
    if (child.type === 2 || child.type === 5) {
      // Preserve text/interpolation runs as a whole (including intentional spaces).
      let last = child
      while ([2, 5].includes(children[index + 1]?.type)) last = children[++index]
      const start = child.loc.start.offset - node.loc.start.offset
      const end = last.loc.end.offset - node.loc.start.offset
      content.push(indent(depth + 1) + raw.slice(start, end).trim())
    } else content.push(render_template_node(child, depth + 1))
  }
  return [formatted_opening, ...content, spacing + closing].join('\n')
}

const template_signature = (source) => {
  const { code, errors } = compileTemplate({ source, filename: 'format-check.vue', id: 'format-check' })
  assert.equal(errors.length, 0, String(errors))
  return ast_signature(code)
}

export const format_vue = (source) => {
  const { descriptor, errors } = parse(source)
  assert.equal(errors.length, 0, String(errors))
  const edits = []
  const template = descriptor.template
  if (template) {
    const formatted = '\n' + template.ast.children
      .filter((node) => node.type !== 2 || node.content.trim())
      .map((node) => render_template_node(node, 1)).join('\n') + '\n'
    const before = template_signature(template.content)
    const after = template_signature(formatted)
    if (before !== after) {
      const index = [...before].findIndex((character, position) => after[position] !== character)
      throw new Error(`Compiled template changed near ${index}: ${before.slice(index, index + 150)} => ${after.slice(index, index + 150)}`)
    }
    edits.push({ start: template.loc.start.offset, end: template.loc.end.offset, text: formatted })
  }
  for (const block of [descriptor.script, descriptor.scriptSetup].filter(Boolean)) {
    edits.push({ start: block.loc.start.offset, end: block.loc.end.offset, text: format_javascript(block.content) })
  }
  return apply_edits(source, edits)
}

const collect_files = () => {
  const explicit = process.argv.slice(2).filter((value) => !value.startsWith('--'))
  const paths = explicit.length ? explicit : [
    ...execFileSync('git', ['diff', '--name-only', '--relative', '--diff-filter=ACMRT', 'HEAD', '--', 'src'], { cwd: project_root, encoding: 'utf8' }).trim().split(/\r?\n/),
    ...execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'src'], { cwd: project_root, encoding: 'utf8' }).trim().split(/\r?\n/)
  ]
  return [...new Set(paths)].filter(Boolean).map((file) => path.resolve(project_root, file))
    .filter((file) => file.startsWith(path.join(project_root, 'src') + path.sep)
      && existsSync(file) && /\.(vue|js|mjs|cjs)$/.test(file))
}

const main = () => {
  const check_only = process.argv.includes('--check')
  // Prepare and validate all files before modifying any source file.
  const updates = collect_files().flatMap((file) => {
    const original = readFileSync(file, 'utf8')
    const source = original.replaceAll('\r\n', '\n')
    let formatted
    try {
      formatted = file.endsWith('.vue') ? format_vue(source) : format_javascript(source)
    } catch (error) {
      throw new Error(`${path.relative(project_root, file)}: ${error.message}`, { cause: error })
    }
    if (formatted === source) return []
    if (original.includes('\r\n')) formatted = formatted.replaceAll('\n', '\r\n')
    return [{ file, formatted }]
  })
  for (const { file, formatted } of updates) {
    console.log(`${check_only ? 'Needs formatting' : 'Formatted'}: ${path.relative(project_root, file)}`)
    if (!check_only) writeFileSync(file, formatted, 'utf8')
  }
  console.log(`${updates.length} file(s) ${check_only ? 'need formatting' : 'formatted'}; template and JS behavior verified.`)
  if (check_only && updates.length) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()

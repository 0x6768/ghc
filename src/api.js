import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const GH_API = 'https://api.github.com'
const GH_PROXY = 'https://gh-proxy.com/'

export const getToken = () => localStorage.getItem('gh_token') || ''
export const proxy = (u) => GH_PROXY + u

// 全局限流通知回调：由 RateLimitNotice 组件注册，命中限流时触发弹框
let rateHandler = null
export const onRateLimit = (fn) => { rateHandler = fn }
function notifyRateLimit() {
  if (rateHandler) rateHandler()
}

// 是否为限流响应：剩余配额为 0（GitHub 返回头）
function isRateLimited(res) {
  return res && res.headers && res.headers.get('X-RateLimit-Remaining') === '0'
}

export function fmtStars(n) {
  if (n == null) return '—'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

async function ghJson(path) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'gh-browser' }
  const t = getToken()
  if (t) headers.Authorization = 'Bearer ' + t
  const r = await fetch(GH_API + path, { headers })
  if (isRateLimited(r)) {
    notifyRateLimit()
    throw new Error('API 限流，请稍后重试')
  }
  if (r.status === 403) throw new Error('限流，请先配置 Token')
  if (!r.ok) throw new Error('API 错误 ' + r.status + ' — ' + (await r.text()).slice(0, 120))
  return r.json()
}

// 校验 Token 并返回当前认证用户信息（头像 + login 等）
export async function verifyToken(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'gh-browser',
    Authorization: 'Bearer ' + token
  }
  const r = await fetch(GH_API + '/user', { headers })
  if (r.status === 401 || r.status === 403) {
    throw new Error('Token 无效或已失效，请检查后重试（' + r.status + '）')
  }
  if (!r.ok) throw new Error('验证失败 ' + r.status)
  return r.json()
}

export async function searchRepos(q) {
  return ghJson(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=10`)
}

export async function searchPeople(q) {
  return ghJson(`/search/users?q=${encodeURIComponent(q)}&per_page=20`)
}

export async function getLanguages(owner, repo) {
  return ghJson(`/repos/${owner}/${repo}/languages`)
}

export async function getFullTree(owner, repo, ref) {
  return ghJson(`/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`)
}

export async function getRepo(owner, repo) {
  return ghJson(`/repos/${owner}/${repo}`)
}

export async function getUser(login) {
  return ghJson(`/users/${login}`)
}

export async function getUserRepos(login, page, per = 20) {
  return ghJson(`/users/${login}/repos?page=${page}&per_page=${per}&sort=pushed&direction=desc`)
}

/* pinned 仓库：REST API 无官方端点，尝试非官方接口，失败回退为 star 排序的全量列表 */
export async function getPinned(login) {
  try {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'gh-browser' }
    const t = getToken()
    if (t) headers.Authorization = 'Bearer ' + t
    const r = await fetch(GH_API + `/users/${login}/pinned?per_page=6`, { headers })
    if (!r.ok) throw new Error(r.status)
    return (await r.json()) || []
  } catch (e) {
    return null
  }
}

export async function getReadme(owner, repo, ref) {
  try {
    const data = await ghJson(`/repos/${owner}/${repo}/readme?ref=${ref}`)
    return data.content ? decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))) : ''
  } catch (e) {
    return ''
  }
}

export async function getTree(owner, repo, path, ref) {
  return ghJson(`/repos/${owner}/${repo}/contents/${path}?ref=${ref}`)
}

export async function getReleases(owner, repo, page, per = 5) {
  return ghJson(`/repos/${owner}/${repo}/releases?per_page=${per}&page=${page}`)
}

export async function fetchRaw(owner, repo, ref, path) {
  const official = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`
  try {
    const r = await fetch(official)
    if (r.ok) return r.text()
    throw new Error('官方源 ' + r.status)
  } catch (e) {
    const r = await fetch(proxy(official))
    if (!r.ok) throw new Error('拉取文件失败 ' + r.status + (e && e.message ? '（' + e.message + '）' : ''))
    return r.text()
  }
}

export const LANGS = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', py: 'python', c: 'c', h: 'c',
  cpp: 'cpp', cc: 'cpp', hpp: 'cpp', java: 'java', go: 'go', rs: 'rust',
  cs: 'csharp', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', xml: 'xml',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
  sh: 'bash', bash: 'bash', zsh: 'bash', md: 'markdown', rst: 'markdown',
  sql: 'sql', vue: 'vue', svelte: 'svelte', diff: 'diff'
}

export function langOf(path) {
  const name = path.split('/').pop().toLowerCase()
  if (name === 'dockerfile') return 'dockerfile'
  const ext = name.split('.').pop()
  return LANGS[ext] || null
}

// HTML 转义，用于自渲染的 img / a 属性与文本
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/* --- Markdown 渲染（markdown-it + DOMPurify，支持仓库上下文：相对图片/链接解析） --- */

// 相对路径：去掉开头的 ./ 与 /，并将反斜杠统一为正斜杠（兼容 Windows 风格路径）
function cleanRel(h) { return String(h).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '') }
// 判断是否为外部/协议地址或锚点
function isExternal(h) { return /^(\/\/|[a-z][a-z0-9+.-]*:)/i.test(h) || h.startsWith('#') }

// 预处理：仅处理 MD 文档内的内联 HTML 相对图片/链接（markdown 语法由 markdown-it renderer 处理）
function preprocessHTML(s, rawBase, viewerBase) {
  let t = String(s ?? '')
  // 内联 <img>：反斜杠归一为斜杠，相对路径补全为 raw 绝对地址
  t = t.replace(/(<img\b[^>]*\bsrc=["'])([^"']+?)(["'][^>]*>)/gi, (m, a, src, c) => {
    const s2 = src.replace(/\\/g, '/')
    return (rawBase && !isExternal(s2)) ? a + rawBase + '/' + cleanRel(s2) + c : a + s2 + c
  })
  // 内联 <a>：相对 href 跳转到 files-viewer 渲染
  t = t.replace(/(<a\b[^>]*\bhref=["'])([^"']+?)(["'])/gi, (m, a, href, c) => {
    if (viewerBase && !isExternal(href)) return a + viewerBase + '?path=' + encodeURIComponent(cleanRel(href)) + '&tree=hide' + c
    return m
  })
  return t
}

export function parseMD(text, ctx) {
  ctx = ctx || {}
  const { owner, repo, ref } = ctx
  const rawBase = (owner && repo && ref) ? `https://raw.githubusercontent.com/${owner}/${repo}/${ref}` : null
  const viewerBase = (owner && repo) ? `/${owner}/${repo}/files-viewer` : null

  // 预处理：仅对本 MD 文本生效（内联 HTML 相对图片/链接）
  const src = preprocessHTML(String(text ?? ''), rawBase, viewerBase)

  const md = new MarkdownIt({
    html: true, // 允许内联 HTML，最终交给 DOMPurify 过滤危险内容
    linkify: false,
    breaks: false,
    typographer: false
  })

  // 图片：相对路径补全为 raw 绝对地址
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const tok = tokens[idx]
    let src = tok.attrGet('src') || ''
    const alt = tok.content || ''
    const title = tok.attrGet('title')
    if (rawBase && src && !isExternal(src)) src = rawBase + '/' + cleanRel(src)
    let out = `<img src="${escHtml(src)}" alt="${escHtml(alt)}"`
    if (title) out += ` title="${escHtml(title)}"`
    return out + ' loading="lazy" />'
  }

  // 链接：仓库相对链接跳转到 files-viewer 并渲染；外部链接保留新窗口打开
  md.renderer.rules.link = (tokens, idx, options, env, self) => {
    const tok = tokens[idx]
    const href = tok.attrGet('href') || ''
    const title = tok.attrGet('title')
    let inner
    if (tok.children && tok.children.length) {
      inner = self.renderInline(tok.children, options, env)
    } else if (tok.content) {
      inner = escHtml(tok.content)
    } else {
      inner = escHtml(href)
    }
    const t = title ? ` title="${escHtml(title)}"` : ''
    if (viewerBase && href && !isExternal(href)) {
      const target = viewerBase + '?path=' + encodeURIComponent(cleanRel(href)) + '&tree=hide'
      return `<a href="${escHtml(target)}"${t} class="md-link noexternal">${inner}</a>`
    }
    return `<a href="${escHtml(href)}" target="_blank" rel="noopener"${t} class="md-link">${inner}</a>`
  }

  const out = md.render(src)
  return DOMPurify.sanitize(out, { ADD_ATTR: ['target', 'loading', 'rel'] })
}
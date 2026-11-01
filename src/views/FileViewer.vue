<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getRepo, getReadme, getFullTree, fetchRaw, langOf, proxy, parseMD } from '../api'
import Prism from 'prismjs'
import { NButton, NInput, NTree, NEmpty, NSpin } from 'naive-ui'

const props = defineProps({ owner: String, repo: String })
const route = useRoute()

const MAX_INLINE = 512 * 1024
const tree = ref([])
const loading = ref(true)
const error = ref('')
const current = ref(null) // { path, text, lang }
const query = ref('')

const branch = ref('main')
const repoMeta = ref(null)

/* 依据 URL ?path= 跳转到对应文件 */
const initPath = route.query.path || ''
// ?tree=hide 时隐藏左侧文件树
const treeHidden = computed(() => route.query.tree === 'hide')
function isMd(p) { return /\.(md|markdown|mdown|mkd)$/i.test(p || '') }

const rawUrl = (p) => `https://raw.githubusercontent.com/${props.owner}/${props.repo}/${branch.value}/${p}`

const nodeKeyOf = (p) => 'f:' + p
const dirKeyOf = (p) => 'd:' + p

const treeData = computed(() => buildTree())

function buildTree() {
  const map = {}
  tree.value.forEach(ent => {
    if (ent.type === 'tree') return
    const parts = ent.path.split('/')
    let cursor = map
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      acc = acc ? acc + '/' + parts[i] : parts[i]
      const isFile = i === parts.length - 1
      if (isFile) {
        cursor[parts[i]] = { path: acc, type: 'file', size: ent.size }
      } else {
        cursor[parts[i]] = cursor[parts[i]] || { type: 'dir', children: {} }
        cursor = cursor[parts[i]].children
      }
    }
  })
  function node(folderMap, prefix) { 
    const kids = Object.keys(folderMap).sort((a, b) => {
      const A = folderMap[a], B = folderMap[b]
      if (A.type !== B.type) return A.type === 'dir' ? -1 : 1
      return a.localeCompare(b)
    })
    return kids.map(k => {
      const v = folderMap[k]
      const full = prefix ? prefix + '/' + k : k
      if (v.type === 'dir') {
        return {
          key: dirKeyOf(full),
          label: k,
          type: 'dir',
          dir: full,
          isLeaf: false,
          children: node(v.children, full)
        }
      }
      return {
        key: nodeKeyOf(full),
        label: k,
        type: 'file',
        path: full,
        size: v.size,
        isLeaf: true
      }
    })
  }
  function filterTree(folders, prefix, kw) {
    if (!kw) return node(folders, prefix)
    const out = []
    Object.keys(folders).forEach(k => {
      const v = folders[k]
      const full = prefix ? prefix + '/' + k : k
      if (v.type === 'file' && k.toLowerCase().includes(kw)) {
        out.push({ key: nodeKeyOf(full), label: k, type: 'file', path: full, size: v.size, isLeaf: true })
      } else if (v.type === 'dir') {
        const kids = filterTree(v.children, full, kw)
        if (kids.length) out.push({ key: dirKeyOf(full), label: k, type: 'dir', dir: full, isLeaf: false, children: kids })
      }
    })
    return out
  }
  return filterTree(map, '', query.value.trim().toLowerCase())
}

const expandedKeys = ref([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const meta = await getRepo(props.owner, props.repo)
    repoMeta.value = meta
    branch.value = meta.default_branch || 'main'
    const t = await getFullTree(props.owner, props.repo, branch.value)
    tree.value = (t.tree || []).filter(e => e.type === 'blob' || e.type === 'tree')
    await openPath(initPath)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function openPath(p) {
  if (!p) return
  const node = tree.value.find(e => e.path === p)
  if (!node || node.type !== 'blob') return
  const md = isMd(p)
  current.value = { path: p, text: '加载中…', lang: md ? null : langOf(p), render: '' }
  const size = node.size || 0
  if (size > MAX_INLINE) {
    current.value = { ...current.value, text: '', download: rawUrl(p) }
    return
  }
  try {
    const text = await fetchRaw(props.owner, props.repo, branch.value, p)
    const st = { path: p, text, lang: md ? null : langOf(p), render: '' }
    // Markdown 文件直接渲染文档（含相对图片/链接解析）
    if (md) st.render = parseMD(text, { owner: props.owner, repo: props.repo, ref: branch.value })
    current.value = st
    await nextTick()
    if (!md && fileRef.value) {
      try { Prism.highlightAllUnder(fileRef.value) } catch (e) { /* ignore */ }
    }
  } catch (e) {
    current.value = { ...current.value, text: '拉取失败：' + e.message }
  }
}

async function onSelect(keys) {
  const key = keys && keys[0]
  if (!key) return
  const target = treeData.value ? findNode(treeData.value, key) : null
  if (target && target.type === 'file') {
    await openPath(target.path)
  }
}

function findNode(nodes, key) {
  for (const n of nodes) {
    if (n.key === key) return n
    if (n.children) {
      const r = findNode(n.children, key)
      if (r) return r
    }
  }
  return null
}

const fileRef = ref(null)
const readmeWrapRef = ref(null)

const readme = ref('')
const showReadme = ref(false)
async function toggleReadme() {
  showReadme.value = !showReadme.value
  if (showReadme.value && !readme.value) {
    try {
      const md = await getReadme(props.owner, props.repo, branch.value)
      readme.value = md ? parseMD(md, { owner: props.owner, repo: props.repo, ref: branch.value }) : ''
      if (readme.value) {
        await nextTick()
        try { Prism.highlightAllUnder(readmeWrapRef.value) } catch (e) { /* ignore */ }
      }
    } catch (e) { readme.value = '' }
  }
}

watch(() => props.owner + '/' + props.repo, () => {
  tree.value = []
  current.value = null
  query.value = ''
  load()
}, { immediate: true })
</script>

<template>
  <div class="fv-root">
    <div class="viewer-toolbar">
      <RouterLink :to="`/${owner}/${repo}`" class="tool-link"><Icon icon="mdi:keyboard-backspace" class="mi" /> 返回仓库</RouterLink>
      <span class="tool-title"><span class="owner">{{ owner }}</span>/<span class="repo">{{ repo }}</span></span>
      <span class="tool-right">
        <n-button size="tiny" quaternary @click="toggleReadme">{{ showReadme ? '隐藏' : '显示' }} README</n-button>
        <RouterLink :to="`/${owner}/${repo}/releases`" class="tool-link">Release</RouterLink>
      </span>
    </div>

    <div v-if="error" class="err">{{ error }}</div>

    <table class="layout-table" v-else-if="!loading && tree.length">
      <tr v-if="treeHidden" class="row-only-main">
        <td class="cell-main">
          <div class="main">
            <div v-if="showReadme" class="readme-card" ref="readmeWrapRef">
              <div class="readme-title"><Icon icon="mdi:book-open-variant" class="mi rm" /> README</div>
              <div class="md-body" v-html="readme"></div>
            </div>

            <div v-if="current" class="file-panel">
              <div class="file-head">
                <span class="file-path"><Icon icon="mdi:file-code-outline" class="mi code" /> {{ current.path }}</span>
                <a v-if="current.download" :href="proxy(current.download)" target="_blank" class="btn-raw">原始文件</a>
                <a v-else :href="proxy(rawUrl(current.path))" target="_blank" class="btn-raw">原始文件</a>
              </div>
              <div class="filecode" :class="{ rendered: !!current.render }">
                <div v-if="current.render" class="md-body" v-html="current.render"></div>
                <template v-else-if="current.text && current.lang">
                  <pre class="ml-code" ref="fileRef"><code :class="'language-' + current.lang">{{ current.text }}</code></pre>
                </template>
                <template v-else-if="current.text && !current.lang">
                  <pre class="plain-code" ref="fileRef"><code>{{ current.text }}</code></pre>
                </template>
                <div v-else-if="current.download" class="big-file">
                  <Icon icon="mdi:file-download-outline" class="mi big-icon" />
                  <p>文件超过 {{ (MAX_INLINE/1024/1024).toFixed(0) }}MB，请下载后查看。</p>
                </div>
              </div>
            </div>

            <n-empty v-else description="从文件树中选择一个文件或点击 README/MD 链接" class="empty" />
          </div>
        </td>
      </tr>
      <tr v-else>
        <td class="cell-side">
          <div class="side">
            <div class="side-head">
              <Icon icon="mdi:folder-tree" class="mi tree-icon" />
              <n-input v-model:value="query" size="tiny" placeholder="过滤文件…" clearable />
            </div>
            <n-tree :data="treeData" :default-expanded-keys="expandedKeys"
                    block-line :selectable="true" @update:selected-keys="onSelect"
                    :expand-on-click="true" class="filetree">
              <template #default="{ option }">
                <span class="tnode">
                  <Icon :icon="option.type === 'dir' ? 'mdi:folder' : 'mdi:file-document-outline'" class="tnode-icon" :class="option.type" />
                  <span class="tnode-label">{{ option.label }}</span>
                </span>
              </template>
            </n-tree>
          </div>
        </td>
        <td class="cell-main">
          <div class="main">
            <div v-if="showReadme" class="readme-card" ref="readmeWrapRef">
              <div class="readme-title"><Icon icon="mdi:book-open-variant" class="mi rm" /> README</div>
              <div class="md-body" v-html="readme"></div>
            </div>

            <div v-if="current" class="file-panel">
              <div class="file-head">
                <span class="file-path"><Icon icon="mdi:file-code-outline" class="mi code" /> {{ current.path }}</span>
                <a v-if="current.download" :href="proxy(current.download)" target="_blank" class="btn-raw">原始文件</a>
                <a v-else :href="proxy(rawUrl(current.path))" target="_blank" class="btn-raw">原始文件</a>
              </div>
              <div class="filecode" :class="{ rendered: !!current.render }">
                <div v-if="current.render" class="md-body" v-html="current.render"></div>
                <template v-else-if="current.text && current.lang">
                  <pre class="ml-code" ref="fileRef"><code :class="'language-' + current.lang">{{ current.text }}</code></pre>
                </template>
                <template v-else-if="current.text && !current.lang">
                  <pre class="plain-code" ref="fileRef"><code>{{ current.text }}</code></pre>
                </template>
                <div v-else-if="current.download" class="big-file">
                  <Icon icon="mdi:file-download-outline" class="mi big-icon" />
                  <p>文件超过 {{ (MAX_INLINE/1024/1024).toFixed(0) }}MB，请下载后查看。</p>
                </div>
              </div>
            </div>

            <n-empty v-else description="从左侧文件树中选择一个文件" class="empty" />
          </div>
        </td>
      </tr>
    </table>

    <n-spin v-if="loading" style="padding-top:60px" />
  </div>
</template>

<style scoped>
.err { color: #d03050; margin: 10px 0 16px; }
.layout-table { width: 100%; table-layout: fixed; border-collapse: collapse; }
.layout-table td { vertical-align: top; padding: 0; }
.cell-side { width: 26%; }
.cell-main { width: 74%; padding-left: 16px; }
.file-panel { }
.file-panel .file-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid #eaecef;
}
.file-panel .file-path {
  font-size: 13px;
  color: #57606a;
  display: inline-flex;
  align-items: center;
  font-family: ui-monospace, monospace;
  word-break: break-all;
}
.file-panel .btn-raw {
  font-size: 13px;
  color: #0969da;
  white-space: nowrap;
}
.file-panel .filecode { min-height: 120px; }
.file-panel pre { margin: 0; }
.viewer-toolbar { display: flex; align-items: center; gap: 14px; padding-bottom: 12px; border-bottom: 1px solid #eaecef; margin-bottom: 14px; flex-wrap: wrap; }
.tool-link { color: #0969da; font-size: 13px; display: inline-flex; align-items: center; }
.mi { margin-right: 4px; }
.tool-title { font-size: 15px; font-weight: 600; font-family: ui-monospace, monospace; }
.tool-title .owner { color: #0969da; }
.tool-title .repo { color: #24292f; }
.tool-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.tree-icon { color: #54aeff; }
.side { border: 1px solid #eaecef; border-radius: 10px; background: #fff; padding: 10px; }
.side-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.side-head .n-input { flex: 1; }
.filetree { max-height: 74vh; overflow: auto; font-size: 13px; }
.tnode { display: flex; align-items: center; gap: 6px; }
.tnode-icon { color: #54aeff; }
.tnode-icon.file { color: #8b949e; }
.tnode-label { display: inline-block; }
.main { display: flex; flex-direction: column; gap: 12px; }
/* tree=hide 时仅剩主栏，占满宽度 */
.row-only-main .cell-main { width: 100%; padding-left: 0; }
/* Markdown 渲染样式 */
.md-body { font-size: 14px; line-height: 1.7; color: #1f2328; overflow-wrap: break-word; }
.md-body img { max-width: 100%; height: auto; }
.md-body a.md-link { color: #0969da; text-decoration: none; }
.md-body a.md-link:hover { text-decoration: underline; }
.md-body pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow: auto; }
.md-body table { border-collapse: collapse; }
.md-body th, .md-body td { border: 1px solid #d0d7de; padding: 6px 10px; }
.md-body blockquote { margin: 0; padding: 0 14px; color: #57606a; border-left: 4px solid #d0d7de; }
.readme-card { padding: 8px 2px; }
.readme-title { font-size: 14px; font-weight: 600; color: #24292f; display: flex; align-items: center; margin-bottom: 10px; }
.mi.rm { color: #8250df; }
.mi.code { color: #8250df; font-size: 16px; }
.filecode { overflow: auto; max-height: 74vh; }
.filecode pre { margin: 0; padding: 16px; font-size: 13px; white-space: pre-wrap; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; }
.ml-code, .plain-code { background: #fff; }
.big-file { text-align: center; color: #57606a; padding: 40px 0; }
.big-icon { font-size: 30px; color: #8b949e; margin-bottom: 8px; }
.empty { padding: 60px 0; }
</style>
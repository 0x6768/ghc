<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
import {
  getRepo, getReadme, getTree, getLanguages, fmtStars, proxy, parseMD
} from '../api'
import Prism from 'prismjs'
import { NCard, NSpin, NBreadcrumb, NBreadcrumbItem } from 'naive-ui'

const props = defineProps({ owner: String, repo: String })
const router = useRouter()

const COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  'C++': '#f34b7d', Go: '#00ADD8', 'HTML': '#e34c26', CSS: '#563d7c', Vue: '#41b883',
  Rust: '#dea584', C: '#555555', Scala: '#c22d40', Kotlin: '#A97BFF', Shell: '#89e051',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Dart: '#00B4AB', 'C#': '#178600',
  Markdown: '#083fa1', JSON: '#292929', YAML: '#cb171e'
}

const repoData = ref(null)
const path = ref('')
const items = ref([])
const loading = ref(false)
const error = ref('')
const readmeHtml = ref('')
const langs = ref({})

const refBranch = computed(() => repoData.value?.default_branch || 'main')
const totalBytes = computed(() => Object.values(langs.value).reduce((a, b) => a + b, 0))
const langBars = computed(() => {
  const total = totalBytes.value || 1
  return Object.keys(langs.value).map(name => ({
    name,
    pct: Math.round((langs.value[name] / total) * 100)
  })).sort((a, b) => b.pct - a.pct)
})

async function loadRepo() {
  loading.value = true
  error.value = ''
  try {
    repoData.value = await getRepo(props.owner, props.repo)
    await Promise.all([loadReadme(), loadTree()])
    try { langs.value = await getLanguages(props.owner, props.repo) } catch (e) { langs.value = {} }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function loadReadme() {
  const md = await getReadme(props.owner, props.repo, refBranch.value)
  readmeHtml.value = md ? parseMD(md, { owner: props.owner, repo: props.repo, ref: refBranch.value }) : ''
  if (readmeHtml.value) {
    await nextTick()
    try { Prism.highlightAllUnder(readmeRef.value) } catch (e) { /* ignore */ }
  }
}

async function loadTree() {
  loading.value = true
  error.value = ''
  try {
    items.value = await getTree(props.owner, props.repo, path.value, refBranch.value)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function gotoDir(p) {
  path.value = p
  await loadTree()
}

function openFile(it) {
  const p = it.path
  const size = it.size || 0
  if (size > 512 * 1024) {
    window.open(proxy(it.download_url), '_blank')
    return
  }
  router.push(`/${props.owner}/${props.repo}/files-viewer?path=${encodeURIComponent(p)}`)
}

const readmeRef = ref(null)

const breadcrumb = computed(() => {
  const segs = path.value.split('/').filter(Boolean)
  const parts = [{ label: props.repo, path: '' }]
  let acc = ''
  segs.forEach(s => {
    acc += (acc ? '/' : '') + s
    parts.push({ label: s, path: acc })
  })
  return parts
})

watch(() => props.owner + '/' + props.repo, () => {
  path.value = ''
  loadRepo()
}, { immediate: true })
</script>

<template>
  <div>
    <n-card v-if="repoData" class="repo-head" :bordered="true" style="margin-bottom:18px">
      <div class="head-row">
        <span class="head-meta">
          <span v-if="repoData.stargazers_count != null" class="meta-item">
            <Icon icon="mdi:star" class="mi star" /> {{ fmtStars(repoData.stargazers_count) }}
          </span>
          <span v-if="repoData.forks_count != null" class="meta-item">
            <Icon icon="mdi:source-fork" class="mi" /> {{ repoData.forks_count }}
          </span>
          <span v-if="repoData.language" class="meta-item">
            <Icon icon="mdi:circle" class="mi lang" /> {{ repoData.language }}
          </span>
          <span v-if="repoData.license" class="meta-item">
            <Icon icon="mdi:scale-balance" class="mi lic" /> {{ repoData.license.spdx_id }}
          </span>
        </span>
      </div>
      <div class="repo-desc">
        <RouterLink :to="`/${owner}`" class="owner-link">{{ owner }}</RouterLink>
        <span class="sep">/</span>
        <span class="repo-cur">{{ repo }}</span>
        <span v-if="repoData.description" class="d">{{ repoData.description }}</span>
      </div>
      <div class="head-tabs">
        <RouterLink :to="`/${owner}/${repo}`" class="tab" exact-active-class="tab-active">文件</RouterLink>
        <RouterLink :to="`/${owner}/${repo}/files-viewer`" class="tab" exact-active-class="tab-active">浏览器</RouterLink>
        <RouterLink :to="`/${owner}/${repo}/releases`" class="tab" exact-active-class="tab-active">Releases</RouterLink>
      </div>
    </n-card>

    <n-spin v-if="loading && !items.length" style="padding-top:60px" />

    <div v-else-if="repoData">
      <div v-if="error" class="err">{{ error }}</div>

      <!-- 语言统计 -->
      <div v-if="langBars.length" class="langbar">
        <div class="bar">
          <div v-for="l in langBars" :key="l.name" class="seg"
               :style="{ width: l.pct + '%', background: COLORS[l.name] || '#0969da' }"
               :title="l.name + ' ' + l.pct + '%'"></div>
        </div>
        <div class="lang-legend">
          <span v-for="l in langBars" :key="l.name" class="legend-item">
            <i class="dot" :style="{ background: COLORS[l.name] || '#0969da' }"></i>{{ l.name }} {{ l.pct }}%
          </span>
        </div>
      </div>

      <!-- 面包屑 -->
      <n-breadcrumb class="breadcrumb">
        <n-breadcrumb-item v-for="(b, i) in breadcrumb" :key="i" @click="gotoDir(b.path)">
          <span class="crumb">{{ b.label }}</span>
        </n-breadcrumb-item>
      </n-breadcrumb>

      <!-- 文件列表 -->
      <div v-if="items.length" class="tree">
        <div v-if="path" class="row" style="cursor:pointer" @click="gotoDir('')">
          <Icon icon="mdi:folder-arrow-up" class="mi dir" /> ..
        </div>
        <div v-for="it in items" :key="it.name">
          <div v-if="it.type === 'dir'" class="row" style="cursor:pointer" @click="gotoDir(it.path)">
            <Icon icon="mdi:folder" class="mi dir" /> {{ it.name }}
          </div>
          <div v-else class="row" style="cursor:pointer" @click="openFile(it)">
            <Icon icon="mdi:file" class="mi file" /> {{ it.name }}
            <Icon icon="mdi:open-in-new" class="mi open" />
            <span class="row-right">
              <span class="fs">{{ it.size ? (it.size/1024).toFixed(1)+' KB' : '' }}</span>
              <a :href="proxy(it.download_url)" target="_blank" class="dl" @click.stop>下载</a>
            </span>
          </div>
        </div>
      </div>

      <!-- README -->
      <div v-if="readmeHtml" class="readme-wrap" ref="readmeRef">
        <div class="readme-title"><Icon icon="mdi:book-open-variant" class="mi readme" /> README</div>
        <div class="md-body" v-html="readmeHtml"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.err { color: #d03050; margin: 10px 0 16px; }
.repo-name { font-family: ui-monospace, monospace; font-weight: 700; font-size: 20px; }
.repo-desc { color: #57606a; font-size: 15px; margin-top: 8px; display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
.owner-link { color: #0969da; font-family: ui-monospace, monospace; font-weight: 600; }
.repo-cur { font-family: ui-monospace, monospace; font-weight: 600; color: #24292f; }
.sep { color: #57606a; }
.d { color: #57606a; font-size: 14px; margin-left: 8px; }
.head-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.head-meta { display: flex; gap: 14px; }
.meta-item { display: inline-flex; align-items: center; font-size: 13px; color: #24292f; }
.mi { margin-right: 4px; }
.mi.star { color: #e3b341; }
.mi.lang { color: #0969da; font-size: 11px; }
.mi.lic { font-size: 13px; color: #8250df; }
.head-tabs { display: flex; gap: 8px; margin-top: 16px; border-bottom: 1px solid #eaecef; }
.tab { padding: 8px 2px; margin-right: 14px; color: #57606a; font-size: 14px; border-bottom: 2px solid transparent; }
.tab-active { color: #24292f; font-weight: 600; border-bottom-color: #fd8c73; }
.breadcrumb { margin: 4px 0 10px; }
.crumb { color: #0969da; cursor: pointer; font-size: 13px; }
.langbar { margin-bottom: 8px; }
.bar { height: 7px; border-radius: 20px; overflow: hidden; display: flex; background: #eaecef; margin-bottom: 8px; }
.seg { height: 100%; }
.lang-legend { display: flex; flex-wrap: wrap; gap: 12px; }
.legend-item { font-size: 12px; color: #57606a; display: inline-flex; align-items: center; gap: 4px; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.tree { border: 1px solid #eaecef; border-radius: 10px; overflow: hidden; background: #fff; margin-bottom: 18px; }
.row { display: flex; align-items: center; gap: 6px; padding: 9px 14px; border-bottom: 1px solid #f0f1f2; font-size: 14px; color: #24292f; }
.row:last-child { border-bottom: none; }
.row:hover { background: #f6f8fa; }
.mi.dir { color: #54aeff; }
.mi.file { color: #8b949e; }
.mi.open { color: #8b949e; font-size: 14px; }
.mi.readme { color: #8250df; }
.row-right { margin-left: auto; display: inline-flex; align-items: center; gap: 10px; }
.fs { color: #6e7781; font-size: 12px; }
.dl { color: #0969da; font-size: 13px; }
.readme-wrap { border: 1px solid #eaecef; border-radius: 10px; background: #fff; padding: 20px 24px; }
.readme-title { font-size: 15px; font-weight: 600; color: #24292f; display: flex; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #eaecef; padding-bottom: 12px; }
/* Markdown 内容样式：蓝色链接 + 图片自适应 */
.md-body { font-size: 14px; line-height: 1.7; color: #1f2328; overflow-wrap: break-word; }
.md-body img { max-width: 100%; height: auto; }
.md-body a.md-link { color: #0969da; text-decoration: none; }
.md-body a.md-link:hover { text-decoration: underline; }
.md-body pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow: auto; }
.md-body table { border-collapse: collapse; }
.md-body th, .md-body td { border: 1px solid #d0d7de; padding: 6px 10px; }
.md-body blockquote { margin: 0; padding: 0 14px; color: #57606a; border-left: 4px solid #d0d7de; }
</style>
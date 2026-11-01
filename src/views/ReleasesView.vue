<script setup>
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { getRepo, getReleases, proxy, fmtStars, parseMD } from '../api'
import { Icon } from '@iconify/vue'
import { NCard, NSpin, NEmpty, NButton } from 'naive-ui'

const props = defineProps({ owner: String, repo: String })

const repoData = ref(null)
const releases = ref([])
const page = ref(1)
const loading = ref(false)
const error = ref('')
const REL_PER_PAGE = 5

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (!repoData.value) repoData.value = await getRepo(props.owner, props.repo)
    releases.value = await getReleases(props.owner, props.repo, page.value, REL_PER_PAGE)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function pageBy(d) {
  page.value = Math.max(1, page.value + d)
  load()
}

function renderBody(md) {
  return md ? parseMD(md, { owner: props.owner, repo: props.repo, ref: '' }) : ''
}

watch(() => props.owner + '/' + props.repo, () => {
  page.value = 1
  releases.value = []
  repoData.value = null
  load()
}, { immediate: true })
</script>

<template>
  <div>
    <n-card v-if="repoData" class="repo-head" :bordered="true" style="margin-bottom:18px">
      <div class="head-row">
        <span class="repo-name">{{ owner }}/{{ repo }}</span>
        <span class="head-meta">
          <span v-if="repoData.stargazers_count != null" class="meta-item">
            <Icon icon="mdi:star" class="mi star" /> {{ fmtStars(repoData.stargazers_count) }}
          </span>
          <span v-if="repoData.language" class="meta-item">
            <Icon icon="mdi:circle" class="mi lang" /> {{ repoData.language }}
          </span>
        </span>
      </div>
      <div class="repo-desc">{{ repoData.description || '暂无描述' }}</div>
      <div class="head-tabs">
        <RouterLink :to="`/${owner}/${repo}`" class="tab" exact-active-class="tab-active">文件</RouterLink>
        <RouterLink :to="`/${owner}/${repo}/releases`" class="tab" exact-active-class="tab-active">Releases</RouterLink>
      </div>
    </n-card>

    <n-spin v-if="loading && !releases.length" style="padding-top:40px" />
    <div v-else>
      <div v-if="error" class="err">{{ error }}</div>
      <n-empty v-else-if="!releases.length" description="暂无 Release" style="padding-top:40px" />

      <div v-else class="rel-list">
        <n-card v-for="rel in releases" :key="rel.id" :bordered="true" class="rel-card">
          <div class="rel-head">
            <span class="rel-tag">{{ rel.tag_name || rel.name }}</span>
            <span v-if="rel.prerelease" class="pre"><Icon icon="mdi:flask" class="mi" /> 预发布</span>
            <span class="rel-date">{{ rel.published_at ? rel.published_at.replace('T',' ').slice(0,16) : '' }}</span>
          </div>
          <div v-if="rel.body" class="md-body rel-body" v-html="renderBody(rel.body)"></div>
          <div class="assets">
            <div class="assets-title"><Icon icon="mdi:package-variant-closed" class="mi" /> 附件</div>
            <ul v-if="rel.assets.length">
              <li v-for="a in rel.assets" :key="a.id">
                <a :href="proxy(a.browser_download_url)" target="_blank" class="asset-link">{{ a.name }}</a>
                <span class="asset-size">{{ (a.size/1024/1024).toFixed(1) }}MB</span>
              </li>
            </ul>
            <span v-else class="no-assets">无附件</span>
          </div>
        </n-card>
      </div>

      <div class="pager">
        <n-button size="small" :disabled="page <= 1" @click="pageBy(-1)">上一页</n-button>
        <span class="page-info">第 {{ page }} 页</span>
        <n-button size="small" :disabled="releases.length < REL_PER_PAGE" @click="pageBy(1)">下一页</n-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.repo-name { font-family: ui-monospace, monospace; font-weight: 700; font-size: 20px; }
.repo-desc { color: #57606a; font-size: 14px; margin-top: 8px; }
.head-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.head-meta { display: flex; gap: 14px; }
.meta-item { display: inline-flex; align-items: center; font-size: 13px; color: #24292f; }
.mi { margin-right: 4px; }
.mi.star { color: #e3b341; }
.mi.lang { color: #0969da; font-size: 11px; }
.head-tabs { display: flex; gap: 8px; margin-top: 16px; border-bottom: 1px solid #eaecef; }
.tab { padding: 8px 2px; margin-right: 14px; color: #57606a; font-size: 14px; border-bottom: 2px solid transparent; }
.tab-active { color: #24292f; font-weight: 600; border-bottom-color: #fd8c73; }
.err { color: #d03050; margin: 10px 0 16px; }
.rel-list { display: grid; gap: 14px; }
.rel-card { margin-bottom: 14px; }
.rel-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rel-tag { font-weight: 700; font-size: 16px; }
.pre { display: inline-flex; align-items: center; font-size: 12px; color: #7a5af5; background: #f3f0ff; border-radius: 20px; padding: 1px 10px; }
.rel-date { margin-left: auto; color: #6e7781; font-size: 13px; }
.rel-body { margin-top: 10px; }
.assets { margin-top: 12px; border-top: 1px solid #eaecef; padding-top: 10px; }
.assets-title { font-size: 13px; color: #57606a; display: flex; align-items: center; margin-bottom: 6px; }
.assets ul { list-style: none; margin: 0; padding: 0; }
.assets li { padding: 3px 0; font-size: 14px; }
.asset-link { color: #0969da; }
.asset-size { color: #6e7781; font-size: 12px; margin-left: 8px; }
.no-assets { color: #8b949e; font-size: 13px; }
.pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-info { color: #57606a; font-size: 13px; }
</style>
<script setup>
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getUser, getUserRepos, getPinned, fmtStars } from '../api'
import { NSpin, NCard, NInput, NButton } from 'naive-ui'

const props = defineProps({ login: String })

const user = ref(null)
const pinned = ref([])
const repos = ref([])
const page = ref(1)
const loading = ref(false)
const error = ref('')
const PER = 20
const filter = ref('')

const isUser = computed(() => user.value && user.value.type === 'User')
const displayName = computed(() => user.value?.name || user.value?.login || '')
const repoFiltered = computed(() => {
  const kw = filter.value.trim().toLowerCase()
  if (!kw) return repos.value
  return repos.value.filter(r => r.name.toLowerCase().includes(kw))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    user.value = await getUser(props.login)
    await loadPinned()
    await loadRepos()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function loadPinned() {
  const p = await getPinned(props.login)
  if (Array.isArray(p)) pinned.value = p
  else pinned.value = []
}

async function loadRepos() {
  loading.value = true
  error.value = ''
  try {
    repos.value = await getUserRepos(props.login, page.value, PER)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function goPage(d) {
  page.value = Math.max(1, page.value + d)
  loadRepos()
}

const isExternalLink = (u) => /^https?:\/\//.test(u || '')

watch(() => props.login, () => {
  page.value = 1
  repos.value = []
  user.value = null
  pinned.value = []
  filter.value = ''
  load()
}, { immediate: true })
</script>

<template>
  <div v-if="error" class="err">{{ error }}</div>

  <n-spin v-else-if="!user" style="padding-top:60px" />

  <div v-else>
    <div class="profile">
      <img v-if="user.avatar_url" :src="user.avatar_url" class="avatar" alt="头像" />
      <div class="p-info">
        <div class="p-name">
          {{ displayName }}
          <span v-if="user.type === 'User'" class="badge-user"><Icon icon="mdi:account" class="mi" />个人</span>
          <span v-else class="badge-org"><Icon icon="mdi:office-building" class="mi" />组织</span>
        </div>
        <div class="p-login">@{{ user.login }}</div>
        <div v-if="user.bio" class="p-bio">{{ user.bio }}</div>
        <div v-if="user.location" class="p-loc"><Icon icon="mdi:map-marker" class="mi" /> {{ user.location }}</div>
        <div class="p-stats">
          <span class="stat"><RouterLink :to="`/${user.login}`"><Icon icon="mdi:account-group" class="mi" /> {{ user.followers }} 关注者</RouterLink></span>
          <span v-if="isUser" class="stat"><Icon icon="mdi:account-heart" class="mi" /> {{ user.following }} 正在关注</span>
          <span class="stat"><Icon icon="mdi:source-repository" class="mi" /> {{ user.public_repos }} 仓库</span>
        </div>
      </div>
    </div>

    <!-- pinned 仓库 -->
    <n-card v-if="pinned.length" class="sec" :bordered="true">
      <template #header><Icon icon="mdi:pin" class="mi pin" /> 置顶仓库</template>
      <div class="pin-grid">
        <RouterLink v-for="p in pinned" :key="p.id || p.full_name" :to="`/${p.owner?.login || login}/${p.name}`"
                    class="pin-card">
          <div class="pin-head"><Icon icon="mdi:source-repository" class="mi repo" /><span class="pin-name">{{ p.full_name || (login + '/' + p.name) }}</span></div>
          <div class="pin-desc">{{ p.description || '暂无描述' }}</div>
          <div class="pin-meta">
            <span v-if="p.stargazers_count != null" class="meta-item"><Icon icon="mdi:star" class="mi star" /> {{ fmtStars(p.stargazers_count) }}</span>
            <span v-if="p.forks_count != null" class="meta-item"><Icon icon="mdi:source-fork" class="mi" /> {{ p.forks_count }}</span>
            <span v-if="p.language" class="meta-item"><Icon icon="mdi:circle" class="mi lang" /> {{ p.language }}</span>
          </div>
        </RouterLink>
      </div>
    </n-card>

    <!-- 仓库列表标题 + 过滤 -->
    <div class="repos-head">
      <h3 class="repos-title">仓库 <span class="count">{{ user.public_repos }}</span></h3>
      <n-input v-model:value="filter" size="small" placeholder="查找仓库…" clearable class="filter-input" />
    </div>

    <div class="repo-list">
      <RouterLink v-for="r in repoFiltered" :key="r.id" class="repo-card" :to="`/${r.owner.login}/${r.name}`">
        <div class="repo-left">
          <div class="repo-name">{{ r.name }}</div>
          <div class="repo-desc">{{ r.description || '暂无描述' }}</div>
          <div class="repo-sub">
            <span v-if="r.language" class="meta-item"><Icon icon="mdi:circle" class="mi lang" /> {{ r.language }}</span>
            <span v-if="r.stargazers_count" class="meta-item"><Icon icon="mdi:star" class="mi star" /> {{ fmtStars(r.stargazers_count) }}</span>
            <span v-if="r.forks_count" class="meta-item"><Icon icon="mdi:source-fork" class="mi" /> {{ r.forks_count }}</span>
            <span v-if="r.license" class="meta-item"><Icon icon="mdi:scale-balance" class="mi lic" /> {{ r.license.spdx_id }}</span>
            <span v-if="r.fork" class="meta-item"><Icon icon="mdi:source-branch" class="mi" /> fork</span>
            <span class="meta-item upd">更新于 {{ r.pushed_at ? r.pushed_at.slice(0, 10) : '' }}</span>
          </div>
        </div>
        <span v-if="r.stargazers_count" class="repo-star"><Icon icon="mdi:star" class="mi star" /> {{ fmtStars(r.stargazers_count) }}</span>
      </RouterLink>
    </div>

    <div v-if="!repoFiltered.length && !loading" class="no-repo">暂无仓库</div>

    <div class="pager">
      <n-button size="small" :disabled="page <= 1" @click="goPage(-1)">上一页</n-button>
      <span class="page-info">第 {{ page }} 页</span>
      <n-button size="small" :disabled="repos.length < PER" @click="goPage(1)">下一页</n-button>
    </div>
  </div>
</template>

<style scoped>
.err { color: #d03050; margin: 10px 0 16px; }
.profile { display: flex; gap: 20px; margin-bottom: 24px; }
.avatar { width: 96px; height: 96px; border-radius: 50%; border: 1px solid #eaecef; }
.p-info { display: flex; flex-direction: column; gap: 6px; }
.p-name { font-size: 24px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
.p-login { color: #57606a; font-size: 18px; font-weight: 300; }
.p-bio { color: #24292f; font-size: 14px; }
.p-loc { color: #57606a; font-size: 14px; display: flex; align-items: center; }
.p-stats { display: flex; gap: 16px; margin-top: 6px; font-size: 13px; color: #57606a; }
.stat { display: inline-flex; align-items: center; }
.stat a { color: #0969da; }
.badge-user, .badge-org { display: inline-flex; align-items: center; font-size: 12px; font-weight: 500; border-radius: 20px; padding: 2px 10px; border: 1px solid; }
.badge-user { color: #1f883d; border-color: #1f883d; background: #f0fff4; }
.badge-org { color: #0969da; border-color: #0969da; background: #f0f7ff; }
.sec { margin-bottom: 24px; }
.pin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.pin-card { background: #fff; border: 1px solid #eaecef; border-radius: 10px; padding: 12px 14px; transition: border-color .15s; display: flex; flex-direction: column; gap: 6px; }
.pin-card:hover { border-color: #2da44e; }
.pin-head { display: flex; align-items: center; gap: 6px; }
.pin-name { font-size: 14px; font-weight: 600; color: #0969da; font-family: ui-monospace, monospace; }
.pin-desc { font-size: 13px; color: #57606a; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pin-meta { display: flex; gap: 12px; font-size: 12px; color: #24292f; }
.repos-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.repos-title { font-size: 18px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; }
.repos-title .count { font-size: 13px; font-weight: 400; color: #57606a; }
.filter-input { width: 220px; }
.repo-list { display: grid; gap: 10px; }
.repo-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; background: #fff; border: 1px solid #eaecef; border-radius: 10px; padding: 14px 16px; transition: border-color .15s, box-shadow .15s; }
.repo-card:hover { border-color: #2da44e; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.repo-left { min-width: 0; flex: 1; }
.repo-name { font-weight: 600; color: #0969da; margin-bottom: 4px; }
.repo-desc { color: #57606a; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.repo-sub { display: flex; gap: 12px; margin-top: 8px; font-size: 12px; color: #57606a; flex-wrap: wrap; }
.repo-star { white-space: nowrap; font-size: 13px; color: #24292f; display: inline-flex; align-items: center; }
.meta-item { display: inline-flex; align-items: center; }
.mi { margin-right: 4px; font-size: 15px; }
.mi.star { color: #e3b341; }
.mi.lang { font-size: 10px; color: #0969da; }
.mi.lic { font-size: 13px; color: #8250df; }
.mi.repo, .mi.pin { color: #8b949e; }
.pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-info { color: #57606a; font-size: 13px; }
.no-repo { text-align: center; color: #8b949e; padding: 30px 0; }
</style>
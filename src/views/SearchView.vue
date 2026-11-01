<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
import { searchRepos, searchPeople, fmtStars } from '../api'
import { NInput, NButton, NTabs, NTabPane, NEmpty } from 'naive-ui'

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'repos', label: '仓库', icon: 'mdi:source-repository' },
  { key: 'people', label: '用户', icon: 'mdi:account' }
]

const q = ref(route.query.q || '')
const active = ref('repos')
const loading = ref(false)
const repos = ref([])
const people = ref([])
const error = ref('')

async function doSearch() {
  if (!q.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    // 仓库 + 用户（含组织）两个接口并行；用户一次请求即包含 User 与 Organization
    const [d, u] = await Promise.all([
      searchRepos(q.value),
      searchPeople(q.value)
    ])
    repos.value = d.items || []
    people.value = u.items || []
  } catch (e) {
    error.value = e.message
    repos.value = []
    people.value = []
  } finally {
    loading.value = false
  }
}

// 点击搜索：把关键词带入 /search?q=… 详情页，由路由参数驱动请求
function onSearch() {
  if (!q.value.trim()) return
  router.replace({ path: '/search', query: { q: q.value } })
}

watch(() => route.query.q, (v) => {
  q.value = v || ''
  if (v) doSearch()
}, { immediate: true })

function switchTab(k) {
  if (active.value === k) return
  active.value = k
}
</script>

<template>
  <div>
    <div class="search-bar">
      <n-input v-model:value="q" size="large" placeholder="搜索仓库 / 用户 / 组织…"
               clearable @keyup.enter="onSearch" />
      <n-button size="large" type="primary" :loading="loading" @click="onSearch">搜索</n-button>
    </div>

    <n-tabs v-model:value="active" type="line" class="tabs" @update:value="switchTab">
      <n-tab-pane v-for="t in tabs" :key="t.key" :name="t.key">
        <template #tab>
          <span style="display:inline-flex;align-items:center;gap:4px">
            <Icon :icon="t.icon" />
            {{ t.label }}
          </span>
        </template>
      </n-tab-pane>
    </n-tabs>

    <div v-if="error" class="err">{{ error }}</div>
    <n-empty v-else-if="!loading && !repos.length && !people.length" description="输入关键字开始搜索" class="pt-10" />

    <!-- 仓库结果 -->
    <div v-if="active === 'repos' && repos.length" class="repo-list">
      <RouterLink v-for="r in repos" :key="r.full_name" class="repo-card" :to="`/${r.owner.login}/${r.name}`">
        <div class="repo-left">
          <div class="repo-name">{{ r.full_name }}</div>
          <div class="repo-desc">{{ r.description || '暂无描述' }}</div>
          <div class="repo-sub">
            <span v-if="r.language" class="meta-item"><Icon icon="mdi:circle" class="mi lang" /> {{ r.language }}</span>
            <span v-if="r.license" class="meta-item"><Icon icon="mdi:scale-balance" class="mi lic" /> {{ r.license.spdx_id }}</span>
          </div>
        </div>
        <div class="repo-meta">
          <span class="meta-item"><Icon icon="mdi:star" class="mi star" /> {{ fmtStars(r.stargazers_count) }}</span>
          <span class="meta-item"><Icon icon="mdi:source-fork" class="mi" /> {{ r.forks_count }}</span>
        </div>
      </RouterLink>
    </div>

    <!-- 用户/组织结果 -->
    <div v-if="active === 'people' && people.length" class="people-list">
      <RouterLink v-for="p in people" :key="p.login" class="person-card" :to="`/${p.login}`">
        <img v-if="p.avatar_url" :src="p.avatar_url" class="avatar" alt="头像" />
        <div class="p-info">
          <div class="p-login">{{ p.login }}</div>
          <div class="p-type">
            <Icon :icon="p.type === 'Organization' ? 'mdi:office-building' : 'mdi:account'" class="mi"
                  :class="p.type === 'Organization' ? 'mi-org' : 'mi-user'" />
            {{ p.type === 'Organization' ? '组织' : '用户' }}
          </div>
        </div>
        <span class="p-link"><Icon icon="mdi:arrow-right" class="mi" /></span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.search-bar { display: flex; gap: 10px; margin-bottom: 6px; }
.search-bar .n-input { flex: 1; }
.tabs { margin-bottom: 8px; }
.err { color: #d03050; margin: 10px 0 16px; }
.pt-10 { padding-top: 40px; }
.repo-list { display: grid; gap: 10px; }
.repo-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; background: #fff; border: 1px solid #eaecef; border-radius: 10px; padding: 14px 16px; transition: border-color .15s, box-shadow .15s; }
.repo-card:hover { border-color: #2da44e; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.repo-left { min-width: 0; flex: 1; }
.repo-name { font-weight: 600; color: #0969da; margin-bottom: 4px; }
.repo-desc { color: #57606a; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.repo-sub { display: flex; gap: 12px; margin-top: 8px; font-size: 12px; color: #57606a; }
.repo-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; white-space: nowrap; }
.meta-item { font-size: 13px; color: #24292f; display: inline-flex; align-items: center; }
.mi { font-size: 15px; margin-right: 4px; }
.mi.star { color: #e3b341; }
.mi.lang { font-size: 10px; color: #0969da; }
.mi.lic { font-size: 13px; color: #8250df; }
.people-list { display: flex; flex-direction: column; gap: 10px; }
.person-card { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #eaecef; border-radius: 10px; padding: 12px 16px; transition: border-color .15s, box-shadow .15s; }
.person-card:hover { border-color: #2da44e; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.avatar { width: 44px; height: 44px; border-radius: 50%; border: 1px solid #eaecef; }
.p-info { flex: 1; }
.p-login { font-weight: 600; color: #0969da; font-size: 15px; }
.p-type { font-size: 12px; color: #57606a; display: flex; align-items: center; margin-top: 3px; }
.mi-user { color: #0969da; }
.mi-org { color: #8250df; }
.p-link { color: #8b949e; }
</style> 
<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getToken } from '../api'
import { NCard } from 'naive-ui'

const hasToken = ref(false)
onMounted(() => { hasToken.value = !!getToken() })

const features = [
  { icon: 'mdi:search-web', title: '仓库搜索', desc: '基于 GitHub 搜索 API，按星标排序快速找到目标仓库。' },
  { icon: 'mdi:draw', title: '代码高亮', desc: '内置 highlight.js，小文件直接内联预览，大文件自动转下载。' },
  { icon: 'mdi:file-document-outline', title: 'README 渲染', desc: '仓库首页自动渲染 README，支持 Markdown、表格、代码块。' },
  { icon: 'mdi:pin', title: '用户与组织页', desc: '展示头像、置顶仓库、关注者与完整仓库列表，更像原版。' },
  { icon: 'mdi:source-branch', title: 'Release 浏览', desc: '分页查看版本发布与附件，一键下载历史发行版。' },
  { icon: 'mdi:scale-balance', title: '许可证识别', desc: '仓库与列表自动展示许可证信息，一眼看清授权协议。' }
]

const stack = [
  { name: 'Vue 3', icon: 'logos:vue' },
  { name: 'Vite', icon: 'logos:vitejs' },
  { name: 'Naive UI', icon: 'simple-icons:naiveui' },
  { name: 'vue-router', icon: 'logos:vue-router' },
  { name: 'marked', icon: 'grommet-icons:markdown' },
  { name: 'highlight.js', icon: 'mdi:language-javascript' },
  { name: 'Iconify', icon: 'mdi:emoticon-happy-outline' }
]
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-badge">
        <Icon icon="mdi:github" class="hb-icon" /> GitHub Browser
      </div>
      <h1 class="hero-title">轻量优雅的<br />GitHub 只读浏览器</h1>
      <p class="hero-sub">
        无需安装、无需授权，纯前端渲染。搜索仓库、浏览文件、阅读 README、
        查看 Release，全部在一个界面完成。
      </p>
      <div class="hero-cta">
        <RouterLink to="/search" class="btn-primary"><Icon icon="mdi:search-web" class="bmi" /> 开始浏览</RouterLink>
        <RouterLink :to="hasToken ? '/search' : '/login'" class="btn-ghost">
          <Icon icon="mdi:cog-outline" class="bmi" /> {{ hasToken ? '已配置 Token' : '配置 Token' }}
        </RouterLink>
      </div>
      <div class="hero-stats">
        <span><Icon icon="mdi:source-repository" class="smi" /> 海量仓库</span>
        <span><Icon icon="mdi:star" class="smi star" /> 星标排行</span>
        <span><Icon icon="mdi:code-greater-than" class="smi" /> 语法高亮</span>
      </div>
    </section>

    <!-- 功能特性 -->
    <section class="section">
      <h2 class="section-title">核心特性</h2>
      <div class="grid">
        <n-card v-for="f in features" :key="f.title" class="feature" :bordered="true">
          <div class="feature-icon"><Icon :icon="f.icon" /></div>
          <div class="feature-title">{{ f.title }}</div>
          <div class="feature-desc">{{ f.desc }}</div>
        </n-card>
      </div>
    </section>

    <!-- 使用方式 -->
    <section class="section">
      <h2 class="section-title">三步上手</h2>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-title">搜索仓库</div>
          <div class="step-desc">输入关键字，点击搜索，按星标从高到低排列结果。</div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-title">浏览文件</div>
          <div class="step-desc">进入仓库，内联预览代码、阅读 README、下载附件。</div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-title">可选配置 Token</div>
          <div class="step-desc">默认 60 次/小时。配置 GitHub Token 可大幅提升配额。</div>
        </div>
      </div>
    </section>

    <!-- 技术栈 -->
    <section class="section">
      <h2 class="section-title">技术栈</h2>
      <div class="stack">
        <span v-for="s in stack" :key="s.name" class="chip">
          <Icon :icon="s.icon" class="chip-icon" /> {{ s.name }}
        </span>
      </div>
    </section>

    <footer class="foot">
      <span>仅用于学习与个人浏览 · 数据来自 GitHub API</span>
    </footer>
  </div>
</template>

<style scoped>
.home { max-width: 820px; margin: 0 auto; }

.hero { text-align: center; padding: 40px 0 30px; }
.hero-badge { display: inline-flex; align-items: center; gap: 6px; color: #0969da; font-weight: 600; font-size: 13px; border: 1px solid #d0e8ff; background: #f0f7ff; padding: 6px 14px; border-radius: 20px; margin-bottom: 18px; }
.hb-icon { font-size: 16px; }
.hero-title { font-size: 44px; line-height: 1.2; font-weight: 800; margin: 0 0 16px; }
.hero-sub { color: #57606a; font-size: 16px; max-width: 560px; margin: 0 auto 26px; line-height: 1.7; }
.hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; background: #2da44e; color: #fff; padding: 10px 22px; border-radius: 24px; font-weight: 600; transition: background .15s; }
.btn-primary:hover { background: #2c974b; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #d0d7de; color: #24292f; padding: 10px 22px; border-radius: 24px; font-weight: 500; transition: background .15s, border-color .15s; }
.btn-ghost:hover { background: #f6f8fa; }
.bmi { font-size: 17px; }
.hero-stats { display: flex; gap: 22px; justify-content: center; margin-top: 30px; color: #57606a; font-size: 13px; flex-wrap: wrap; }
.hero-stats span { display: inline-flex; align-items: center; gap: 5px; }
.smi { font-size: 15px; color: #24292f; }
.smi.star { color: #e3b341; }

.section { margin: 34px 0; }
.section-title { font-size: 20px; font-weight: 700; margin: 0 0 16px; text-align: center; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.feature { transition: border-color .15s, box-shadow .15s; }
.feature:hover { border-color: #2da44e; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.feature-icon { font-size: 28px; color: #0969da; margin-bottom: 8px; }
.feature-title { font-weight: 600; margin-bottom: 4px; }
.feature-desc { color: #57606a; font-size: 13px; line-height: 1.6; }

.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.step { background: #fff; border: 1px solid #eaecef; border-radius: 12px; padding: 18px; text-align: center; }
.step-num { width: 32px; height: 32px; border-radius: 50%; background: #0969da; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: 10px; }
.step-title { font-weight: 600; margin-bottom: 6px; }
.step-desc { color: #57606a; font-size: 13px; line-height: 1.6; }

.stack { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 5px; background: #fff; border: 1px solid #eaecef; border-radius: 20px; padding: 6px 14px; font-size: 13px; }
.chip-icon { font-size: 16px; }

.foot { text-align: center; color: #8b949e; font-size: 13px; padding: 20px 0; border-top: 1px solid #eaecef; }

@media (max-width: 640px) {
  .hero-title { font-size: 32px; }
  .steps { grid-template-columns: 1fr; }
}
</style>
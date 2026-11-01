<script setup>
import { ref, computed, onMounted } from 'vue'
import { verifyToken, getToken } from '../api'
import { NInput, NCheckbox, NButton, useMessage } from 'naive-ui'

const message = useMessage()
const pat = ref('')
const rememberPat = ref(true)
const loading = ref(false)
const isLoggedIn = ref(false)
const user = ref(null)

const isFormValid = computed(() => pat.value.trim().length > 0)

// 从本地读取用户信息
function loadUserFromStorage() {
  try {
    const raw = localStorage.getItem('gh_user')
    user.value = raw ? JSON.parse(raw) : null
    isLoggedIn.value = !!user.value
  } catch {
    user.value = null
    isLoggedIn.value = false
  }
}

onMounted(() => {
  if (getToken()) {
    loadUserFromStorage()
    // 后台校验一次本地 Token，并刷新头像/登录名
    verifyUser(getToken())
  }
})

async function verifyUser(token) {
  try {
    const u = await verifyToken(token)
    user.value = u
    isLoggedIn.value = true
    localStorage.setItem('gh_user', JSON.stringify({ login: u.login, avatar_url: u.avatar_url, name: u.name }))
  } catch {
    if (!isLoggedIn.value) {
      localStorage.removeItem('gh_token')
      localStorage.removeItem('gh_user')
      message.error('本地 Token 已失效，请重新登录')
    } else {
      // 已有登录信息但后台校验失败，保留显示，仅提示
      message.warning('Token 校验失败，可能存在限流或网络问题')
    }
  }
}

async function handleLogin() {
  if (!isFormValid.value) {
    message.warning('请输入 Personal Access Token')
    return
  }
  loading.value = true
  try {
    // 先提交给 GitHub 校验有效性
    const u = await verifyToken(pat.value.trim())
    if (rememberPat.value) {
      localStorage.setItem('gh_token', pat.value.trim())
    } else {
      localStorage.removeItem('gh_token')
    }
    localStorage.setItem('gh_user', JSON.stringify({ login: u.login, avatar_url: u.avatar_url, name: u.name }))
    user.value = u
    isLoggedIn.value = true
    message.success('认证成功，欢迎 ' + u.login)
  } catch (e) {
    message.error(e.message || '认证失败，请检查 Token')
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('gh_token')
  localStorage.removeItem('gh_user')
  pat.value = ''
  user.value = null
  isLoggedIn.value = false
  message.info('已退出登录')
}

function clearAndReset() {
  pat.value = ''
  localStorage.removeItem('gh_token')
  localStorage.removeItem('gh_user')
  user.value = null
  isLoggedIn.value = false
  message.info('Token 已清除')
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-card">
      <!-- 头部 -->
      <div class="login-header">
        <h2>GitHub Token 登录</h2>
       
      </div>

      <!-- 已登录状态 -->
      <div v-if="isLoggedIn" class="logged-in">
        <img v-if="user && user.avatar_url" :src="user.avatar_url" class="logged-in-avatar" alt="头像" />
        <div v-else class="logged-in-icon">✓</div>
        <p class="logged-in-login">@{{ user ? user.login : '已登录' }}</p>
        <p v-if="user && user.name" class="logged-in-name">{{ user.name }}</p>
        <n-button
          type="primary"
          size="large"
          block
          @click="handleLogout"
        >
          退出登录
        </n-button>
      </div>

      <!-- 登录表单 -->
      <div v-else class="login-form">
        <div class="field">
          <label>Personal Access Token</label>
          <n-input
            v-model:value="pat"
            type="password"
            placeholder="ghp_xxxxxxxxxxxx"
            :show-password-on="'click'"
            size="large"
            @keyup.enter="handleLogin"
          />
        </div>

        <div class="field options">
          <label class="checkbox-label">
            <n-checkbox v-model:checked="rememberPat" />
            <span>记住此 Token（存储在浏览器本地）</span>
          </label>
        </div>

        <div class="field tip-text">
          <p>Token 仅存储在你的浏览器 localStorage 中，不会发送给任何第三方。用于提升 GitHub API 配额（未配置时 60 次/小时）。</p>
        </div>

        <div class="field actions">
          <n-button
            type="primary"
            size="large"
            block
            :loading="loading"
            :disabled="!isFormValid"
            @click="handleLogin"
          >
            登录
          </n-button>
        </div>

        <div class="field footer-links">
          <button class="link-btn" @click="clearAndReset">清除 Token</button>
          <span class="separator">·</span>
          <a href="https://github.com/settings/tokens" target="_blank" rel="noopener">创建新 Token →</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f6f8fa;
  padding: 20px;
}

.login-card {
  width: 420px;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 0;
  overflow: hidden;
}

.login-header {
  text-align: center;
  padding: 28px 20px 18px;
  border-bottom: 1px solid #d0d7de;
  background: #f6f8fa;
}

.login-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2328;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #656d76;
}

.login-form {
  padding: 24px;
  display: grid;
  gap: 16px;
}

.field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1f2328;
  margin-bottom: 6px;
}

.options {
  margin-top: -4px;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 400 !important;
  font-size: 13px;
  color: #656d76;
}

.tip-text p {
  margin: 0;
  font-size: 12px;
  color: #8b949e;
  line-height: 1.5;
  background: #f6f8fa;
  padding: 10px 12px;
  border-radius: 0;
  border-left: 3px solid #0969da;
}

.actions {
  margin-top: 4px;
}

.actions :deep(.n-button) {
  border-radius: 0;
}

.footer-links {
  text-align: center;
  font-size: 13px;
  color: #656d76;
  padding-top: 8px;
  border-top: 1px solid #d0d7de;
}

.link-btn {
  background: none;
  border: none;
  color: #0969da;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}

.link-btn:hover {
  text-decoration: underline;
}

.separator {
  margin: 0 6px;
  color: #d0d7de;
}

.footer-links a {
  color: #0969da;
  text-decoration: none;
}

.footer-links a:hover {
  text-decoration: underline;
}

/* 已登录状态样式 */
.logged-in {
  padding: 32px 24px;
  text-align: center;
  display: grid;
  gap: 16px;
}

.logged-in-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto;
  background: #dafbe1;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #1a7f37;
}

.logged-in-avatar {
  width: 88px;
  height: 88px;
  margin: 0 auto;
  border-radius: 50%;
  border: 3px solid #0969da;
  object-fit: cover;
  background: #f6f8fa;
}

.logged-in-login {
  font-size: 18px;
  font-weight: 600;
  color: #1f2328;
  margin: 0;
}

.logged-in-name {
  font-size: 13px;
  color: #656d76;
  margin: 0;
}

.logged-in :deep(.n-button) {
  border-radius: 0;
}
</style>
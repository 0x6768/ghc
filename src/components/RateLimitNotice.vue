<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDialog } from 'naive-ui'
import { onRateLimit, getToken } from '../api'

const router = useRouter()
const dialog = useDialog()
let showing = false

function showRate() {
  // 避免同一时刻重复弹出
  if (showing) return
  showing = true
  const loggedIn = !!getToken()
  dialog.warning({
    title: '访问被限流',
    maskClosable: false,
    closable: false,
    style: { width: '440px' },
    content: loggedIn
      ? '检测到当前 GitHub API 请求已达到速率限制。当前配额已用尽，请稍后再试，或检查 Token 是否有效以解除限流。'
      : '检测到当前 GitHub API 请求已达到速率限制（未登录每次每小时约 60 次）。登录 GitHub Token 可提升至每小时 5000 次，解除限流。',
    positiveText: loggedIn ? '知道了' : '去登录解除限流',
    negativeText: !loggedIn ? '取消' : null,
    onPositiveClick: () => {
      if (!loggedIn) router.push('/login')
    },
    onAfterLeave: () => { showing = false }
  })
}

onMounted(() => { onRateLimit(showRate) })
onUnmounted(() => { onRateLimit(null) })
</script>

<template>
  <span />
</template>
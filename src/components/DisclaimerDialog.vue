<script setup>
import { onMounted } from 'vue'
import { useDialog } from 'naive-ui'
import { useMessage } from 'naive-ui'
const dialog = useDialog()
const message = useMessage()

onMounted(() => {
  // 仅在全局首次访问时弹出
  if (localStorage.getItem('gh_disclaimer_ok') === '1') return
  dialog.warning({
    title: '免责声明',
    maskClosable: false,
    closable: false,
    content: '本网站为非官方第三方 GitHub 浏览器，非 GitHub 官方网站，与 GitHub 官方及其关联公司无任何从属或合作关系。站内数据均来自 GitHub 公开接口，仅供学习与个人研究使用；请遵守 GitHub 服务条款及各站点规定，若因使用本工具造成任何问题，由使用者自行承担。',
    positiveText: '我已知晓',
    negativeText: null,
    // 点击确认按钮时立即标记
    onPositiveClick: () => {
      localStorage.setItem('gh_disclaimer_ok', '1')
      message.success('已知晓，继续使用')
    }
  })
})
</script>

<template>
  <span />
</template>
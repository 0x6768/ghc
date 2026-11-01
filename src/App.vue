<script setup>
import { RouterLink, RouterView } from 'vue-router'
import {
  NConfigProvider, NDialogProvider, NMessageProvider,
  NLayout, NLayoutHeader, NLayoutContent
} from 'naive-ui'
import DisclaimerDialog from './components/DisclaimerDialog.vue'
import RateLimitNotice from './components/RateLimitNotice.vue'
</script>

<template>
  <n-config-provider>
  <n-dialog-provider>
<n-message-provider>
    <n-layout position="static">
      <n-layout-header bordered class="nav-h">
        <div class="nav-inner">
          <RouterLink to="/" class="brand">GitHub Browser</RouterLink>
          <div class="nav-actions">
            <RouterLink to="/" class="nav-link">首页</RouterLink>
            <RouterLink to="/search" class="nav-link">搜索</RouterLink>
            <RouterLink to="/login" class="nav-link">Token 设置</RouterLink>
          </div>
        </div>
      </n-layout-header>
      <n-layout-content class="content">
        <RouterView />
      </n-layout-content>
    </n-layout>
    <!-- 全局首次访问免责声明，挂在 dialog-provider 之下以使用 useDialog -->
    <DisclaimerDialog />
    <!-- 全局限流提示：API 限流时弹出大框提示登录解除 -->
    <RateLimitNotice />
  </n-message-provider>
  </n-dialog-provider>
  </n-config-provider>
</template>

<style scoped>
.nav-h {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
}
.nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand {
  font-weight: 700;
  font-size: 17px;
  color: #24292f;
}
.nav-actions { display: flex; gap: 14px; }
.nav-link { color: #57606a; font-size: 14px; transition: color .15s; }
.nav-link:hover { color: #24292f; }
.content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 16px 60px;
}
::v-deep(.n-layout-content) { background: transparent; }
</style>
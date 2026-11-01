# GitHub 只读浏览器

一个**轻量优雅的 GitHub 只读浏览器**。纯前端、无后端、无授权，基于 GitHub REST API 渲染仓库内容。

> 用于学习、个人浏览与代码阅读。非官方应用，与 GitHub 无关。

## ✨ 特性

- 🔍 **仓库搜索** — 按星标排序，快速定位目标仓库
- 🐱 **用户 / 组织页** — 头像、置顶仓库、关注者与完整仓库列表，更像原版
- 📄 **文件浏览** — 面包屑导航，进入任意子目录
- 💡 **代码高亮** — 内置 highlight.js，小文件内联预览，大文件自动转下载
- 📖 **README 渲染** — 仓库首页自动渲染 Markdown（表格、代码块、图片）
- 🏷️ **Release 浏览** — 分页查看版本发布与附件下载
- ⚖️ **许可证识别** — 仓库与列表自动展示 SPDX 许可证
- ⭐ **星标 / fork / 语言** — 仓库多维度元信息一目了然

## 🚀 快速开始

```bash
# 安装依赖
bun install
# 启动开发服务器
bun dev
```

访问 `http://localhost:5173/` 即可。

### 构建部署

```bash
bun run build
bun run preview
```

> ⚠️ 本项目使用 **History 路由**（无 `#`），部署时需将所有路径回退到 `index.html`。

## 🛠️ 使用说明

1. **搜索仓库** — 首页输入关键字，或进入「搜索」页面。
2. **进入仓库** — 点击搜索结果，浏览文件树、阅读 README、查看 Release。
3. **用户页** — 点击仓库名左侧的 owner 名称，跳转到该用户 / 组织的置顶与仓库列表。
4. **配置 Token（可选）** — 默认 60 次/小时；在「Token 设置」填入 GitHub Token 可提升配额。

## 💻 技术栈

| 技术 | 用途 |
| --- | --- |
| [Vue 3](https://vuejs.org/) | UI 框架 |
| [Vite](https://vitejs.dev/) | 构建工具 |
| [Naive UI](https://www.naiveui.com/) | 组件库与主题 |
| [vue-router](https://router.vuejs.org/) | 前端路由（History 模式） |
| [marked](https://marked.js.org/) | Markdown 渲染 |
| [highlight.js](https://highlightjs.org/) | 代码语法高亮 |
| [Iconify](https://iconify.design/) | 图标库 |

## 📁 目录结构

```
src/
├── api.js              # GitHub API 封装
├── router.js           # 路由配置
├── App.vue             # 全局布局与导航
├── views/
│   ├── HomeView.vue    # 宣导首页
│   ├── SearchView.vue  # 仓库搜索
│   ├── UserView.vue    # 用户 / 组织页
│   ├── RepoView.vue    # 仓库页（文件树 + README）
│   └── ReleasesView.vue# Release 页
```

## ⚠️ 说明

- 本项目为只读浏览，不提供写操作。
- API 数据经过 `gh-proxy.com` 代理中转以缓解直连限制，可自行在 `src/api.js` 中调整。
- 仅用于合法、公开的代码阅读场景，请遵守目标项目的开源许可。

## 📄 License

本项目仅作学习交流用途。
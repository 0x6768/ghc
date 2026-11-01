import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import SearchView from './views/SearchView.vue'
import LoginView from './views/LoginView.vue'
import UserView from './views/UserView.vue'
import RepoView from './views/RepoView.vue'
import ReleasesView from './views/ReleasesView.vue'
import FileViewer from './views/FileViewer.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/search', component: SearchView },
    { path: '/login', component: LoginView },
    { path: '/:owner/:repo/releases', component: ReleasesView, props: true },
    { path: '/:owner/:repo/files-viewer', component: FileViewer, props: true },
    { path: '/:owner/:repo', component: RepoView, props: true },
    { path: '/:login', component: UserView, props: true }
  ]
})

export default router
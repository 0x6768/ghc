import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'
import Prism from 'prismjs'
import 'prismjs/themes/prism.css'

window.Prism = Prism

const CDN = 'https://s4.zstatic.net/ajax/libs/prism/1.30.0/'
const loader = document.createElement('script')
loader.src = CDN + 'plugins/autoloader/prism-autoloader.min.js'
loader.async = true
loader.onload = () => {
  Prism.plugins.autoloader.languages_path = CDN + 'components/'
}
document.head.appendChild(loader)

createApp(App).use(router).mount('#app')
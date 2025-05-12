import { createRouter, createWebHashHistory } from 'vue-router'
import Index from '~/ui/options/pages/Index.vue'

const routes = [
  {
    path: '/',
    name: 'Index',
    component: Index,
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router

import { createRouter, createWebHashHistory } from 'vue-router'
import Index from '~/ui/popup/pages/Index.vue'
import ViewChanges from '~/ui/popup/pages/ViewChanges.vue'

const routes = [
  {
    path: '/',
    name: 'Index',
    component: Index,
  },
  {
    path: '/view-changes/:id',
    name: 'ViewChanges',
    component: ViewChanges,
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router

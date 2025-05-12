import { createRouter, createWebHashHistory } from 'vue-router'
import Index from '~/ui/popup/pages/Index.vue'
import ViewChanges from '~/ui/popup/pages/ViewChanges.vue'

console.log('[ROUTER] Initializing router...')
console.log('[ROUTER] Index component:', Index)
console.log('[ROUTER] ViewChanges component:', ViewChanges)

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

console.log('[ROUTER] Routes defined:', routes)

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

console.log('[ROUTER] Router created')

// Добавляем хуки роутера для отладки
router.beforeEach((to, from) => {
  console.log(`[ROUTER] Navigating from "${from.path}" to "${to.path}"`)
  return true
})

router.afterEach((to) => {
  console.log(`[ROUTER] Navigation to "${to.path}" complete`)
})

export default router

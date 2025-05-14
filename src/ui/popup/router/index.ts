import { createRouter, createWebHashHistory } from 'vue-router'
import Index from '~/ui/popup/pages/Index.vue'
import ViewChanges from '~/ui/popup/pages/ViewChanges.vue'
import NewTask from '~/ui/popup/pages/NewTask.vue'

console.log('[ROUTER] Initializing router...')
console.log('[ROUTER] Index component:', Index)
console.log('[ROUTER] ViewChanges component:', ViewChanges)
console.log('[ROUTER] NewTask component:', NewTask)

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
  },
  {
    path: '/new-task',
    name: 'NewTask',
    component: NewTask,
  }
]

console.log('[ROUTER] Routes defined:', routes)

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

console.log('[ROUTER] Router created')

// Делаем роутер доступным глобально для упрощения доступа в CSP-режиме
window.vueRouter = router

// Добавляем хуки роутера для отладки
router.beforeEach((to, from) => {
  console.log(`[ROUTER] Navigating from "${from.path}" to "${to.path}"`)
  return true
})

router.afterEach((to) => {
  console.log(`[ROUTER] Navigation to "${to.path}" complete`)
})

export default router

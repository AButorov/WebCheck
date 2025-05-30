import { createRouter, createWebHashHistory } from 'vue-router'

// Импортируем страницы
// @ts-expect-error - Vue компонент будет корректно разрешен во время сборки
import Index from '../pages/Index.vue'

// Создаем маршруты
const routes = [
  {
    path: '/',
    name: 'index',
    component: Index,
  },
]

// Создаем экземпляр маршрутизатора
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// Делаем маршрутизатор доступным глобально
// Это необходимо для совместимости с CSP в Manifest V3
window.vueRouter = router

export default router

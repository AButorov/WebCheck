import App from './App.vue'
import router from './router'
import '~/assets/styles/tailwind.css'
import { createPinia } from 'pinia'

// Import locale messages
import en from '~/locales/en.json'
import ru from '~/locales/ru.json'

// Use our CSP-safe configuration for MV3
import { configureSafeApp } from './csp-safe'

console.log('[POPUP-MV3] Starting popup initialization for Manifest V3...')

// Initialize Pinia
const pinia = createPinia()
console.log('[POPUP-MV3] Pinia initialized')

// Initialize the app with CSP-safe settings for MV3
const app = configureSafeApp(App, router, { en, ru })
console.log('[POPUP-MV3] App created with MV3-compatible settings')

// Use Pinia
app.use(pinia)
console.log('[POPUP-MV3] Pinia attached to app')

// Mount app
console.log('[POPUP-MV3] Mounting app to #app element...')
try {
  // Проверка наличия элемента #app
  const appElement = document.getElementById('app')
  if (!appElement) {
    console.error('[POPUP-MV3] #app element not found in DOM!')
    console.log('[POPUP-MV3] DOM structure:', document.body.innerHTML)
  } else {
    app.mount('#app')
    console.log('[POPUP-MV3] App successfully mounted')
  }
} catch (error) {
  console.error('[POPUP-MV3] Error mounting app:', error)
}

// Настройка глобальной обработки ошибок
window.addEventListener('error', (event) => {
  console.error('[POPUP-MV3] Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[POPUP-MV3] Unhandled Promise rejection:', event.reason)
})

// Логирование загрузки страницы
window.addEventListener('load', () => {
  console.log('[POPUP-MV3] Page fully loaded')
  console.log('[POPUP-MV3] Current route:', router.currentRoute.value)
})

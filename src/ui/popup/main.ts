import App from './App.vue'
import router from './router'
import '~/assets/styles/tailwind.css'
import { createPinia } from 'pinia'

// Import locale messages
import en from '~/locales/en.json'
import ru from '~/locales/ru.json'

// Use our CSP-safe configuration
import { configureSafeApp } from './csp-safe'

// Добавляем отдельный скрипт для логирования, чтобы избежать inline скриптов
const logDomState = () => {
  console.log('[POPUP] Starting popup initialization...')
  console.log('[POPUP] DOM state:', {
    appElement: document.getElementById('app'),
    body: document.body,
    documentReady: document.readyState
  })
}

// Выполняем логирование когда DOM готов
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', logDomState)
} else {
  logDomState()
}

// Initialize Pinia
const pinia = createPinia()
console.log('[POPUP] Pinia initialized')

// Initialize the app with CSP-safe settings
const app = configureSafeApp(App, router, { en, ru })
console.log('[POPUP] App created with CSP-safe settings')

// Use Pinia
app.use(pinia)
console.log('[POPUP] Pinia attached to app')

// Mount app
console.log('[POPUP] Mounting app to #app element...')
app.mount('#app')
console.log('[POPUP] App mounted')

// Настройка глобальной обработки ошибок
window.addEventListener('error', (event) => {
  console.error('[POPUP] Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[POPUP] Unhandled Promise rejection:', event.reason)
})

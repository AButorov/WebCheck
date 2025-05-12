import { createApp, defineComponent } from 'vue'
import App from './App.vue'
import router from './router'
import '~/assets/styles/tailwind.css'
import { createPinia } from 'pinia'

// Import locale messages statically
import en from '~/locales/en.json'
import ru from '~/locales/ru.json'

// Console logging helper
const log = (msg, ...args) => {
  console.log(`[CSP-SAFE] ${msg}`, ...args)
}

log('Starting popup initialization...')

// Pre-define components to avoid runtime compilation
const AppComponent = defineComponent(App)

// Create application
const app = createApp(AppComponent)

// Attach router
app.use(router)
log('Router attached')

// Attach Pinia
const pinia = createPinia()
app.use(pinia)
log('Pinia attached')

// Setup localization manually (without compilation)
const userLang = navigator.language.split('-')[0] || 'en'
const messages = { en, ru }
const t = (key) => {
  const langMessages = messages[userLang] || messages.en
  const keys = key.split('.')
  let result = langMessages
  
  // Navigate through the nested keys
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k]
    } else {
      return key // Return key if not found
    }
  }
  
  return typeof result === 'string' ? result : key
}

// Make translation function global
app.config.globalProperties.$t = t
window.t = t

// Error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('[CSP-SAFE] Error:', err)
  console.error('[CSP-SAFE] Info:', info)
  
  // Try to render error in UI
  const appElement = document.getElementById('app')
  if (appElement) {
    appElement.innerHTML = `
      <div style="padding: 20px; color: #e53e3e; background: #fff5f5; border: 1px solid #fc8181; border-radius: 5px; margin: 20px;">
        <h3 style="font-weight: bold; margin-bottom: 10px;">Ошибка загрузки</h3>
        <p>${err.message || 'Неизвестная ошибка'}</p>
        <p style="margin-top: 10px; font-size: 14px; color: #718096;">
          Попробуйте перезапустить расширение
        </p>
      </div>
    `
  }
}

// Mount the app
try {
  const appElement = document.getElementById('app')
  if (!appElement) {
    log('Error: #app element not found!')
  } else {
    app.mount('#app')
    log('App mounted successfully')
  }
} catch (error) {
  console.error('[CSP-SAFE] Mount error:', error)
}

// Add page load logging
window.addEventListener('load', () => {
  log('Page fully loaded')
})

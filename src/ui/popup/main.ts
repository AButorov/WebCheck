import { createApp } from 'vue'
// @ts-expect-error - Vue компонент будет корректно разрешен во время сборки
import App from './App.vue'
import router from './router'
import '~/assets/styles/tailwind.css'
import { createPinia } from 'pinia'

// Import locale messages statically
import en from '~/locales/en.json'
import ru from '~/locales/ru.json'

// Типы для локализации
type MessageLanguage = 'en' | 'ru'
type Messages = {
  [K in MessageLanguage]: typeof en
}

// Console logging helper
const log = (msg: string, ...args: unknown[]) => {
  console.log(`[CSP-SAFE] ${msg}`, ...args)
}

log('Starting popup initialization...')

// Create application
const app = createApp(App)

// Attach router
app.use(router)
log('Router attached')

// Attach Pinia
const pinia = createPinia()
app.use(pinia)
log('Pinia attached')

// Setup localization manually (without compilation)
const userLang = (navigator.language.split('-')[0] as MessageLanguage) || 'en'
const messages: Messages = { en, ru }

const t = (key: string): string => {
  const langMessages = messages[userLang] || messages.en
  const keys = key.split('.')
  let result: unknown = langMessages

  // Navigate through the nested keys
  for (const k of keys) {
    if (result && typeof result === 'object' && !Array.isArray(result) && k in result) {
      result = (result as Record<string, unknown>)[k]
    } else {
      return key // Return key if not found
    }
  }

  return typeof result === 'string' ? result : key
}

// Типизация глобального окна
declare global {
  interface Window {
    t: (key: string) => string
  }
}

// Make translation function global
app.config.globalProperties.$t = t
window.t = t

// Error handler
app.config.errorHandler = (err) => {
  console.error('[CSP-SAFE] Error:', err)

  // Try to render error in UI
  const appElement = document.getElementById('app')
  if (appElement) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
    appElement.innerHTML = `
      <div style="padding: 20px; color: #e53e3e; background: #fff5f5; border: 1px solid #fc8181; border-radius: 5px; margin: 20px;">
        <h3 style="font-weight: bold; margin-bottom: 10px;">Ошибка загрузки</h3>
        <p>${errorMessage}</p>
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
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  console.error('[CSP-SAFE] Mount error:', errorMessage)
}

// Add page load logging
window.addEventListener('load', () => {
  log('Page fully loaded')
})

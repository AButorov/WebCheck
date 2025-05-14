// Импорты
import { createApp, defineComponent } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Импорт стилей Tailwind
import '~/assets/styles/tailwind.css'

// Импорт файлов локализации
import en from '~/locales/en.json'
import ru from '~/locales/ru.json'

// Помощник для логирования
const log = (msg, ...args) => {
  console.log(`[OPTIONS] ${msg}`, ...args)
}

log('Starting options page initialization...')

// Настройка локализации вручную (без компиляции)
const userLang = navigator.language.split('-')[0] || 'en'
const messages = { en, ru }

/**
 * Функция перевода с защитой от ошибок
 */
const t = (key) => {
  try {
    if (!key) return '';
    
    const langMessages = messages[userLang] || messages.en
    const keys = key.split('.')
    let result = langMessages
    
    // Перемещение по вложенным ключам
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k]
      } else {
        return key // Возвращаем ключ, если не найден
      }
    }
    
    return typeof result === 'string' ? result : key
  } catch (err) {
    console.error('[OPTIONS] Translation error:', err)
    return key || ''
  }
}

// ВАЖНО: Добавляем функцию перевода глобально перед созданием приложения
// Это гарантирует, что она будет доступна для шаблонов, которые пытаются получить к ней доступ
window.t = t
log('i18n function added to window before app creation')

// Предопределение компонентов для избегания компиляции во время выполнения
const AppComponent = defineComponent(App)

// Создание приложения
const app = createApp(AppComponent)

// Подключение маршрутизатора
app.use(router)
log('Router attached')

// Подключение Pinia
const pinia = createPinia()
app.use(pinia)
log('Pinia attached')

// Устанавливаем функцию перевода как глобальное свойство Vue
app.config.globalProperties.$t = t
log('Translation function attached to app.config.globalProperties')

// Обработчик ошибок
app.config.errorHandler = (err, instance, info) => {
  console.error('[OPTIONS] Error:', err)
  console.error('[OPTIONS] Info:', info)
  console.error('[OPTIONS] Instance:', instance)
  
  // Попытка отобразить ошибку в UI
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

// Монтирование приложения
try {
  const appElement = document.getElementById('app')
  if (!appElement) {
    log('Error: #app element not found!')
  } else {
    app.mount('#app')
    log('App mounted successfully')
  }
} catch (error) {
  console.error('[OPTIONS] Mount error:', error)
}

// Добавляем логирование загрузки страницы
window.addEventListener('load', () => {
  log('Page fully loaded')
  // Проверим доступность функции t в window для диагностики
  log('window.t is ' + (typeof window.t === 'function' ? 'available' : 'NOT available'))
})

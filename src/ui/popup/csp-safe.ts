// CSP-safe configuration for Vue
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { App } from 'vue'
import type { Router } from 'vue-router'

type Messages = {
  en: Record<string, any>
  ru: Record<string, any>
  [key: string]: Record<string, any>
}

// Настройки для предотвращения CSP ошибок
export function configureSafeApp(AppComponent: any, router: Router, messages: Messages) {
  console.log('[CSP-SAFE] Configuring safe app...')
  
  // Определяем язык
  const userLanguage = navigator.language.split('-')[0] || 'en'
  console.log('[CSP-SAFE] User language:', userLanguage)
  
  // Создаем i18n в режиме совместимости с CSP
  const i18n = createI18n({
    legacy: false,
    locale: userLanguage,
    fallbackLocale: 'en',
    messages,
    warnHtmlMessage: false,
    escapeHtml: false,
    runtimeOnly: false, // Изменено для лучшей совместимости
  })
  
  console.log('[CSP-SAFE] i18n created')

  // Создаем приложение
  console.log('[CSP-SAFE] Creating Vue app...')
  const app = createApp(AppComponent)
  
  // Настройка для CSP-совместимости
  app.config.performance = false
  app.config.compilerOptions.whitespace = 'condense'
  app.config.unwrapInjectedRef = true
  
  // Глобальная обработка ошибок
  app.config.errorHandler = (err, instance, info) => {
    console.error('[CSP-SAFE] Global error:', err)
    console.error('[CSP-SAFE] Error info:', info)
  }
  
  console.log('[CSP-SAFE] Vue app created')

  // Устанавливаем плагины
  app.use(router)
  console.log('[CSP-SAFE] Router attached')
  
  app.use(i18n)
  console.log('[CSP-SAFE] i18n attached')

  console.log('[CSP-SAFE] App configuration complete')
  return app
}

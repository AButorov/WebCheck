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
  console.log('[CSP-SAFE] Messages:', Object.keys(messages))
  
  // Определяем язык
  const userLanguage = navigator.language.split('-')[0] || 'en'
  console.log('[CSP-SAFE] User language:', userLanguage)
  
  // Создаем i18n без использования eval() где возможно
  const i18n = createI18n({
    legacy: false,
    locale: userLanguage,
    fallbackLocale: 'en',
    messages,
    warnHtmlMessage: false, // Отключаем предупреждения
    escapeHtml: false, // Отключаем экранирование HTML
    runtimeOnly: true, // Только runtime режим
    // Отключаем компиляцию сообщений, которая может использовать eval()
    missing: (locale: string, key: string) => {
      console.warn(`[CSP-SAFE] Missing translation: ${locale} - ${key}`)
      return key
    },
  })
  
  console.log('[CSP-SAFE] i18n created')

  // Создаем приложение с безопасными настройками
  console.log('[CSP-SAFE] Creating Vue app...')
  const app = createApp(AppComponent)
  console.log('[CSP-SAFE] Vue app created')

  // Устанавливаем плагины
  app.use(router)
  console.log('[CSP-SAFE] Router attached')
  
  app.use(i18n)
  console.log('[CSP-SAFE] i18n attached')

  // Глобальная обработка ошибок
  app.config.errorHandler = (err, instance, info) => {
    console.error('[CSP-SAFE] Global error:', err)
    console.error('[CSP-SAFE] Error info:', info)
  }
  
  // Обработка предупреждений
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('[CSP-SAFE] Vue warning:', msg)
    console.warn('[CSP-SAFE] Warning trace:', trace)
  }

  console.log('[CSP-SAFE] App configuration complete')
  return app
}

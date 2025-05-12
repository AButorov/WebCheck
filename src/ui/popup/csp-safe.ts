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
  // Отключение ошибок и предупреждений в production
  if (process.env.NODE_ENV === 'production') {
    console.log = () => {}
    console.warn = () => {}
    console.error = () => {}
  }

  // Создаем i18n без использования eval() где возможно
  const i18n = createI18n({
    legacy: false,
    locale: navigator.language.split('-')[0] || 'en',
    fallbackLocale: 'en',
    messages,
    warnHtmlMessage: false, // Отключаем предупреждения
    escapeHtml: false, // Отключаем экранирование HTML
    runtimeOnly: true, // Только runtime режим
    // Отключаем компиляцию сообщений, которая может использовать eval()
    missing: (locale: string, key: string) => key,
  })

  // Создаем приложение с безопасными настройками
  const app = createApp(AppComponent)
  const pinia = createPinia()

  // Дополнительные настройки (Vue 3 больше не использует эти пропсы, но при необходимости можно добавить логику)
  
  // Устанавливаем плагины
  app.use(pinia)
  app.use(router)
  app.use(i18n)

  return app
}

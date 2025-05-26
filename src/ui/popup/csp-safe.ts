// CSP-safe configuration for Vue in MV3 environment (without eval)
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import type { Router } from 'vue-router'
import type { Component } from 'vue'

// Настройки для предотвращения CSP ошибок в Manifest V3
export function configureSafeApp(
  AppComponent: Component,
  router: Router,
  messages: Record<string, Record<string, string>>
) {
  console.log('[CSP-SAFE-MV3] Configuring safe app for Manifest V3...')

  // Определяем язык
  const userLanguage = navigator.language.split('-')[0] || 'en'
  console.log('[CSP-SAFE-MV3] User language:', userLanguage)

  // Создаем i18n в режиме совместимости с CSP
  const i18n = createI18n({
    legacy: false, // false для Vue 3 Composition API
    locale: userLanguage,
    fallbackLocale: 'en',
    messages,
    // Настройки для CSP-совместимости
    warnHtmlMessage: false,
    escapeHtml: true, // Включаем экранирование HTML для безопасности
    // Без использования runtime-компиляции, которая требует eval
    runtimeOnly: false,
    // Базовая функция для отсутствующих переводов
    missingWarn: false,
    fallbackWarn: false,
  })

  console.log('[CSP-SAFE-MV3] i18n created')

  // Создаем приложение с настройками для Manifest V3
  console.log('[CSP-SAFE-MV3] Creating Vue app...')
  const app = createApp(AppComponent)

  // Дополнительная настройка Vue для работы без eval
  app.config.isCustomElement = (tag) => tag.includes('-')
  app.config.compilerOptions = {
    whitespace: 'condense',
    comments: false,
    isCustomElement: (tag) => tag.includes('-'),
  }

  // Глобальная обработка ошибок
  app.config.errorHandler = (err) => {
    console.error('[CSP-SAFE-MV3] Global error:', err)
  }

  // Обработка предупреждений
  app.config.warnHandler = (msg) => {
    console.warn('[CSP-SAFE-MV3] Vue warning:', msg)
  }

  console.log('[CSP-SAFE-MV3] Vue app created with MV3-compatible settings')

  // Устанавливаем плагины
  app.use(router)
  console.log('[CSP-SAFE-MV3] Router attached')

  app.use(i18n)
  console.log('[CSP-SAFE-MV3] i18n attached')

  console.log('[CSP-SAFE-MV3] App configuration complete for Manifest V3')
  return app
}

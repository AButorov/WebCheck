/**
 * Debug скрипт для тестирования offscreen API
 * Добавляет функции в глобальную область видимости для отладки через DevTools
 */

import { testOffscreenMonitoring, getMonitoringStats } from './monitor'
import {
  ensureOffscreenDocument,
  pingOffscreenDocument,
  closeOffscreenDocument,
} from './offscreenManager'

// Типизация для Chrome API
interface ChromeGlobal {
  chrome?: {
    runtime?: {
      getContexts?: (options: {
        contextTypes: string[]
      }) => Promise<Array<{ creationTime?: number }>>
    }
  }
}

// Функция для получения статистики offscreen документа
async function getOffscreenStats() {
  try {
    // Используем chrome API напрямую для отладки, так как это Chrome-специфичная функция
    const contexts =
      (await (globalThis as ChromeGlobal).chrome?.runtime?.getContexts?.({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
      })) || []

    const exists = contexts.length > 0
    const cacheAge = Date.now() - (exists ? contexts[0].creationTime || 0 : 0)

    return {
      exists,
      cacheAge,
      contextCount: contexts.length,
    }
  } catch (error) {
    return {
      exists: false,
      cacheAge: 0,
      contextCount: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Добавляем функции отладки в глобальную область видимости для console
if (typeof globalThis !== 'undefined') {
  // @ts-expect-error - Намеренно добавляем в глобальную область видимости для отладки
  globalThis.webCheckDebug = {
    // Тестирование мониторинга
    async testMonitoring(url = 'https://example.com', selector = 'h1') {
      console.log('🧪 Testing offscreen monitoring...')
      await testOffscreenMonitoring(url, selector)
    },

    // Получение статистики
    async getStats() {
      console.log('📊 Getting monitoring stats...')
      const stats = await getMonitoringStats()
      console.table(stats)
      return stats
    },

    // Проверка offscreen документа
    async checkOffscreen() {
      console.log('🖥️ Checking offscreen document...')
      try {
        await ensureOffscreenDocument()
        const responsive = await pingOffscreenDocument()
        const stats = await getOffscreenStats()

        console.log('Offscreen document status:')
        console.table({
          exists: stats.exists,
          responsive: responsive,
          cacheAge: `${Math.round(stats.cacheAge / 1000)}s`,
        })

        return { exists: stats.exists, responsive, cacheAge: stats.cacheAge }
      } catch (error) {
        console.error('❌ Offscreen check failed:', error)
        return {
          exists: false,
          responsive: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },

    // Принудительная пересоздание offscreen документа
    async resetOffscreen() {
      console.log('🔄 Resetting offscreen document...')
      try {
        await closeOffscreenDocument()
        console.log('✅ Offscreen document closed')

        await ensureOffscreenDocument()
        console.log('✅ Offscreen document recreated')

        return true
      } catch (error) {
        console.error('❌ Reset failed:', error)
        return false
      }
    },

    // Тест с конкретными параметрами
    async testSite(url: string, selector: string) {
      if (!url || !selector) {
        console.error('❌ Usage: testSite("https://example.com", "h1")')
        return
      }

      console.log(`🎯 Testing ${url} with selector "${selector}"`)
      await testOffscreenMonitoring(url, selector)
    },

    // Помощь по использованию
    help() {
      console.log(`
🚀 WebCheck Debug Console Commands:

📊 webCheckDebug.getStats()
   - Get monitoring statistics

🧪 webCheckDebug.testMonitoring()
   - Test with default URL (example.com)

🎯 webCheckDebug.testSite(url, selector)
   - Test with specific URL and selector
   - Example: testSite("https://github.com", "h1")

🖥️ webCheckDebug.checkOffscreen()
   - Check offscreen document status

🔄 webCheckDebug.resetOffscreen()
   - Reset offscreen document

❓ webCheckDebug.help()
   - Show this help

Example usage:
  webCheckDebug.testSite("https://news.ycombinator.com", ".title")
      `)
    },
  }

  console.log('🐛 WebCheck Debug Console loaded! Type webCheckDebug.help() for available commands')
}

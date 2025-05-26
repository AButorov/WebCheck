/**
 * Универсальный обработчик сообщений для background
 * Работает как с webext-bridge, так и с chrome.runtime.sendMessage
 */
import browser from 'webextension-polyfill'
import { getMonitoringStats, getPerformanceStats } from './monitor'

// Интерфейсы для сообщений
interface MessageRequest {
  type?: string
  action?: string
  data?: unknown
  [key: string]: unknown
}

interface StatsResponse {
  success: boolean
  stats?: unknown
  error?: string
}

/**
 * Настройка универсального обработчика
 */
export function setupUniversalMessageHandler(): void {
  console.log('[UNIVERSAL HANDLER] Setting up message handler')

  // Обработчик для chrome.runtime.onMessage
  browser.runtime.onMessage.addListener(
    (
      request: MessageRequest,
      sender: browser.Runtime.MessageSender,
      sendResponse: (response: StatsResponse) => void
    ): true | void => {
      // Логируем все входящие сообщения для отладки
      console.log('[UNIVERSAL HANDLER] Received message:', {
        request,
        sender: sender.tab ? `Tab ${sender.tab.id}` : 'Extension',
      })

      // Определяем тип сообщения (поддерживаем и type, и action)
      const messageType = request.type || request.action

      // Обрабатываем различные типы сообщений
      switch (messageType) {
        case 'get-monitoring-stats':
          handleMonitoringStats(sendResponse)
          return true // асинхронный ответ

        case 'get-performance-stats':
          handlePerformanceStats(sendResponse)
          return true // асинхронный ответ

        case 'activateElementSelection':
          // Это обрабатывается в capture/index.ts
          console.log('[UNIVERSAL HANDLER] Element selection handled by capture module')
          return // пропускаем дальше

        case 'elementSelected':
          // Это обрабатывается в capture/index.ts
          console.log('[UNIVERSAL HANDLER] Element selected handled by capture module')
          return // пропускаем дальше

        default:
          // Неизвестный тип сообщения - пропускаем для других обработчиков
          console.log(`[UNIVERSAL HANDLER] Unknown message type: ${messageType}`)
          return // не обрабатываем
      }
    }
  )

  console.log('[UNIVERSAL HANDLER] Message handler ready')
}

/**
 * Обработка запроса статистики мониторинга
 */
async function handleMonitoringStats(
  sendResponse: (response: StatsResponse) => void
): Promise<void> {
  try {
    console.log('[UNIVERSAL HANDLER] Getting monitoring stats...')
    const stats = await getMonitoringStats()
    console.log('[UNIVERSAL HANDLER] Monitoring stats:', stats)
    sendResponse({ success: true, stats })
  } catch (error) {
    console.error('[UNIVERSAL HANDLER] Error getting monitoring stats:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Обработка запроса статистики производительности
 */
async function handlePerformanceStats(
  sendResponse: (response: StatsResponse) => void
): Promise<void> {
  try {
    console.log('[UNIVERSAL HANDLER] Getting performance stats...')
    const stats = await getPerformanceStats()
    console.log('[UNIVERSAL HANDLER] Performance stats:', stats)
    sendResponse({ success: true, stats })
  } catch (error) {
    console.error('[UNIVERSAL HANDLER] Error getting performance stats:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

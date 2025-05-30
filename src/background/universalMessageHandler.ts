/**
 * Универсальный обработчик сообщений для background
 * Работает как с webext-bridge, так и с chrome.runtime.sendMessage
 * Использует менеджер надежности для обеспечения стабильной коммуникации
 */
import browser from 'webextension-polyfill'
import { getMonitoringStats, getPerformanceStats } from './monitor'
import { reliabilityManager } from './reliabilityManager'
import { sendSafeMessage } from './safeMessaging'

// Интерфейсы для сообщений
interface MessageRequest {
  type?: string
  action?: string
  data?: unknown
  tabId?: number
  [key: string]: unknown
}

interface StatsResponse {
  success: boolean
  stats?: unknown
  data?: unknown
  error?: string
}

/**
 * Настройка универсального обработчика
 */
export function setupUniversalMessageHandler(): void {
  console.log('[UNIVERSAL HANDLER] Setting up enhanced message handler')

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

        case 'get-reliability-stats':
          handleReliabilityStats(sendResponse)
          return true // асинхронный ответ

        case 'ensure-tab-ready':
          handleEnsureTabReady(request, sendResponse)
          return true // асинхронный ответ

        case 'safe-send-message':
          handleSafeSendMessage(request, sendResponse)
          return true // асинхронный ответ

        case 'force-reinject-all':
          handleForceReinjectAll(sendResponse)
          return true // асинхронный ответ

        case 'activateElementSelection':
          // Это обрабатывается в capture/index.ts
          console.log('[UNIVERSAL HANDLER] Element selection handled by capture module')
          return // пропускаем дальше

        case 'elementSelected':
        case 'captureElement':
          // Это обрабатывается в capture/index.ts
          console.log('[UNIVERSAL HANDLER] Element capture handled by capture module')
          return // пропускаем дальше

        case 'contentScriptReady':
          // Обрабатывается менеджером надежности автоматически
          console.log('[UNIVERSAL HANDLER] Content script ready notification received')
          return // не отвечаем

        default:
          // Неизвестный тип сообщения - пропускаем для других обработчиков
          console.log(`[UNIVERSAL HANDLER] Unknown message type: ${messageType}`)
          return // не обрабатываем
      }
    }
  )

  console.log('[UNIVERSAL HANDLER] Enhanced message handler ready')
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

/**
 * Обработка запроса статистики надежности
 */
async function handleReliabilityStats(
  sendResponse: (response: StatsResponse) => void
): Promise<void> {
  try {
    console.log('[UNIVERSAL HANDLER] Getting reliability stats...')
    const stats = reliabilityManager.getStats()
    console.log('[UNIVERSAL HANDLER] Reliability stats:', stats)
    sendResponse({ success: true, stats })
  } catch (error) {
    console.error('[UNIVERSAL HANDLER] Error getting reliability stats:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Обработка запроса на проверку готовности таба
 */
async function handleEnsureTabReady(
  request: MessageRequest,
  sendResponse: (response: StatsResponse) => void
): Promise<void> {
  try {
    const { tabId } = request
    if (typeof tabId !== 'number') {
      sendResponse({ success: false, error: 'Invalid tabId' })
      return
    }

    console.log(`[UNIVERSAL HANDLER] Ensuring tab ${tabId} is ready...`)
    const isReady = await reliabilityManager.ensureTabReady(tabId)
    console.log(`[UNIVERSAL HANDLER] Tab ${tabId} readiness: ${isReady}`)
    
    sendResponse({ success: true, data: { tabId, isReady } })
  } catch (error) {
    console.error('[UNIVERSAL HANDLER] Error ensuring tab ready:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Обработка безопасной отправки сообщения
 */
async function handleSafeSendMessage(
  request: MessageRequest,
  sendResponse: (response: StatsResponse) => void
): Promise<void> {
  try {
    const { tabId, message, options } = request
    
    if (typeof tabId !== 'number' || !message) {
      sendResponse({ success: false, error: 'Invalid parameters for safe send message' })
      return
    }

    console.log(`[UNIVERSAL HANDLER] Safe sending message to tab ${tabId}:`, message)
    
    const result = await sendSafeMessage(tabId, message, options as any)
    
    console.log(`[UNIVERSAL HANDLER] Safe send result:`, result)
    sendResponse({ success: result.success, data: result.data, error: result.error })
  } catch (error) {
    console.error('[UNIVERSAL HANDLER] Error in safe send message:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Обработка принудительной переинжекции во все табы
 */
async function handleForceReinjectAll(
  sendResponse: (response: StatsResponse) => void
): Promise<void> {
  try {
    console.log('[UNIVERSAL HANDLER] Force reinjecting content scripts into all tabs...')
    
    await reliabilityManager.forceReinjectAll()
    
    console.log('[UNIVERSAL HANDLER] Force reinject completed')
    sendResponse({ success: true, data: { message: 'Content scripts reinjected' } })
  } catch (error) {
    console.error('[UNIVERSAL HANDLER] Error during force reinject:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Утилитная функция для безопасной отправки сообщений в табы
 * Может использоваться другими модулями
 */
export async function sendMessageToTab(
  tabId: number, 
  message: any, 
  options?: { ensureReady?: boolean; retryCount?: number }
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { ensureReady = true, retryCount = 3 } = options || {}
  
  try {
    // Проверяем готовность таба, если требуется
    if (ensureReady) {
      const isReady = await reliabilityManager.ensureTabReady(tabId)
      if (!isReady) {
        return { success: false, error: 'Tab is not ready for messaging' }
      }
    }
    
    // Отправляем сообщение через безопасную систему
    const result = await sendSafeMessage(tabId, message, { retryCount })
    
    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

import browser from 'webextension-polyfill'
import { onMessage } from 'webext-bridge/background'
import { WebCheckTask } from '~/types/task'
import { MessagePayloads } from '~/types/messages'

// Импортируем универсальный обработчик сообщений
import { setupUniversalMessageHandler } from './universalMessageHandler'

// Импортируем модуль захвата элементов
import './capture'

// Импортируем и инициализируем систему мониторинга
import { initMonitor, checkDueTasksForUpdates, stopMonitor } from './monitor'

// Импортируем менеджер offscreen-документов
import { setupOffscreenEventHandlers } from './offscreenManager'

// Импортируем систему безопасных сообщений
import { injectContentScriptsIntoAllTabs } from './safeMessaging'

// Импортируем менеджер надежности
import { reliabilityManager } from './reliabilityManager'

// Обработка установки расширения - ИСПРАВЛЕННАЯ ВЕРСИЯ
browser.runtime.onInstalled.addListener(async ({ reason }) => {
  console.log(`[WebCheck:Background] Extension installed, reason: ${reason}`)

  if (reason === 'install') {
    console.log('Web Check extension installed')

    // Инициализация базовых настроек
    try {
      const storage = await browser.storage.local.get(['tasks', 'settings'])
      if (!storage.tasks) {
        await browser.storage.local.set({ tasks: [] })
      }
      if (!storage.settings) {
        await browser.storage.local.set({
          settings: {
            notifications: true,
            checkInterval: 300000, // 5 минут по умолчанию
            maxRetries: 3,
          },
        })
      }
      console.log('[WebCheck:Background] Initial storage setup completed')
    } catch (error) {
      console.error('[WebCheck:Background] Error setting up initial storage:', error)
    }
  }

  // При установке или обновлении инжектируем content scripts
  if (reason === 'install' || reason === 'update') {
    console.log('[WebCheck:Background] Extension installed/updated, injecting content scripts...')

    try {
      // Ждем немного, чтобы система успела инициализироваться
      await new Promise((resolve) => setTimeout(resolve, 1000))

      await injectContentScriptsIntoAllTabs()
      console.log('[WebCheck:Background] Content scripts injected into all suitable tabs')
    } catch (error) {
      console.error('[WebCheck:Background] Error injecting content scripts:', error)
    }
  }
})

// ВАЖНО: Инициализируем универсальный обработчик ДО других инициализаций
setupUniversalMessageHandler()

// Инициализируем мониторинг при запуске фонового скрипта
initMonitor()

// Настраиваем обработчики событий для offscreen-документов
setupOffscreenEventHandlers()

// Обработка остановки расширения (cleanup)
if (browser.runtime.onSuspend) {
  browser.runtime.onSuspend.addListener(() => {
    console.log('Background script suspending, cleaning up resources')
    stopMonitor()
    reliabilityManager.stopHealthChecks()
  })
}

// Загружаем debug консоль в режиме разработки
if (process.env.NODE_ENV === 'development') {
  import('./debug')
    .then(() => console.log('Debug console loaded'))
    .catch((error) => console.warn('Failed to load debug console:', error))
}

// Обработка сообщений для ручной проверки изменений (webext-bridge)
onMessage('check-for-changes', async (message) => {
  const { data } = message
  const { tabId } = data as MessagePayloads['check-for-changes']
  console.log(`Checking for changes in tab ${tabId}`)

  // Запускаем проверку задач, у которых наступило время обновления
  await checkDueTasksForUpdates()
})

// Обработка уведомлений (webext-bridge)
onMessage('show-notification', async (message) => {
  const { data } = message
  const { title, message: notificationMessage } = data as MessagePayloads['show-notification']

  // Создаем уведомление
  browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('icons/icon-128.png'),
    title,
    message: notificationMessage,
  })
})

// Обработка запросов на проверку элемента (webext-bridge)
onMessage('check-element', async (message) => {
  const { data } = message
  const { taskId, selector } = data as MessagePayloads['check-element']
  console.log(`Received check-element request for task ${taskId} with selector ${selector}`)

  try {
    // Получаем задачу из хранилища
    const storage = await browser.storage.local.get('tasks')
    const tasks = storage.tasks || []
    const task = tasks.find((t: WebCheckTask) => t.id === taskId)

    if (!task) {
      console.error(`Task with ID ${taskId} not found`)
      return { taskId, error: 'Task not found' }
    }

    // В реальной реализации здесь будет использоваться функция checkElement
    return {
      taskId,
      html: task.currentHtml || '',
    }
  } catch (error) {
    console.error('Error checking element:', error)
    return {
      taskId,
      error: error instanceof Error ? error.message : String(error),
    }
  }
})

// Интерфейсы для статистики
interface MonitoringStats {
  totalTasks: number
  activeTasks: number
  pausedTasks: number
  changedTasks: number
}

interface PerformanceStats {
  memoryUsage: {
    used: number
    total: number
    limit: number
  } | null
  timestamp: number
}

// Функции для получения статистики
async function getMonitoringStats(): Promise<MonitoringStats> {
  const storage = await browser.storage.local.get(['tasks'])
  const tasks = storage.tasks || []

  return {
    totalTasks: tasks.length,
    activeTasks: tasks.filter((task: WebCheckTask) => task.status !== 'paused').length,
    pausedTasks: tasks.filter((task: WebCheckTask) => task.status === 'paused').length,
    changedTasks: tasks.filter((task: WebCheckTask) => task.status === 'changed').length,
  }
}

async function getPerformanceStats(): Promise<PerformanceStats> {
  // Проверяем доступность Chrome-специфичного API
  const chromeMemory = (
    performance as unknown as {
      memory?: {
        usedJSHeapSize: number
        totalJSHeapSize: number
        jsHeapSizeLimit: number
      }
    }
  ).memory

  return {
    memoryUsage: chromeMemory
      ? {
          used: Math.round(chromeMemory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(chromeMemory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(chromeMemory.jsHeapSizeLimit / 1024 / 1024),
        }
      : null,
    timestamp: Date.now(),
  }
}

// Типы для обработчика сообщений
interface StatsRequest {
  type: 'get-monitoring-stats' | 'get-performance-stats'
}

interface StatsResponse {
  success: boolean
  stats?: MonitoringStats | PerformanceStats
  error?: string
}

// ОБРАБОТЧИК ДЛЯ ТЕСТИРОВАНИЯ
browser.runtime.onMessage.addListener(
  (
    request: StatsRequest,
    _sender: browser.Runtime.MessageSender,
    sendResponse: (response: StatsResponse) => void
  ): true | void => {
    if (request.type === 'get-monitoring-stats') {
      getMonitoringStats()
        .then((stats) => sendResponse({ success: true, stats }))
        .catch((error) => sendResponse({ success: false, error: error.message }))
      return true // КРИТИЧНО для асинхронного ответа
    }

    if (request.type === 'get-performance-stats') {
      getPerformanceStats()
        .then((stats) => sendResponse({ success: true, stats }))
        .catch((error) => sendResponse({ success: false, error: error.message }))
      return true // КРИТИЧНО для асинхронного ответа
    }

    // Не возвращаем false, просто void
  }
)

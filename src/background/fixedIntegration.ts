/**
 * Интеграция всех исправлений
 */
import browser from 'webextension-polyfill'
import { createAsyncMessageHandler, type AsyncMessageRequest } from './asyncMessageWrapper'
import { getMonitoringStats, getPerformanceStats } from './monitor'
import { taskQueue } from './sequentialTaskQueue'

// Создаём обработчики для различных типов сообщений
const messageHandlers = {
  'get-monitoring-stats': async () => {
    return await getMonitoringStats()
  },

  'get-performance-stats': async () => {
    const queueStats = taskQueue.getStats()
    const perfStats = await getPerformanceStats()

    return {
      ...perfStats,
      queue: queueStats,
    }
  },

  'check-element': async (request: AsyncMessageRequest) => {
    // Извлекаем task из request с проверкой типов
    if (request && typeof request === 'object' && 'task' in request) {
      const task = request.task as {
        id: string
        url: string
        selector: string
      }

      await taskQueue.addTask(task)
      return { queued: true }
    }

    throw new Error('Invalid task data in check-element request')
  },
}

// Регистрируем обработчик
export function setupFixedMessageHandling(): void {
  console.log('[INTEGRATION] Setting up fixed message handling')

  const handler = createAsyncMessageHandler(messageHandlers)

  // Добавляем обработчик с подавлением типов для совместимости
  ;(browser.runtime.onMessage.addListener as (handler: unknown) => void)(handler)

  console.log('[INTEGRATION] Message handling ready')
}

/**
 * Система очередей задач для фонового мониторинга WebCheck
 *
 * Поскольку одновременно может существовать только один offscreen-документ,
 * все задачи, требующие DOM-доступа, должны обрабатываться последовательно
 */

import { WebCheckTask } from '~/types/task'
import { checkElement } from './monitor/element-checker'

// Конфигурация очереди
const QUEUE_CONFIG = {
  MAX_CONCURRENT_CHECKS: 1, // Только одна проверка одновременно для offscreen API
  RETRY_DELAY: 5000, // 5 секунд задержка между повторными попытками
  MAX_QUEUE_SIZE: 50, // Максимальный размер очереди
  QUEUE_TIMEOUT: 300000, // 5 минут - максимальное время жизни задачи в очереди
  PROCESSING_TIMEOUT: 60000, // 1 минута - максимальное время на обработку одной задачи
}

// Тип для элемента очереди
interface QueueItem {
  id: string
  task: WebCheckTask
  addedAt: number
  retryCount: number
  maxRetries: number
  resolve: (result: CheckResult) => void
  reject: (error: Error) => void
}

// Тип результата проверки
interface CheckResult {
  html?: string
  error?: string
  taskId: string
  timestamp: number
}

// Очередь задач
const taskQueue: QueueItem[] = []

// Флаг обработки очереди
let isProcessingQueue = false

// Статистика очереди
let queueStats = {
  totalProcessed: 0,
  totalSuccessful: 0,
  totalFailed: 0,
  totalRetries: 0,
  averageProcessingTime: 0,
  lastProcessedAt: 0,
}

/**
 * Добавление задачи в очередь проверки
 */
export function addTaskToQueue(task: WebCheckTask, maxRetries: number = 3): Promise<CheckResult> {
  return new Promise((resolve, reject) => {
    // Проверяем валидность задачи
    if (!task || typeof task !== 'object' || !task.id) {
      console.error('[TASK QUEUE] Invalid task provided:', task)
      reject(new Error('Invalid task: missing id or malformed object'))
      return
    }

    // Проверяем размер очереди
    if (taskQueue.length >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      reject(new Error(`Queue is full (${QUEUE_CONFIG.MAX_QUEUE_SIZE} items)`))
      return
    }

    // Проверяем, нет ли уже такой задачи в очереди
    const existingItem = taskQueue.find((item) => item && item.task && item.task.id === task.id)
    if (existingItem) {
      console.warn(`[TASK QUEUE] Task ${task.id} already in queue, skipping`)
      reject(new Error(`Task ${task.id} is already queued`))
      return
    }

    const queueItem: QueueItem = {
      id: `${task.id}_${Date.now()}`,
      task,
      addedAt: Date.now(),
      retryCount: 0,
      maxRetries,
      resolve,
      reject,
    }

    taskQueue.push(queueItem)
    console.log(`[TASK QUEUE] Added task ${task.id} to queue (position: ${taskQueue.length})`)

    // Запускаем обработку очереди, если она не запущена
    if (!isProcessingQueue) {
      processQueue()
    }
  })
}

/**
 * Обработка очереди задач
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue) {
    return
  }

  isProcessingQueue = true
  console.log('[TASK QUEUE] Starting queue processing')

  try {
    while (taskQueue.length > 0) {
      const item = taskQueue.shift()
      if (!item) break

      // Проверяем таймаут задачи
      if (Date.now() - item.addedAt > QUEUE_CONFIG.QUEUE_TIMEOUT) {
        const taskId = item && item.task && item.task.id ? item.task.id : 'unknown'
        console.warn(`[TASK QUEUE] Task ${taskId} timed out in queue`)
        if (item && item.reject) {
          item.reject(new Error('Task timed out in queue'))
        }
        queueStats.totalFailed++
        continue
      }

      // Обрабатываем задачу
      await processQueueItem(item)
    }
  } catch (error) {
    console.error('[TASK QUEUE] Error in queue processing:', error)
  } finally {
    isProcessingQueue = false
    console.log('[TASK QUEUE] Queue processing completed')
  }
}

/**
 * Обработка одного элемента очереди
 */
async function processQueueItem(item: QueueItem): Promise<void> {
  // Проверяем валидность элемента очереди
  if (!item || !item.task || !item.task.id) {
    console.error('[TASK QUEUE] Invalid queue item:', item)
    if (item && item.reject) {
      item.reject(new Error('Invalid queue item'))
    }
    return
  }

  const startTime = Date.now()
  console.log(
    `[TASK QUEUE] Processing task ${item.task.id} (attempt ${item.retryCount + 1}/${item.maxRetries + 1})`
  )

  try {
    // Проверяем наличие обязательных свойств задачи
    if (!item.task.url || !item.task.selector) {
      throw new Error(
        `Invalid task: missing url (${item.task.url}) or selector (${item.task.selector})`
      )
    }

    // Устанавливаем таймаут на обработку
    const processPromise = checkElement(item.task.url, item.task.selector, 1)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout')), QUEUE_CONFIG.PROCESSING_TIMEOUT)
    })

    // Выполняем проверку с таймаутом
    const result = await Promise.race([processPromise, timeoutPromise])
    const processingTime = Date.now() - startTime

    // Обновляем статистику
    queueStats.totalProcessed++
    queueStats.lastProcessedAt = Date.now()
    updateAverageProcessingTime(processingTime)

    if (result.html) {
      // Успешный результат
      const taskId = item && item.task && item.task.id ? item.task.id : 'unknown'
      console.log(`[TASK QUEUE] Task ${taskId} completed successfully in ${processingTime}ms`)

      const checkResult: CheckResult = {
        html: result.html,
        taskId: taskId,
        timestamp: Date.now(),
      }

      if (item && item.resolve) {
        item.resolve(checkResult)
      }
      queueStats.totalSuccessful++
    } else if (result.error) {
      // Ошибка - пробуем повторить
      throw new Error(result.error)
    } else {
      // Неожиданное состояние
      throw new Error('Invalid result: no HTML and no error')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const taskId = item && item.task && item.task.id ? item.task.id : 'unknown'
    console.error(`[TASK QUEUE] Error processing task ${taskId}:`, errorMessage)

    // Проверяем, можно ли повторить
    if (item.retryCount < item.maxRetries) {
      item.retryCount++
      queueStats.totalRetries++

      console.log(
        `[TASK QUEUE] Retrying task ${taskId} (attempt ${item.retryCount + 1}/${item.maxRetries + 1})`
      )

      // Добавляем задержку перед повтором
      await delay(QUEUE_CONFIG.RETRY_DELAY)

      // Возвращаем задачу в начало очереди
      taskQueue.unshift(item)
    } else {
      // Исчерпаны все попытки
      console.error(`[TASK QUEUE] Task ${taskId} failed after ${item.maxRetries + 1} attempts`)

      const checkResult: CheckResult = {
        error: errorMessage,
        taskId: taskId,
        timestamp: Date.now(),
      }

      if (item && item.reject) {
        const error = new Error(errorMessage)
        // Добавляем дополнительную информацию в объект ошибки
        Object.assign(error, { checkResult })
        item.reject(error)
      }
      queueStats.totalFailed++
    }

    queueStats.totalProcessed++
    updateAverageProcessingTime(Date.now() - startTime)
  }
}

/**
 * Обновление средней статистики времени обработки
 */
function updateAverageProcessingTime(processingTime: number): void {
  if (queueStats.totalProcessed === 1) {
    queueStats.averageProcessingTime = processingTime
  } else {
    // Скользящее среднее
    queueStats.averageProcessingTime = Math.round(
      queueStats.averageProcessingTime * 0.8 + processingTime * 0.2
    )
  }
}

/**
 * Получение статистики очереди
 */
export function getQueueStats(): {
  queueLength: number
  isProcessing: boolean
  stats: typeof queueStats
  config: typeof QUEUE_CONFIG
} {
  return {
    queueLength: taskQueue.length,
    isProcessing: isProcessingQueue,
    stats: { ...queueStats },
    config: { ...QUEUE_CONFIG },
  }
}

/**
 * Очистка очереди
 */
export function clearQueue(): void {
  console.log(`[TASK QUEUE] Clearing queue with ${taskQueue.length} items`)

  // Отклоняем все ожидающие задачи
  while (taskQueue.length > 0) {
    const item = taskQueue.shift()
    if (item && item.reject) {
      item.reject(new Error('Queue cleared'))
    }
  }

  console.log('[TASK QUEUE] Queue cleared')
}

/**
 * Получение позиции задачи в очереди
 */
export function getTaskQueuePosition(taskId: string): number {
  if (!taskId) {
    console.warn('[TASK QUEUE] getTaskQueuePosition called with invalid taskId:', taskId)
    return -1
  }

  const index = taskQueue.findIndex((item) => item && item.task && item.task.id === taskId)
  return index === -1 ? -1 : index + 1 // Возвращаем позицию, начиная с 1
}

/**
 * Удаление задачи из очереди
 */
export function removeTaskFromQueue(taskId: string): boolean {
  if (!taskId) {
    console.warn('[TASK QUEUE] removeTaskFromQueue called with invalid taskId:', taskId)
    return false
  }

  const index = taskQueue.findIndex((item) => item && item.task && item.task.id === taskId)

  if (index !== -1) {
    const item = taskQueue.splice(index, 1)[0]
    if (item && item.reject) {
      item.reject(new Error('Task removed from queue'))
    }
    console.log(`[TASK QUEUE] Task ${taskId} removed from queue`)
    return true
  }

  return false
}

/**
 * Проверка, находится ли задача в очереди
 */
export function isTaskInQueue(taskId: string): boolean {
  if (!taskId) {
    console.warn('[TASK QUEUE] isTaskInQueue called with invalid taskId:', taskId)
    return false
  }

  return taskQueue.some((item) => item && item.task && item.task.id === taskId)
}

/**
 * Получение списка ID задач в очереди
 */
export function getQueuedTaskIds(): string[] {
  return taskQueue.filter((item) => item && item.task && item.task.id).map((item) => item.task.id)
}

/**
 * Принудительная обработка очереди (для отладки)
 */
export function forceProcessQueue(): void {
  if (!isProcessingQueue && taskQueue.length > 0) {
    console.log('[TASK QUEUE] Force processing queue')
    processQueue()
  } else if (isProcessingQueue) {
    console.log('[TASK QUEUE] Queue is already being processed')
  } else {
    console.log('[TASK QUEUE] Queue is empty')
  }
}

/**
 * Сброс статистики очереди
 */
export function resetQueueStats(): void {
  queueStats = {
    totalProcessed: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    totalRetries: 0,
    averageProcessingTime: 0,
    lastProcessedAt: 0,
  }
  console.log('[TASK QUEUE] Statistics reset')
}

/**
 * Вспомогательная функция для задержки
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

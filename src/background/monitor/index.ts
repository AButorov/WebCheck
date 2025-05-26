/**
 * Система фонового мониторинга для Web Check
 *
 * Этот модуль отвечает за:
 * 1. Планирование проверок задач мониторинга
 * 2. Выполнение проверок элементов на веб-страницах
 * 3. Сравнение текущего состояния с предыдущим
 * 4. Генерацию уведомлений при обнаружении изменений
 * 5. Обновление статуса задач в хранилище
 */

import browser from 'webextension-polyfill'
import { WebCheckTask, TaskInterval } from '~/types/task'
import { getStorageLocal, setStorageLocal } from '~/utils/browser-storage'
import { checkElement, type CheckResult } from './element-checker'
import { updateBadge } from './badge'
import { ensureOffscreenDocument } from '../offscreenManager'
import { addTaskToQueue, getQueueStats, isTaskInQueue } from '../taskQueue'
import {
  initReliabilityManager,
  withReliability,
  registerActivity,
  getReliabilityState,
  performDiagnostics,
} from '../reliabilityManager'

// Имя аларма для планирования проверок
const CHECK_ALARM_NAME = 'web-check-monitor'

// Флаг для отслеживания активности проверок
let isChecking = false

/**
 * Инициализация системы мониторинга
 */
export function initMonitor() {
  console.log('[MONITOR] Initializing background monitoring system')

  // Инициализация менеджера надёжности
  initReliabilityManager()

  // Настройка периодической проверки (каждую минуту)
  setupAlarm()

  // Обработчик для аларма
  browser.alarms.onAlarm.addListener(handleAlarm)

  // Обработчик запуска браузера для возобновления мониторинга
  browser.runtime.onStartup.addListener(handleBrowserStartup)

  // Обработчик обновления расширения
  browser.runtime.onInstalled.addListener(handleExtensionInstalled)

  console.log('[MONITOR] Monitor system initialized')
}

/**
 * Остановка системы мониторинга
 */
export function stopMonitor() {
  console.log('[MONITOR] Stopping monitor system')

  // Удаляем аларм
  browser.alarms.clear(CHECK_ALARM_NAME)

  // Сбрасываем флаг проверки
  isChecking = false

  console.log('[MONITOR] Monitor system stopped')
}

/**
 * Настройка аларма для периодических проверок
 */
function setupAlarm() {
  // Создаём аларм, который будет срабатывать каждую минуту
  browser.alarms.create(CHECK_ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: 1,
  })

  console.log('[MONITOR] Alarm set up for periodic checks')
}

/**
 * Обработчик аларма
 */
async function handleAlarm(alarm: browser.Alarms.Alarm) {
  if (alarm.name === CHECK_ALARM_NAME) {
    console.log('[MONITOR] Alarm fired - checking for due tasks')
    await checkDueTasksForUpdates()
  }
}

/**
 * Обработчик запуска браузера
 */
function handleBrowserStartup() {
  console.log('[MONITOR] Browser started - resuming monitoring')
  // Настраиваем аларм заново после запуска браузера
  setupAlarm()
}

/**
 * Обработчик установки/обновления расширения
 */
function handleExtensionInstalled(details: browser.Runtime.OnInstalledDetailsType) {
  console.log('[MONITOR] Extension installed/updated:', details.reason)
  // Настраиваем аларм после установки/обновления
  setupAlarm()
}

/**
 * Основная функция проверки задач, у которых наступило время обновления
 */
export async function checkDueTasksForUpdates() {
  if (isChecking) {
    console.log('[MONITOR] Check already in progress, skipping')
    return
  }

  isChecking = true

  try {
    console.log('[MONITOR] Starting check for due tasks')

    // Получаем все задачи
    const tasks = await getTasks()
    const now = Date.now()

    // Фильтруем задачи, которые нужно проверить
    const dueTasks = tasks.filter((task) => {
      // Пропускаем приостановленные задачи
      if (task.status === 'paused') {
        return false
      }

      // Проверяем, не в очереди ли уже задача
      if (isTaskInQueue(task.id)) {
        console.log(`[MONITOR] Task ${task.id} already in queue, skipping`)
        return false
      }

      // Вычисляем время следующей проверки
      const nextCheckTime = getNextCheckTime(task)

      return now >= nextCheckTime
    })

    console.log(`[MONITOR] Found ${dueTasks.length} due tasks out of ${tasks.length} total`)

    // Обрабатываем задачи
    for (const task of dueTasks) {
      try {
        await processTask(task)

        // Небольшая пауза между задачами
        await delay(1000)
      } catch (error) {
        console.error(`[MONITOR] Error processing task ${task.id}:`, error)
        await handleTaskError(task, error)
      }
    }

    // Обновляем бейдж с количеством измененных задач
    const changedTasksCount = tasks.filter((task) => task.status === 'changed').length
    updateBadge(changedTasksCount)

    console.log('[MONITOR] Check cycle completed')
  } finally {
    isChecking = false
  }
}

/**
 * Обработка отдельной задачи
 */
async function processTask(task: WebCheckTask) {
  console.log(`[MONITOR] Processing task ${task.id}: ${task.title}`)

  try {
    // Регистрируем активность
    registerActivity()

    // Добавляем задачу в очередь для проверки
    await addTaskToQueue(task)

    console.log(`[MONITOR] Task ${task.id} added to queue for processing`)
  } catch (error) {
    console.error(`[MONITOR] Error adding task ${task.id} to queue:`, error)
    throw error
  }
}

/**
 * Обработка ошибки задачи
 */
async function handleTaskError(task: WebCheckTask, error: unknown) {
  console.error(`[MONITOR] Handling error for task ${task.id}:`, error)

  const errorMessage = error instanceof Error ? error.message : String(error)

  // Обновляем задачу с информацией об ошибке
  const updatedTask: Partial<WebCheckTask> = {
    lastCheckedAt: Date.now(),
    hasError: true,
    errorMessage: errorMessage,
  }

  await updateTask(task.id, updatedTask)
}

/**
 * Обработка результата проверки задачи
 */
export async function handleTaskResult(taskId: string, result: CheckResult) {
  console.log(`[MONITOR] Handling result for task ${taskId}`)

  try {
    const tasks = await getTasks()
    const task = tasks.find((t) => t.id === taskId)

    if (!task) {
      console.error(`[MONITOR] Task ${taskId} not found`)
      return
    }

    const now = Date.now()

    if (result.error) {
      // Обработка ошибки
      console.error(`[MONITOR] Task ${taskId} failed:`, result.error)

      const updatedTask: Partial<WebCheckTask> = {
        lastCheckedAt: now,
        hasError: true,
        errorMessage: result.error,
        checkCount: (task.checkCount || 0) + 1,
      }

      await updateTask(taskId, updatedTask)
      return
    }

    if (!result.html) {
      console.error(`[MONITOR] Task ${taskId} returned no HTML`)
      return
    }

    // Проверяем, изменился ли HTML
    const hasChanged = result.html !== task.currentHtml

    if (hasChanged) {
      console.log(`[MONITOR] Change detected for task ${taskId}`)

      // Обновляем задачу с новым HTML и статусом изменения
      const updatedTask: Partial<WebCheckTask> = {
        currentHtml: result.html,
        status: 'changed' as const,
        lastCheckedAt: now,
        lastChangedAt: now,
        hasError: false,
        errorMessage: undefined,
        checkCount: (task.checkCount || 0) + 1,
        changeCount: (task.changeCount || 0) + 1,
      }

      await updateTask(taskId, updatedTask)

      // Отправляем уведомление
      await sendChangeNotification(task)
    } else {
      console.log(`[MONITOR] No changes for task ${taskId}`)

      // Обновляем время последней проверки
      const updatedTask: Partial<WebCheckTask> = {
        status: 'unchanged' as const,
        lastCheckedAt: now,
        hasError: false,
        errorMessage: undefined,
        checkCount: (task.checkCount || 0) + 1,
      }

      await updateTask(taskId, updatedTask)
    }
  } catch (error) {
    console.error(`[MONITOR] Error handling task result for ${taskId}:`, error)
  }
}

/**
 * Отправка уведомления об изменении
 */
async function sendChangeNotification(task: WebCheckTask) {
  try {
    await browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon-48.png'),
      title: 'WebCheck - Change Detected',
      message: `Changes detected in "${task.title}" on ${new URL(task.url).hostname}`,
    })

    console.log(`[MONITOR] Change notification sent for task ${task.id}`)
  } catch (error) {
    console.error(`[MONITOR] Error sending notification for task ${task.id}:`, error)
  }
}

/**
 * Получение времени следующей проверки для задачи
 */
function getNextCheckTime(task: WebCheckTask): number {
  // Если есть явно заданное время следующей проверки, используем его
  if (task.nextCheckAt) {
    return task.nextCheckAt
  }

  // Иначе вычисляем на основе интервала
  const intervalMs = getIntervalInMs(task.interval)
  return task.lastCheckedAt + intervalMs
}

/**
 * Преобразование интервала в миллисекунды
 */
function getIntervalInMs(interval: TaskInterval): number {
  const intervals: Record<TaskInterval, number> = {
    '10s': 10 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '3h': 3 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  }

  return intervals[interval] || intervals['1h']
}

/**
 * Получение всех задач из хранилища
 */
async function getTasks(): Promise<WebCheckTask[]> {
  try {
    const data = await getStorageLocal('tasks', [])
    // Приводим к типу WebCheckTask[] с проверкой
    if (Array.isArray(data)) {
      return data as WebCheckTask[]
    }
    return []
  } catch (error) {
    console.error('[MONITOR] Error getting tasks:', error)
    return []
  }
}

/**
 * Обновление задачи в хранилище
 */
async function updateTask(taskId: string, updates: Partial<WebCheckTask>) {
  try {
    const tasks = await getTasks()
    const taskIndex = tasks.findIndex((t) => t.id === taskId)

    if (taskIndex === -1) {
      console.error(`[MONITOR] Task ${taskId} not found for update`)
      return
    }

    // Обновляем задачу
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates }

    // Сохраняем обратно в хранилище
    await setStorageLocal('tasks', tasks)

    console.log(`[MONITOR] Task ${taskId} updated`)
  } catch (error) {
    console.error(`[MONITOR] Error updating task ${taskId}:`, error)
  }
}

/**
 * Функция для тестирования offscreen мониторинга
 */
export async function testOffscreenMonitoring(url: string, selector: string) {
  console.log(`[MONITOR] Testing offscreen monitoring for ${url} with selector ${selector}`)

  try {
    // Убеждаемся, что offscreen документ создан
    await ensureOffscreenDocument()

    // Выполняем проверку элемента
    const result = await withReliability(async () => {
      return await checkElement(url, selector)
    })

    console.log('[MONITOR] Test result:', result)
    return result
  } catch (error) {
    console.error('[MONITOR] Test failed:', error)
    throw error
  }
}

/**
 * Получение статистики производительности
 */
export async function getPerformanceStats() {
  const performance = globalThis.performance as Performance & {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }

  return {
    memoryUsage: performance.memory
      ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
        }
      : null,
    timestamp: Date.now(),
  }
}

/**
 * Получение статистики мониторинга
 */
export async function getMonitoringStats() {
  try {
    const tasks = await getTasks()
    const queueStats = getQueueStats()
    const reliabilityState = getReliabilityState()
    const diagnostics = await performDiagnostics()

    return {
      // Статистика задач
      tasksTotal: tasks.length,
      tasksActive: tasks.filter((task) => task.status !== 'paused').length,
      tasksPaused: tasks.filter((task) => task.status === 'paused').length,
      tasksWithChanges: tasks.filter((task) => task.status === 'changed').length,
      tasksWithErrors: tasks.filter((task) => task.hasError).length,

      // Статистика offscreen
      offscreenReady: diagnostics.documentExists && diagnostics.documentResponsive,

      // Статистика очереди
      queueStats,

      // Статистика надёжности
      reliabilityState,

      // Диагностика
      diagnostics,
    }
  } catch (error) {
    console.error('[MONITOR] Error getting monitoring stats:', error)
    return {
      tasksTotal: 0,
      tasksActive: 0,
      tasksPaused: 0,
      tasksWithChanges: 0,
      tasksWithErrors: 0,
      offscreenReady: false,
      queueStats: getQueueStats(),
      reliabilityState: getReliabilityState(),
      diagnostics: { error: error instanceof Error ? error.message : String(error) },
    }
  }
}

/**
 * Вспомогательная функция для задержки
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

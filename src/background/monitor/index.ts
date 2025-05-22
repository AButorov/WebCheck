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
import { CHECK_INTERVALS, NOTIFICATION_TYPES, NOTIFICATION_TIMEOUT } from '~/utils/constants'
import { checkElement } from './element-checker'
import { updateBadge } from './badge'
import { ensureOffscreenDocument } from '../offscreenManager'
import { addTaskToQueue, getQueueStats, isTaskInQueue } from '../taskQueue'
import { initReliabilityManager, withReliability, registerActivity, getReliabilityState, performDiagnostics } from '../reliabilityManager'

// Имя аларма для планирования проверок
const CHECK_ALARM_NAME = 'web-check-monitor'

// Лимит на количество одновременных проверок
const MAX_CONCURRENT_CHECKS = 3

// Очередь задач для проверки
let checkQueue: string[] = []

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
  
  // Сразу обновляем бейдж на основе текущего состояния
  updateBadgeFromStorage()
  
  console.log('[MONITOR] Background monitoring system initialized')
}

/**
 * Настройка аларма для периодических проверок
 */
function setupAlarm() {
  // Удаляем существующий аларм, если он есть
  browser.alarms.clear(CHECK_ALARM_NAME).then(() => {
    // Создаем новый аларм с интервалом в 1 минуту
    browser.alarms.create(CHECK_ALARM_NAME, {
      periodInMinutes: 1
    })
    console.log('[MONITOR] Alarm scheduled for periodic checks')
  })
}

/**
 * Обработчик аларма для запуска проверки задач
 */
async function handleAlarm(alarm: browser.Alarms.Alarm) {
  if (alarm.name === CHECK_ALARM_NAME) {
    console.log('[MONITOR] Alarm triggered, checking for tasks to update')
    await checkDueTasksForUpdates()
  }
}

/**
 * Обработчик события запуска браузера
 */
async function handleBrowserStartup() {
  console.log('[MONITOR] Browser started, resuming monitoring')
  
  // Восстанавливаем мониторинг для активных задач
  const tasks = await getStorageLocal('tasks', [] as WebCheckTask[])
  
  // Обновляем бейдж на основе текущих данных
  updateBadgeFromTasks(tasks)
  
  console.log(`[MONITOR] Loaded ${tasks.length} tasks from storage`)
}

/**
 * Проверка задач, для которых наступило время обновления
 */
export async function checkDueTasksForUpdates() {
  if (isChecking) {
    console.log('[MONITOR] Check already in progress, skipping')
    return
  }
  
  console.log('[MONITOR] Checking for tasks due for update')
  isChecking = true
  
  try {
    // Регистрируем активность для менеджера надёжности
    registerActivity()
    
    // Убеждаемся, что offscreen-документ готов к работе через менеджер надёжности
    try {
      await withReliability(async () => {
        await ensureOffscreenDocument()
        console.log('[MONITOR] Offscreen document ready for monitoring')
      })
    } catch (error) {
      console.warn('[MONITOR] Failed to ensure offscreen document, monitoring will use fallback:', error)
      // Продолжаем работу - element-checker имеет fallback
    }
    
    // Получаем задачи из хранилища
    const tasks = await getStorageLocal('tasks', [] as WebCheckTask[])
    
    // Проверяем, что tasks действительно массив
    if (!Array.isArray(tasks)) {
      console.error('[MONITOR] Tasks is not an array:', tasks)
      isChecking = false
      return
    }
    
    // Проверяем, нужно ли обновить какие-либо задачи
    const now = Date.now()
    const tasksToCheck = tasks.filter(task => {
      // Пропускаем приостановленные задачи
      if (task.status === 'paused') {
        return false
      }
      
      // Определяем интервал проверки в миллисекундах
      const intervalMs = getIntervalInMs(task.interval)
      
      // Проверяем, прошло ли достаточно времени с последней проверки
      return now - task.lastCheckedAt >= intervalMs
    })
    
    if (tasksToCheck.length > 0) {
      console.log(`[MONITOR] Found ${tasksToCheck.length} tasks to check`)
      
      // Используем новую систему очередей
      await processTasksWithQueue(tasksToCheck)
    } else {
      console.log('[MONITOR] No tasks due for update')
      isChecking = false
    }
  } catch (error) {
    console.error('[MONITOR] Error checking tasks for updates:', error)
    isChecking = false
  }
}

/**
 * Обработка задач через систему очередей
 */
async function processTasksWithQueue(tasks: WebCheckTask[]): Promise<void> {
  console.log(`[MONITOR] Processing ${tasks.length} tasks through queue system`)
  
  const checkPromises = tasks.map(async (task) => {
    try {
      // Проверяем, не находится ли задача уже в очереди
      if (isTaskInQueue(task.id)) {
        console.log(`[MONITOR] Task ${task.id} already in queue, skipping`)
        return
      }
      
      // Добавляем задачу в очередь
      const result = await addTaskToQueue(task, 3)
      
      // Обрабатываем результат
      await handleTaskResult(task, result)
      
    } catch (error) {
      console.error(`[MONITOR] Error processing task ${task.id}:`, error)
      
      // Обрабатываем ошибку как результат проверки
      await handleTaskError(task, error instanceof Error ? error.message : String(error))
    }
  })
  
  // Ждём завершения всех задач
  await Promise.all(checkPromises)
  
  console.log('[MONITOR] All tasks processed')
  isChecking = false
}

/**
 * Обработка результата проверки задачи
 */
async function handleTaskResult(task: WebCheckTask, result: { html?: string; error?: string; taskId: string; timestamp: number }): Promise<void> {
  console.log(`[MONITOR] Handling result for task: ${task.id}`)
  
  const now = Date.now()
  const updates: Partial<WebCheckTask> = {
    lastCheckedAt: now
  }
  
  if (result.html) {
    // Успешно получен HTML
    updates.consecutiveErrors = 0
    
    // Проверяем на изменения
    const hasChanges = result.html !== task.currentHtml
    
    if (hasChanges) {
      console.log(`[MONITOR] Changes detected for task: ${task.id}`)
      updates.status = 'changed'
      updates.currentHtml = result.html
      updates.lastChangedAt = now
      
      // Показываем уведомление
      showNotification(task, result.html)
    } else if (task.status === 'error') {
      // Восстанавливаем статус после исправления ошибки
      updates.status = 'active'
    }
  } else {
    // Обрабатываем как ошибку
    await handleTaskError(task, result.error || 'Unknown error')
    return
  }
  
  // Сохраняем обновления
  await updateTask(task.id, updates)
  updateBadgeFromStorage()
}

/**
 * Обработка ошибки проверки задачи
 */
async function handleTaskError(task: WebCheckTask, error: string): Promise<void> {
  console.error(`[MONITOR] Handling error for task ${task.id}:`, error)
  
  const now = Date.now()
  const currentConsecutiveErrors = task.consecutiveErrors || 0
  
  const updates: Partial<WebCheckTask> = {
    lastCheckedAt: now,
    lastError: error,
    lastErrorTime: now,
    consecutiveErrors: currentConsecutiveErrors + 1
  }
  
  // Если много повторяющихся ошибок, меняем статус
  if (updates.consecutiveErrors >= 5) {
    updates.status = 'error'
  }
  
  await updateTask(task.id, updates)
  updateBadgeFromStorage()
}

/**
 * Показ уведомления об изменении
 */
function showNotification(task: WebCheckTask, newHtml: string) {
  // Создаем уведомление
  try {
    browser.notifications.create(`webcheck-${task.id}`, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon-changed-48.png'), // Исправленный путь без 'assets/'
      title: 'Обнаружены изменения',
      message: `Страница "${task.title}" была изменена`,
      priority: 2
    }).catch(error => {
      console.error('[MONITOR] Error showing notification:', error)
    })
    
    // Обработчик клика по уведомлению
    browser.notifications.onClicked.addListener((notificationId) => {
      if (notificationId === `webcheck-${task.id}`) {
        // Открываем страницу для просмотра изменений
        browser.tabs.create({
          url: browser.runtime.getURL(`src/ui/popup/pages/ViewChanges.html?id=${task.id}`)
        }).catch(error => {
          console.error('[MONITOR] Error opening view changes page:', error)
        })
        
        // Закрываем уведомление
        browser.notifications.clear(notificationId).catch(() => {})
      }
    })
    
    // Автоматическое закрытие уведомления по таймауту
    setTimeout(() => {
      browser.notifications.clear(`webcheck-${task.id}`).catch(() => {})
    }, NOTIFICATION_TIMEOUT)
  } catch (error) {
    console.error('[MONITOR] Error in showNotification:', error)
  }
}

/**
 * Обновление задачи в хранилище
 */
async function updateTask(taskId: string, updates: Partial<WebCheckTask>) {
  const tasks = await getStorageLocal('tasks', [] as WebCheckTask[])
  
  // Находим и обновляем задачу
  const updatedTasks = tasks.map(task => {
    if (task.id === taskId) {
      return { ...task, ...updates }
    }
    return task
  })
  
  // Сохраняем обновленные задачи
  await setStorageLocal('tasks', updatedTasks)
}

/**
 * Получение интервала в миллисекундах
 */
function getIntervalInMs(interval: TaskInterval): number {
  switch (interval) {
    case '10s':
      return CHECK_INTERVALS.TEN_SECONDS.milliseconds
    case '15m':
      return CHECK_INTERVALS.FIFTEEN_MINUTES.milliseconds
    case '1h':
      return CHECK_INTERVALS.ONE_HOUR.milliseconds
    case '3h':
      return CHECK_INTERVALS.THREE_HOURS.milliseconds
    case '1d':
      return CHECK_INTERVALS.ONE_DAY.milliseconds
    default:
      return CHECK_INTERVALS.ONE_HOUR.milliseconds
  }
}

/**
 * Обновление бейджа на основе данных из хранилища
 */
async function updateBadgeFromStorage() {
  const tasks = await getStorageLocal('tasks', [] as WebCheckTask[])
  updateBadgeFromTasks(tasks)
}

/**
 * Обновление бейджа на основе списка задач
 */
function updateBadgeFromTasks(tasks: WebCheckTask[]) {
  // Подсчитываем количество задач с изменениями
  const changedTasksCount = tasks.filter(task => task.status === 'changed').length
  
  // Обновляем бейдж
  updateBadge(changedTasksCount)
}

/**
 * Остановка мониторинга (для очистки ресурсов)
 */
export function stopMonitor(): void {
  console.log('[MONITOR] Stopping background monitoring system')
  
  // Останавливаем аларм
  browser.alarms.clear(CHECK_ALARM_NAME)
  
  // Очищаем флаги
  isChecking = false
  checkQueue = []
  
  console.log('[MONITOR] Background monitoring system stopped')
}

/**
 * Получение краткой статистики производительности
 */
export async function getPerformanceStats(): Promise<{
  queueLength: number
  isProcessing: boolean
  averageProcessingTime: number
  successRate: number
  recoveryCount: number
  systemHealth: 'healthy' | 'degraded' | 'critical'
}> {
  const queueStats = getQueueStats()
  const reliabilityState = getReliabilityState()
  
  // Вычисляем процент успешных операций
  const totalProcessed = queueStats.stats.totalProcessed
  const successRate = totalProcessed > 0 
    ? Math.round((queueStats.stats.totalSuccessful / totalProcessed) * 100)
    : 100
  
  // Определяем состояние системы
  let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'
  
  if (!reliabilityState.isHealthy || reliabilityState.consecutiveErrors > 3) {
    systemHealth = 'critical'
  } else if (successRate < 80 || reliabilityState.consecutiveErrors > 1) {
    systemHealth = 'degraded'
  }
  
  return {
    queueLength: queueStats.queueLength,
    isProcessing: queueStats.isProcessing,
    averageProcessingTime: queueStats.stats.averageProcessingTime,
    successRate,
    recoveryCount: reliabilityState.totalRecoveries,
    systemHealth
  }
}

/**
 * Тестовые функции для отладки offscreen API
 */
export async function testOffscreenMonitoring(url: string, selector: string): Promise<{
  success: boolean
  duration: number
  contentLength?: number
  contentPreview?: string
  error?: string
  queuePosition?: number
}> {
  console.log(`[MONITOR:TEST] Testing offscreen monitoring for ${url} with selector ${selector}`)
  
  try {
    // Регистрируем активность
    registerActivity()
    
    // Создаём тестовую задачу
    const testTask: WebCheckTask = {
      id: `test_${Date.now()}`,
      title: 'Test Task',
      url,
      selector,
      interval: '15m',
      status: 'active',
      createdAt: Date.now(),
      lastCheckedAt: 0,
      currentHtml: ''
    }
    
    // Проверяем позицию в очереди
    const queuePosition = isTaskInQueue(testTask.id) ? getQueueStats().queueLength + 1 : 1
    
    // Тестируем через систему очередей
    const startTime = Date.now()
    const result = await addTaskToQueue(testTask, 2)
    const duration = Date.now() - startTime
    
    console.log(`[MONITOR:TEST] Test completed in ${duration}ms`)
    
    if (result.html) {
      console.log(`[MONITOR:TEST] Success: Found element (${result.html.length} characters)`)
      const preview = result.html.substring(0, 200)
      console.log(`[MONITOR:TEST] Content preview: ${preview}...`)
      
      return {
        success: true,
        duration,
        contentLength: result.html.length,
        contentPreview: preview,
        queuePosition
      }
    } else {
      console.error(`[MONITOR:TEST] Error: ${result.error}`)
      return {
        success: false,
        duration,
        error: result.error,
        queuePosition
      }
    }
    
  } catch (error) {
    console.error('[MONITOR:TEST] Test failed:', error)
    return {
      success: false,
      duration: 0,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Получение расширенной статистики мониторинга
 */
export async function getMonitoringStats(): Promise<{
  tasksTotal: number
  tasksActive: number
  tasksPaused: number
  tasksWithChanges: number
  tasksWithErrors: number
  offscreenReady: boolean
  queueStats: ReturnType<typeof getQueueStats>
  reliabilityState: ReturnType<typeof getReliabilityState>
  diagnostics: Awaited<ReturnType<typeof performDiagnostics>>
}> {
  const tasks = await getStorageLocal('tasks', [] as WebCheckTask[])
  
  // Проверяем состояние offscreen-документа
  let offscreenReady = false
  try {
    await ensureOffscreenDocument()
    offscreenReady = true
  } catch {
    offscreenReady = false
  }
  
  // Получаем статистику очереди
  const queueStats = getQueueStats()
  
  // Получаем состояние надёжности
  const reliabilityState = getReliabilityState()
  
  // Выполняем диагностику
  const diagnostics = await performDiagnostics()
  
  return {
    tasksTotal: tasks.length,
    tasksActive: tasks.filter(t => t.status === 'active').length,
    tasksPaused: tasks.filter(t => t.status === 'paused').length,
    tasksWithChanges: tasks.filter(t => t.status === 'changed').length,
    tasksWithErrors: tasks.filter(t => t.status === 'error').length,
    offscreenReady,
    queueStats,
    reliabilityState,
    diagnostics
  }
}

/**
 * Принудительная проверка одной задачи (для отладки)
 */
export async function forceCheckTask(taskId: string): Promise<{
  success: boolean
  result?: any
  error?: string
  duration: number
}> {
  const startTime = Date.now()
  
  try {
    const tasks = await getStorageLocal('tasks', [] as WebCheckTask[])
    const task = tasks.find(t => t.id === taskId)
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }
    
    console.log(`[MONITOR:FORCE] Force checking task ${taskId}`)
    
    // Проверяем, не находится ли задача уже в очереди
    if (isTaskInQueue(taskId)) {
      throw new Error('Task is already in queue')
    }
    
    // Добавляем в очередь с высоким приоритетом
    const result = await addTaskToQueue(task, 1)
    
    // Обрабатываем результат
    await handleTaskResult(task, result)
    
    const duration = Date.now() - startTime
    
    return {
      success: true,
      result,
      duration
    }
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[MONITOR:FORCE] Force check failed:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration
    }
  }
}

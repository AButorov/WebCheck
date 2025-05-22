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
    // Убеждаемся, что offscreen-документ готов к работе
    try {
      await ensureOffscreenDocument()
      console.log('[MONITOR] Offscreen document ready for monitoring')
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
      
      // Добавляем все задачи в очередь
      checkQueue = checkQueue.concat(tasksToCheck.map(task => task.id))
      
      // Запускаем процесс проверки
      processCheckQueue()
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
 * Обработка очереди проверок
 */
async function processCheckQueue() {
  // Если очередь пуста или проверка не активна, выходим
  if (checkQueue.length === 0 || !isChecking) {
    console.log('[MONITOR] Check queue empty or checking disabled')
    isChecking = false
    return
  }
  
  // Получаем задачи из хранилища
  const tasks = await getStorageLocal('tasks', [] as WebCheckTask[])
  
  // Создаем массив промисов для параллельной обработки
  const checkPromises: Promise<void>[] = []
  
  // Проверяем до MAX_CONCURRENT_CHECKS задач одновременно
  while (checkQueue.length > 0 && checkPromises.length < MAX_CONCURRENT_CHECKS) {
    const taskId = checkQueue.shift()
    if (!taskId) continue
    
    const task = tasks.find(t => t.id === taskId)
    if (!task) continue
    
    // Добавляем промис проверки в массив
    checkPromises.push(checkTaskForChanges(task))
  }
  
  // Ждем завершения всех проверок
  await Promise.all(checkPromises)
  
  // Если в очереди остались задачи, продолжаем обработку
  if (checkQueue.length > 0) {
    processCheckQueue()
  } else {
    console.log('[MONITOR] All tasks checked')
    isChecking = false
  }
}

/**
 * Проверка одной задачи на наличие изменений с улучшенной обработкой ошибок
 */
async function checkTaskForChanges(task: WebCheckTask): Promise<void> {
  console.log(`[MONITOR] Checking task: ${task.id} (${task.title})`)
  
  try {
    // Проверяем элемент с повторными попытками (3 попытки по умолчанию)
    const result = await checkElement(task.url, task.selector, 3)
    
    // Флаг наличия изменений
    let hasChanges = false
    
    // Всегда обновляем время последней проверки
    const now = Date.now()
    const updates: Partial<WebCheckTask> = {
      lastCheckedAt: now
    }
    
    // Если успешно получен HTML
    if (result.html) {
      // Сбрасываем счетчик ошибок, если он был
      updates.consecutiveErrors = 0
      
      // Сравниваем с сохраненным HTML
      hasChanges = result.html !== task.currentHtml
      
      // Если есть изменения
      if (hasChanges) {
        console.log(`[MONITOR] Changes detected for task: ${task.id}`)
        updates.status = 'changed'
        updates.currentHtml = result.html
        updates.lastChangedAt = now
        
        // Показываем уведомление
        showNotification(task, result.html)
      } else if (task.status === 'error') {
        // Если раньше была ошибка, а теперь нет - восстанавливаем статус
        updates.status = 'active'
      }
    } else if (result.error) {
      console.error(`[MONITOR] Error checking task ${task.id}:`, result.error)
      
      // Обновляем информацию об ошибке
      updates.lastError = result.error
      updates.lastErrorTime = now
      
      // Увеличиваем счетчик последовательных ошибок
      const currentConsecutiveErrors = task.consecutiveErrors || 0
      updates.consecutiveErrors = currentConsecutiveErrors + 1
      
      // Если ошибка повторяется много раз, меняем статус на "error"
      if (updates.consecutiveErrors >= 5) {
        updates.status = 'error'
      }
    }
    
    // Сохраняем обновления в любом случае
    await updateTask(task.id, updates)
    
    // Обновляем бейдж
    updateBadgeFromStorage()
  } catch (error) {
    console.error(`[MONITOR] Failed to check task ${task.id}:`, error)
    
    // Даже если все пошло не так, сохраняем информацию об ошибке
    try {
      const updates: Partial<WebCheckTask> = {
        lastCheckedAt: Date.now(),
        lastError: error instanceof Error ? error.message : String(error),
        lastErrorTime: Date.now(),
        consecutiveErrors: (task.consecutiveErrors || 0) + 1
      }
      
      // Если много повторяющихся ошибок, меняем статус
      if (updates.consecutiveErrors >= 5) {
        updates.status = 'error'
      }
      
      await updateTask(task.id, updates)
    } catch (updateError) {
      console.error(`[MONITOR] Failed to update task error status:`, updateError)
    }
  }
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
 * Тестовые функции для отладки offscreen API
 */
export async function testOffscreenMonitoring(url: string, selector: string): Promise<void> {
  console.log(`[MONITOR:TEST] Testing offscreen monitoring for ${url} with selector ${selector}`)
  
  try {
    // Убеждаемся, что offscreen-документ доступен
    await ensureOffscreenDocument()
    console.log('[MONITOR:TEST] Offscreen document ready')
    
    // Тестируем проверку элемента
    const startTime = Date.now()
    const result = await checkElement(url, selector, 2)
    const duration = Date.now() - startTime
    
    console.log(`[MONITOR:TEST] Test completed in ${duration}ms`)
    
    if (result.html) {
      console.log(`[MONITOR:TEST] Success: Found element (${result.html.length} characters)`)
      console.log(`[MONITOR:TEST] Content preview: ${result.html.substring(0, 200)}...`)
    } else if (result.error) {
      console.error(`[MONITOR:TEST] Error: ${result.error}`)
    } else {
      console.warn(`[MONITOR:TEST] Unexpected result: no HTML and no error`)
    }
    
  } catch (error) {
    console.error('[MONITOR:TEST] Test failed:', error)
  }
}

/**
 * Получение статистики мониторинга
 */
export async function getMonitoringStats(): Promise<{
  tasksTotal: number
  tasksActive: number
  tasksPaused: number
  tasksWithChanges: number
  tasksWithErrors: number
  offscreenReady: boolean
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
  
  return {
    tasksTotal: tasks.length,
    tasksActive: tasks.filter(t => t.status === 'active').length,
    tasksPaused: tasks.filter(t => t.status === 'paused').length,
    tasksWithChanges: tasks.filter(t => t.status === 'changed').length,
    tasksWithErrors: tasks.filter(t => t.status === 'error').length,
    offscreenReady
  }
}

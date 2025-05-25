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

// Обработка установки расширения
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('Web Check extension installed')
  }
})

// ВАЖНО: Инициализируем универсальный обработчик ДО других инициализаций
setupUniversalMessageHandler()

// Инициализируем мониторинг при запуске фонового скрипта
initMonitor()

// Настраиваем обработчики событий для offscreen-документов
setupOffscreenEventHandlers()

// Обработка остановки расширения (cleanup)
if (chrome.runtime.onSuspend) {
  chrome.runtime.onSuspend.addListener(() => {
    console.log('Background script suspending, cleaning up resources')
    stopMonitor()
  })
}

// Загружаем debug консоль в режиме разработки
if (process.env.NODE_ENV === 'development') {
  import('./debug')
    .then(() => console.log('Debug console loaded'))
    .catch(error => console.warn('Failed to load debug console:', error))
}

// Обработка сообщений для ручной проверки изменений (webext-bridge)
onMessage('check-for-changes', async (message) => {
  const { data } = message;
  const { taskId, tabId } = data as MessagePayloads['check-for-changes'];
  console.log(`Checking for changes for task ${taskId} in tab ${tabId}`)
  
  // Запускаем проверку задач, у которых наступило время обновления
  await checkDueTasksForUpdates()
})

// Обработка уведомлений (webext-bridge)
onMessage('show-notification', async (message) => {
  const { data } = message;
  const { title, message: notificationMessage, taskId } = data as MessagePayloads['show-notification'];
  
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
  const { data, sender } = message;
  const { taskId, selector } = data as MessagePayloads['check-element'];
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
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

// ВРЕМЕННЫЙ ОБРАБОТЧИК ДЛЯ ТЕСТИРОВАНИЯ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'get-monitoring-stats') {
    getMonitoringStats()
      .then(stats => sendResponse({ success: true, stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // КРИТИЧНО для асинхронного ответа
  }
  
  if (request.type === 'get-performance-stats') {
    getPerformanceStats()
      .then(stats => sendResponse({ success: true, stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // КРИТИЧНО для асинхронного ответа
  }
  
  return false;
});

import browser from 'webextension-polyfill'
import { onMessage } from 'webext-bridge/background'
import { WebCheckTask } from '~/types/task'
import { MessagePayloads } from '~/types/messages'

// Импортируем модуль захвата элементов
import './capture'

// Импортируем и инициализируем систему мониторинга
import { initMonitor, checkDueTasksForUpdates } from './monitor'

// Обработка установки расширения
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('Web Check extension installed')
  }
})

// Инициализируем мониторинг при запуске фонового скрипта
initMonitor()

// Обработка сообщений для ручной проверки изменений
onMessage('check-for-changes', async (message) => {
  const { data } = message;
  const { taskId, tabId } = data as MessagePayloads['check-for-changes'];
  console.log(`Checking for changes for task ${taskId} in tab ${tabId}`)
  
  // Запускаем проверку задач, у которых наступило время обновления
  await checkDueTasksForUpdates()
})

// Обработка уведомлений
onMessage('show-notification', async (message) => {
  const { data } = message;
  const { title, message: notificationMessage, taskId } = data as MessagePayloads['show-notification'];
  
  // Создаем уведомление
  browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('assets/icons/icon-128.png'),
    title,
    message: notificationMessage,
  })
})

// Обработка запросов на проверку элемента
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
    
    // Проверяем элемент с использованием модуля element-checker
    // (на этом этапе просто возвращаем заглушку)
    // В реальной реализации будет использоваться функция checkElement из ./monitor/element-checker
    
    return {
      taskId,
      html: task.currentHtml, // В реальной реализации здесь будет результат проверки
    }
  } catch (error) {
    console.error('Error checking element:', error)
    return {
      taskId,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

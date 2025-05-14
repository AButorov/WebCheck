import browser from 'webextension-polyfill'
import { onMessage } from 'webext-bridge/background'
import { WebCheckTask } from '~/types/task'
import { MessagePayloads } from '~/types/messages'

// Импортируем модуль захвата элементов
import './capture'

// Обработка установки расширения
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('Web Check extension installed')
  }
})

// Обработка сообщений
onMessage('check-for-changes', async (message) => {
  const { data } = message;
  const { taskId, tabId } = data as MessagePayloads['check-for-changes'];
  console.log(`Checking for changes for task ${taskId} in tab ${tabId}`)
  // Реализация проверки изменений будет добавлена позже
})

// Обработка уведомлений
onMessage('show-notification', async (message) => {
  const { data } = message;
  const { title, message: notificationMessage, taskId } = data as MessagePayloads['show-notification'];
  
  // Создаем уведомление
  browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('src/assets/icons/icon-128.png'),
    title,
    message: notificationMessage,
  })
})

// Настройка алармов для периодической проверки
browser.alarms.create('check-tasks', { periodInMinutes: 5 })

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check-tasks') {
    // Получение задач из хранилища
    const storage = await browser.storage.local.get('tasks')
    const tasks = storage.tasks || []
    
    // Проверка задач, которые нужно обновить
    const now = Date.now()
    const tasksToCheck = tasks.filter((task: WebCheckTask) => {
      if (task.status === 'paused') return false
      
      // Определение интервала проверки в миллисекундах
      let intervalMs = 60 * 60 * 1000 // По умолчанию 1 час
      
      switch (task.interval) {
        case '15m':
          intervalMs = 15 * 60 * 1000
          break
        case '1h':
          intervalMs = 60 * 60 * 1000
          break
        case '3h':
          intervalMs = 3 * 60 * 60 * 1000
          break
        case '1d':
          intervalMs = 24 * 60 * 60 * 1000
          break
      }
      
      // Проверяем, прошло ли достаточно времени с последней проверки
      return now - task.lastCheckedAt >= intervalMs
    })
    
    // Выполнение проверок
    for (const task of tasksToCheck) {
      console.log(`Scheduled check for task: ${task.id}`)
      // Логика проверки будет добавлена позже
    }
  }
})

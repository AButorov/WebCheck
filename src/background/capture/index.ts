/**
 * Background script для захвата элементов и создания скриншотов
 */

import * as browser from 'webextension-polyfill'
import {
  sendSafeMessage,
  injectContentScriptsIntoAllTabs,
} from '../safeMessaging'

interface ElementInfo {
  selector: string
  rect: {
    top: number
    left: number
    width: number
    height: number
    bottom: number
    right: number
  }
  html: string
  pageTitle: string
  pageUrl: string
  faviconUrl: string
  thumbnailUrl?: string // Миниатюра может быть предоставлена content script
}

interface Task {
  id: string
  title: string
  url: string
  faviconUrl: string
  selector: string
  createdAt: number
  status: 'unchanged' | 'changed' | 'paused'
  interval: string
  initialHtml: string
  currentHtml: string
  thumbnailUrl: string
  lastCheckedAt: number
  lastChangedAt: number | null
}

// Переменная для отслеживания состояния выбора элемента
let elementSelectionActive = false

/**
 * Обработка выбранного элемента
 */
async function handleSelectedElement(elementInfo: ElementInfo): Promise<void> {
  console.log('[WebCheck:Background] Processing selected element:', elementInfo.selector)

  try {
    // Получаем активную вкладку
    const tabs = await browser.tabs.query({ active: true, currentWindow: true }).catch((error) => {
      console.error('[WebCheck:Background] Error querying tabs:', error)
      return []
    })

    if (tabs.length === 0) {
      console.error('[WebCheck:Background] No active tab found')
      return
    }

    // Создаем задачу
    const task: Task = {
      id: generateId(),
      title: elementInfo.pageTitle || 'Untitled',
      url: elementInfo.pageUrl,
      faviconUrl: elementInfo.faviconUrl || '',
      selector: elementInfo.selector,
      createdAt: Date.now(),
      status: 'unchanged',
      interval: '1h',
      initialHtml: elementInfo.html,
      currentHtml: elementInfo.html,
      thumbnailUrl: elementInfo.thumbnailUrl || '',
      lastCheckedAt: Date.now(),
      lastChangedAt: null,
    }

    // Сохраняем задачу сразу в основной список задач
    await saveTask(task)

    // ОПЦИОНАЛЬНО: также сохраняем во временное хранилище для NewTask.vue (для совместимости)
    // Больше не нужно, так как задача уже сохранена в основной список
    // await browser.storage.local.set({ newTaskData: task })

    // Отправляем сообщение в popup о том, что элемент захвачен
    try {
      await browser.runtime.sendMessage({
        action: 'elementCaptured',
        task: task,
      })
    } catch (error) {
      console.log(
        '[WebCheck:Background] Could not send message to popup (popup may be closed):',
        error
      )
    }

    // Дополнительно сохраняем во временное хранилище для NewTask.vue
    await browser.storage.local.set({ newTaskData: task })

    console.log('[WebCheck:Background] Task created and saved:', task.id)
  } catch (error) {
    console.error('[WebCheck:Background] Error handling selected element:', error)

    // Отправляем ошибку в popup
    try {
      await browser.runtime.sendMessage({
        action: 'captureError',
        error: error instanceof Error ? error.message : String(error),
      })
    } catch (msgError) {
      console.log('[WebCheck:Background] Could not send error to popup:', msgError)
    }
  }
}

/**
 * Сохранение задачи в хранилище
 */
async function saveTask(task: Task): Promise<void> {
  try {
    const storage = await browser.storage.local.get('tasks')
    const tasks = storage.tasks || []

    tasks.push(task)

    await browser.storage.local.set({ tasks })
    console.log('[WebCheck:Background] Task saved to storage')
  } catch (error) {
    console.error('[WebCheck:Background] Error saving task:', error)
    throw error
  }
}

/**
 * Генерация уникального ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/**
 * Активация выбора элемента - ИСПРАВЛЕННАЯ ВЕРСИЯ
 */
async function activateElementSelection(tabId?: number): Promise<void> {
  console.log('[WebCheck:Background] Activating element selection')

  try {
    let activeTabId: number

    if (tabId) {
      activeTabId = tabId
    } else {
      // Получаем активную вкладку
      const tabs = await browser.tabs.query({ active: true, currentWindow: true })
      if (tabs.length === 0) {
        throw new Error('No active tab found')
      }
      if (!tabs[0].id) {
        throw new Error('Active tab has no ID')
      }
      activeTabId = tabs[0].id
    }

    // Проверяем URL вкладки
    const tab = await browser.tabs.get(activeTabId)
    if (
      !tab.url ||
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('moz-extension://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:')
    ) {
      throw new Error('Cannot monitor system pages. Please navigate to a regular website.')
    }

    console.log(`[WebCheck:Background] Sending activation message to tab ${activeTabId}`)

    // Используем безопасную отправку сообщений
    const result = await sendSafeMessage(
      activeTabId,
      { action: 'activateElementSelection' },
      {
        retryCount: 3,
        retryDelay: 500,
        timeout: 10000,
        injectContentScript: true,
      }
    )

    if (!result.success) {
      // Пробуем альтернативное сообщение
      console.log('[WebCheck:Background] Trying alternative activation message...')

      const altResult = await sendSafeMessage(
        activeTabId,
        { action: 'activateElementPicker' },
        {
          retryCount: 2,
          retryDelay: 300,
          timeout: 5000,
          injectContentScript: false, // Уже пробовали инжектировать выше
        }
      )

      if (!altResult.success) {
        throw new Error(`Could not activate element selection: ${result.error || altResult.error}`)
      }
    }

    elementSelectionActive = true
    console.log('[WebCheck:Background] Element selection activated successfully')

    // Уведомляем popup об успехе
    try {
      await browser.runtime.sendMessage({
        action: 'elementSelectionActivated',
        tabId: activeTabId,
      })
    } catch (error) {
      console.log('[WebCheck:Background] Could not notify popup (may be closed):', error)
    }
  } catch (error) {
    console.error('[WebCheck:Background] Error activating element selection:', error)
    elementSelectionActive = false

    // Отправляем ошибку в popup
    try {
      await browser.runtime.sendMessage({
        action: 'elementSelectionError',
        error: error instanceof Error ? error.message : String(error),
      })
    } catch (msgError) {
      console.log('[WebCheck:Background] Could not send error to popup:', msgError)
    }

    throw error
  }
}

/**
 * Отмена выбора элемента - ИСПРАВЛЕННАЯ ВЕРСИЯ
 */
async function cancelElementSelection(): Promise<void> {
  console.log('[WebCheck:Background] Cancelling element selection')

  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })

    if (tabs.length > 0 && tabs[0].id) {
      // Используем безопасную отправку сообщений
      const result = await sendSafeMessage(
        tabs[0].id,
        { action: 'cancelElementSelection' },
        {
          retryCount: 2,
          retryDelay: 200,
          timeout: 3000,
          injectContentScript: false, // Для отмены не нужно инжектировать
        }
      )

      if (!result.success) {
        console.warn(
          '[WebCheck:Background] Could not send cancellation to content script:',
          result.error
        )
      }
    }

    elementSelectionActive = false
    console.log('[WebCheck:Background] Element selection cancelled')

    // Отправляем уведомление в popup
    try {
      await browser.runtime.sendMessage({
        action: 'elementSelectionCancelled',
      })
    } catch (error) {
      console.log('[WebCheck:Background] Could not send cancellation to popup:', error)
    }
  } catch (error) {
    console.error('[WebCheck:Background] Error cancelling element selection:', error)
  }
}

/**
 * Получение статуса выбора элемента
 */
function getElementSelectionStatus(): boolean {
  return elementSelectionActive
}

// Обработчик сообщений
browser.runtime.onMessage.addListener(
  async (message: { type?: string; action?: string; tabId?: number; [key: string]: unknown }) => {
    const messageType = message.type || message.action
    console.log('[WebCheck:Background] Received message:', messageType)

    try {
      switch (messageType) {
        case 'activateElementSelection':
          await activateElementSelection(message.tabId)
          return { status: 'activated' }

        case 'captureElement':
        case 'elementSelected':
          if (message.elementInfo) {
            await handleSelectedElement(message.elementInfo as ElementInfo)
            elementSelectionActive = false
          }
          return { status: 'captured' }

        case 'cancelElementSelection':
          await cancelElementSelection()
          return { status: 'cancelled' }

        case 'getElementSelectionStatus':
          return { active: getElementSelectionStatus() }

        default:
          console.log('[WebCheck:Background] Unknown message type:', messageType)
          break
      }
    } catch (error) {
      console.error('[WebCheck:Background] Error processing message:', error)
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }
)

// Обработчик установки расширения - ИСПРАВЛЕННАЯ ВЕРСИЯ
browser.runtime.onInstalled.addListener(async ({ reason }) => {
  console.log('[WebCheck:Background] Extension installed, reason:', reason)

  if (reason === 'install') {
    // Инициализация при первой установке
    await browser.storage.local.set({ tasks: [] })
    console.log('[WebCheck:Background] Initial storage setup completed')
  }

  // При установке или обновлении инжектируем content scripts во все открытые табы
  if (reason === 'install' || reason === 'update') {
    console.log('[WebCheck:Background] Injecting content scripts into existing tabs...')
    try {
      await injectContentScriptsIntoAllTabs()
      console.log('[WebCheck:Background] Content scripts injection completed')
    } catch (error) {
      console.error('[WebCheck:Background] Error injecting content scripts:', error)
    }
  }
})

console.log('[WebCheck:Background] Capture module loaded with safe messaging')

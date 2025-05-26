/**
 * Background script для захвата элементов и создания скриншотов
 */

import browser from 'webextension-polyfill'

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

    // Сохраняем задачу
    await saveTask(task)

    // Отправляем уведомление об успешном создании
    await browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon-48.png'),
      title: 'WebCheck',
      message: `Element "${elementInfo.selector}" is now being monitored`,
    })

    console.log('[WebCheck:Background] Task created successfully:', task.id)
  } catch (error) {
    console.error('[WebCheck:Background] Error handling selected element:', error)
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
 * Активация выбора элемента
 */
async function activateElementSelection(): Promise<void> {
  console.log('[WebCheck:Background] Activating element selection')

  try {
    // Получаем активную вкладку
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })

    if (tabs.length === 0) {
      console.error('[WebCheck:Background] No active tab found')
      return
    }

    const activeTab = tabs[0]

    if (!activeTab.id) {
      console.error('[WebCheck:Background] Active tab has no ID')
      return
    }

    // Проверяем URL вкладки
    if (
      !activeTab.url ||
      activeTab.url.startsWith('chrome://') ||
      activeTab.url.startsWith('chrome-extension://')
    ) {
      console.error('[WebCheck:Background] Cannot inject into system pages')
      return
    }

    // Инжектируем content script если необходимо
    try {
      await browser.tabs.executeScript(activeTab.id, {
        file: 'content-script/index.js',
      })
    } catch (error) {
      console.log('[WebCheck:Background] Content script already injected or error:', error)
    }

    // Отправляем сообщение для активации выбора
    await browser.tabs.sendMessage(activeTab.id, {
      type: 'activateElementSelection',
    })

    elementSelectionActive = true
    console.log('[WebCheck:Background] Element selection activated')
  } catch (error) {
    console.error('[WebCheck:Background] Error activating element selection:', error)
  }
}

/**
 * Отмена выбора элемента
 */
async function cancelElementSelection(): Promise<void> {
  console.log('[WebCheck:Background] Cancelling element selection')

  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })

    if (tabs.length > 0 && tabs[0].id) {
      await browser.tabs.sendMessage(tabs[0].id, {
        type: 'cancelElementSelection',
      })
    }

    elementSelectionActive = false
    console.log('[WebCheck:Background] Element selection cancelled')
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
browser.runtime.onMessage.addListener(async (message: { type: string; [key: string]: unknown }) => {
  console.log('[WebCheck:Background] Received message:', message.type)

  try {
    switch (message.type) {
      case 'activateElementSelection':
        await activateElementSelection()
        break

      case 'elementSelected':
        if (message.elementInfo) {
          await handleSelectedElement(message.elementInfo as ElementInfo)
          elementSelectionActive = false
        }
        break

      case 'cancelElementSelection':
        await cancelElementSelection()
        break

      case 'getElementSelectionStatus':
        return { active: getElementSelectionStatus() }

      default:
        console.log('[WebCheck:Background] Unknown message type:', message.type)
        break
    }
  } catch (error) {
    console.error('[WebCheck:Background] Error processing message:', error)
  }
})

// Обработчик установки расширения
browser.runtime.onInstalled.addListener(({ reason }) => {
  console.log('[WebCheck:Background] Extension installed, reason:', reason)

  if (reason === 'install') {
    // Инициализация при первой установке
    browser.storage.local.set({ tasks: [] })
  }
})

console.log('[WebCheck:Background] Capture module loaded')

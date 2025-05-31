// Background Service Worker для Web Check
import '~/types/chrome.d.ts'

// Интерфейсы для сообщений
interface BaseMessage {
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface ElementSelectionMessage extends BaseMessage {
  action: 'activateElementSelection';
  tabId: number;
}

interface CaptureElementMessage extends BaseMessage {
  action: 'captureElement';
  elementInfo: {
    selector: string;
    rect: DOMRect;
    html: string;
    pageTitle: string;
    pageUrl: string;
    faviconUrl?: string;
  };
}

interface ContentScriptReadyMessage extends BaseMessage {
  action: 'contentScriptReady';
}

type MessageType = ElementSelectionMessage | CaptureElementMessage | ContentScriptReadyMessage | BaseMessage;

// Обработчик сообщений
// eslint-disable-next-line @typescript-eslint/no-explicit-any
chrome.runtime.onMessage.addListener((message: MessageType, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean => {
  console.log('[Background] Received message:', message.action)
  
  // Простой ping-pong
  if (message.action === 'ping') {
    sendResponse({ status: 'pong' })
    return true
  }
  
  // Обработка асинхронных сообщений
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error: Error) => {
      console.error('[Background] Error handling message:', error)
      sendResponse({ error: error.message })
    })
  
  return true // Необходимо для асинхронных ответов
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleMessage(message: MessageType, sender: chrome.runtime.MessageSender): Promise<any> {
  try {
    switch (message.action) {
      case 'test':
        return { success: true, message: 'Background script работает!' }
      
      case 'contentScriptReady':
        console.log('[Background] Content script ready in tab:', sender.tab?.id)
        return { status: 'acknowledged' }
      
      case 'activateElementSelection':
        return await handleElementSelection((message as ElementSelectionMessage).tabId)
      
      case 'captureElement':
        return await handleElementCapture((message as CaptureElementMessage).elementInfo)
      
      default:
        console.log('[Background] Unknown action:', message.action)
        return { error: 'Unknown action' }
    }
  } catch (error) {
    console.error('[Background] Error handling message:', error)
    throw error
  }
}

// Обработка активации выбора элементов
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleElementSelection(tabId: number): Promise<{ success: boolean; response?: any }> {
  if (!tabId) {
    throw new Error('Tab ID is required for element selection')
  }

  console.log(`[Background] Activating element selection for tab ${tabId}`)

  try {
    // Получаем информацию о табе
    const tab = await chrome.tabs.get(tabId)
    
    if (!tab.url || isSystemUrl(tab.url)) {
      throw new Error(`Cannot activate element selection on system URL: ${tab.url}`)
    }

    // Проверяем готовность content script
    const isReady = await checkContentScriptReady(tabId)
    
    if (!isReady) {
      console.log('[Background] Content script not ready, injecting...')
      await injectContentScript(tabId)
      
      // Ждем инициализации
      await delay(500)
      
      // Повторно проверяем
      const isReadyAfterInjection = await checkContentScriptReady(tabId)
      if (!isReadyAfterInjection) {
        throw new Error('Content script not ready after injection')
      }
    }

    // Отправляем сообщение активации в content script
    const response = await sendMessageToTab(tabId, { action: 'activateElementSelection' })
    
    console.log('[Background] Element selection activated successfully:', response)
    return { success: true, response }
    
  } catch (error) {
    console.error('[Background] Error activating element selection:', error)
    throw error
  }
}

// Обработка захвата элемента
async function handleElementCapture(elementInfo: CaptureElementMessage['elementInfo']): Promise<{ success: boolean; message: string; taskId: string }> {
  console.log('[Background] Element captured:', elementInfo)
  
  try {
    // Создаем задачу из информации об элементе
    const task = {
      id: generateTaskId(),
      url: elementInfo.pageUrl,
      title: elementInfo.pageTitle || 'Без названия',
      selector: elementInfo.selector,
      interval: '1h', // По умолчанию 1 час
      isActive: true,
      createdAt: new Date().toISOString(),
      lastCheck: null,
      lastContent: null,
      history: [],
      elementInfo: elementInfo
    }
    
    console.log('[Background] Created task from element:', task)
    
    // Сохраняем данные задачи в storage для popup
    await chrome.storage.local.set({
      newTaskData: task
    })
    
    console.log('[Background] Task data saved to storage as newTaskData')
    
    return { success: true, message: 'Element captured and task created successfully', taskId: task.id }
    
  } catch (error) {
    console.error('[Background] Error handling element capture:', error)
    throw error
  }
}

// Генерация ID задачи
function generateTaskId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// Проверка готовности content script
async function checkContentScriptReady(tabId: number, timeout: number = 3000): Promise<boolean> {
  try {
    const response = await sendMessageToTab(tabId, { action: 'ping' }, timeout)
    return response && response.status === 'pong'
  } catch (error) {
    console.log(`[Background] Content script not ready in tab ${tabId}:`, error)
    return false
  }
}

// Отправка сообщения в таб с таймаутом
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-explicit-any
async function sendMessageToTab(tabId: number, message: any, timeout: number = 5000): Promise<any> {
  return Promise.race([
    chrome.tabs.sendMessage(tabId, message),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Message timeout')), timeout)
    )
  ])
}

// Инъекция content script
async function injectContentScript(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId)

    if (!tab.url || isSystemUrl(tab.url)) {
      throw new Error(`Cannot inject into system URL: ${tab.url}`)
    }

    // Пробуем инжектировать основной content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-script/index-legacy.js']
      })
      console.log(`[Background] Content script injected successfully into tab ${tabId}`)
    } catch (error) {
      console.log(`[Background] Failed to inject main script, trying fallback:`, error)
      
      // Fallback инжекция
      await chrome.scripting.executeScript({
        target: { tabId },
        func: createFallbackContentScript
      })
      console.log(`[Background] Fallback content script injected into tab ${tabId}`)
    }
  } catch (error) {
    console.error(`[Background] Failed to inject content script into tab ${tabId}:`, error)
    throw error
  }
}

// Проверка системных URL
function isSystemUrl(url: string): boolean {
  return [
    'chrome://',
    'chrome-extension://',
    'moz-extension://',
    'edge://',
    'about:',
    'data:',
    'file:',
    'devtools://'
  ].some(prefix => url.startsWith(prefix))
}

// Минимальный fallback content script
function createFallbackContentScript(): void {
  console.log('[Background:Fallback] Fallback content script loaded')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).webCheckContentScriptLoaded) {
    console.log('[Background:Fallback] Main content script already loaded')
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).webCheckContentScriptLoaded = true

  // Обработчик сообщений
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-explicit-any, @typescript-eslint/no-explicit-any
  chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (response?: any) => void): boolean => {
    console.log('[Background:Fallback] Received message:', message.action)

    if (message.action === 'ping') {
      sendResponse({ status: 'pong' })
      return true
    }

    if (message.action === 'activateElementSelection') {
      activateSimpleElementPicker()
      sendResponse({ status: 'activated' })
      return true
    }

    return false
  })

  function activateSimpleElementPicker(): void {
    // Простейший element picker
    let hoveredElement: Element | null = null

    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.3);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
    `

    const instructions = document.createElement('div')
    instructions.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 400px;
    `
    instructions.innerHTML = `
      <h3 style="margin-top: 0; color: #333;">Выберите элемент</h3>
      <p style="color: #666; margin-bottom: 20px;">Наведите курсор и кликните на элемент для отслеживания</p>
      <button id="webcheck-cancel" style="padding: 8px 16px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Отмена</button>
    `

    overlay.appendChild(instructions)
    document.body.appendChild(overlay)

    const style = document.createElement('style')
    style.textContent = `
      .webcheck-highlight {
        outline: 2px solid #4285f4 !important;
        outline-offset: 2px !important;
        background-color: rgba(66, 133, 244, 0.1) !important;
      }
    `
    document.head.appendChild(style)

    function handleMouseMove(e: MouseEvent): void {
      if (hoveredElement) {
        hoveredElement.classList.remove('webcheck-highlight')
      }

      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (target && !target.closest('div[style*="z-index: 2147483647"]')) {
        hoveredElement = target
        hoveredElement.classList.add('webcheck-highlight')
      }
    }

    function handleClick(e: MouseEvent): void {
      e.preventDefault()
      e.stopPropagation()

      if (hoveredElement && !hoveredElement.closest('div[style*="z-index: 2147483647"]')) {
        const rect = hoveredElement.getBoundingClientRect()
        const selector = hoveredElement.id 
          ? `#${hoveredElement.id}`
          : hoveredElement.tagName.toLowerCase() + 
            (hoveredElement.className ? `.${hoveredElement.className.split(' ').join('.')}` : '')

        const elementInfo = {
          selector,
          rect: {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset,
            width: rect.width,
            height: rect.height
          },
          html: hoveredElement.outerHTML.substring(0, 1000), // Ограничиваем размер
          pageTitle: document.title,
          pageUrl: window.location.href
        }

        chrome.runtime.sendMessage({
          action: 'captureElement',
          elementInfo
        })

        cleanup()
      }
    }

    function cleanup(): void {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
      if (hoveredElement) {
        hoveredElement.classList.remove('webcheck-highlight')
      }
      overlay.remove()
      style.remove()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)

    const cancelButton = document.getElementById('webcheck-cancel')
    if (cancelButton) {
      cancelButton.addEventListener('click', cleanup)
    }
    
    // Автоотмена через 30 секунд
    setTimeout(cleanup, 30000)
  }
}

// Утилита для задержки
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Обработка установки расширения
chrome.runtime.onInstalled.addListener(async (details: { reason: string }): Promise<void> => {
  console.log(`[Background] Extension installed, reason: ${details.reason}`)
  
  if (details.reason === 'install') {
    console.log('[Background] Web Check extension installed successfully')
  }
})

// Обработка запуска
chrome.runtime.onStartup.addListener((): void => {
  console.log('[Background] Extension startup')
})

console.log('[Background] Service worker initialized successfully')

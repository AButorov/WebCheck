import browser from 'webextension-polyfill'

/**
 * Offscreen Document для Web Check
 * Использует iframe для загрузки и парсинга веб-страниц без их отображения
 */

// Интерфейсы для сообщений
interface OffscreenMessage {
  target: string
  type: string
  requestId: string
  url?: string
  selector?: string
  content?: string
  error?: string
}

// Конфигурация
const OFFSCREEN_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 3,
  REQUEST_TIMEOUT: 30000,
  CONTENT_EXTRACTION_TIMEOUT: 10000,
  IFRAME_LOAD_TIMEOUT: 15000,
  MAX_CONTENT_SIZE: 1024 * 1024, // 1MB
}

// Хранилище активных запросов
const activeRequests = new Map<string, {
  iframe: HTMLIFrameElement
  timeoutId: number
  resolve: (content: string) => void
  reject: (error: Error) => void
}>()

// Контейнер для iframe'ов
let iframeContainer: HTMLElement

console.log('[Offscreen] Offscreen document initialized')

/**
 * Инициализация контейнера для iframe'ов
 */
function initializeIframeContainer(): void {
  iframeContainer = document.getElementById('offscreen-container') || document.body
  console.log('[Offscreen] Iframe container initialized')
}

/**
 * Обработчик сообщений от Service Worker
 */
browser.runtime.onMessage.addListener((message: OffscreenMessage, sender: unknown, sendResponse: (response?: unknown) => void): true => {
  console.log('[Offscreen] Получено сообщение:', message)

  // Проверяем, что сообщение предназначено для offscreen
  if (message.target !== 'offscreen') {
    return true
  }

  // Обрабатываем различные типы сообщений
  switch (message.type) {
    case 'EXTRACT_CONTENT':
      handleContentExtractionRequest(message)
        .then(content => {
          sendResponse({ 
            type: 'CONTENT_EXTRACTED', 
            requestId: message.requestId, 
            content 
          })
        })
        .catch(error => {
          console.error('[Offscreen] Ошибка извлечения контента:', error)
          sendResponse({ 
            type: 'CONTENT_EXTRACTED', 
            requestId: message.requestId, 
            error: error.message 
          })
        })
      break

    case 'CANCEL_REQUEST':
      handleCancelRequest(message.requestId)
      sendResponse({ type: 'REQUEST_CANCELLED', requestId: message.requestId })
      break

    default:
      console.warn('[Offscreen] Неизвестный тип сообщения:', message.type)
      sendResponse({ error: 'Неизвестный тип сообщения' })
  }

  return true // Указываем, что ответ будет отправлен асинхронно
})

/**
 * Обработка запроса на извлечение контента
 */
async function handleContentExtractionRequest(message: OffscreenMessage): Promise<string> {
  if (!message.url || !message.selector || !message.requestId) {
    throw new Error('Отсутствуют обязательные параметры: url, selector, requestId')
  }

  console.log(`[Offscreen] Начинаем извлечение контента с ${message.url}`)

  // Проверяем лимит одновременных запросов
  if (activeRequests.size >= OFFSCREEN_CONFIG.MAX_CONCURRENT_REQUESTS) {
    throw new Error(`Превышен лимит одновременных запросов (${OFFSCREEN_CONFIG.MAX_CONCURRENT_REQUESTS})`)
  }

  // Создаем и настраиваем iframe
  const iframe = createIframe(message.url)
  
  try {
    // Ждем загрузки страницы в iframe
    await waitForIframeLoad(iframe)
    
    // Извлекаем контент
    const content = await extractContentFromIframe(iframe, message.selector, message.requestId)
    
    console.log(`[Offscreen] Контент успешно извлечен (${content.length} символов)`)
    return content
    
  } finally {
    // Всегда очищаем iframe
    cleanupIframe(iframe, message.requestId)
  }
}

/**
 * Создание и настройка iframe
 */
function createIframe(url: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe')
  
  iframe.style.cssText = `
    position: absolute;
    left: -9999px;
    top: -9999px;
    width: 1024px;
    height: 768px;
    border: none;
    visibility: hidden;
  `
  
  iframe.src = url
  
  // Добавляем в контейнер
  if (!iframeContainer) {
    initializeIframeContainer()
  }
  iframeContainer.appendChild(iframe)
  
  console.log(`[Offscreen] Iframe создан для ${url}`)
  return iframe
}

/**
 * Ожидание загрузки iframe
 */
function waitForIframeLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Таймаут загрузки iframe'))
    }, OFFSCREEN_CONFIG.IFRAME_LOAD_TIMEOUT)

    const handleLoad = (): void => {
      clearTimeout(timeoutId)
      iframe.removeEventListener('load', handleLoad)
      iframe.removeEventListener('error', handleError)
      console.log('[Offscreen] Iframe загружен успешно')
      resolve()
    }

    const handleError = (): void => {
      clearTimeout(timeoutId)
      iframe.removeEventListener('load', handleLoad)
      iframe.removeEventListener('error', handleError)
      reject(new Error('Ошибка загрузки iframe'))
    }

    iframe.addEventListener('load', handleLoad)
    iframe.addEventListener('error', handleError)

    // Если iframe уже загружен
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad()
    }
  })
}

/**
 * Извлечение контента из iframe через postMessage
 */
function extractContentViaPostMessage(
  iframe: HTMLIFrameElement, 
  selector: string, 
  requestId: string, 
  timeoutId: number,
  resolve: (content: string) => void,
  reject: (error: Error) => void
): void {
  console.log('[Offscreen] Используем postMessage для извлечения контента')

  const messageHandler = (event: MessageEvent): void => {
    // Проверяем источник сообщения
    if (event.source !== iframe.contentWindow) {
      return
    }

    if (event.data.type === 'CONTENT_EXTRACTED' && event.data.requestId === requestId) {
      console.log('[Offscreen] Получен контент через postMessage')
      clearTimeout(timeoutId)
      window.removeEventListener('message', messageHandler)
      
      if (event.data.error) {
        reject(new Error(event.data.error))
      } else {
        resolve(event.data.content || '')
      }
    }
  }

  window.addEventListener('message', messageHandler)

  // Отправляем сообщение в iframe
  try {
    iframe.contentWindow?.postMessage({
      type: 'EXTRACT_CONTENT',
      selector,
      requestId
    }, '*')
  } catch (error) {
    clearTimeout(timeoutId)
    window.removeEventListener('message', messageHandler)
    reject(new Error(`Ошибка отправки сообщения в iframe: ${error}`))
  }
}

/**
 * Извлечение контента из iframe напрямую
 */
function extractContentFromIframe(iframe: HTMLIFrameElement, selector: string, requestId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Таймаут извлечения контента'))
    }, OFFSCREEN_CONFIG.CONTENT_EXTRACTION_TIMEOUT)

    try {
      // Поскольку iframe загружается в offscreen-документе,
      // мы можем получить доступ к его содержимому
      // если iframe и offscreen-документ находятся в одном домене

      // Пробуем получить доступ к contentDocument
      let iframeDocument: Document | null
      try {
        iframeDocument = iframe.contentDocument || iframe.contentWindow?.document || null
      } catch (error) {
        // Если нет доступа из-за CORS, используем postMessage
        console.warn('[Offscreen] No direct access to iframe content, using postMessage')
        return extractContentViaPostMessage(iframe, selector, requestId, timeoutId, resolve, reject)
      }

      if (!iframeDocument) {
        clearTimeout(timeoutId)
        reject(new Error('Не удалось получить доступ к документу iframe'))
        return
      }

      console.log('[Offscreen] Direct access to iframe document available')

      // Проверяем, что документ загружен
      if (iframeDocument.readyState !== 'complete') {
        console.log('[Offscreen] Ожидаем полной загрузки документа в iframe')
        iframeDocument.addEventListener('readystatechange', () => {
          if (iframeDocument?.readyState === 'complete') {
            performContentExtraction(iframeDocument, selector, timeoutId, resolve, reject)
          }
        })
      } else {
        performContentExtraction(iframeDocument, selector, timeoutId, resolve, reject)
      }

    } catch (error) {
      clearTimeout(timeoutId)
      reject(new Error(`Ошибка при извлечении контента: ${error}`))
    }
  })
}

/**
 * Выполнение извлечения контента
 */
function performContentExtraction(
  document: Document, 
  selector: string, 
  timeoutId: number,
  resolve: (content: string) => void,
  reject: (error: Error) => void
): void {
  try {
    console.log(`[Offscreen] Ищем элемент по селектору: ${selector}`)

    let element: Element | null = null
    
    // Пробуем найти элемент разными способами
    try {
      element = document.querySelector(selector)
    } catch (selectorError) {
      console.warn('[Offscreen] Ошибка селектора, пробуем альтернативные методы:', selectorError)
      
      // Пробуем по ID
      if (selector.startsWith('#')) {
        const id = selector.substring(1)
        element = document.getElementById(id)
      }
      // Пробуем по классу
      else if (selector.startsWith('.')) {
        const className = selector.substring(1)
        const elements = document.getElementsByClassName(className)
        element = elements.length > 0 ? elements[0] : null
      }
      // Пробуем по тегу
      else {
        const elements = document.getElementsByTagName(selector)
        element = elements.length > 0 ? elements[0] : null
      }
    }

    clearTimeout(timeoutId)

    if (!element) {
      reject(new Error(`Элемент не найден по селектору: ${selector}`))
      return
    }

    console.log('[Offscreen] Элемент найден, извлекаем контент')
    
    // Извлекаем контент
    let content = element.outerHTML
    
    // Проверяем размер контента
    if (content.length > OFFSCREEN_CONFIG.MAX_CONTENT_SIZE) {
      console.warn(`[Offscreen] Контент слишком большой (${content.length} символов), обрезаем`)
      content = content.substring(0, OFFSCREEN_CONFIG.MAX_CONTENT_SIZE) + '...[TRUNCATED]'
    }

    console.log(`[Offscreen] Контент извлечен успешно (${content.length} символов)`)
    resolve(content)

  } catch (error) {
    clearTimeout(timeoutId)
    reject(new Error(`Ошибка при извлечении контента: ${error}`))
  }
}

/**
 * Отмена активного запроса
 */
function handleCancelRequest(requestId: string): void {
  const request = activeRequests.get(requestId)
  if (request) {
    console.log(`[Offscreen] Отменяем запрос ${requestId}`)
    clearTimeout(request.timeoutId)
    cleanupIframe(request.iframe, requestId)
    request.reject(new Error('Запрос отменен'))
  }
}

/**
 * Очистка iframe и связанных ресурсов
 */
function cleanupIframe(iframe: HTMLIFrameElement, requestId: string): void {
  try {
    // Удаляем из активных запросов
    const request = activeRequests.get(requestId)
    if (request) {
      clearTimeout(request.timeoutId)
      activeRequests.delete(requestId)
    }

    // Удаляем iframe из DOM
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }

    console.log(`[Offscreen] Iframe для запроса ${requestId} очищен`)
  } catch (error) {
    console.error('[Offscreen] Ошибка при очистке iframe:', error)
  }
}

/**
 * Периодическая очистка старых iframe'ов
 */
function setupPeriodicCleanup(): void {
  setInterval(() => {
    const now = Date.now()
    const requestsToCleanup: string[] = []

    activeRequests.forEach((request, requestId) => {
      // Удаляем запросы старше 5 минут
      if (now - parseInt(requestId.split('_')[1] || '0') > 5 * 60 * 1000) {
        requestsToCleanup.push(requestId)
      }
    })

    requestsToCleanup.forEach(requestId => {
      console.log(`[Offscreen] Принудительная очистка старого запроса: ${requestId}`)
      handleCancelRequest(requestId)
    })

    // Очищаем потерянные iframe'ы
    const iframes = iframeContainer?.querySelectorAll('iframe') || []
    if (iframes.length > activeRequests.size) {
      console.log(`[Offscreen] Найдено ${iframes.length - activeRequests.size} потерянных iframe'ов`)
      // Удаляем iframe'ы, которых нет в activeRequests
      Array.from(iframes).forEach(iframe => {
        const hasActiveRequest = Array.from(activeRequests.values()).some(req => req.iframe === iframe)
        if (!hasActiveRequest) {
          iframe.remove()
        }
      })
    }

  }, 60000) // Каждую минуту
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  initializeIframeContainer()
  setupPeriodicCleanup()
  console.log('[Offscreen] Offscreen document готов к работе')
})

// Fallback инициализация, если DOM уже загружен
if (document.readyState === 'loading') {
  // DOM еще загружается, ждем DOMContentLoaded
} else {
  // DOM уже загружен
  initializeIframeContainer()
  setupPeriodicCleanup()
  console.log('[Offscreen] Offscreen document готов к работе (immediate)')
}

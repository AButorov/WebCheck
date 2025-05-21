/**
 * Offscreen Document для WebCheck
 * Обрабатывает проверку изменений на веб-страницах в невидимом режиме
 * Используется для Manifest V3 с целью замены временных видимых вкладок
 */

// Константы для работы offscreen-документа
const OFFSCREEN_CONFIG = {
  IFRAME_LOAD_TIMEOUT: 15000, // 15 секунд на загрузку iframe
  CONTENT_EXTRACTION_TIMEOUT: 10000, // 10 секунд на извлечение контента
  MAX_CONCURRENT_IFRAMES: 1, // Максимальное количество одновременных iframe
  CLEANUP_DELAY: 1000 // Задержка перед удалением iframe
}

// Хранилище активных iframe
const activeIframes = new Map()
let iframeCounter = 0

/**
 * Обработчик сообщений от Service Worker
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] Получено сообщение:', message)
  
  // Проверяем, что сообщение предназначено для offscreen
  if (message.target !== 'offscreen') {
    return false
  }
  
  // Обрабатываем различные типы сообщений
  switch (message.type) {
    case 'PROCESS_URL':
      handleUrlProcessing(message, sendResponse)
      return true // Указываем, что будем отвечать асинхронно
      
    case 'PING':
      sendResponse({ status: 'alive' })
      return false
      
    default:
      console.warn('[Offscreen] Неизвестный тип сообщения:', message.type)
      sendResponse({ error: 'Unknown message type' })
      return false
  }
})

/**
 * Обработка запроса на проверку URL
 */
async function handleUrlProcessing(message, sendResponse) {
  const { url, selector, requestId } = message
  
  if (!url || !selector) {
    sendResponse({ 
      error: 'Отсутствуют обязательные параметры: url или selector',
      requestId 
    })
    return
  }
  
  console.log(`[Offscreen] Начинаем обработку URL: ${url}, селектор: ${selector}`)
  
  try {
    // Создаем iframe для загрузки страницы
    const iframe = await createIframe(url, requestId)
    
    // Ожидаем загрузки iframe
    await waitForIframeLoad(iframe)
    
    // Извлекаем контент с помощью content script
    const content = await extractContentFromIframe(iframe, selector, requestId)
    
    // Отправляем результат
    sendResponse({
      success: true,
      content,
      requestId,
      timestamp: Date.now()
    })
    
  } catch (error) {
    console.error('[Offscreen] Ошибка при обработке URL:', error)
    sendResponse({
      error: error.message,
      requestId,
      timestamp: Date.now()
    })
  } finally {
    // Очищаем iframe через некоторое время
    setTimeout(() => {
      cleanupIframe(requestId)
    }, OFFSCREEN_CONFIG.CLEANUP_DELAY)
  }
}

/**
 * Создание iframe для загрузки страницы
 */
function createIframe(url, requestId) {
  return new Promise((resolve, reject) => {
    // Проверяем лимит одновременных iframe
    if (activeIframes.size >= OFFSCREEN_CONFIG.MAX_CONCURRENT_IFRAMES) {
      reject(new Error('Превышен лимит одновременных iframe'))
      return
    }
    
    const iframe = document.createElement('iframe')
    const iframeId = `iframe_${requestId}_${++iframeCounter}`
    
    // Настройка iframe
    iframe.id = iframeId
    iframe.src = url
    iframe.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 1px;
      height: 1px;
      border: none;
      visibility: hidden;
    `
    
    // Настройка атрибутов для безопасности
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
    
    // Добавляем в хранилище
    activeIframes.set(requestId, {
      iframe,
      iframeId,
      url,
      createdAt: Date.now()
    })
    
    // Добавляем в DOM
    const container = document.getElementById('offscreen-container')
    container.appendChild(iframe)
    
    console.log(`[Offscreen] Создан iframe ${iframeId} для URL: ${url}`)
    resolve(iframe)
  })
}

/**
 * Ожидание загрузки iframe
 */
function waitForIframeLoad(iframe) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Таймаут загрузки iframe'))
    }, OFFSCREEN_CONFIG.IFRAME_LOAD_TIMEOUT)
    
    iframe.onload = () => {
      clearTimeout(timeout)
      console.log('[Offscreen] Iframe успешно загружен')
      resolve()
    }
    
    iframe.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('Ошибка загрузки iframe'))
    }
  })
}

/**
 * Извлечение контента из iframe с помощью content script
 */
function extractContentFromIframe(iframe, selector, requestId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Таймаут извлечения контента'))
    }, OFFSCREEN_CONFIG.CONTENT_EXTRACTION_TIMEOUT)
    
    // Слушатель ответа от content script
    const messageListener = (message, sender, sendResponse) => {
      if (message.target === 'offscreen' && 
          message.type === 'CONTENT_EXTRACTED' && 
          message.requestId === requestId) {
        
        clearTimeout(timeout)
        chrome.runtime.onMessage.removeListener(messageListener)
        
        if (message.error) {
          reject(new Error(message.error))
        } else {
          resolve(message.content)
        }
      }
    }
    
    chrome.runtime.onMessage.addListener(messageListener)
    
    // Отправляем сообщение content script'у для извлечения контента
    // Примечание: это будет работать через Service Worker, который перенаправит сообщение
    chrome.runtime.sendMessage({
      target: 'content_script',
      type: 'EXTRACT_CONTENT',
      selector,
      requestId,
      tabId: undefined // Будет определен в Service Worker
    }).catch(error => {
      clearTimeout(timeout)
      chrome.runtime.onMessage.removeListener(messageListener)
      reject(new Error(`Ошибка отправки сообщения в content script: ${error.message}`))
    })
  })
}

/**
 * Очистка iframe
 */
function cleanupIframe(requestId) {
  const iframeData = activeIframes.get(requestId)
  
  if (iframeData) {
    try {
      const { iframe, iframeId } = iframeData
      
      // Удаляем iframe из DOM
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe)
      }
      
      // Удаляем из хранилища
      activeIframes.delete(requestId)
      
      console.log(`[Offscreen] Очищен iframe ${iframeId}`)
    } catch (error) {
      console.error('[Offscreen] Ошибка при очистке iframe:', error)
    }
  }
}

/**
 * Периодическая очистка старых iframe
 */
setInterval(() => {
  const now = Date.now()
  const maxAge = 30000 // 30 секунд
  
  for (const [requestId, iframeData] of activeIframes.entries()) {
    if (now - iframeData.createdAt > maxAge) {
      console.log(`[Offscreen] Принудительная очистка старого iframe: ${iframeData.iframeId}`)
      cleanupIframe(requestId)
    }
  }
}, 10000) // Проверяем каждые 10 секунд

// Лог инициализации
console.log('[Offscreen] Offscreen document инициализирован')
console.log('[Offscreen] Конфигурация:', OFFSCREEN_CONFIG)
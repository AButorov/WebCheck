/**
 * Offscreen Document для WebCheck
 * Обрабатывает проверку изменений на веб-страницах в невидимом режиме
 * Используется для Manifest V3 с целью замены временных видимых вкладок
 */

// Константы для работы offscreen-документа
const OFFSCREEN_CONFIG = {
  IFRAME_LOAD_TIMEOUT: 20000, // 20 секунд на загрузку iframe
  CONTENT_EXTRACTION_TIMEOUT: 15000, // 15 секунд на извлечение контента
  MAX_CONCURRENT_IFRAMES: 1, // Максимальное количество одновременных iframe
  CLEANUP_DELAY: 2000, // Задержка перед удалением iframe
  MAX_RETRY_ATTEMPTS: 2, // Максимальное количество попыток повтора
  RETRY_DELAY: 1000 // Задержка между попытками
}

// Хранилище активных iframe
const activeIframes = new Map()
let iframeCounter = 0

// Статистика offscreen-документа
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  timeouts: 0,
  averageProcessingTime: 0,
  startTime: Date.now()
}

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
      sendResponse({ 
        status: 'alive',
        uptime: Date.now() - stats.startTime,
        stats: { ...stats }
      })
      return false
      
    case 'GET_STATS':
      sendResponse({
        status: 'alive',
        stats: { ...stats },
        activeIframes: activeIframes.size,
        config: { ...OFFSCREEN_CONFIG }
      })
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
  const startTime = Date.now()
  
  // Обновляем статистику
  stats.totalRequests++
  
  if (!url || !selector) {
    stats.failedRequests++
    sendResponse({ 
      error: 'Отсутствуют обязательные параметры: url или selector',
      requestId 
    })
    return
  }
  
  console.log(`[Offscreen] Начинаем обработку URL: ${url}, селектор: ${selector}`)
  
  let attempt = 0
  let lastError = null
  
  while (attempt < OFFSCREEN_CONFIG.MAX_RETRY_ATTEMPTS) {
    try {
      attempt++
      console.log(`[Offscreen] Попытка ${attempt}/${OFFSCREEN_CONFIG.MAX_RETRY_ATTEMPTS} для ${url}`)
      
      // Создаем iframe для загрузки страницы
      const iframe = await createIframe(url, `${requestId}_${attempt}`)
      
      // Ожидаем загрузки iframe
      await waitForIframeLoad(iframe)
      
      // Извлекаем контент
      const content = await extractContentFromIframe(iframe, selector, requestId)
      
      // Успешный результат
      const processingTime = Date.now() - startTime
      updateStats(processingTime, true)
      
      sendResponse({
        success: true,
        content,
        requestId,
        timestamp: Date.now(),
        processingTime,
        attempt
      })
      
      // Очищаем iframe
      setTimeout(() => cleanupIframe(`${requestId}_${attempt}`), OFFSCREEN_CONFIG.CLEANUP_DELAY)
      return
      
    } catch (error) {
      lastError = error
      console.error(`[Offscreen] Ошибка в попытке ${attempt}:`, error)
      
      // Очищаем iframe при ошибке
      cleanupIframe(`${requestId}_${attempt}`)
      
      // Если это не последняя попытка, делаем паузу
      if (attempt < OFFSCREEN_CONFIG.MAX_RETRY_ATTEMPTS) {
        await delay(OFFSCREEN_CONFIG.RETRY_DELAY)
      }
    }
  }
  
  // Все попытки исчерпаны
  const processingTime = Date.now() - startTime
  updateStats(processingTime, false)
  
  console.error(`[Offscreen] Все попытки исчерпаны для ${url}`)
  sendResponse({
    error: lastError ? lastError.message : 'Неизвестная ошибка',
    requestId,
    timestamp: Date.now(),
    processingTime,
    totalAttempts: attempt
  })
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
    
    // Инжектируем скрипт для postMessage обмена (для CORS случаев)
    const script = document.createElement('script')
    script.textContent = `
      (function() {
        console.log('[WebCheck:iframe] Content extraction script loaded');
        
        // Обработчик postMessage
        window.addEventListener('message', function(event) {
          if (event.data.type === 'EXTRACT_CONTENT') {
            console.log('[WebCheck:iframe] Extract content request received:', event.data.selector);
            
            try {
              const selector = event.data.selector;
              const requestId = event.data.requestId;
              
              // Поиск элемента
              let element = document.querySelector(selector);
              
              // Альтернативные стратегии поиска
              if (!element) {
                if (selector.includes('.')) {
                  const className = selector.split('.').pop()?.trim();
                  if (className) {
                    const alternatives = document.getElementsByClassName(className);
                    if (alternatives.length > 0) {
                      element = alternatives[0];
                    }
                  }
                } else if (selector.includes('#')) {
                  const idName = selector.split('#').pop()?.trim();
                  if (idName) {
                    const elements = document.querySelectorAll('[id*="' + idName + '"]');
                    if (elements.length > 0) {
                      element = elements[0];
                    }
                  }
                }
              }
              
              if (element) {
                const content = element.outerHTML;
                event.source.postMessage({
                  type: 'CONTENT_EXTRACTED',
                  requestId: requestId,
                  content: content
                }, '*');
                console.log('[WebCheck:iframe] Content extracted and sent');
              } else {
                event.source.postMessage({
                  type: 'CONTENT_EXTRACTED',
                  requestId: requestId,
                  error: 'Element not found with selector: ' + selector
                }, '*');
                console.warn('[WebCheck:iframe] Element not found');
              }
            } catch (error) {
              event.source.postMessage({
                type: 'CONTENT_EXTRACTED',
                requestId: event.data.requestId,
                error: error.message
              }, '*');
              console.error('[WebCheck:iframe] Error extracting content:', error);
            }
          }
        });
        
        console.log('[WebCheck:iframe] Ready to receive extract content requests');
      })();
    `
    
    // Добавляем в DOM
    const container = document.getElementById('offscreen-container')
    container.appendChild(iframe)
    
    // Пытаемся инжектировать скрипт после загрузки iframe
    iframe.onload = () => {
      try {
        // Пробуем инжектировать скрипт напрямую
        if (iframe.contentDocument) {
          iframe.contentDocument.head.appendChild(script)
          console.log(`[Offscreen] Script injected directly into iframe ${iframeId}`)
        }
      } catch (error) {
        // Ошибка CORS - это нормально, postMessage будет работать в любом случае
        console.log(`[Offscreen] Cannot inject script directly due to CORS, will use postMessage only`)
      }
    }
    
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
 * Извлечение контента из iframe напрямую
 */
function extractContentFromIframe(iframe, selector, requestId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Таймаут извлечения контента'))
    }, OFFSCREEN_CONFIG.CONTENT_EXTRACTION_TIMEOUT)
    
    try {
      // Поскольку iframe загружается в offscreen-документе,
      // мы можем получить доступ к его содержимому
      // если iframe и offscreen-документ находятся в одном домене
      
      // Пробуем получить доступ к contentDocument
      let iframeDocument
      try {
        iframeDocument = iframe.contentDocument || iframe.contentWindow?.document
      } catch (error) {
        // Если нет доступа из-за CORS, используем postMessage
        console.warn('[Offscreen] No direct access to iframe content, using postMessage')
        return extractContentViaPostMessage(iframe, selector, requestId, timeout, resolve, reject)
      }
      
      if (!iframeDocument) {
        reject(new Error('Не удалось получить доступ к документу iframe'))
        return
      }
      
      console.log('[Offscreen] Direct access to iframe document available')
      
      // Проверяем, что документ загружен
      if (iframeDocument.readyState !== 'complete') {
        console.log('[Offscreen] Waiting for iframe document to complete loading')
        
        const loadListener = () => {
          iframeDocument.removeEventListener('readystatechange', loadListener)
          extractFromDocument(iframeDocument, selector, resolve, reject)
        }
        
        iframeDocument.addEventListener('readystatechange', loadListener)
        
        // Дополнительная проверка через несколько секунд
        setTimeout(() => {
          if (iframeDocument.readyState === 'complete') {
            iframeDocument.removeEventListener('readystatechange', loadListener)
            extractFromDocument(iframeDocument, selector, resolve, reject)
          }
        }, 2000)
      } else {
        console.log('[Offscreen] iframe document already loaded')
        extractFromDocument(iframeDocument, selector, resolve, reject)
      }
      
      clearTimeout(timeout)
      
    } catch (error) {
      clearTimeout(timeout)
      console.error('[Offscreen] Error in extractContentFromIframe:', error)
      reject(error)
    }
  })
}

/**
 * Извлечение контента из документа
 */
function extractFromDocument(document, selector, resolve, reject) {
  try {
    console.log(`[Offscreen] Extracting content with selector: ${selector}`)
    
    // Пробуем найти элемент по основному селектору
    let element = document.querySelector(selector)
    
    // Если не найден, пробуем альтернативные варианты
    if (!element) {
      console.log('[Offscreen] Primary selector failed, trying alternatives')
      
      if (selector.includes('.')) {
        const className = selector.split('.').pop()?.trim()
        if (className) {
          const alternatives = document.getElementsByClassName(className)
          if (alternatives.length > 0) {
            element = alternatives[0]
            console.log('[Offscreen] Found element by class name')
          }
        }
      } else if (selector.includes('#')) {
        const idName = selector.split('#').pop()?.trim()
        if (idName) {
          const elements = document.querySelectorAll(`[id*='${idName}']`)
          if (elements.length > 0) {
            element = elements[0]
            console.log('[Offscreen] Found element by partial ID match')
          }
        }
      }
      
      // Последняя попытка - по имени тега
      if (!element && selector.match(/^[a-z]+(\.|\[)/i)) {
        const tagName = selector.match(/^[a-z]+/i)?.[0]
        if (tagName) {
          const elements = document.getElementsByTagName(tagName)
          if (elements.length > 0) {
            element = elements[0]
            console.log('[Offscreen] Found element by tag name')
          }
        }
      }
    }
    
    if (!element) {
      reject(new Error(`Element not found with selector: ${selector}`))
      return
    }
    
    const content = element.outerHTML
    console.log(`[Offscreen] Successfully extracted content (${content.length} characters)`)
    resolve(content)
    
  } catch (error) {
    console.error('[Offscreen] Error extracting from document:', error)
    reject(error)
  }
}

/**
 * Извлечение контента через postMessage (для CORS-ограниченных iframe)
 */
function extractContentViaPostMessage(iframe, selector, requestId, timeout, resolve, reject) {
  console.log('[Offscreen] Using postMessage approach for content extraction')
  
  // Слушатель ответов от iframe
  const messageListener = (event) => {
    if (event.source === iframe.contentWindow && event.data.type === 'CONTENT_EXTRACTED' && event.data.requestId === requestId) {
      clearTimeout(timeout)
      window.removeEventListener('message', messageListener)
      
      if (event.data.error) {
        reject(new Error(event.data.error))
      } else {
        resolve(event.data.content)
      }
    }
  }
  
  window.addEventListener('message', messageListener)
  
  // Отправляем сообщение в iframe
  iframe.contentWindow.postMessage({
    type: 'EXTRACT_CONTENT',
    selector,
    requestId
  }, '*')
  
  console.log('[Offscreen] PostMessage sent to iframe')
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
}, 15000) // Проверяем каждые 15 секунд

/**
 * Обновление статистики
 */
function updateStats(processingTime, success) {
  if (success) {
    stats.successfulRequests++
  } else {
    stats.failedRequests++
  }
  
  // Обновляем среднее время обработки
  const totalRequests = stats.successfulRequests + stats.failedRequests
  if (totalRequests === 1) {
    stats.averageProcessingTime = processingTime
  } else {
    // Скользящее среднее
    stats.averageProcessingTime = Math.round(
      (stats.averageProcessingTime * 0.8) + (processingTime * 0.2)
    )
  }
}

/**
 * Функция задержки
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Обработка таймаутов
 */
function handleTimeout(requestId, operation) {
  stats.timeouts++
  console.warn(`[Offscreen] Timeout для ${operation}, requestId: ${requestId}`)
}

/**
 * Очистка всех активных iframe (для экстренных случаев)
 */
function cleanupAllIframes() {
  console.log('[Offscreen] Cleaning up all active iframes')
  
  for (const [requestId, iframeData] of activeIframes.entries()) {
    try {
      const { iframe } = iframeData
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe)
      }
    } catch (error) {
      console.error('[Offscreen] Error cleaning up iframe:', error)
    }
  }
  
  activeIframes.clear()
  console.log('[Offscreen] All iframes cleaned up')
}

// Периодическая принудительная очистка всех iframe (safety net)
setInterval(() => {
  if (activeIframes.size > 5) {
    console.warn('[Offscreen] Too many active iframes, forcing cleanup')
    cleanupAllIframes()
  }
}, 60000) // Каждую минуту

// Лог инициализации
console.log('[Offscreen] Offscreen document инициализирован')
console.log('[Offscreen] Конфигурация:', OFFSCREEN_CONFIG)
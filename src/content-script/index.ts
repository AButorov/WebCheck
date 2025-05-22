import browser from 'webextension-polyfill'
import { onMessage, sendMessage } from 'webext-bridge/content-script'
import { MessagePayloads } from '~/types/messages'

// Показываем, что скрипт загружен
console.log('[WebCheck:ContentScript] Content script loaded and ready');

// Отслеживаем активацию селектора элементов (для обратной совместимости)
onMessage('activate-selector', async () => {
  console.log('[WebCheck:ContentScript] Element selector activated via bridge');
  
  // Включаем режим выбора элемента
  activateElementSelector()
})

// Функция для активации селектора элементов
function activateElementSelector() {
  // Проверяем, не активировался ли уже модуль picker
  const pickerActive = document.querySelector('.webcheck-overlay');
  if (pickerActive) {
    console.log('[WebCheck:ContentScript] Picker overlay already exists, not initializing again');
    return;
  }
  
  // Текущий выбранный элемент
  let selectedElement: Element | null = null
  let hoveredElement: Element | null = null
  
  // Создаем выделение для наведенного элемента
  const highlighter = document.createElement('div')
  highlighter.style.position = 'absolute'
  highlighter.style.border = '2px solid #3e66fb'
  highlighter.style.backgroundColor = 'rgba(62, 102, 251, 0.1)'
  highlighter.style.pointerEvents = 'none'
  highlighter.style.zIndex = '10000'
  highlighter.style.display = 'none'
  document.body.appendChild(highlighter)
  
  // Инструкция для пользователя
  const instructions = document.createElement('div')
  instructions.style.position = 'fixed'
  instructions.style.top = '10px'
  instructions.style.left = '50%'
  instructions.style.transform = 'translateX(-50%)'
  instructions.style.backgroundColor = '#fff'
  instructions.style.border = '1px solid #ddd'
  instructions.style.borderRadius = '4px'
  instructions.style.padding = '10px'
  instructions.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
  instructions.style.zIndex = '10001'
  instructions.style.fontSize = '14px'
  instructions.innerHTML = 'Кликните на элемент для отслеживания. <button id="cancel-selection">Отмена</button>'
  document.body.appendChild(instructions)
  
  // Обработчик отмены выбора
  document.getElementById('cancel-selection')?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    cleanup()
  })
  
  // Обработчик движения мыши для подсветки элементов
  function handleMouseMove(e: MouseEvent) {
    // Получаем элемент под курсором, пропуская наши созданные элементы
    const target = document.elementFromPoint(e.clientX, e.clientY)
    if (!target || target === highlighter || target === instructions || instructions.contains(target)) {
      highlighter.style.display = 'none'
      hoveredElement = null
      return
    }
    
    hoveredElement = target
    
    // Обновляем позицию и размер подсветки
    const rect = target.getBoundingClientRect()
    highlighter.style.left = `${rect.left + window.scrollX}px`
    highlighter.style.top = `${rect.top + window.scrollY}px`
    highlighter.style.width = `${rect.width}px`
    highlighter.style.height = `${rect.height}px`
    highlighter.style.display = 'block'
  }
  
  // Обработчик клика для выбора элемента
  function handleClick(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    if (hoveredElement) {
      selectedElement = hoveredElement
      
      // Получаем необходимую информацию о выбранном элементе
      const html = selectedElement.outerHTML
      const rect = selectedElement.getBoundingClientRect()
      
      // Генерируем CSS-селектор для выбранного элемента
      const selector = generateSelector(selectedElement)
      
      // Создаем объект с информацией об элементе
      const elementInfo = {
        selector,
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
          x: rect.x,
          y: rect.y,
          bottom: rect.bottom,
          right: rect.right
        },
        html,
        pageTitle: document.title,
        pageUrl: window.location.href,
        faviconUrl: getFaviconUrl()
      };
      
      // Отправляем данные в background script
      try {
        chrome.runtime.sendMessage({
          action: 'captureElement',
          elementInfo
        });
        console.log('[WebCheck:ContentScript] Capture element message sent:', selector);
      } catch (error) {
        console.error('[WebCheck:ContentScript] Error sending capture message:', error);
        
        // Пробуем отправить через webext-bridge как запасной вариант
        sendMessage('element-selected', {
          selector,
          html,
          title: document.title,
          url: window.location.href,
          faviconUrl: getFaviconUrl(),
          position: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }
        }, { context: 'popup', tabId: -1 }).catch(console.error)
      }
      
      // Очищаем DOM после выбора
      cleanup()
    }
  }
  
  // Очистка DOM-элементов
  function cleanup() {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('click', handleClick)
    highlighter.remove()
    instructions.remove()
    
    // Сообщаем, что выбор был отменен
    try {
      chrome.runtime.sendMessage({ action: 'cancelElementSelection' });
      console.log('[WebCheck:ContentScript] Cancel element selection message sent');
    } catch (error) {
      console.error('[WebCheck:ContentScript] Error sending cancellation message:', error);
      
      // Пробуем отправить через webext-bridge как запасной вариант
      sendMessage('element-selection-cancelled', null, { context: 'popup', tabId: -1 }).catch(console.error)
    }
  }
  
  // Получение URL иконки сайта
  function getFaviconUrl(): string {
    const links = document.querySelectorAll('link[rel*="icon"]')
    if (links.length > 0) {
      // Берем последнюю иконку (обычно она имеет наивысший приоритет)
      const link = links[links.length - 1] as HTMLLinkElement
      if (link.href) {
        return link.href
      }
    }
    
    // Стандартный путь к иконке
    return new URL('/favicon.ico', window.location.origin).href
  }
  
  // Генерация CSS-селектора для элемента
  function generateSelector(el: Element): string {
    if (el.id) {
      return `#${el.id}`
    }
    
    // Если нет id, создаем селектор по пути к элементу
    let path = ''
    let current = el
    
    while (current !== document.body && current.parentElement) {
      let selector = current.tagName.toLowerCase()
      
      // Добавляем классы (первые 2 для уникальности)
      if (current.classList.length > 0) {
        const classNames = Array.from(current.classList).slice(0, 2)
        selector += `.${classNames.join('.')}`
      }
      
      path = path ? `${selector} > ${path}` : selector
      current = current.parentElement
    }
    
    return path
  }
  
  // Добавляем обработчики событий
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('click', handleClick)
}

// Проверка изменений для конкретной задачи
onMessage('check-element', async (message) => {
  const { data } = message
  const { taskId, selector } = data as MessagePayloads['check-element']
  
  // Ищем элемент по селектору
  const element = document.querySelector(selector)
  
  if (element) {
    // Получаем текущий HTML элемента
    const currentHtml = element.outerHTML
    
    // Отправляем результат в фоновый скрипт
    return {
      taskId,
      html: currentHtml,
    }
  }
  
  return {
    taskId,
    error: 'Element not found',
  }
})

// Обработчик сообщений от background script и popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[WebCheck:ContentScript] Received message:', message.action || message.type);
  
  // Обработка ping-сообщения для проверки доступности content script
  if (message.action === 'ping') {
    console.log('[WebCheck:ContentScript] Ping received, sending pong');
    sendResponse({ status: 'pong' });
    return true;
  }
  
  // Обработка запроса на извлечение контента от offscreen-документа
  if (message.target === 'content_script' && message.type === 'EXTRACT_CONTENT') {
    console.log('[WebCheck:ContentScript] Extract content request received:', message);
    
    try {
      const element = findElementBySelectorAdvanced(message.selector);
      
      if (element) {
        const content = element.outerHTML;
        
        // Отправляем результат обратно в offscreen
        chrome.runtime.sendMessage({
          target: 'offscreen',
          type: 'CONTENT_EXTRACTED',
          requestId: message.requestId,
          content: content
        });
        
        console.log('[WebCheck:ContentScript] Content extracted and sent to offscreen');
      } else {
        // Отправляем ошибку
        chrome.runtime.sendMessage({
          target: 'offscreen',
          type: 'CONTENT_EXTRACTED',
          requestId: message.requestId,
          error: `Element not found with selector: ${message.selector}`
        });
        
        console.warn('[WebCheck:ContentScript] Element not found:', message.selector);
      }
      
    } catch (error) {
      console.error('[WebCheck:ContentScript] Error extracting content:', error);
      
      // Отправляем ошибку
      chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'CONTENT_EXTRACTED',
        requestId: message.requestId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    return true;
  }
  
  // Перенаправление к activateElementPicker в element-picker, если он есть
  if (message.action === 'activateElementPicker') {
    console.log('[WebCheck:ContentScript] Received activateElementPicker message, redirecting to element-picker');
    // В основном content_script не активируем выбор элемента,
    // т.к. эта функциональность должна быть в element-picker/index.js
    // но делаем резервную обработку
    if (window.hasOwnProperty('initElementPicker')) {
      console.log('[WebCheck:ContentScript] element-picker already available');
      sendResponse({ status: 'already_initialized' });
    } else {
      console.log('[WebCheck:ContentScript] Fallback to built-in picker');
      activateElementSelector();
      sendResponse({ status: 'activated_fallback' });
    }
    return true;
  }
  
  return false; // Не обрабатываем другие сообщения
});

// Функция для поиска элемента по селектору с альтернативными стратегиями
function findElementBySelectorAdvanced(selector: string): Element | null {
  // Пробуем найти элемент по основному селектору
  let element = document.querySelector(selector);
  
  // Если не найден, пробуем альтернативные варианты
  if (!element) {
    // Попробуем найти по частичному соответствию классов
    if (selector.includes('.')) {
      const className = selector.split('.').pop()?.trim();
      if (className) {
        const alternatives = document.getElementsByClassName(className);
        if (alternatives.length > 0) {
          element = alternatives[0];
        }
      }
    } else if (selector.includes('#')) {
      // Попробуем найти элементы с похожим id
      const idName = selector.split('#').pop()?.trim();
      if (idName) {
        const elements = document.querySelectorAll(`[id*='${idName}']`);
        if (elements.length > 0) {
          element = elements[0];
        }
      }
    }
    
    // Если все еще не нашли и селектор выглядит как имя тега
    if (!element && selector.match(/^[a-z]+(\.|\[)/i)) {
      const tagName = selector.match(/^[a-z]+/i)?.[0];
      if (tagName) {
        const elements = document.getElementsByTagName(tagName);
        if (elements.length > 0) {
          element = elements[0];
        }
      }
    }
  }
  
  return element;
}

console.log('[WebCheck:ContentScript] Core content script initialized');

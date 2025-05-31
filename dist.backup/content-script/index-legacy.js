// Content Script для Web Check - без ES6 импортов
// Этот файл должен работать без module системы

(function() {
  'use strict';

  // Предотвращаем множественную загрузку content script
  if (window.webCheckContentScriptLoaded) {
    console.log('[WebCheck:ContentScript] Content script already loaded, skipping initialization');
    return;
  }

  window.webCheckContentScriptLoaded = true;
  console.log('[WebCheck:ContentScript] Content script loaded and ready');

  // Уведомляем background script о готовности ТОЛЬКО ОДИН РАЗ
  if (!window.webCheckReadyMessageSent) {
    window.webCheckReadyMessageSent = true;
    setTimeout(() => {
      try {
        if (typeof browser !== 'undefined') {
          browser.runtime.sendMessage({ action: 'contentScriptReady' }).catch(() => {});
        } else if (typeof chrome !== 'undefined') {
          chrome.runtime.sendMessage({ action: 'contentScriptReady' });
        }
      } catch (error) {
        // Игнорируем ошибки инициализации
      }
    }, 100);
  }

  // Функция для активации селектора элементов
  function activateElementSelector() {
    // Проверяем, не активировался ли уже модуль picker
    const pickerActive = document.querySelector('.webcheck-overlay');
    if (pickerActive) {
      console.log('[WebCheck:ContentScript] Picker overlay already exists, not initializing again');
      return;
    }

    console.log('[WebCheck:ContentScript] Activating element selector');

    // Текущий выбранный элемент
    let selectedElement = null;
    let hoveredElement = null;

    // Создаем выделение для наведенного элемента
    const highlighter = document.createElement('div');
    highlighter.className = 'webcheck-element-picker-active';
    highlighter.style.position = 'absolute';
    highlighter.style.border = '2px solid #3e66fb';
    highlighter.style.backgroundColor = 'rgba(62, 102, 251, 0.1)';
    highlighter.style.pointerEvents = 'none';
    highlighter.style.zIndex = '10000';
    highlighter.style.display = 'none';
    document.body.appendChild(highlighter);

    // Создаем информационную панель
    const infoPanel = document.createElement('div');
    infoPanel.className = 'webcheck-element-picker-active';
    infoPanel.style.position = 'fixed';
    infoPanel.style.top = '10px';
    infoPanel.style.left = '50%';
    infoPanel.style.transform = 'translateX(-50%)';
    infoPanel.style.backgroundColor = '#fff';
    infoPanel.style.border = '1px solid #ddd';
    infoPanel.style.borderRadius = '4px';
    infoPanel.style.padding = '10px';
    infoPanel.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    infoPanel.style.zIndex = '10001';
    infoPanel.style.fontSize = '14px';
    infoPanel.innerHTML = 'Кликните на элемент для отслеживания. <button id="webcheck-cancel-selection">Отмена</button>';
    document.body.appendChild(infoPanel);

    // Обработчик отмены
    const cancelButton = document.getElementById('webcheck-cancel-selection');
    if (cancelButton) {
      cancelButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
      });
    }

    // Обработчик движения мыши
    function handleMouseMove(e) {
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (!element || element === highlighter || element === infoPanel || 
          infoPanel.contains(element) || element.closest('.webcheck-element-picker-active')) {
        highlighter.style.display = 'none';
        hoveredElement = null;
        return;
      }

      hoveredElement = element;
      const rect = element.getBoundingClientRect();
      highlighter.style.left = `${rect.left + window.scrollX}px`;
      highlighter.style.top = `${rect.top + window.scrollY}px`;
      highlighter.style.width = `${rect.width}px`;
      highlighter.style.height = `${rect.height}px`;
      highlighter.style.display = 'block';
    }

    // Обработчик клика
    function handleClick(e) {
      e.preventDefault();
      e.stopPropagation();

      if (hoveredElement && !hoveredElement.closest('.webcheck-element-picker-active')) {
        selectedElement = hoveredElement;
        const html = selectedElement.outerHTML;
        const rect = selectedElement.getBoundingClientRect();
        const selector = generateSelector(selectedElement);

        const elementInfo = {
          selector: selector,
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
          html: html,
          pageTitle: document.title,
          pageUrl: window.location.href,
          faviconUrl: getFaviconUrl()
        };

        console.log('[WebCheck:ContentScript] Element selected:', selector);

        // Отправляем сообщение в background script
        try {
          const runtime = (typeof browser !== 'undefined') ? browser.runtime : chrome.runtime;
          runtime.sendMessage({
            action: 'captureElement',
            elementInfo: elementInfo
          });
          console.log('[WebCheck:ContentScript] Capture element message sent successfully');
        } catch (error) {
          console.error('[WebCheck:ContentScript] Error sending capture message:', error);
        }

        cleanup();
      }
    }

    // Очистка обработчиков
    function cleanup() {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      window.webCheckMouseMoveHandler = null;
      window.webCheckClickHandler = null;
      if (highlighter.parentNode) highlighter.remove();
      if (infoPanel.parentNode) infoPanel.remove();
      console.log('[WebCheck:ContentScript] Element selector cleaned up');
    }

    // Функция получения favicon
    function getFaviconUrl() {
      const links = document.querySelectorAll('link[rel*="icon"]');
      if (links.length > 0) {
        const favicon = links[links.length - 1];
        if (favicon.href) return favicon.href;
      }
      return new URL('/favicon.ico', window.location.origin).href;
    }

    // Функция генерации селектора
    function generateSelector(element) {
      if (element.id) {
        return `#${element.id}`;
      }

      let path = '';
      let current = element;

      while (current !== document.body && current.parentElement) {
        let tag = current.tagName.toLowerCase();

        if (current.classList.length > 0) {
          const classes = Array.from(current.classList).slice(0, 2);
          tag += `.${classes.join('.')}`;
        }

        path = path ? `${tag} > ${path}` : tag;
        current = current.parentElement;
      }

      return path;
    }

    // Сохраняем обработчики для возможной очистки
    window.webCheckMouseMoveHandler = handleMouseMove;
    window.webCheckClickHandler = handleClick;

    // Устанавливаем обработчики
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    // Автоочистка через 30 секунд
    setTimeout(() => {
      if (document.querySelector('.webcheck-element-picker-active')) {
        console.log('[WebCheck:ContentScript] Auto-cleanup after 30 seconds');
        cleanup();
      }
    }, 30000);
  }

  // Функция поиска элемента по селектору
  function findElementBySelectorAdvanced(selector) {
    let element = document.querySelector(selector);

    if (!element) {
      // Попробуем альтернативные варианты...
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
          const elements = document.querySelectorAll(`[id*='${idName}']`);
          if (elements.length > 0) {
            element = elements[0];
          }
        }
      }

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

  // Обработчик сообщений от background script
  const runtime = (typeof browser !== 'undefined') ? browser.runtime : chrome.runtime;
  
  runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[WebCheck:ContentScript] Received message:', message.action || message.type);

    try {
      if (message.action === 'ping') {
        console.log('[WebCheck:ContentScript] Ping received, sending pong');
        sendResponse({ status: 'pong', timestamp: Date.now() });
        return true;
      }

      if (message.target === 'content_script' && message.type === 'EXTRACT_CONTENT') {
        console.log('[WebCheck:ContentScript] Extract content request received:', message);
        try {
          const element = findElementBySelectorAdvanced(message.selector || '');
          if (element) {
            const content = element.outerHTML;
            runtime.sendMessage({
              target: 'offscreen',
              type: 'CONTENT_EXTRACTED',
              requestId: message.requestId,
              content: content
            });
            console.log('[WebCheck:ContentScript] Content extracted and sent to offscreen');
          } else {
            runtime.sendMessage({
              target: 'offscreen',
              type: 'CONTENT_EXTRACTED',
              requestId: message.requestId,
              error: `Element not found with selector: ${message.selector}`
            });
            console.warn('[WebCheck:ContentScript] Element not found:', message.selector);
          }
        } catch (error) {
          console.error('[WebCheck:ContentScript] Error extracting content:', error);
          runtime.sendMessage({
            target: 'offscreen',
            type: 'CONTENT_EXTRACTED',
            requestId: message.requestId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        return true;
      }

      if (message.action === 'activateElementSelection') {
        console.log('[WebCheck:ContentScript] Received activateElementSelection message, using built-in picker');
        
        if (document.querySelector('.webcheck-element-picker-active')) {
          console.log('[WebCheck:ContentScript] Element picker already active');
          sendResponse({ status: 'already_active' });
          return true;
        }

        try {
          activateElementSelector();
          sendResponse({ status: 'activated', timestamp: Date.now() });
        } catch (error) {
          console.error('[WebCheck:ContentScript] Error activating element selector:', error);
          sendResponse({ 
            status: 'error', 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
        return true;
      }

      if (message.action === 'activateElementPicker') {
        console.log('[WebCheck:ContentScript] Received activateElementPicker message, using built-in picker');
        activateElementSelector();
        sendResponse({ status: 'activated', method: 'builtin_picker' });
        return true;
      }

      if (message.action === 'cancelElementSelection') {
        console.log('[WebCheck:ContentScript] Received cancelElementSelection message');
        // Удаляем все элементы пикера
        document.querySelectorAll('.webcheck-element-picker-active, .webcheck-highlight, [id^="webcheck-"]').forEach(el => el.remove());
        // Удаляем обработчики
        if (window.webCheckMouseMoveHandler) {
          document.removeEventListener('mousemove', window.webCheckMouseMoveHandler);
        }
        if (window.webCheckClickHandler) {
          document.removeEventListener('click', window.webCheckClickHandler);
        }
        sendResponse({ status: 'cancelled' });
        return true;
      }

      // Неизвестное сообщение
      console.log('[WebCheck:ContentScript] Unknown message action:', message.action || message.type);
      sendResponse({ status: 'unknown_action' });
      
    } catch (error) {
      console.error('[WebCheck:ContentScript] Error processing message:', error);
      sendResponse({ 
        status: 'error', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }

    return; // Синхронный ответ для неизвестных сообщений
  });

  console.log('[WebCheck:ContentScript] Core content script initialized without ES6 imports');

})();

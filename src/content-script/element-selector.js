// Простой скрипт для выбора элементов на странице
// Будет инжектироваться с помощью chrome.scripting.executeScript

(() => {
  console.log('[WebCheck:ElementSelector] Script injected and starting...');
  
  // Проверяем, не запущен ли уже селектор
  if (window.__webCheckElementSelectorActive) {
    console.log('[WebCheck:ElementSelector] Selector already active, stopping previous instance');
    // Если селектор уже активен, останавливаем его
    if (typeof window.__webCheckCleanupSelector === 'function') {
      window.__webCheckCleanupSelector();
    }
  }
  
  // Переменные для отслеживания состояния
  let currentElement = null;
  let overlayElement = null;
  let overlayInfo = null;
  let isActive = true;
  let selectionCompleted = false;
  
  // Создаем стиль для выделения элементов
  const style = document.createElement('style');
  style.textContent = `
    .webcheck-highlight {
      outline: 3px solid #4285f4 !important;
      outline-offset: 2px !important;
      background-color: rgba(66, 133, 244, 0.2) !important;
      box-shadow: 0 0 8px rgba(66, 133, 244, 0.6) !important;
      cursor: pointer !important;
      z-index: 2147483645 !important;
      position: relative !important;
    }
    .webcheck-overlay {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 10px 15px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      z-index: 2147483647;
      font-family: Arial, sans-serif;
      font-size: 14px;
      text-align: center;
      max-width: 90%;
      min-width: 300px;
    }
    .webcheck-info {
      margin-bottom: 10px;
      color: #333;
    }
    .webcheck-buttons {
      display: flex;
      justify-content: center;
      gap: 10px;
    }
    .webcheck-btn {
      padding: 8px 12px;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      border: none;
      font-size: 14px;
    }
    .webcheck-btn-select {
      background: #4285f4;
      color: white;
    }
    .webcheck-btn-cancel {
      background: #f1f3f4;
      color: #5f6368;
    }
  `;
  document.head.appendChild(style);
  
  // Создаем информационную панель
  function createOverlay() {
    overlayElement = document.createElement('div');
    overlayElement.className = 'webcheck-overlay';
    
    overlayInfo = document.createElement('div');
    overlayInfo.className = 'webcheck-info';
    overlayInfo.textContent = 'Наведите на элемент для выбора';
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'webcheck-buttons';
    
    const selectButton = document.createElement('button');
    selectButton.className = 'webcheck-btn webcheck-btn-select';
    selectButton.textContent = 'Выбрать текущий элемент';
    selectButton.disabled = true;
    selectButton.id = 'webcheck-select-btn';
    selectButton.addEventListener('click', selectCurrentElement);
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'webcheck-btn webcheck-btn-cancel';
    cancelButton.textContent = 'Отменить';
    cancelButton.addEventListener('click', cleanup);
    
    buttonsContainer.appendChild(selectButton);
    buttonsContainer.appendChild(cancelButton);
    
    overlayElement.appendChild(overlayInfo);
    overlayElement.appendChild(buttonsContainer);
    
    document.body.appendChild(overlayElement);
  }
  
  // Обновляем информацию о текущем элементе
  function updateInfo(element) {
    if (!overlayInfo) return;
    
    // Получаем информацию об элементе
    const tagName = element.tagName.toLowerCase();
    const classes = element.className && typeof element.className === 'string' 
      ? element.className.split(' ').filter(c => c && !c.includes('webcheck-'))
      : [];
    const id = element.id ? `#${element.id}` : '';
    const selector = id || (classes.length > 0 ? `${tagName}.${classes.join('.')}` : tagName);
    
    // Текст элемента
    const text = element.textContent?.trim() || '';
    const shortText = text.length > 50 ? text.substring(0, 50) + '...' : text;
    
    overlayInfo.innerHTML = `
      <strong>Элемент:</strong> ${selector}<br>
      <strong>Текст:</strong> ${shortText || '<нет текста>'}
    `;
    
    // Активируем кнопку выбора
    const selectButton = document.getElementById('webcheck-select-btn');
    if (selectButton) {
      selectButton.disabled = false;
    }
  }
  
  // Функция обработки перемещения мыши
  function handleMouseOver(event) {
    if (!isActive || selectionCompleted) return;
    
    // Игнорируем наши собственные элементы
    if (event.target.closest('.webcheck-overlay')) return;
    
    // Очищаем предыдущее выделение
    if (currentElement) {
      currentElement.classList.remove('webcheck-highlight');
    }
    
    // Выделяем новый элемент
    currentElement = event.target;
    currentElement.classList.add('webcheck-highlight');
    
    // Обновляем информацию
    updateInfo(currentElement);
    
    // Предотвращаем всплытие события
    event.stopPropagation();
  }
  
  // Функция обработки клика
  function handleClick(event) {
    if (!isActive || selectionCompleted) return;
    
    // Игнорируем клики на наших собственных элементах
    if (event.target.closest('.webcheck-overlay')) return;
    
    // Предотвращаем выполнение действий по умолчанию и всплытие события
    event.preventDefault();
    event.stopPropagation();
    
    console.log('[WebCheck:ElementSelector] Click detected on element:', event.target);
    
    // Если клик произошел по выделенному элементу, выбираем его
    if (event.target === currentElement) {
      selectCurrentElement();
    } else {
      // Если клик произошел по другому элементу, сначала делаем его текущим
      if (currentElement) {
        currentElement.classList.remove('webcheck-highlight');
      }
      
      currentElement = event.target;
      currentElement.classList.add('webcheck-highlight');
      
      // Обновляем информацию
      updateInfo(currentElement);
      
      // Выбираем элемент сразу после клика
      setTimeout(selectCurrentElement, 100);
    }
  }

  // Тихая функция очистки - без отправки сообщения об отмене
  function quietCleanup() {
    console.log('[WebCheck:ElementSelector] Quiet cleanup...');
    
    // Деактивируем селектор
    isActive = false;
    window.__webCheckElementSelectorActive = false;
    
    // Удаляем обработчики событий
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeydown);
    
    // Удаляем выделение
    if (currentElement) {
      currentElement.classList.remove('webcheck-highlight');
      currentElement = null;
    }
    
    // Удаляем оверлей
    if (overlayElement) {
      document.body.removeChild(overlayElement);
      overlayElement = null;
      overlayInfo = null;
    }
    
    // Удаляем глобальную функцию очистки
    delete window.__webCheckCleanupSelector;
  }
  
  // Функция выбора текущего элемента
  function selectCurrentElement() {
    if (!currentElement || !isActive || selectionCompleted) return;
    
    console.log('[WebCheck:ElementSelector] Selecting element:', currentElement);
    
    // Устанавливаем флаг, что выбор выполнен
    selectionCompleted = true;
    
    // Устанавливаем флаг на document для проверки в cleanup
    document.webCheckElementSelected = true;
    
    // Отчетливый визуальный сигнал о выборе
    currentElement.classList.remove('webcheck-highlight');
    currentElement.classList.add('webcheck-highlight');
    
    // Обновляем информационную панель
    if (overlayInfo) {
      overlayInfo.innerHTML = `<strong>Элемент выбран!</strong><br>Обрабатываем...`;
    }
    
    // Генерируем селектор
    const selector = generateSelector(currentElement);
    
    // Получаем информацию о размерах
    const rect = currentElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Создаем скриншот выбранного элемента
    // В реальном приложении лучше использовать html2canvas или другую библиотеку
    let dataUrl = null;
    
    try {
      // Попытаемся создать скриншот с помощью canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Получаем размеры и позицию элемента
      const elementRect = currentElement.getBoundingClientRect();
      canvas.width = elementRect.width;
      canvas.height = elementRect.height;
      
      // Создаем временный светлый фон
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Попытка использовать foreignObject для отрисовки HTML содержимого
      // Это не идеальное решение, но может работать в некоторых случаях
      // В реальном приложении мы бы использовали html2canvas или аналогичную библиотеку
      try {
        // Создаем свойство backgroundImage с помощью DOM API
        const serializer = new XMLSerializer();
        const elementXML = serializer.serializeToString(currentElement);
        const DOMURL = window.URL || window.webkitURL || window;
        const img = new Image();
        const svgBlob = new Blob([`
          <svg xmlns="http://www.w3.org/2000/svg" width="${elementRect.width}" height="${elementRect.height}">
            <foreignObject width="100%" height="100%" x="0" y="0">
              ${elementXML}
            </foreignObject>
          </svg>
        `], {type: 'image/svg+xml;charset=utf-8'});
        const url = DOMURL.createObjectURL(svgBlob);
        
        // Загрузка изображения и рисование на canvas
        img.onload = function() {
          ctx.drawImage(img, 0, 0);
          DOMURL.revokeObjectURL(url);
          dataUrl = canvas.toDataURL('image/png');
          console.log('[WebCheck:ElementSelector] Element screenshot created');
        };
        img.src = url;
      } catch (e) {
        console.error('[WebCheck:ElementSelector] Error creating SVG screenshot:', e);
      }
      
      // Даем немного времени для загрузки изображения
      setTimeout(() => {
        // Если не удалось создать скриншот, используем HTML-версию
        if (!dataUrl) {
          console.log('[WebCheck:ElementSelector] Using HTML version as fallback');
          dataUrl = 'data:text/html,' + encodeURIComponent(`
            <html>
              <head>
                <style>
                  body {
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                  }
                  .element-container {
                    max-width: 100%;
                    max-height: 100%;
                    overflow: auto;
                  }
                </style>
              </head>
              <body>
                <div class="element-container">${currentElement.outerHTML}</div>
              </body>
            </html>
          `);
        }
        
        // Создаем объект с информацией о выбранном элементе
        const elementInfo = {
          selector,
          rect: {
            top: rect.top + scrollTop,
            left: rect.left + scrollLeft,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom + scrollTop,
            right: rect.right + scrollLeft
          },
          html: currentElement.outerHTML,
          pageTitle: document.title,
          pageUrl: window.location.href,
          faviconUrl: getFaviconUrl(),
          // Сохраняем dataUrl для миниатюры
          thumbnailUrl: dataUrl
        };
        
        // Отправляем информацию в расширение
        chrome.runtime.sendMessage({
          action: 'elementSelected',
          elementInfo
        }, response => {
          console.log('[WebCheck:ElementSelector] Response from background:', response);
          
          // Тихая очистка без отправки сообщения об отмене
          quietCleanup();
          
          // Показываем уведомление пользователю
          try {
            const notificationElement = document.createElement('div');
            notificationElement.className = 'webcheck-notification';
            notificationElement.innerHTML = `
              <div class="webcheck-notification-content">
                <div class="webcheck-notification-icon">✅</div>
                <div class="webcheck-notification-text">
                  <div class="webcheck-notification-title">Элемент успешно выбран!</div>
                  <div class="webcheck-notification-message">Нажмите на иконку расширения, чтобы продолжить.</div>
                </div>
              </div>
            `;
            
            // Стили для уведомления
            const notificationStyle = document.createElement('style');
            notificationStyle.textContent = `
              .webcheck-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 2147483647;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 16px;
                max-width: 300px;
                animation: webcheck-slide-in 0.3s ease-out;
              }
              
              @keyframes webcheck-slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
              
              .webcheck-notification-content {
                display: flex;
                align-items: flex-start;
              }
              
              .webcheck-notification-icon {
                font-size: 24px;
                margin-right: 12px;
              }
              
              .webcheck-notification-text {
                flex: 1;
              }
              
              .webcheck-notification-title {
                font-weight: bold;
                margin-bottom: 4px;
                font-size: 16px;
              }
              
              .webcheck-notification-message {
                font-size: 14px;
                color: #666;
              }
            `;
            
            document.head.appendChild(notificationStyle);
            document.body.appendChild(notificationElement);
            
            // Удаляем уведомление через 5 секунд
            setTimeout(() => {
              if (document.body.contains(notificationElement)) {
                document.body.removeChild(notificationElement);
              }
              if (document.head.contains(notificationStyle)) {
                document.head.removeChild(notificationStyle);
              }
            }, 5000);
          } catch (e) {
            console.error('[WebCheck:ElementSelector] Error showing notification:', e);
          }
        });
      }, 200); // Даем время для загрузки изображения
    } catch (e) {
      console.error('[WebCheck:ElementSelector] Error creating element thumbnail:', e);
    }
    
    console.log('[WebCheck:ElementSelector] Element selected with selector:', selector);
    
    // На случай, если ответ не придет, устанавливаем таймаут на очистку
    setTimeout(quietCleanup, 1000);
  }
  
  // Получаем URL иконки сайта
  function getFaviconUrl() {
    const links = document.querySelectorAll('link[rel*="icon"]');
    if (links.length > 0) {
      for (const link of links) {
        if (link.href) {
          return link.href;
        }
      }
    }
    return '/favicon.ico';
  }
  
  // Генерируем CSS селектор для элемента
  function generateSelector(element) {
    // Если есть ID, используем его
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Пробуем генерировать по классам
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ')
        .filter(c => c && !c.includes('webcheck-'));
      
      if (classes.length > 0) {
        const selector = `${element.tagName.toLowerCase()}.${classes.join('.')}`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }
    
    // Строим селектор по пути
    const path = [];
    let current = element;
    let index;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      // Добавляем nth-child для уникальности
      if (current.parentNode) {
        const siblings = Array.from(current.parentNode.children)
          .filter(el => el.tagName === current.tagName);
          
        if (siblings.length > 1) {
          index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentNode;
      
      // Проверяем текущий селектор
      const testSelector = path.join(' > ');
      if (document.querySelectorAll(testSelector).length === 1) {
        return testSelector;
      }
    }
    
    return path.join(' > ');
  }
  
  // Функция очистки и завершения работы
  function cleanup() {
    console.log('[WebCheck:ElementSelector] Cleaning up...');
    
    // Деактивируем селектор
    isActive = false;
    window.__webCheckElementSelectorActive = false;
    
    // Удаляем обработчики событий
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeydown);
    
    // Удаляем выделение
    if (currentElement) {
      currentElement.classList.remove('webcheck-highlight');
      currentElement = null;
    }
    
    // Удаляем оверлей
    if (overlayElement) {
      document.body.removeChild(overlayElement);
      overlayElement = null;
      overlayInfo = null;
    }
    
    // Отправляем сообщение об отмене, если это не вызов после выбора элемента
    if (!document.webCheckElementSelected) {
      chrome.runtime.sendMessage({
        action: 'elementSelectionCancelled'
      }, response => {
        console.log('[WebCheck:ElementSelector] Response from background after cancellation:', response);
      });
    }
    
    // Сбрасываем флаг выбора элемента
    document.webCheckElementSelected = false;
    
    // Удаляем глобальную функцию очистки
    delete window.__webCheckCleanupSelector;
  }
  
  // Обработчик нажатия Escape для отмены
  function handleKeydown(e) {
    if (e.key === 'Escape' && isActive) {
      cleanup();
    }
  }
  
  // Устанавливаем глобальные переменные для управления селектором
  window.__webCheckElementSelectorActive = true;
  window.__webCheckCleanupSelector = cleanup;
  document.webCheckElementSelected = false;
  
  // Создаем оверлей
  createOverlay();
  
  // Устанавливаем обработчики событий
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('click', handleClick, true);
  console.log('[WebCheck:ElementSelector] Click event listener added with capture phase (true)');
  document.addEventListener('keydown', handleKeydown);
  
  // Добавляем обработчик сообщений
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'cancelElementSelection' && isActive) {
      cleanup();
    }
    return true;
  });
  
  console.log('[WebCheck:ElementSelector] Element selector activated with click support');
})();

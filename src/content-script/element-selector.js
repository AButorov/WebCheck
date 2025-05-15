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
      faviconUrl: getFaviconUrl()
    };
    
    // Отправляем информацию в расширение
    chrome.runtime.sendMessage({
      action: 'elementSelected',
      elementInfo
    }, response => {
      console.log('[WebCheck:ElementSelector] Response from background:', response);
      
      // Тихая очистка без отправки сообщения об отмене
      quietCleanup();
    });
    
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

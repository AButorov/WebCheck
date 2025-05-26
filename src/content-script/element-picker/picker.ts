// CSP-совместимый модуль выбора элементов на странице
// Без использования сторонних библиотек и eval()

import browser from 'webextension-polyfill'

interface ElementInfo {
  selector: string;
  rect: DOMRect;
  html: string;
  pageTitle: string;
  pageUrl: string;
  faviconUrl: string;
}

// Типизация для сообщений
interface PickerMessage {
  action: string;
  elementInfo?: ElementInfo;
}

export function initElementPicker() {
  let targetElement: Element | null = null;
  let overlay: HTMLElement | null = null;
  let isPickerActive = false;
  
  // Создаем стили для выделения элементов
  const style = document.createElement('style');
  style.textContent = `
    .webcheck-highlight {
      outline: 2px solid #4285f4 !important;
      outline-offset: 2px !important;
      background-color: rgba(66, 133, 244, 0.1) !important;
      transition: outline 0.2s ease, background-color 0.2s ease !important;
    }
    .webcheck-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding-top: 15px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .webcheck-controls {
      background: white;
      padding: 12px 15px;
      border-radius: 8px;
      margin-top: 15px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      display: flex;
      gap: 10px;
      align-items: center;
      z-index: 2147483647;
    }
    .webcheck-title {
      background: white;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .webcheck-instructions {
      background: white;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 14px;
      max-width: 400px;
      text-align: center;
      margin-bottom: 10px;
    }
    .webcheck-btn {
      padding: 8px 12px;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      border: none;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .webcheck-btn-confirm {
      background: #4285f4;
      color: white;
    }
    .webcheck-btn-confirm:hover {
      background: #3b78e7;
    }
    .webcheck-btn-cancel {
      background: #f1f3f4;
      color: #5f6368;
    }
    .webcheck-btn-cancel:hover {
      background: #e8eaed;
    }
    .webcheck-element-info {
      background: white;
      padding: 10px 15px;
      border-radius: 8px;
      margin-top: 10px;
      font-size: 13px;
      color: #444;
      max-width: 400px;
    }
  `;
  
  document.head.appendChild(style);
  
  // Функция для создания интерфейса управления
  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'webcheck-overlay';
    
    const title = document.createElement('div');
    title.className = 'webcheck-title';
    title.textContent = 'Web Check - Выбор элемента';
    
    const instructions = document.createElement('div');
    instructions.className = 'webcheck-instructions';
    instructions.textContent = 'Наведите курсор на элемент, который хотите отслеживать, и кликните по нему. Или используйте кнопки ниже.';
    
    const controls = document.createElement('div');
    controls.className = 'webcheck-controls';
    
    const confirmButton = document.createElement('button');
    confirmButton.className = 'webcheck-btn webcheck-btn-confirm';
    confirmButton.textContent = 'Выбрать элемент';
    confirmButton.addEventListener('click', () => confirmSelection());
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'webcheck-btn webcheck-btn-cancel';
    cancelButton.textContent = 'Отменить';
    cancelButton.addEventListener('click', () => cancelSelection());
    
    overlay.appendChild(title);
    overlay.appendChild(instructions);
    controls.appendChild(confirmButton);
    controls.appendChild(cancelButton);
    overlay.appendChild(controls);
    
    document.body.appendChild(overlay);
  }
  
  // Обработчики событий
  function handleMouseOver(e: MouseEvent) {
    e.stopPropagation();
    
    if (targetElement) {
      targetElement.classList.remove('webcheck-highlight');
    }
    
    if (e.target instanceof Element) {
      targetElement = e.target;
      
      if (targetElement && targetElement !== document.body && 
          !targetElement.classList.contains('webcheck-overlay') && 
          !targetElement.closest('.webcheck-overlay')) {
        targetElement.classList.add('webcheck-highlight');
        
        // Показываем информацию о текущем элементе
        updateElementInfo(targetElement);
      } else {
        targetElement = null;
      }
    }
  }
  
  // Обновляем информацию о выбранном элементе
  function updateElementInfo(element: Element) {
    if (!overlay) return;
    
    // Удаляем старую информацию
    const oldInfo = overlay.querySelector('.webcheck-element-info');
    if (oldInfo) {
      oldInfo.remove();
    }
    
    // Создаем новую информацию
    const info = document.createElement('div');
    info.className = 'webcheck-element-info';
    
    // Получаем тег и классы для отображения
    const tagName = element.tagName.toLowerCase();
    const classes = element.className && typeof element.className === 'string' 
      ? element.className.split(' ').filter(c => c && !c.includes('webcheck-'))
      : [];
    const classStr = classes.length > 0 ? `.${classes.join('.')}` : '';
    
    // Определяем тип элемента (заголовок, текст, изображение и т.д.)
    let elementType = 'Элемент';
    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      elementType = 'Заголовок';
    } else if (tagName === 'p') {
      elementType = 'Параграф';
    } else if (tagName === 'img') {
      elementType = 'Изображение';
    } else if (tagName === 'div' || tagName === 'section') {
      elementType = 'Блок';
    } else if (tagName === 'span' || tagName === 'a') {
      elementType = 'Текст';
    } else if (tagName === 'table') {
      elementType = 'Таблица';
    } else if (tagName === 'ul' || tagName === 'ol') {
      elementType = 'Список';
    }
    
    // Текст элемента (обрезаем, если слишком длинный)
    const text = element.textContent?.trim() || '';
    const shortText = text.length > 100 ? text.substring(0, 100) + '...' : text;
    
    info.innerHTML = `
      <strong>Тип:</strong> ${elementType}<br>
      <strong>Элемент:</strong> ${tagName}${classStr}<br>
      <strong>Текст:</strong> ${shortText || '<нет текста>'}
    `;
    
    overlay.appendChild(info);
  }
  
  function handleClick(e: MouseEvent) {
    if (isPickerActive && targetElement) {
      e.preventDefault();
      e.stopPropagation();
      confirmSelection();
    }
  }
  
  // Подтверждение выбора элемента
  function confirmSelection() {
    if (!targetElement) return;
    
    const selector = generateSelector(targetElement);
    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    const elementInfo: ElementInfo = {
      selector,
      rect: {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y,
        bottom: rect.bottom,
        right: rect.right,
        toJSON: rect.toJSON
      },
      html: targetElement.outerHTML,
      pageTitle: document.title,
      pageUrl: window.location.href,
      faviconUrl: getFaviconUrl()
    };
    
    // Отправляем данные в background script
    browser.runtime.sendMessage({
      action: 'captureElement',
      elementInfo
    });
    
    deactivatePicker();
  }
  
  function cancelSelection() {
    deactivatePicker();
    browser.runtime.sendMessage({ action: 'cancelElementSelection' });
  }
  
  // Получение URL фавиконки
  function getFaviconUrl(): string {
    // Пытаемся найти все иконки
    const icons = Array.from(document.querySelectorAll('link[rel*="icon"]'));
    
    // Если есть несколько иконок, сортируем по размеру (предпочитаем большие)
    if (icons.length > 0) {
      // Ищем иконку с атрибутом sizes, предпочитая большие размеры
      const iconWithSize = icons.find(icon => 
        icon.getAttribute('sizes') && icon.getAttribute('sizes')!.includes('32')
      ) || icons.find(icon => 
        icon.getAttribute('sizes') && icon.getAttribute('sizes')!.includes('48')
      ) || icons.find(icon => 
        icon.getAttribute('sizes') && icon.getAttribute('sizes')!.includes('64')
      );
      
      if (iconWithSize && iconWithSize.getAttribute('href')) {
        return new URL(iconWithSize.getAttribute('href') || '', window.location.origin).href;
      }
      
      // Если не нашли иконку с размером, берем первую
      if (icons[0].getAttribute('href')) {
        return new URL(icons[0].getAttribute('href') || '', window.location.origin).href;
      }
    }
    
    // Стандартный путь к фавиконке
    return new URL('/favicon.ico', window.location.origin).href;
  }
  
  // Генерация CSS селектора для элемента
  function generateSelector(element: Element): string {
    // Если есть ID, используем его
    if (element.id && !element.id.includes(' ')) {
      return `#${element.id}`;
    }
    
    // Строим селектор на основе тега и атрибутов
    let selector = element.tagName.toLowerCase();
    
    // Добавляем классы (если есть)
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ')
        .filter(c => c && !c.includes('webcheck-'));
      
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }
    
    // Проверяем уникальность селектора
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
    
    // Если селектор не уникален, добавляем n-й child
    let current = element;
    let parent = element.parentElement;
    
    // Максимальное количество уровней иерархии для поиска уникального селектора
    const MAX_LEVELS = 3;
    let level = 0;
    
    while (parent && level < MAX_LEVELS) {
      const children = Array.from(parent.children);
      const index = children.indexOf(current as Element) + 1;
      
      const parentSelector = parent.tagName.toLowerCase();
      selector = `${parentSelector} > ${selector}:nth-child(${index})`;
      
      // Проверяем уникальность селектора
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
      
      current = parent;
      parent = parent.parentElement;
      level++;
    }
    
    // Если не нашли уникальный селектор, используем XPath
    return generateXPathSelector(element);
  }
  
  // Генерация XPath селектора для более точного нахождения элемента
  function generateXPathSelector(element: Element): string {
    const parts = [];
    let current = element;
    
    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase();
      
      // Добавляем id, если есть
      if (current.id && !current.id.includes(' ')) {
        part += `[@id="${current.id}"]`;
        parts.unshift(part);
        break; // ID должен быть уникальным, прерываем поиск
      }
      
      // Определяем позицию среди одноименных тегов
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children)
          .filter(el => el.tagName === current.tagName);
        
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          part += `[${index}]`;
        }
      }
      
      parts.unshift(part);
      
      if (current.parentElement) {
        current = current.parentElement;
      } else {
        break;
      }
    }
    
    return `//${parts.join('/')}`;
  }
  
  // Активация выбора элемента
  function activatePicker() {
    isPickerActive = true;
    createOverlay();
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);
  }
  
  // Деактивация выбора элемента
  function deactivatePicker() {
    isPickerActive = false;
    
    if (targetElement) {
      targetElement.classList.remove('webcheck-highlight');
      targetElement = null;
    }
    
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      overlay = null;
    }
    
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('click', handleClick, true);
  }
  
  // Обработчик сообщений от background script
  browser.runtime.onMessage.addListener((message: PickerMessage) => {
    if (message.action === 'activateElementPicker') {
      activatePicker();
      return true;
    }
  });
}

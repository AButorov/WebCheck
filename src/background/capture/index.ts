// Background script для захвата элементов и создания скриншотов

interface ElementInfo {
  selector: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
    bottom: number;
    right: number;
  };
  html: string;
  pageTitle: string;
  pageUrl: string;
  faviconUrl: string;
  thumbnailUrl?: string; // Миниатюра может быть предоставлена content script
}

interface Task {
  id: string;
  title: string;
  url: string;
  faviconUrl: string;
  selector: string;
  createdAt: number;
  status: 'unchanged' | 'changed' | 'paused';
  interval: string;
  initialHtml: string;
  currentHtml: string;
  thumbnailUrl: string;
  lastCheckedAt: number;
  lastChangedAt: number | null;
}

// Переменная для отслеживания состояния выбора элемента
let elementSelectionActive = false;

/**
 * Обработка выбранного элемента 
 */
async function handleSelectedElement(elementInfo: ElementInfo): Promise<void> {
  console.log('[WebCheck:Background] Processing selected element:', elementInfo.selector);
  
  try {
    // Получаем активную вкладку
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      throw new Error('Active tab not found');
    }
    
    const tab = tabs[0];
    
    // Если thumbnailUrl не предоставлен content script, запрашиваем скриншот
    let thumbnailUrl = elementInfo.thumbnailUrl;
    
    if (!thumbnailUrl) {
      // Захватываем весь экран и сохраняем URL
      thumbnailUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
      
      // Примечание: мы не можем обрезать изображение здесь, так как Service Worker 
      // не имеет доступа к DOM API. Будем использовать полный скриншот.
      console.log('[WebCheck:Background] Using full screenshot as thumbnail');
    }
    
    // Создаем новую задачу
    const task: Task = {
      id: generateId(),
      title: elementInfo.pageTitle,
      url: elementInfo.pageUrl,
      faviconUrl: elementInfo.faviconUrl,
      selector: elementInfo.selector,
      createdAt: Date.now(),
      status: 'unchanged',
      interval: await getDefaultInterval(),
      initialHtml: elementInfo.html,
      currentHtml: elementInfo.html,
      thumbnailUrl: thumbnailUrl,
      lastCheckedAt: Date.now(),
      lastChangedAt: null
    };
    
    // Сохраняем данные для последующего редактирования
    await chrome.storage.local.set({ newTaskData: task });
    
    // Отправляем сообщение в popup
    try {
    // Проверяем, есть ли слушатели перед отправкой сообщения
    chrome.runtime.sendMessage({action: 'ping'}, (response) => {
    // Если есть ответ, значит popup активен
      const lastError = chrome.runtime.lastError;
      if (!lastError) {
          chrome.runtime.sendMessage({
          action: 'elementCaptured',
            task
        });
        console.log('[WebCheck:Background] Element captured message sent to popup');
      } else {
        console.log('[WebCheck:Background] Popup not available, task data saved to storage');
      }
    });
  } catch (error) {
    console.warn('[WebCheck:Background] Error checking popup status:', error);
  }
    
    console.log('[WebCheck:Background] Element processing completed successfully');
    
    // Сбрасываем флаг выбора элемента
    elementSelectionActive = false;
    
  } catch (error) {
    console.error('[WebCheck:Background] Error processing selected element:', error);
    elementSelectionActive = false;
    
    try {
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (msgError) {
      console.warn('[WebCheck:Background] Error sending error message to popup:', msgError);
    }
  }
}

/**
 * Активация выбора элемента
 */
async function activateElementSelection(tabId: number): Promise<void> {
  console.log('[WebCheck:Background] Activating element selection on tab:', tabId);
  
  // Проверяем, активен ли уже выбор элемента
  if (elementSelectionActive) {
    console.log('[WebCheck:Background] Element selection already active');
    return;
  }
  
  elementSelectionActive = true;
  
  try {
    // Используем executeScript для инжекции скрипта выбора элемента
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script/element-selector.js']
    });
    
    console.log('[WebCheck:Background] Element selector injected successfully');
  } catch (error) {
    console.error('[WebCheck:Background] Error injecting element selector:', error);
    elementSelectionActive = false;
    
    // Сообщаем об ошибке в popup
    try {
      chrome.runtime.sendMessage({
        action: 'elementSelectionError',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (msgError) {
      console.warn('[WebCheck:Background] Error sending error message to popup:', msgError);
    }
  }
}

/**
 * Отмена выбора элемента
 */
async function cancelElementSelection(tabId: number): Promise<void> {
  console.log('[WebCheck:Background] Cancelling element selection on tab:', tabId);
  
  // Если выбор элемента не активен, ничего не делаем
  if (!elementSelectionActive) {
    console.log('[WebCheck:Background] Element selection not active, nothing to cancel');
    return;
  }
  
  elementSelectionActive = false;
  
  try {
    // Отправляем сообщение в content script для отмены выбора элемента
    await chrome.tabs.sendMessage(tabId, {
      action: 'cancelElementSelection'
    });
    
    console.log('[WebCheck:Background] Cancel message sent to content script');
  } catch (error) {
    console.warn('[WebCheck:Background] Error sending cancel message (this may be normal):', error);
  }
  
  // Отправляем сообщение в popup об отмене выбора элемента
  try {
    // Проверяем, есть ли слушатели перед отправкой сообщения
    chrome.runtime.sendMessage({action: 'ping'}, (response) => {
      const lastError = chrome.runtime.lastError;
      if (!lastError) {
        chrome.runtime.sendMessage({
          action: 'elementSelectionCancelled'
        });
        console.log('[WebCheck:Background] Cancellation message sent to popup');
      } else {
        console.log('[WebCheck:Background] Popup not available for cancellation message');
      }
    });
  } catch (msgError) {
    console.warn('[WebCheck:Background] Error checking popup status for cancellation:', msgError);
  }
}

/**
 * Получение интервала проверки по умолчанию из настроек
 */
async function getDefaultInterval(): Promise<string> {
  try {
    const result = await chrome.storage.local.get('settings');
    if (result.settings && result.settings.defaultInterval) {
      return result.settings.defaultInterval;
    }
    return '1h'; // Интервал по умолчанию, если настройки не найдены
  } catch (error) {
    console.error('[WebCheck:Background] Error getting default interval:', error);
    return '1h';
  }
}

/**
 * Генерация уникального ID для задачи
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Обработчик сообщений
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[WebCheck:Background] Received message:', message.action, 
    sender.tab ? `from tab ${sender.tab.id}` : 'from extension');
  
  // Обработка ping-сообщения для проверки активности popup
  if (message.action === 'ping') {
    sendResponse({ status: 'pong' });
    return true;
  }
  
  // Обработка выбранного элемента
  if (message.action === 'elementSelected') {
    handleSelectedElement(message.elementInfo);
    sendResponse({ status: 'processing' });
    return true;
  }
  
  // Обработка отмены выбора элемента
  if (message.action === 'elementSelectionCancelled') {
    elementSelectionActive = false;
    
    // Пересылаем сообщение в popup
    try {
      // Проверяем, есть ли слушатели перед отправкой сообщения
      chrome.runtime.sendMessage({action: 'ping'}, (response) => {
        const lastError = chrome.runtime.lastError;
        if (!lastError) {
          chrome.runtime.sendMessage({
            action: 'elementSelectionCancelled'
          });
          console.log('[WebCheck:Background] Cancellation message forwarded to popup');
        } else {
          console.log('[WebCheck:Background] Popup not available for forwarding cancellation');
        }
      });
    } catch (error) {
      console.warn('[WebCheck:Background] Error checking popup status for forwarded cancellation:', error);
    }
    
    sendResponse({ status: 'cancelled' });
    return true;
  }
  
  // Запрос на активацию выбора элемента
  if (message.action === 'activateElementSelection') {
    const tabId = message.tabId;
    if (tabId) {
      activateElementSelection(tabId);
      sendResponse({ status: 'activating' });
    } else {
      console.error('[WebCheck:Background] No tab ID provided for element selection activation');
      sendResponse({ status: 'error', error: 'No tab ID provided' });
    }
    return true;
  }
  
  // Запрос на отмену выбора элемента
  if (message.action === 'cancelElementSelection') {
    const tabId = message.tabId;
    if (tabId) {
      cancelElementSelection(tabId);
      sendResponse({ status: 'cancelling' });
    } else {
      console.error('[WebCheck:Background] No tab ID provided for element selection cancellation');
      sendResponse({ status: 'error', error: 'No tab ID provided' });
    }
    return true;
  }
  
  return false;
});

// Инициализация модуля при загрузке background script
console.log('[WebCheck] Element capture module initialized');

// Обработчик установки расширения
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('Web Check extension installed');
  }
});

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

// Обработка выбранного элемента 
/**
 * Обработка выбранного элемента 
 */
async function handleSelectedElement(elementInfo: ElementInfo): Promise<void> {
  console.log('[WebCheck:Background] Processing selected element:', elementInfo.selector);
  
  try {
    // Получаем активную вкладку
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true }).catch(error => {
      console.error('[WebCheck:Background] Error querying tabs:', error);
      return [] as chrome.tabs.Tab[];
    });
    
    if (!tabs || tabs.length === 0) {
      throw new Error('Active tab not found');
    }
    
    const tab = tabs[0];
    
    // Если thumbnailUrl не предоставлен content script, запрашиваем скриншот
    let thumbnailUrl = elementInfo.thumbnailUrl;
    
    if (!thumbnailUrl) {
      try {
        // Захватываем весь экран и сохраняем URL
        thumbnailUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        console.log('[WebCheck:Background] Using full screenshot as thumbnail');
      } catch (screenshotError) {
        console.warn('[WebCheck:Background] Error capturing screenshot:', screenshotError);
        thumbnailUrl = null; // В случае ошибки продолжаем без скриншота
      }
    }
    
    // Создаем новую задачу
    const task: Task = {
      id: generateId(),
      title: elementInfo.pageTitle || 'Новая задача',
      url: elementInfo.pageUrl || '',
      faviconUrl: elementInfo.faviconUrl || '',
      selector: elementInfo.selector,
      createdAt: Date.now(),
      status: 'unchanged',
      interval: await getDefaultInterval(),
      initialHtml: elementInfo.html || '',
      currentHtml: elementInfo.html || '',
      thumbnailUrl: thumbnailUrl || '',
      lastCheckedAt: Date.now(),
      lastChangedAt: null
    };
    
    // Сохраняем данные для последующего редактирования
    await chrome.storage.local.set({ newTaskData: task }).catch(error => {
      console.error('[WebCheck:Background] Error storing task data:', error);
    });
    
    // Показываем уведомление в Chrome и открываем редактор задач
    try {
      // Сохраняем дополнительную информацию для маршрутизации
      await chrome.storage.local.set({ 
        newTaskData: task,
        openNewTaskEditor: true // Добавляем флаг для маршрутизатора
      }).catch(error => {
        console.error('[WebCheck:Background] Error storing task data:', error);
      });
      
      // Небольшая задержка перед открытием попапа, чтобы данные успели сохраниться
      await new Promise(resolve => setTimeout(resolve, 100));

      // Открываем попап с формой редактирования задачи
      try {
        await chrome.action.openPopup();
        console.log('[WebCheck:Background] Opened popup automatically');
      } catch (popupError) {
        console.warn('[WebCheck:Background] Could not open popup automatically:', popupError);
      }
    } catch (notificationError) {
      console.warn('[WebCheck:Background] Failed to show notification:', notificationError);
    }
    
    // Пытаемся отправить сообщение в popup
    try {
      // Используем механизм проверки соединения с обработкой ошибок
      chrome.runtime.sendMessage({action: 'ping'}, (response) => {
        // Обязательно проверяем chrome.runtime.lastError внутри callback
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.log('[WebCheck:Background] Popup not available due to error:', lastError.message);
          console.log('[WebCheck:Background] Task data saved to storage');
          return;
        }
        
        // Если дошли сюда, значит popup активен
        chrome.runtime.sendMessage({action: 'elementCaptured', task}, (msgResponse) => {
          // Снова проверяем ошибку
          const msgError = chrome.runtime.lastError;
          if (msgError) {
            console.log('[WebCheck:Background] Error sending task to popup:', msgError.message);
          } else {
            console.log('[WebCheck:Background] Element captured message sent to popup');
          }
        });
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
      // Отправляем сообщение об ошибке, но с проверкой на ошибку отправки
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.warn('[WebCheck:Background] Unable to send error message: ', lastError.message);
        }
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
    // Дополнительная проверка наличия вкладки
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab) {
        throw new Error(`Tab ${tabId} not found`);
      }
      
      // Проверяем, что вкладка доступна для скриптинга
      if (tab.url && !tab.url.startsWith('chrome:') && !tab.url.startsWith('chrome-extension:')) {
        console.log('[WebCheck:Background] Tab OK for scripting:', tab.url);
      } else {
        console.warn('[WebCheck:Background] Tab may not support scripting:', tab.url);
      }
    } catch (e) {
      console.warn('[WebCheck:Background] Error checking tab:', e);
      // Продолжаем несмотря на ошибку проверки
    }
    
    // Активируем вкладку перед инжекцией скрипта
    await chrome.tabs.update(tabId, { active: true });
    
    // Небольшая задержка для гарантированной активации вкладки
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Используем executeScript для инжекции скрипта выбора элемента
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script/element-selector.js']
    });
    
    // Проверяем результаты инжекции
    if (results && results.length > 0) {
      console.log('[WebCheck:Background] Element selector injected successfully:', results);
    } else {
      console.warn('[WebCheck:Background] Element selector injection returned no results');
    }
    
    // Дополнительно проверяем через сообщение, активен ли селектор
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'checkElementSelectorActive' });
      console.log('[WebCheck:Background] Element selector status check:', response);
    } catch (e) {
      // Если ответ не получен, но это не критично
      console.log('[WebCheck:Background] Could not check element selector status, but continuing');
    }
  } catch (error) {
    console.error('[WebCheck:Background] Error injecting element selector:', error);
    elementSelectionActive = false;
    
    // Сообщаем об ошибке в popup
    try {
      chrome.runtime.sendMessage({
        action: 'elementSelectionError',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, (response) => {
        // Проверяем ошибку отправки
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.warn('[WebCheck:Background] Error sending error message to popup:', lastError.message);
        }
      });
    } catch (msgError) {
      console.warn('[WebCheck:Background] Error sending error message to popup:', msgError);
    }
    
    // Пытаемся показать уведомление в браузере
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
        title: 'Ошибка выбора элемента',
        message: 'Не удалось активировать выбор элемента. Попробуйте еще раз.',
      });
    } catch (notificationError) {
      console.warn('[WebCheck:Background] Failed to show error notification:', notificationError);
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
    try {
      handleSelectedElement(message.elementInfo);
      sendResponse({ status: 'processing' });
    } catch (error) {
      console.error('[WebCheck:Background] Error in handleSelectedElement:', error);
      sendResponse({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    return true;
  }
  
  // Обработка отмены выбора элемента
  if (message.action === 'elementSelectionCancelled') {
    elementSelectionActive = false;
    
    // Пересылаем сообщение в popup с обработкой ошибок
    try {
      // Проверяем, есть ли слушатели перед отправкой сообщения
      chrome.runtime.sendMessage({action: 'ping'}, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          // Если есть ошибка, значит popup недоступен
          console.log('[WebCheck:Background] Popup not available for forwarding cancellation:', lastError.message);
          return;
        }
        
        // Если прошли эту проверку, то popup доступен
        chrome.runtime.sendMessage({
          action: 'elementSelectionCancelled'
        }, (cancellationResponse) => {
          const cancellationError = chrome.runtime.lastError;
          if (cancellationError) {
            console.log('[WebCheck:Background] Error forwarding cancellation:', cancellationError.message);
          } else {
            console.log('[WebCheck:Background] Cancellation message forwarded to popup');
          }
        });
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
      try {
        activateElementSelection(tabId);
        sendResponse({ status: 'activating' });
      } catch (error) {
        console.error('[WebCheck:Background] Error activating element selection:', error);
        sendResponse({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      }
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
      try {
        cancelElementSelection(tabId);
        sendResponse({ status: 'cancelling' });
      } catch (error) {
        console.error('[WebCheck:Background] Error cancelling element selection:', error);
        sendResponse({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      }
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

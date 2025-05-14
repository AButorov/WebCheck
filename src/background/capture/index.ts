// Background script для захвата элементов и создания скриншотов

interface ElementInfo {
  selector: string;
  rect: DOMRect;
  html: string;
  pageTitle: string;
  pageUrl: string;
  faviconUrl: string;
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

/**
 * Обработка захвата элемента со страницы
 */
async function captureElement(elementInfo: ElementInfo): Promise<void> {
  try {
    console.log('[WebCheck] Capturing element:', elementInfo);
    
    // Получаем активную вкладку
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      throw new Error('Active tab not found');
    }
    
    const tab = tabs[0];
    
    // Захватываем скриншот вкладки
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    
    // Создаем изображение для последующей обработки
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load captured image'));
      img.src = dataUrl;
    });
    
    // Создаем canvas для обрезки изображения
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    const rect = elementInfo.rect;
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Обрезаем изображение до размеров выбранного элемента
    ctx.drawImage(
      img,
      rect.left, rect.top,
      rect.width, rect.height,
      0, 0,
      rect.width, rect.height
    );
    
    // Получаем обрезанное изображение
    const croppedDataUrl = canvas.toDataURL('image/png');
    
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
      thumbnailUrl: croppedDataUrl,
      lastCheckedAt: Date.now(),
      lastChangedAt: null
    };
    
    // Сохраняем данные для последующего редактирования
    await chrome.storage.local.set({ newTaskData: task });
    
    // Открываем страницу редактирования задачи в popup
    // Отправляем сообщение в popup
    chrome.runtime.sendMessage({
      action: 'elementCaptured',
      task
    });
    
    console.log('[WebCheck] Element captured successfully:', task);
    
  } catch (error) {
    console.error('[WebCheck] Error capturing element:', error);
    chrome.runtime.sendMessage({
      action: 'captureError',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
    console.error('[WebCheck] Error getting default interval:', error);
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
  if (message.action === 'captureElement') {
    captureElement(message.elementInfo);
    return true;
  }
  
  if (message.action === 'cancelElementSelection') {
    chrome.runtime.sendMessage({ action: 'elementSelectionCancelled' });
    return true;
  }
});

// Инициализация модуля при загрузке background script
console.log('[WebCheck] Element capture module initialized');

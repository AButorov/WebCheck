#!/bin/zsh

echo "🔧 Применение архитектурных исправлений WebCheck"
echo "================================================"
echo "Основано на анализе ограничений Offscreen API"
echo ""

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

echo "✅ Находимся в корневой директории проекта"

# 1. Создаём улучшенный OffscreenManager с Singleton паттерном
echo ""
echo "📝 Создание улучшенного OffscreenManager..."

cat > src/background/offscreenManagerFixed.ts << 'EOF'
/**
 * Улучшенный менеджер offscreen-документов с Singleton паттерном
 * Гарантирует создание только одного offscreen-документа
 */

// Singleton класс для управления offscreen документом
class OffscreenManager {
  private static instance: OffscreenManager;
  private isCreating = false;
  private documentExists = false;
  private lastCheck = 0;
  private readonly CACHE_DURATION = 5000; // 5 секунд кэша
  private readonly DOCUMENT_PATH = 'offscreen/offscreen.html';

  private constructor() {}

  static getInstance(): OffscreenManager {
    if (!OffscreenManager.instance) {
      OffscreenManager.instance = new OffscreenManager();
    }
    return OffscreenManager.instance;
  }

  async hasDocument(): Promise<boolean> {
    const now = Date.now();
    
    // Используем кэш для частых проверок
    if (this.documentExists && (now - this.lastCheck) < this.CACHE_DURATION) {
      return true;
    }

    try {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType]
      });
      
      this.documentExists = contexts.some(context => 
        context.documentUrl?.endsWith(this.DOCUMENT_PATH)
      );
      this.lastCheck = now;
      
      console.log(`[OffscreenManager] Document exists: ${this.documentExists}`);
      return this.documentExists;
    } catch (error) {
      console.error('[OffscreenManager] Error checking document:', error);
      this.documentExists = false;
      return false;
    }
  }

  async ensureDocument(): Promise<void> {
    // Проверяем существование документа
    if (await this.hasDocument()) {
      console.log('[OffscreenManager] Document already exists');
      return;
    }

    // Предотвращаем одновременное создание
    if (this.isCreating) {
      console.log('[OffscreenManager] Document creation in progress, waiting...');
      while (this.isCreating) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isCreating = true;
    try {
      console.log('[OffscreenManager] Creating offscreen document...');
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL(this.DOCUMENT_PATH),
        reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'Parse DOM content for web page change detection'
      });
      
      this.documentExists = true;
      this.lastCheck = Date.now();
      console.log('[OffscreenManager] Document created successfully');
    } catch (error: any) {
      if (error.message?.includes('Only a single offscreen document')) {
        console.log('[OffscreenManager] Document already exists (caught)');
        this.documentExists = true;
      } else {
        console.error('[OffscreenManager] Failed to create document:', error);
        throw error;
      }
    } finally {
      this.isCreating = false;
    }
  }

  async closeDocument(): Promise<void> {
    if (!(await this.hasDocument())) {
      console.log('[OffscreenManager] No document to close');
      return;
    }

    try {
      await chrome.offscreen.closeDocument();
      this.documentExists = false;
      this.lastCheck = 0;
      console.log('[OffscreenManager] Document closed');
    } catch (error) {
      console.error('[OffscreenManager] Error closing document:', error);
    }
  }

  invalidateCache(): void {
    this.documentExists = false;
    this.lastCheck = 0;
  }
}

// Экспортируем единственный экземпляр
export const offscreenManager = OffscreenManager.getInstance();

// Функции для обратной совместимости
export async function hasOffscreenDocument(): Promise<boolean> {
  return offscreenManager.hasDocument();
}

export async function ensureOffscreenDocument(): Promise<void> {
  return offscreenManager.ensureDocument();
}

export async function closeOffscreenDocument(): Promise<void> {
  return offscreenManager.closeDocument();
}

export function invalidateCache(): void {
  offscreenManager.invalidateCache();
}

export async function sendMessageToOffscreen(message: any): Promise<any> {
  await ensureOffscreenDocument();
  
  return chrome.runtime.sendMessage({
    target: 'offscreen',
    ...message
  });
}

export async function pingOffscreenDocument(): Promise<boolean> {
  try {
    const response = await sendMessageToOffscreen({ type: 'PING' });
    return response?.status === 'alive';
  } catch {
    return false;
  }
}

export function setupOffscreenEventHandlers(): void {
  chrome.runtime.onStartup.addListener(() => {
    console.log('[OffscreenManager] Browser startup, invalidating cache');
    offscreenManager.invalidateCache();
  });
  
  chrome.runtime.onInstalled.addListener(() => {
    console.log('[OffscreenManager] Extension installed/updated');
    offscreenManager.invalidateCache();
  });
}
EOF

# 2. Создаём семафор для ограничения параллельности
echo ""
echo "📝 Создание семафора для управления параллельностью..."

cat > src/utils/semaphore.ts << 'EOF'
/**
 * Семафор для ограничения параллельности операций
 */
export class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    // Ждём освобождения
    return new Promise<void>(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    
    const next = this.waiting.shift();
    if (next) {
      this.permits--;
      next();
    }
  }

  async use<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

// Глобальный семафор для offscreen операций
export const offscreenSemaphore = new Semaphore(1);
EOF

# 3. Создаём обёртку для асинхронных сообщений
echo ""
echo "📝 Создание обёртки для асинхронных сообщений..."

cat > src/background/asyncMessageWrapper.ts << 'EOF'
/**
 * Обёртка для безопасной обработки асинхронных сообщений
 */

type AsyncMessageHandler = (
  request: any,
  sender: chrome.runtime.MessageSender
) => Promise<any>;

/**
 * Создаёт обработчик сообщений с правильной обработкой асинхронных ответов
 */
export function createAsyncMessageHandler(
  handlers: Record<string, AsyncMessageHandler>
): (
  request: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => boolean | undefined {
  
  return (request, sender, sendResponse) => {
    // Определяем тип сообщения
    const messageType = request?.type || request?.action;
    
    if (!messageType || !(messageType in handlers)) {
      // Не наш обработчик, пропускаем
      return false;
    }

    // Логируем входящее сообщение
    console.log(`[ASYNC HANDLER] Processing ${messageType}`, request);

    // Обрабатываем асинхронно
    Promise.resolve()
      .then(() => handlers[messageType](request, sender))
      .then(result => {
        console.log(`[ASYNC HANDLER] Success for ${messageType}`, result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error(`[ASYNC HANDLER] Error for ${messageType}:`, error);
        sendResponse({ 
          success: false, 
          error: error.message || String(error) 
        });
      });

    // КРИТИЧНО: Возвращаем true для асинхронного ответа
    return true;
  };
}

/**
 * Хелпер для отправки сообщений с ожиданием ответа
 */
export async function sendMessageAsync<T = any>(message: any): Promise<T> {
  const response = await chrome.runtime.sendMessage(message);
  
  if (!response) {
    throw new Error('No response received');
  }
  
  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }
  
  return response.result;
}
EOF

# 4. Создаём улучшенную систему обработки задач
echo ""
echo "📝 Создание последовательной системы обработки задач..."

cat > src/background/sequentialTaskQueue.ts << 'EOF'
/**
 * Последовательная очередь задач с защитой от превышения лимитов
 */
import { offscreenSemaphore } from '~/utils/semaphore'
import { sendMessageToOffscreen } from './offscreenManagerFixed'

interface QueueTask {
  id: string;
  url: string;
  selector: string;
}

export class SequentialTaskQueue {
  private queue: QueueTask[] = [];
  private processing = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 секунда базовая задержка
  private readonly TASK_TIMEOUT = 30000; // 30 секунд таймаут

  /**
   * Валидация задачи
   */
  private isValidTask(task: any): task is QueueTask {
    return task && 
           typeof task.id === 'string' && 
           typeof task.url === 'string' && 
           typeof task.selector === 'string';
  }

  /**
   * Добавление задачи в очередь
   */
  async addTask(task: unknown): Promise<void> {
    if (!this.isValidTask(task)) {
      console.error('[TASK QUEUE] Invalid task:', task);
      throw new Error('Invalid task format');
    }

    console.log(`[TASK QUEUE] Adding task ${task.id} to queue`);
    this.queue.push(task);
    
    // Запускаем обработку если не активна
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Обработка очереди задач
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    console.log('[TASK QUEUE] Starting queue processing');

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        
        try {
          await this.processTask(task);
          
          // Пауза между задачами для избежания перегрузки
          await this.delay(1000);
        } catch (error) {
          console.error(`[TASK QUEUE] Failed to process task ${task.id}:`, error);
          // Продолжаем обработку других задач
        }
      }
    } finally {
      this.processing = false;
      console.log('[TASK QUEUE] Queue processing completed');
    }
  }

  /**
   * Обработка одной задачи с повторными попытками
   */
  private async processTask(task: QueueTask): Promise<any> {
    console.log(`[TASK QUEUE] Processing task ${task.id}`);

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Используем семафор для гарантии последовательности
        return await offscreenSemaphore.use(async () => {
          return await this.executeTaskWithTimeout(task);
        });
      } catch (error) {
        console.warn(`[TASK QUEUE] Attempt ${attempt} failed for task ${task.id}:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          // Экспоненциальная задержка с джиттером
          const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 1000; // 0-1 секунда джиттер
          await this.delay(delay + jitter);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Выполнение задачи с таймаутом
   */
  private async executeTaskWithTimeout(task: QueueTask): Promise<any> {
    return Promise.race([
      this.executeTask(task),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Task timeout')), this.TASK_TIMEOUT)
      )
    ]);
  }

  /**
   * Выполнение задачи через offscreen документ
   */
  private async executeTask(task: QueueTask): Promise<any> {
    console.log(`[TASK QUEUE] Executing task ${task.id}`);
    
    const response = await sendMessageToOffscreen({
      type: 'PROCESS_URL',
      url: task.url,
      selector: task.selector,
      requestId: task.id
    });

    if (!response.success) {
      throw new Error(response.error || 'Task execution failed');
    }

    return response.content;
  }

  /**
   * Вспомогательная функция задержки
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получение статистики очереди
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing
    };
  }
}

// Экспортируем единственный экземпляр
export const taskQueue = new SequentialTaskQueue();
EOF

# 5. Создаём улучшенный offscreen процессор
echo ""
echo "📝 Создание улучшенного offscreen процессора..."

cat > src/offscreen/offscreenProcessorFixed.js << 'EOF'
/**
 * Улучшенный процессор для offscreen документа
 * Обрабатывает только одну задачу за раз
 */

class OffscreenProcessor {
  constructor() {
    this.currentIframe = null;
    this.processing = false;
    this.setupMessageHandler();
  }

  setupMessageHandler() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.target !== 'offscreen') {
        return false;
      }

      console.log('[OFFSCREEN] Received message:', request.type);

      switch (request.type) {
        case 'PING':
          sendResponse({ status: 'alive' });
          return false;

        case 'PROCESS_URL':
          this.handleProcessUrl(request, sendResponse);
          return true; // Асинхронный ответ

        default:
          sendResponse({ error: 'Unknown message type' });
          return false;
      }
    });
  }

  async handleProcessUrl(request, sendResponse) {
    const { url, selector, requestId } = request;

    if (this.processing) {
      sendResponse({ 
        success: false, 
        error: 'Another task is being processed' 
      });
      return;
    }

    this.processing = true;
    try {
      const content = await this.processElement(url, selector);
      sendResponse({ 
        success: true, 
        content,
        requestId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[OFFSCREEN] Processing error:', error);
      sendResponse({ 
        success: false, 
        error: error.message,
        requestId
      });
    } finally {
      this.processing = false;
      this.cleanup();
    }
  }

  async processElement(url, selector) {
    console.log(`[OFFSCREEN] Processing ${url} with selector ${selector}`);
    
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.sandbox = 'allow-scripts allow-same-origin';
      
      this.currentIframe = iframe;
      
      const timeout = setTimeout(() => {
        reject(new Error('Iframe load timeout'));
      }, 20000);

      iframe.onload = () => {
        clearTimeout(timeout);
        
        // Даём странице время на загрузку динамического контента
        setTimeout(() => {
          try {
            const doc = iframe.contentDocument;
            if (!doc) {
              throw new Error('Cannot access iframe document');
            }

            const element = doc.querySelector(selector);
            if (!element) {
              throw new Error(`Element not found: ${selector}`);
            }

            resolve(element.textContent || element.innerHTML);
          } catch (error) {
            // CORS ограничение - используем postMessage
            this.handleCrossOrigin(iframe, selector, resolve, reject);
          }
        }, 2000); // 2 секунды на загрузку динамического контента
      };

      iframe.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load page'));
      };

      // Очищаем URL от проблемных фрагментов
      const cleanUrl = url.split('#')[0];
      iframe.src = cleanUrl;
      
      document.body.appendChild(iframe);
    });
  }

  handleCrossOrigin(iframe, selector, resolve, reject) {
    console.log('[OFFSCREEN] Using postMessage for cross-origin');
    
    const messageHandler = (event) => {
      if (event.source !== iframe.contentWindow) return;
      
      if (event.data.type === 'ELEMENT_CONTENT') {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.content);
      }
    };

    window.addEventListener('message', messageHandler);

    // Инжектируем скрипт через URL
    const script = `
      const element = document.querySelector('${selector}');
      if (element) {
        parent.postMessage({
          type: 'ELEMENT_CONTENT',
          content: element.textContent || element.innerHTML
        }, '*');
      }
    `;

    iframe.src = `javascript:${encodeURIComponent(script)}`;
    
    // Таймаут для cross-origin
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      reject(new Error('Cross-origin timeout'));
    }, 5000);
  }

  cleanup() {
    if (this.currentIframe) {
      this.currentIframe.remove();
      this.currentIframe = null;
    }
  }
}

// Создаём единственный экземпляр процессора
const processor = new OffscreenProcessor();

console.log('[OFFSCREEN] Processor initialized');
EOF

# 6. Создаём интеграционный файл
echo ""
echo "📝 Создание интеграционного файла..."

cat > src/background/fixedIntegration.ts << 'EOF'
/**
 * Интеграция всех исправлений
 */
import { createAsyncMessageHandler } from './asyncMessageWrapper'
import { getMonitoringStats, getPerformanceStats } from './monitor'
import { taskQueue } from './sequentialTaskQueue'

// Создаём обработчики для различных типов сообщений
const messageHandlers = {
  'get-monitoring-stats': async () => {
    return await getMonitoringStats();
  },
  
  'get-performance-stats': async () => {
    const queueStats = taskQueue.getStats();
    const perfStats = await getPerformanceStats();
    
    return {
      ...perfStats,
      queue: queueStats
    };
  },
  
  'check-element': async (request: any) => {
    const { task } = request;
    await taskQueue.addTask(task);
    return { queued: true };
  }
};

// Регистрируем обработчик
export function setupFixedMessageHandling(): void {
  console.log('[INTEGRATION] Setting up fixed message handling');
  
  const handler = createAsyncMessageHandler(messageHandlers);
  chrome.runtime.onMessage.addListener(handler);
  
  console.log('[INTEGRATION] Message handling ready');
}
EOF

# 7. Создаём инструкцию по интеграции
echo ""
echo "📝 Создание инструкции..."

cat > ARCHITECTURE_FIX_INSTRUCTIONS.md << 'EOF'
# Инструкции по применению архитектурных исправлений

## Что исправлено:

1. **OffscreenManager** - Singleton паттерн гарантирует только один offscreen документ
2. **Семафор** - Ограничивает параллельность операций
3. **Асинхронные сообщения** - Правильная обработка с return true
4. **Последовательная очередь** - Задачи обрабатываются по одной
5. **Валидация** - Проверка всех объектов перед использованием

## Интеграция:

### 1. Замените старый offscreenManager:
```typescript
// В src/background/index.ts
import { setupOffscreenEventHandlers } from './offscreenManagerFixed'
import { setupFixedMessageHandling } from './fixedIntegration'

// Вместо старых обработчиков
setupFixedMessageHandling();
setupOffscreenEventHandlers();
```

### 2. Замените старый offscreen.js:
```bash
cp src/offscreen/offscreenProcessorFixed.js src/offscreen/offscreen.js
```

### 3. Обновите импорты в reliabilityManager.ts:
```typescript
import { 
  ensureOffscreenDocument, 
  hasOffscreenDocument, 
  closeOffscreenDocument, 
  pingOffscreenDocument, 
  invalidateCache 
} from './offscreenManagerFixed'
```

### 4. Используйте новую очередь в monitor:
```typescript
import { taskQueue } from '../sequentialTaskQueue'

// Вместо старой очереди
await taskQueue.addTask({
  id: task.id,
  url: task.url,
  selector: task.selector
});
```

## Тестирование:

```javascript
// В консоли Service Worker
chrome.runtime.sendMessage({type: 'get-monitoring-stats'})
  .then(console.log)
  .catch(console.error)

// Должно вернуть данные без ошибок
```

## Важно:

- Все задачи теперь обрабатываются последовательно
- Только один iframe активен в любой момент времени
- Автоматические повторные попытки с экспоненциальной задержкой
- Правильная обработка CORS через postMessage
EOF

echo ""
echo "✅ Архитектурные исправления созданы!"
echo ""
echo "📋 Следующие шаги:"
echo "  1. Изучите ARCHITECTURE_FIX_INSTRUCTIONS.md"
echo "  2. Примените изменения согласно инструкции"
echo "  3. Пересоберите проект: ./build.sh"
echo "  4. Протестируйте исправленную систему"
echo ""
echo "⚠️  Основные изменения:"
echo "  - Только один offscreen документ (Singleton)"
echo "  - Последовательная обработка задач"
echo "  - Правильная обработка асинхронных сообщений"
echo "  - Защита от превышения лимитов"

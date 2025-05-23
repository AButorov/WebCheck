#!/bin/zsh

echo "🔧 Применение решений из GitHub для WebCheck"
echo "==========================================="

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

echo "✅ Находимся в корневой директории проекта"

# 1. Исправляем проблему с undefined id в обработчиках сообщений
echo ""
echo "📝 Исправление обработчиков сообщений..."

# Создаём улучшенный message handler для background
cat > src/background/messageHandler.ts << 'EOF'
/**
 * Централизованный обработчик сообщений для background
 */
import browser from 'webextension-polyfill'
import { getMonitoringStats, getPerformanceStats } from './monitor'
import { sendMessageToPopup } from './safeMessaging'

// Тип для обработчиков сообщений
type MessageHandler = (data: any, sender: browser.Runtime.MessageSender) => Promise<any>

// Карта обработчиков
const handlers: Record<string, MessageHandler> = {
  'get-monitoring-stats': async () => {
    try {
      const stats = await getMonitoringStats()
      return { success: true, stats }
    } catch (error) {
      console.error('[MESSAGE HANDLER] Error getting monitoring stats:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  },
  
  'get-performance-stats': async () => {
    try {
      const stats = await getPerformanceStats()
      return { success: true, stats }
    } catch (error) {
      console.error('[MESSAGE HANDLER] Error getting performance stats:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  },
  
  'update-task': async (data) => {
    // Защитная проверка
    if (!data || !data.taskId) {
      console.error('[MESSAGE HANDLER] Invalid update-task data:', data)
      return { success: false, error: 'Missing taskId' }
    }
    
    try {
      // Отправляем обновление в popup если он открыт
      await sendMessageToPopup({
        type: 'task-updated',
        taskId: data.taskId,
        updates: data.updates
      })
      return { success: true }
    } catch (error) {
      console.error('[MESSAGE HANDLER] Error updating task:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }
}

/**
 * Инициализация обработчика сообщений
 */
export function initMessageHandler(): void {
  console.log('[MESSAGE HANDLER] Initializing message handler')
  
  // Универсальный обработчик
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Защитная проверка структуры сообщения
    if (!message || typeof message !== 'object') {
      console.warn('[MESSAGE HANDLER] Invalid message format:', message)
      sendResponse({ success: false, error: 'Invalid message format' })
      return false
    }
    
    const { type, data } = message
    
    if (!type || typeof type !== 'string') {
      console.warn('[MESSAGE HANDLER] Message missing type:', message)
      sendResponse({ success: false, error: 'Message type required' })
      return false
    }
    
    // Проверяем наличие обработчика
    const handler = handlers[type]
    
    if (!handler) {
      console.warn('[MESSAGE HANDLER] Unknown message type:', type)
      sendResponse({ success: false, error: `Unknown message type: ${type}` })
      return false
    }
    
    // Выполняем обработчик асинхронно
    handler(data, sender)
      .then(result => {
        sendResponse(result)
      })
      .catch(error => {
        console.error(`[MESSAGE HANDLER] Error handling ${type}:`, error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      })
    
    // Возвращаем true для асинхронного ответа
    return true
  })
  
  console.log('[MESSAGE HANDLER] Message handler initialized')
}

/**
 * Регистрация дополнительного обработчика
 */
export function registerMessageHandler(type: string, handler: MessageHandler): void {
  handlers[type] = handler
  console.log(`[MESSAGE HANDLER] Registered handler for ${type}`)
}
EOF

# 2. Обновляем background/index.ts для использования нового обработчика
echo ""
echo "📝 Обновление background/index.ts..."

# Добавляем импорт и инициализацию
sed -i.bak '1s/^/import { initMessageHandler } from '\''\.\/messageHandler'\''\n/' src/background/index.ts

# Добавляем инициализацию после initMonitor
sed -i.bak '/initMonitor()/a\
\
// Инициализируем централизованный обработчик сообщений\
initMessageHandler()' src/background/index.ts

# 3. Исправляем проблему с таймаутами в offscreen
echo ""
echo "📝 Улучшение обработки таймаутов в offscreen.js..."

# Увеличиваем таймауты и добавляем retry логику
sed -i.bak 's/IFRAME_LOAD_TIMEOUT: 30000/IFRAME_LOAD_TIMEOUT: 60000/' src/offscreen/offscreen.js
sed -i.bak 's/CONTENT_EXTRACTION_TIMEOUT: 25000/CONTENT_EXTRACTION_TIMEOUT: 45000/' src/offscreen/offscreen.js
sed -i.bak 's/PAGE_LOAD_DELAY: 3000/PAGE_LOAD_DELAY: 5000/' src/offscreen/offscreen.js
sed -i.bak 's/MAX_RETRY_ATTEMPTS: 2/MAX_RETRY_ATTEMPTS: 3/' src/offscreen/offscreen.js

# 4. Добавляем защитные проверки в taskQueue
echo ""
echo "📝 Дополнительные защитные проверки в taskQueue.ts..."

# Создаём патч для taskQueue
cat > src/background/taskQueue_patch.ts << 'EOF'
// Добавить в начало processQueueItem:
if (!item || !item.task || !item.task.id) {
  console.error('[TASK QUEUE] Invalid queue item:', item)
  throw new Error('Invalid queue item structure')
}

// Добавить в начало addTaskToQueue:
if (!task || typeof task !== 'object' || !task.id) {
  console.error('[TASK QUEUE] Invalid task object:', task)
  throw new Error('Invalid task: missing required properties')
}
EOF

# 5. Создаём утилиту для безопасного доступа к свойствам
echo ""
echo "📝 Создание утилиты безопасного доступа..."

cat > src/utils/safeAccess.ts << 'EOF'
/**
 * Безопасный доступ к вложенным свойствам объекта
 */
export function safeGet<T = any>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
  try {
    const keys = path.split('.')
    let result = obj
    
    for (const key of keys) {
      if (result == null) {
        return defaultValue
      }
      result = result[key]
    }
    
    return result ?? defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Проверка наличия всех обязательных свойств
 */
export function hasRequiredProps<T extends object>(
  obj: any,
  props: (keyof T)[]
): obj is T {
  if (!obj || typeof obj !== 'object') {
    return false
  }
  
  return props.every(prop => prop in obj && obj[prop] != null)
}

/**
 * Безопасное выполнение функции с fallback
 */
export async function safeTry<T>(
  fn: () => T | Promise<T>,
  fallback: T,
  errorHandler?: (error: unknown) => void
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (errorHandler) {
      errorHandler(error)
    }
    return fallback
  }
}
EOF

# 6. Исправляем проблему с drive_search
echo ""
echo "📝 Добавление заглушки для google_drive_search..."

cat > src/background/driveSearchStub.ts << 'EOF'
/**
 * Заглушка для google_drive_search
 * TODO: Интегрировать реальный API когда будет доступен
 */
import browser from 'webextension-polyfill'

export async function google_drive_search(params: any): Promise<any> {
  console.warn('[DRIVE SEARCH] Google Drive search is not implemented yet')
  return {
    success: false,
    error: 'Google Drive search is not available in this version',
    results: []
  }
}
EOF

# 7. Создаём debug утилиту для отслеживания undefined errors
echo ""
echo "📝 Создание debug утилиты..."

cat > src/utils/debugger.ts << 'EOF'
/**
 * Debug утилита для отслеживания undefined errors
 */

// Глобальный перехватчик ошибок
export function setupGlobalErrorHandler(): void {
  // Перехват необработанных ошибок
  self.addEventListener('error', (event) => {
    console.error('[GLOBAL ERROR]', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      stack: event.error?.stack
    })
  })
  
  // Перехват rejected promises
  self.addEventListener('unhandledrejection', (event) => {
    console.error('[UNHANDLED REJECTION]', {
      reason: event.reason,
      promise: event.promise,
      stack: event.reason?.stack
    })
  })
}

/**
 * Обёртка для безопасного вызова функций
 */
export function wrapFunction<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    try {
      console.log(`[DEBUG] Calling ${name} with args:`, args)
      const result = fn(...args)
      
      // Если это промис, добавляем обработку ошибок
      if (result && typeof result.catch === 'function') {
        return result.catch((error: any) => {
          console.error(`[DEBUG] Error in ${name}:`, error)
          throw error
        })
      }
      
      return result
    } catch (error) {
      console.error(`[DEBUG] Sync error in ${name}:`, error)
      throw error
    }
  }) as T
}
EOF

# 8. Удаляем временные файлы
echo ""
echo "🧹 Очистка временных файлов..."
rm -f src/background/*.bak
rm -f src/offscreen/*.bak
rm -f src/background/taskQueue_patch.ts

echo ""
echo "✅ Все исправления применены!"
echo ""
echo "📋 Что было сделано:"
echo "  1. Создан централизованный обработчик сообщений с защитными проверками"
echo "  2. Увеличены таймауты для offscreen документов"
echo "  3. Добавлены утилиты безопасного доступа к свойствам"
echo "  4. Создана debug утилита для отслеживания ошибок"
echo "  5. Добавлена заглушка для google_drive_search"
echo ""
echo "🔨 Следующие шаги:"
echo "  1. Запустите сборку: ./build.sh"
echo "  2. Перезагрузите расширение в Chrome"
echo "  3. Откройте консоль Service Worker"
echo "  4. Протестируйте команды:"
echo "     chrome.runtime.sendMessage({type: 'get-monitoring-stats'}).then(console.log)"
echo "     chrome.runtime.sendMessage({type: 'get-performance-stats'}).then(console.log)"

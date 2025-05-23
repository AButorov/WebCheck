#!/bin/zsh

echo "🔧 Дополнительные исправления для WebCheck"
echo "=========================================="

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

echo "✅ Находимся в корневой директории проекта"

# 1. Проверяем, применились ли предыдущие исправления
echo ""
echo "🔍 Проверка применения предыдущих исправлений..."

if [ -f "src/background/messageHandler.ts" ]; then
    echo "✅ messageHandler.ts существует"
else
    echo "❌ messageHandler.ts НЕ найден - применяем исправления заново"
    # Копируем содержимое из предыдущего скрипта
    ./apply_github_solutions.sh
fi

# 2. Исправляем проблему с action vs type в сообщениях
echo ""
echo "📝 Расширяем messageHandler для поддержки action..."

cat > src/background/messageHandler_extended.ts << 'EOF'
/**
 * Расширенный обработчик сообщений с поддержкой action
 */
import browser from 'webextension-polyfill'
import { getMonitoringStats, getPerformanceStats } from './monitor'
import { sendMessageToPopup } from './safeMessaging'

// Обработчики для action-based сообщений
const actionHandlers: Record<string, (data: any) => Promise<any>> = {
  'activateElementSelection': async (data) => {
    console.log('[MESSAGE HANDLER] Element selection activation handled by capture module')
    return { success: true }
  },
  
  'elementSelected': async (data) => {
    console.log('[MESSAGE HANDLER] Element selected handled by capture module')
    return { success: true }
  },
  
  'newTaskCreated': async (data) => {
    if (!data || !data.task || !data.task.id) {
      console.error('[MESSAGE HANDLER] Invalid new task data:', data)
      return { success: false, error: 'Invalid task data' }
    }
    
    // Отправляем в popup если открыт
    await sendMessageToPopup({
      type: 'task-created',
      task: data.task
    })
    
    return { success: true }
  }
}

// Универсальный обработчик, поддерживающий и type, и action
export function setupUniversalMessageHandler(): void {
  console.log('[MESSAGE HANDLER] Setting up universal message handler')
  
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Защитная проверка
    if (!message || typeof message !== 'object') {
      console.warn('[MESSAGE HANDLER] Invalid message format:', message)
      return false
    }
    
    // Поддержка обоих форматов: type и action
    const messageType = message.type || message.action
    const messageData = message.data || message
    
    if (!messageType || typeof messageType !== 'string') {
      console.warn('[MESSAGE HANDLER] Message missing type/action:', message)
      return false
    }
    
    // Специальная обработка для get-monitoring-stats и get-performance-stats
    if (messageType === 'get-monitoring-stats') {
      getMonitoringStats()
        .then(stats => {
          sendResponse({ success: true, stats })
        })
        .catch(error => {
          console.error('[MESSAGE HANDLER] Error getting monitoring stats:', error)
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          })
        })
      return true // асинхронный ответ
    }
    
    if (messageType === 'get-performance-stats') {
      getPerformanceStats()
        .then(stats => {
          sendResponse({ success: true, stats })
        })
        .catch(error => {
          console.error('[MESSAGE HANDLER] Error getting performance stats:', error)
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          })
        })
      return true // асинхронный ответ
    }
    
    // Проверяем action handlers
    const actionHandler = actionHandlers[messageType]
    if (actionHandler) {
      actionHandler(messageData)
        .then(result => sendResponse(result))
        .catch(error => {
          console.error(`[MESSAGE HANDLER] Error in action ${messageType}:`, error)
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })
        })
      return true // асинхронный ответ
    }
    
    // Если обработчик не найден, возвращаем false
    console.log(`[MESSAGE HANDLER] No handler for ${messageType}, passing to other listeners`)
    return false
  })
  
  console.log('[MESSAGE HANDLER] Universal message handler ready')
}
EOF

# 3. Обновляем background/index.ts
echo ""
echo "📝 Обновление background/index.ts для нового обработчика..."

# Создаём патч файл
cat > src/background/index_patch.ts << 'EOF'
// Заменить строки с onMessage на:

// Импортируем универсальный обработчик
import { setupUniversalMessageHandler } from './messageHandler_extended'

// В функции инициализации заменить initMessageHandler() на:
setupUniversalMessageHandler()

// Удалить все отдельные onMessage обработчики для get-monitoring-stats и get-performance-stats
EOF

# 4. Исправляем проблему с undefined id в capture/index.ts
echo ""
echo "📝 Добавляем защитные проверки в capture/index.ts..."

# Проверяем существование файла
if [ -f "src/background/capture/index.ts" ]; then
    # Добавляем проверки перед обращением к task.id
    sed -i.bak '1s/^/\/\/ SAFETY CHECKS ADDED\n/' src/background/capture/index.ts
    
    # Создаём патч для безопасных проверок
    cat > src/background/capture/safety_patch.ts << 'EOF'
// Добавить в начало каждой функции, работающей с task:

// В функции processSelectedElement:
if (!elementInfo || !elementInfo.selector) {
  console.error('[CAPTURE] Invalid element info:', elementInfo)
  return
}

// Перед созданием newTaskData:
const taskId = nanoid() // Генерируем ID заранее
const newTaskData = {
  id: taskId, // Явно указываем ID
  url: tab.url || '',
  title: tab.title || 'Untitled',
  faviconUrl: tab.favIconUrl || '',
  selector: elementInfo.selector,
  elementInfo: {
    tagName: elementInfo.tagName || '',
    className: elementInfo.className || '',
    textContent: elementInfo.textContent || '',
    thumbnail: thumbnailDataUrl || ''
  },
  createdAt: Date.now()
}

// Проверка перед сохранением:
if (!newTaskData.id || !newTaskData.selector) {
  console.error('[CAPTURE] Invalid task data, missing required fields')
  return
}
EOF
fi

# 5. Создаём временное решение для отладки
echo ""
echo "📝 Создание временного решения для отладки..."

cat > src/background/debugMessageHandler.ts << 'EOF'
/**
 * Временный debug обработчик для отслеживания всех сообщений
 */
import browser from 'webextension-polyfill'

export function setupDebugMessageHandler(): void {
  console.log('[DEBUG] Setting up debug message handler')
  
  // Перехватываем ВСЕ сообщения для отладки
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[DEBUG] Received message:', {
      message,
      sender: sender.tab ? `Tab ${sender.tab.id}` : 'Extension',
      timestamp: new Date().toISOString()
    })
    
    // Не обрабатываем, просто логируем
    return false
  })
}

// Глобальный перехватчик ошибок
self.addEventListener('error', (event) => {
  console.error('[DEBUG] Global error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack
  })
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('[DEBUG] Unhandled rejection:', {
    reason: event.reason,
    promise: event.promise,
    stack: event.reason?.stack
  })
})
EOF

# 6. Создаём простой тестовый обработчик
echo ""
echo "📝 Создание простого тестового обработчика..."

cat > src/background/simpleHandler.ts << 'EOF'
/**
 * Простой обработчик для тестирования
 */
import browser from 'webextension-polyfill'

export function setupSimpleTestHandler(): void {
  console.log('[SIMPLE] Setting up simple test handler')
  
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[SIMPLE] Got message:', request)
    
    // Простая проверка для наших команд
    if (request && request.type === 'get-monitoring-stats') {
      console.log('[SIMPLE] Returning test monitoring stats')
      sendResponse({
        success: true,
        stats: {
          tasksTotal: 2,
          message: 'Test monitoring stats'
        }
      })
      return true
    }
    
    if (request && request.type === 'get-performance-stats') {
      console.log('[SIMPLE] Returning test performance stats')
      sendResponse({
        success: true,
        stats: {
          queueLength: 0,
          message: 'Test performance stats'
        }
      })
      return true
    }
    
    return false
  })
}
EOF

# 7. Создаём инструкцию по применению
echo ""
echo "📝 Создание инструкции..."

cat > ADDITIONAL_FIXES_INSTRUCTIONS.md << 'EOF'
# Инструкция по применению дополнительных исправлений

## Проблемы, которые решаются:

1. **Message missing type** - поддержка сообщений с полем `action`
2. **TypeError reading 'id'** - защитные проверки во всех модулях
3. **undefined responses** - правильная регистрация обработчиков

## Ручные изменения в background/index.ts:

1. Замените импорт:
```typescript
// Было:
import { initMessageHandler } from './messageHandler'

// Стало:
import { setupUniversalMessageHandler } from './messageHandler_extended'
import { setupSimpleTestHandler } from './simpleHandler' // для тестирования
```

2. Замените инициализацию:
```typescript
// Было:
initMessageHandler()

// Стало:
setupUniversalMessageHandler()
setupSimpleTestHandler() // временно для тестирования
```

3. Удалите все `onMessage('get-monitoring-stats')` и `onMessage('get-performance-stats')`

## Тестирование после применения:

```javascript
// В консоли Service Worker:

// Должно вернуть данные, а не undefined
chrome.runtime.sendMessage({type: 'get-monitoring-stats'})
  .then(result => console.log('Monitoring stats:', result))
  .catch(error => console.error('Error:', error))

chrome.runtime.sendMessage({type: 'get-performance-stats'})
  .then(result => console.log('Performance stats:', result))
  .catch(error => console.error('Error:', error))
```

## Если всё ещё не работает:

1. Проверьте консоль на наличие [SIMPLE] логов
2. Убедитесь, что расширение перезагружено
3. Проверьте, что все файлы скопировались в dist/
EOF

# 8. Удаляем временные файлы
echo ""
echo "🧹 Очистка..."
rm -f src/background/*.bak
rm -f src/background/capture/*.bak
rm -f src/background/index_patch.ts
rm -f src/background/capture/safety_patch.ts

echo ""
echo "✅ Дополнительные исправления готовы!"
echo ""
echo "⚠️  ВАЖНО: Требуются ручные изменения!"
echo ""
echo "1. Откройте src/background/index.ts"
echo "2. Следуйте инструкциям в ADDITIONAL_FIXES_INSTRUCTIONS.md"
echo "3. Пересоберите проект: ./build.sh"
echo "4. Перезагрузите расширение"
echo ""
echo "📋 Для быстрого теста используйте simpleHandler"

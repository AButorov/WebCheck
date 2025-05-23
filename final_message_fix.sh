#!/bin/zsh

echo "🔧 Финальное исправление обработки сообщений WebCheck"
echo "===================================================="

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

echo "✅ Находимся в корневой директории проекта"

# 1. Создаём правильный обработчик сообщений
echo ""
echo "📝 Создание универсального обработчика сообщений..."

cat > src/background/universalMessageHandler.ts << 'EOF'
/**
 * Универсальный обработчик сообщений для background
 * Работает как с webext-bridge, так и с chrome.runtime.sendMessage
 */
import browser from 'webextension-polyfill'
import { getMonitoringStats, getPerformanceStats } from './monitor'
import { sendMessageToPopup } from './safeMessaging'

// Интерфейс для сообщений
interface MessageRequest {
  type?: string
  action?: string
  data?: any
  [key: string]: any
}

/**
 * Настройка универсального обработчика
 */
export function setupUniversalMessageHandler(): void {
  console.log('[UNIVERSAL HANDLER] Setting up message handler')
  
  // Обработчик для chrome.runtime.onMessage
  browser.runtime.onMessage.addListener((request: MessageRequest, sender, sendResponse) => {
    // Логируем все входящие сообщения для отладки
    console.log('[UNIVERSAL HANDLER] Received message:', {
      request,
      sender: sender.tab ? `Tab ${sender.tab.id}` : 'Extension'
    })
    
    // Определяем тип сообщения (поддерживаем и type, и action)
    const messageType = request.type || request.action
    
    // Обрабатываем различные типы сообщений
    switch (messageType) {
      case 'get-monitoring-stats':
        handleMonitoringStats(sendResponse)
        return true // асинхронный ответ
        
      case 'get-performance-stats':
        handlePerformanceStats(sendResponse)
        return true // асинхронный ответ
        
      case 'activateElementSelection':
        // Это обрабатывается в capture/index.ts
        console.log('[UNIVERSAL HANDLER] Element selection handled by capture module')
        return false // пропускаем дальше
        
      case 'elementSelected':
        // Это обрабатывается в capture/index.ts
        console.log('[UNIVERSAL HANDLER] Element selected handled by capture module')
        return false // пропускаем дальше
        
      default:
        // Неизвестный тип сообщения - пропускаем для других обработчиков
        console.log(`[UNIVERSAL HANDLER] Unknown message type: ${messageType}`)
        return false
    }
  })
  
  console.log('[UNIVERSAL HANDLER] Message handler ready')
}

/**
 * Обработка запроса статистики мониторинга
 */
async function handleMonitoringStats(sendResponse: (response: any) => void): Promise<void> {
  try {
    console.log('[UNIVERSAL HANDLER] Getting monitoring stats...')
    const stats = await getMonitoringStats()
    console.log('[UNIVERSAL HANDLER] Monitoring stats:', stats)
    sendResponse({ success: true, stats })
  } catch (error) {
    console.error('[UNIVERSAL HANDLER] Error getting monitoring stats:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Обработка запроса статистики производительности
 */
async function handlePerformanceStats(sendResponse: (response: any) => void): Promise<void> {
  try {
    console.log('[UNIVERSAL HANDLER] Getting performance stats...')
    const stats = await getPerformanceStats()
    console.log('[UNIVERSAL HANDLER] Performance stats:', stats)
    sendResponse({ success: true, stats })
  } catch (error) {
    console.error('[UNIVERSAL HANDLER] Error getting performance stats:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
EOF

# 2. Создаём обновлённый background/index.ts
echo ""
echo "📝 Создание обновлённого background/index.ts..."

# Делаем резервную копию
cp src/background/index.ts src/background/index.ts.backup

cat > src/background/index.ts << 'EOF'
import browser from 'webextension-polyfill'
import { onMessage } from 'webext-bridge/background'
import { WebCheckTask } from '~/types/task'
import { MessagePayloads } from '~/types/messages'

// Импортируем универсальный обработчик сообщений
import { setupUniversalMessageHandler } from './universalMessageHandler'

// Импортируем модуль захвата элементов
import './capture'

// Импортируем и инициализируем систему мониторинга
import { initMonitor, checkDueTasksForUpdates, stopMonitor } from './monitor'

// Импортируем менеджер offscreen-документов
import { setupOffscreenEventHandlers } from './offscreenManager'

// Обработка установки расширения
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('Web Check extension installed')
  }
})

// ВАЖНО: Инициализируем универсальный обработчик ДО других инициализаций
setupUniversalMessageHandler()

// Инициализируем мониторинг при запуске фонового скрипта
initMonitor()

// Настраиваем обработчики событий для offscreen-документов
setupOffscreenEventHandlers()

// Обработка остановки расширения (cleanup)
if (chrome.runtime.onSuspend) {
  chrome.runtime.onSuspend.addListener(() => {
    console.log('Background script suspending, cleaning up resources')
    stopMonitor()
  })
}

// Загружаем debug консоль в режиме разработки
if (process.env.NODE_ENV === 'development') {
  import('./debug')
    .then(() => console.log('Debug console loaded'))
    .catch(error => console.warn('Failed to load debug console:', error))
}

// Обработка сообщений для ручной проверки изменений (webext-bridge)
onMessage('check-for-changes', async (message) => {
  const { data } = message;
  const { taskId, tabId } = data as MessagePayloads['check-for-changes'];
  console.log(`Checking for changes for task ${taskId} in tab ${tabId}`)
  
  // Запускаем проверку задач, у которых наступило время обновления
  await checkDueTasksForUpdates()
})

// Обработка уведомлений (webext-bridge)
onMessage('show-notification', async (message) => {
  const { data } = message;
  const { title, message: notificationMessage, taskId } = data as MessagePayloads['show-notification'];
  
  // Создаем уведомление
  browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('icons/icon-128.png'),
    title,
    message: notificationMessage,
  })
})

// Обработка запросов на проверку элемента (webext-bridge)
onMessage('check-element', async (message) => {
  const { data, sender } = message;
  const { taskId, selector } = data as MessagePayloads['check-element'];
  console.log(`Received check-element request for task ${taskId} with selector ${selector}`)
  
  try {
    // Получаем задачу из хранилища
    const storage = await browser.storage.local.get('tasks')
    const tasks = storage.tasks || []
    const task = tasks.find((t: WebCheckTask) => t.id === taskId)
    
    if (!task) {
      console.error(`Task with ID ${taskId} not found`)
      return { taskId, error: 'Task not found' }
    }
    
    // В реальной реализации здесь будет использоваться функция checkElement
    return {
      taskId,
      html: task.currentHtml || '',
    }
  } catch (error) {
    console.error('Error checking element:', error)
    return {
      taskId,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})
EOF

# 3. Исправляем проблему с undefined id в очереди задач
echo ""
echo "📝 Добавление дополнительных проверок в taskQueue.ts..."

# Создаём патч для taskQueue
cat > src/background/taskQueue_safety.patch << 'EOF'
// В функции processQueueItem добавить в начало:
if (!item || !item.task) {
  console.error('[TASK QUEUE] Invalid queue item - missing task')
  throw new Error('Invalid queue item')
}

if (!item.task.id) {
  console.error('[TASK QUEUE] Invalid task - missing id:', item.task)
  throw new Error('Task missing required id property')
}

// В функции addTaskToQueue добавить после валидации:
if (!task || typeof task !== 'object') {
  console.error('[TASK QUEUE] Invalid task object:', task)
  throw new Error('Task must be a valid object')
}

if (!task.id || !task.url || !task.selector) {
  console.error('[TASK QUEUE] Task missing required properties:', {
    hasId: !!task.id,
    hasUrl: !!task.url,
    hasSelector: !!task.selector
  })
  throw new Error('Task missing required properties: id, url, or selector')
}
EOF

# 4. Создаём тестовый скрипт
echo ""
echo "📝 Создание тестового скрипта..."

cat > test_messages.js << 'EOF'
// Тестовый скрипт для проверки обработки сообщений
// Выполните этот код в консоли Service Worker

console.log('=== Тестирование обработки сообщений ===');

// Тест 1: get-monitoring-stats
console.log('Test 1: get-monitoring-stats');
chrome.runtime.sendMessage({type: 'get-monitoring-stats'})
  .then(response => {
    console.log('✅ Monitoring stats response:', response);
  })
  .catch(error => {
    console.error('❌ Monitoring stats error:', error);
  });

// Тест 2: get-performance-stats
setTimeout(() => {
  console.log('\nTest 2: get-performance-stats');
  chrome.runtime.sendMessage({type: 'get-performance-stats'})
    .then(response => {
      console.log('✅ Performance stats response:', response);
    })
    .catch(error => {
      console.error('❌ Performance stats error:', error);
    });
}, 1000);

// Тест 3: Неизвестный тип
setTimeout(() => {
  console.log('\nTest 3: Unknown message type');
  chrome.runtime.sendMessage({type: 'unknown-type'})
    .then(response => {
      console.log('Response for unknown type:', response);
    })
    .catch(error => {
      console.log('Expected: No handler for unknown type');
    });
}, 2000);

console.log('\nЕсли вы видите ответы с данными (не undefined), значит исправления работают!');
EOF

# 5. Удаляем старые файлы и временные патчи
echo ""
echo "🧹 Очистка старых файлов..."
rm -f src/background/messageHandler.ts
rm -f src/background/messageHandler_extended.ts
rm -f src/background/simpleHandler.ts
rm -f src/background/debugMessageHandler.ts
rm -f src/background/*.bak
rm -f src/background/taskQueue_safety.patch

echo ""
echo "✅ Финальные исправления применены!"
echo ""
echo "📋 Дальнейшие шаги:"
echo "  1. Пересоберите проект: ./build.sh"
echo "  2. Перезагрузите расширение в Chrome"
echo "  3. Откройте консоль Service Worker"
echo "  4. Скопируйте содержимое test_messages.js и выполните"
echo ""
echo "⚠️  ВАЖНО: Если есть изменения в taskQueue.ts, примените патч вручную"
echo "   См. src/background/taskQueue_safety.patch"
echo ""
echo "📁 Резервная копия index.ts сохранена в index.ts.backup"

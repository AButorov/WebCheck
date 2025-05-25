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

# 🏗️ Архитектурное решение проблем WebCheck

## 🔍 Анализ корневых проблем

### 1. **Превышение лимита Offscreen API**
**Проблема**: Offscreen API позволяет создать **только один offscreen-документ на всё расширение**. Текущая реализация пытается создавать множественные iframe одновременно.

**Решение**: Singleton паттерн для OffscreenManager + последовательная обработка задач.

### 2. **Закрытие канала сообщений**
**Проблема**: "A listener indicated an asynchronous response by returning true, but the message channel closed"

**Решение**: Правильная обработка асинхронных сообщений с обязательным `return true`.

### 3. **Конфликт систем обработки сообщений**
**Проблема**: Одновременное использование `webext-bridge` и `chrome.runtime.onMessage` создаёт конфликты.

**Решение**: Единая система обработки с createAsyncMessageHandler.

### 4. **TypeError: reading 'id' of undefined**
**Проблема**: Отсутствие валидации объектов перед использованием.

**Решение**: Строгая валидация всех задач с TypeScript type guards.

## ✅ Архитектурные решения

### 1. Singleton OffscreenManager
```typescript
class OffscreenManager {
  private static instance: OffscreenManager;
  
  static getInstance(): OffscreenManager {
    if (!OffscreenManager.instance) {
      OffscreenManager.instance = new OffscreenManager();
    }
    return OffscreenManager.instance;
  }
}
```

### 2. Семафор для контроля параллельности
```typescript
const offscreenSemaphore = new Semaphore(1); // Только одна операция
```

### 3. Последовательная очередь задач
```typescript
class SequentialTaskQueue {
  private processing = false;
  
  async processQueue() {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      await this.processTask(task);
      await this.delay(1000); // Пауза между задачами
    }
  }
}
```

### 4. Правильная обработка асинхронных сообщений
```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  asyncHandler(request)
    .then(result => sendResponse({ success: true, result }))
    .catch(error => sendResponse({ success: false, error }));
  
  return true; // КРИТИЧНО для асинхронного ответа
});
```

## 🚀 Применение исправлений

```bash
# 1. Сделайте скрипт исполняемым
chmod +x apply_architecture_fixes.sh

# 2. Запустите создание исправлений
./apply_architecture_fixes.sh

# 3. Следуйте инструкциям в ARCHITECTURE_FIX_INSTRUCTIONS.md

# 4. Пересоберите проект
./build.sh
```

## 📋 Что изменится после применения

### До исправлений:
- ❌ Множественные попытки создать offscreen документы
- ❌ Параллельная обработка вызывает превышение лимитов
- ❌ Асинхронные сообщения теряются
- ❌ TypeError при обращении к undefined

### После исправлений:
- ✅ Только один offscreen документ (Singleton)
- ✅ Последовательная обработка задач
- ✅ Надёжная доставка асинхронных сообщений
- ✅ Валидация всех данных перед использованием

## 🏗️ Новая архитектура

```
┌─────────────────┐
│ Service Worker  │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Semaphore│ (Ограничивает до 1 операции)
    └────┬─────┘
         │
┌────────▼────────┐
│ Sequential Queue│ (Обрабатывает по одной задаче)
└────────┬────────┘
         │
┌────────▼────────┐
│OffscreenManager│ (Singleton - один документ)
└────────┬────────┘
         │
┌────────▼────────┐
│Offscreen Document│ (Один iframe за раз)
└─────────────────┘
```

## ⚡ Производительность

- **Задержка между задачами**: 1 секунда (предотвращает перегрузку)
- **Таймаут задачи**: 30 секунд
- **Повторные попытки**: 3 с экспоненциальной задержкой
- **Джиттер**: 0-1 секунда (избегает конфликтов)

## 🧪 Тестирование

После применения исправлений:

```javascript
// Тест 1: Статистика должна возвращаться без ошибок
chrome.runtime.sendMessage({type: 'get-monitoring-stats'})
  .then(result => console.log('✅ Stats:', result))
  .catch(error => console.error('❌ Error:', error))

// Тест 2: Добавление задачи в очередь
chrome.runtime.sendMessage({
  type: 'check-element',
  task: {
    id: 'test123',
    url: 'https://example.com',
    selector: 'h1'
  }
}).then(result => console.log('✅ Queued:', result))
```

## 📚 Ссылки

- [Chrome Offscreen API Documentation](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
- [Async Message Handling in Chrome Extensions](https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate)

---

**Это решение основано на официальных ограничениях Chrome API и best practices из документации.**

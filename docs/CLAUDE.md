# Web Check - Справочник для Claude AI

<project_info>
Название: Web Check
Тип: Chrome Extension (Manifest V3)
Технологии: Vue 3 + TypeScript + Vite + Pinia
Статус: Финальная отладка системы фонового мониторинга
</project_info>

## 🚀 Основные команды

### Сборка и запуск

```bash
# Основная сборка (production)
./build.sh

# Разработка
./build.sh dev

# Отладка
./build.sh debug

# Полная пересборка
./build.sh clean

# Генерация иконок
./build.sh icons

# Только валидация
./build.sh validate
```

### Отладка и тестирование

```bash
# Проверка иконок
./scripts/check_icons.sh

# Резервное копирование
./backup.sh

# Очистка временных файлов
./clear.sh
```

## 🛠️ Стиль кодирования

### TypeScript

- Используй строгую типизацию
- Обязательные type guards для объектов
- Интерфейсы для всех API
- Проверки `task?.id` перед использованием

### Vue 3

- Composition API только
- `defineComponent` для CSP совместимости
- Без eval() и dynamic imports
- Строгий CSP: `script-src 'self'`

### Chrome Extension

- Manifest V3 только
- Service Worker для background
- Offscreen API для невидимого мониторинга
- Content Scripts без ES modules

## ⚠️ Критические особенности

### Offscreen API ограничения

```typescript
// ТОЛЬКО ОДИН offscreen документ на всё расширение!
// Используй Singleton паттерн
const offscreenManager = OffscreenManager.getInstance()
```

### Асинхронные сообщения

```typescript
// ОБЯЗАТЕЛЬНО return true для async
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleAsyncMessage(message).then(sendResponse)
  return true // КРИТИЧЕСКИ ВАЖНО!
})
```

### Валидация задач

```typescript
// ВСЕГДА проверяй объекты
if (!task || !task.id || !task.url) {
  console.warn('Invalid task:', task)
  return
}
```

## 🏗️ Архитектура

### Основные компоненты

- **Background Service Worker**: `src/background/index.ts`
- **Offscreen Manager**: `src/background/offscreenManager.ts`
- **Task Queue**: `src/background/taskQueue.ts`
- **Reliability Manager**: `src/background/reliabilityManager.ts`
- **Content Scripts**: `src/content-script/index-legacy.js`
- **Popup UI**: `src/ui/popup/`
- **Options UI**: `src/ui/options/`

### Система мониторинга

1. **Task Queue** → последовательная обработка
2. **Offscreen Manager** → один документ, множество iframe
3. **Reliability Manager** → автоматическое восстановление
4. **Content Extraction** → получение данных через postMessage

## 🐛 Известные проблемы и решения

### "Cannot read properties of undefined (reading 'id')"

```typescript
// ❌ Неправильно
tasks.forEach((task) => console.log(task.id))

// ✅ Правильно
tasks.filter((task) => task?.id).forEach((task) => console.log(task.id))
```

### "Превышен лимит iframe"

```typescript
// ❌ Неправильно: множественные offscreen документы
await chrome.offscreen.createDocument({...});
await chrome.offscreen.createDocument({...}); // ОШИБКА!

// ✅ Правильно: Singleton + очередь
const manager = OffscreenManager.getInstance();
await manager.processTask(task1);
await manager.processTask(task2); // Последовательно
```

### "Message channel closed"

```typescript
// ❌ Неправильно
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  processAsync(msg).then(sendResponse) // Канал закроется!
})

// ✅ Правильно
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  processAsync(msg).then(sendResponse)
  return true // Держим канал открытым
})
```

## 📋 Workflow разработки

1. **Перед изменениями**: `./backup.sh`
2. **После изменений**: `./build.sh`
3. **Тестирование**: Перезагрузить расширение в chrome://extensions/
4. **Отладка**: DevTools → Service Worker или Popup
5. **Проблемы**: Проверь `build.log` и консоль Service Worker

## 📚 Документация

- `docs/CLAUDE_CONTEXT.md` - Навигация по документации
- `docs/PROJECT_STATUS.md` - Текущий статус проекта
- `docs/ARCHITECTURE.md` - Детальная архитектура
- `docs/KNOWN_ISSUES.md` - Решённые проблемы
- `README.md` - Полное описание проекта

## 🔧 Текущие приоритеты

1. **Тестирование системы фонового мониторинга**
2. **Валидация работы на различных сайтах**
3. **Оптимизация производительности очередей**
4. **Подготовка к релизу в Chrome Web Store**

---

_Файл автоматически подтягивается в контекст Claude AI_

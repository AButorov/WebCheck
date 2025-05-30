# Web Check - Контекст для Claude AI

<project_info>
**Web Check** - Chrome расширение для отслеживания изменений на веб-страницах
**Архитектура**: Vue 3 + TypeScript + Manifest V3 + Offscreen API
**Фаза**: Финальная отладка фонового мониторинга (95% готовности)
</project_info>

## 📋 Навигация по документации

### 🎯 Быстрый старт
- **[CLAUDE.md](CLAUDE.md)** - Основные команды и справочник (ЧИТАЙ ПЕРВЫМ)
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Текущий статус разработки
- **[BUILD_PROCESS.md](BUILD_PROCESS.md)** - Команды сборки и деплой

### 🏗️ Архитектура
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Структура проекта и компоненты
- **[TECH_STACK.md](TECH_STACK.md)** - Технологии и зависимости
- **[API.md](API.md)** - Описание внутренних API

### 🛠️ Разработка
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Инструкции для разработки
- **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)** - Решённые проблемы и баги
- **[TESTING.md](TESTING.md)** - Стратегия тестирования

### 🚀 Публикация
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Публикация в Chrome Web Store

## 🔥 Текущие приоритетные задачи

<priority_tasks>
1. **Тестирование системы фонового мониторинга**
   - Проверка работы на различных типах сайтов
   - Валидация системы надёжности и автоматического восстановления
   
2. **Оптимизация производительности**
   - Проверка работы очередей задач
   - Тестирование потребления ресурсов
   
3. **Финальная отладка интерфейса**
   - Проверка работы popup и options страниц
   - Валидация i18n (русский/английский)
   
4. **Подготовка к релизу**
   - Создание финального архива
   - Подготовка документации для Chrome Web Store
</priority_tasks>

## ⚡ Быстрый обзор архитектуры

```
Web Check Extension
├── Background Service Worker
│   ├── OffscreenManager (Singleton) - Управление невидимым мониторингом
│   ├── TaskQueue - Последовательная обработка задач
│   ├── ReliabilityManager - Автоматическое восстановление
│   └── Monitor System - Проверка изменений на сайтах
├── Content Scripts - Инжекция на веб-страницы
├── Offscreen Documents - Невидимая загрузка страниц
├── Popup UI (Vue 3) - Управление задачами
└── Options UI (Vue 3) - Настройки расширения
```

## 🚨 Критические особенности для Claude

### Ограничения Offscreen API
```typescript
// ТОЛЬКО 1 offscreen документ на всё расширение!
// Используется Singleton паттерн + очередь задач
```

### CSP Manifest V3
```javascript
// Запрещены: eval(), new Function(), inline scripts
// Используется: статическая компиляция Vue, строгий CSP
```

### Асинхронные сообщения Chrome
```typescript
// ОБЯЗАТЕЛЬНО return true для async handlers
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleAsync(msg).then(sendResponse);
  return true; // КРИТИЧНО!
});
```

## 📊 Статус компонентов

| Компонент | Статус | Примечания |
|-----------|--------|------------|
| 🔧 Background Service Worker | ✅ Готов | Все исправления применены |
| 🖥️ Offscreen Manager | ✅ Готов | Singleton + семафор |
| 📋 Task Queue System | ✅ Готов | Последовательная обработка |
| 🛡️ Reliability Manager | ✅ Готов | Автовосстановление |
| 🎨 Popup UI | ✅ Готов | Vue 3 + CSP совместимость |
| ⚙️ Options UI | ✅ Готов | Настройки + i18n |
| 📝 Content Scripts | ✅ Готов | Legacy JS без ES modules |
| 🏗️ Build System | ✅ Готов | Универсальный build.sh |

## 🔍 Быстрая диагностика

### Если что-то не работает:
1. **Проверь лог сборки**: `cat build.log`
2. **Service Worker консоль**: DevTools → Application → Service Workers
3. **Критические исправления**: `./quick_critical_fix.sh`
4. **Полная пересборка**: `./build.sh clean`

### Частые проблемы:
- **"undefined task.id"** → Проверь валидацию в `taskQueue.ts`
- **"Message channel closed"** → Проверь `return true` в обработчиках
- **"Превышен лимит iframe"** → Проверь Singleton в `offscreenManager.ts`

## 📚 Связанные файлы в корне проекта

- **README.md** - Полная документация проекта
- **FINAL_SUMMARY.md** - Сводка решённых проблем
- **ARCHITECTURE_SOLUTION.md** - Архитектурные решения
- **BUILD_GUIDE.md** - Детальный гид по сборке
- **RELIABILITY_TESTING.md** - Тестирование надёжности

---

<workflow_note>
**Workflow для Claude:**
1. Всегда читай CLAUDE.md первым
2. Проверяй PROJECT_STATUS.md для актуального статуса
3. При проблемах смотри KNOWN_ISSUES.md
4. Для архитектурных вопросов → ARCHITECTURE.md
5. Перед изменениями → ./backup.sh
6. После изменений → ./build.sh
</workflow_note>
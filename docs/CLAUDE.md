# Web Check - Справочник для Claude AI

<project_info>
Название: Web Check
Тип: Chrome Extension (Manifest V3)
Технологии: Vue 3 + TypeScript + Vite + Pinia
Статус: ✅ **ГОТОВ К РЕЛИЗУ (100% готовности)**
</project_info>

## 🚀 Основные команды

### ⚡ Рекомендуемые (автоматизированные)

```bash
# 🎯 ОСНОВНАЯ КОМАНДА СБОРКИ
npm run build                # Полная автоматизированная сборка

# 🔍 ДИАГНОСТИКА
./check_final.sh            # Быстрая проверка готовности
./status_check.sh           # Полная диагностика + статистика
```

### 🔧 Legacy команды (при необходимости)

```bash
# Старая система сборки
./build.sh                  # Production сборка
./build.sh dev              # Development сборка  
./build.sh debug            # Отладка
./build.sh clean            # Полная пересборка
./build.sh validate         # Только валидация
```

### 🛠️ Вспомогательные

```bash
# Резервное копирование
./backup.sh

# Очистка временных файлов
./clear.sh
```

## ✅ Автоматизированная сборка

### npm run build включает:

1. **Vite TypeScript сборка** - TS → JS, Vue → HTML/JS
2. **Post-build обработка** (`scripts/post-build.sh`):
   - ✅ Копирование content script
   - ✅ Копирование offscreen файлов
   - ✅ Автоматическое исправление manifest.json
   - ✅ Валидация всех файлов
3. **Финальная проверка** (`final_check.sh`):
   - ✅ Проверка обязательных файлов
   - ✅ Валидация путей в manifest

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

## ⚠️ Критические особенности (все решены)

### ✅ Автоматические исправления

```bash
# Post-build скрипт автоматически исправляет:
# - Пути к content script в manifest.json
# - Копирование offscreen файлов
# - Валидацию всех компонентов
```

### ✅ Offscreen API (готово)

```typescript
// Singleton архитектура реализована
const offscreenManager = OffscreenManager.getInstance()
await offscreenManager.processTask(task) // Последовательная обработка
```

### ✅ Асинхронные сообщения (исправлено)

```typescript
// Все обработчики имеют return true
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleAsyncMessage(message).then(sendResponse)
  return true // ✅ Исправлено везде
})
```

## 🏗️ Архитектура (стабильная)

### Основные компоненты - ВСЕ ГОТОВЫ!

- ✅ **Background Service Worker**: `src/background/index.ts`
- ✅ **Offscreen Manager**: `src/background/offscreenManager.ts`
- ✅ **Task Queue**: `src/background/taskQueue.ts`
- ✅ **Reliability Manager**: `src/background/reliabilityManager.ts`
- ✅ **Content Scripts**: `src/content-script/index-legacy.js`
- ✅ **Popup UI**: `src/ui/popup/`
- ✅ **Options UI**: `src/ui/options/`

### Готовая структура dist/

```
dist/
├── manifest.json                    ✅ Автоматически исправляется
├── service-worker-loader.js         ✅ Background script
├── content-script/
│   └── index-legacy.js              ✅ Автоматически копируется
├── offscreen/
│   ├── offscreen.html               ✅ Автоматически копируется
│   └── offscreen.js                 ✅ Автоматически копируется
└── src/ui/popup/index.html          ✅ Vite генерация
```

## ✅ Все проблемы решены!

### ~~Известные проблемы~~ → Исправлено

- ✅ ~~"Cannot read properties of undefined"~~ → Валидация добавлена
- ✅ ~~"Превышен лимит iframe"~~ → Singleton архитектура
- ✅ ~~"Message channel closed"~~ → return true везде
- ✅ ~~Проблемы сборки~~ → Автоматизированы
- ✅ ~~Пути в manifest.json~~ → Автоматически исправляются

## 📋 Workflow разработки

### ⚡ Новый рекомендуемый процесс

1. **Разработка**: Изменения в `src/`
2. **Сборка**: `npm run build`
3. **Проверка**: `./check_final.sh`
4. **Установка**: Chrome → `chrome://extensions/` → загрузить `dist/`
5. **✅ Готово!**

### 🔍 При проблемах

```bash
./status_check.sh          # Полная диагностика
./build.sh clean           # Если нужна полная пересборка
```

## 📚 Документация

- `docs/CLAUDE_CONTEXT.md` - ✅ Навигация (обновлена)
- `docs/PROJECT_STATUS.md` - ✅ **100% готовности**
- `docs/BUILD_PROCESS.md` - ✅ Автоматизированная сборка
- `docs/KNOWN_ISSUES.md` - ✅ Все проблемы решены
- `README.md` - ✅ Инструкции по релизу

## 🎯 Задачи для дальнейшей разработки

**Все критические задачи выполнены!** Проект готов к продакшн-использованию.

**Опциональные улучшения:**
1. **Функциональные** - уведомления в реальном времени, фильтры мониторинга
2. **UI/UX** - темная тема, анимации, drag & drop
3. **Технические** - кэширование, облачная синхронизация

## 🎊 Готовность к релизу

```bash
# ✅ Команда для релиза
npm run build

# ✅ Результат: расширение готово к
# - Установке в Chrome
# - Публикации в Chrome Web Store  
# - Распространению как ZIP
```

---

_Документация обновлена 30.05.2025 - проект готов к релизу!_
# Web Check - Процесс сборки

<build_info>
**Система сборки**: Упрощенная Vite + TypeScript + pnpm
**Статус**: ✅ Полностью готов к продакшн
**Последнее обновление**: 31.05.2025 - Упрощен после успешного запуска
</build_info>

## 🚀 Команды сборки

### ⚡ Основные команды

```bash
# 🎯 ГЛАВНАЯ КОМАНДА
./build.sh                  # Стандартная сборка

# 🧹 ПОЛНАЯ ПЕРЕСБОРКА  
./build.sh clean            # Очистка + переустановка + сборка

# 📦 NPM команды
pnpm build                  # Альтернатива через package.json
pnpm dev                    # Development режим с watch
```

### 🛠️ Команды разработки

```bash
# Разработка
pnpm dev                    # Режим разработки с hot reload
pnpm lint                   # ESLint проверка
pnpm format                 # Prettier форматирование
pnpm type-check             # TypeScript проверка

# Управление зависимостями
pnpm install                # Установка зависимостей
pnpm install --frozen-lockfile  # Точные версии (CI/CD)
```

## 🏗️ Процесс сборки build.sh

### 1. **Проверка окружения**
```bash
✅ Node.js версия (рекомендуется 16+)
✅ pnpm доступен
✅ Конфигурационные файлы на месте
```

### 2. **Управление зависимостями**
```bash
# При clean режиме:
- Полная очистка (node_modules, dist, кэши)
- Переустановка всех зависимостей

# При обычном режиме:
- Проверка key зависимостей (vite, vue, @crxjs)
- Доустановка отсутствующих
```

### 3. **Vite сборка**
```bash
node node_modules/vite/bin/vite.js build
✅ TypeScript → JavaScript
✅ Vue компоненты → HTML/CSS/JS  
✅ Asset bundling и оптимизация
✅ Генерация service-worker-loader.js
```

### 4. **Post-build обработка**
```bash
✅ Копирование content-script/index-legacy.js
✅ Создание папки dist/content-script/
✅ Валидация manifest.json путей
✅ Проверка размеров файлов
```

### 5. **Финальная валидация**
```bash
✅ service-worker-loader.js содержит правильный импорт
✅ Background script сгенерирован (>1KB)
✅ Content script скопирован
✅ Manifest ссылается на правильные файлы
```

## 📁 Результат сборки

### Структура dist/
```
dist/
├── manifest.json                    # ✅ Chrome Extension манифест
├── service-worker-loader.js         # ✅ Background Service Worker (34 байта)
├── assets/js/index.ts.js            # ✅ Основной background код (~4KB)
├── content-script/
│   └── index-legacy.js              # ✅ Content Script
├── offscreen/                       # ✅ Offscreen Documents
├── src/ui/
│   ├── popup/index.html             # ✅ Popup UI
│   └── options/index.html           # ✅ Options UI
├── assets/                          # ✅ CSS, JS, локализация
└── icons/                           # ✅ Иконки расширения
```

### Ключевые файлы

**service-worker-loader.js** (34 байта):
```javascript
import './assets/js/index.ts.js';
```

**assets/js/index.ts.js** (~4KB):
- Полный background service worker код
- Минифицированный и оптимизированный
- Все функции мониторинга и управления

## ⚙️ Конфигурация

### TypeScript (оптимизирован)
```json
// tsconfig.json - настроен для безошибочной сборки
{
  "compilerOptions": {
    "skipLibCheck": true,           // ✅ Избегаем проблем типов
    "strict": true,
    "target": "ESNext"
  }
}
```

### Vite использует локальную установку
```bash
# Избегаем конфликта версий
node node_modules/vite/bin/vite.js build

# Вместо npx vite build (может использовать глобальную версию)
```

### pnpm зафиксированные версии  
```ini
# .npmrc
save-exact=true                     # ✅ Точные версии зависимостей
```

## 🔍 Диагностика

### Проверка готовности
```bash
# Быстрая проверка
ls -la dist/
ls -la dist/service-worker-loader.js
wc -c dist/assets/js/index.ts.js

# Полная проверка
./build.sh                         # Показывает весь процесс + валидация
```

### Решение проблем

**Ошибка "Cannot find module vite":**
```bash
./build.sh clean                   # Переустановит все зависимости
```

**Проблемы с service-worker-loader.js:**
```bash
# Если файл слишком маленький или содержит ошибки
./build.sh clean                   # Полная пересборка
```

**Ошибки TypeScript:**
```bash
pnpm type-check                    # Проверка ошибок
# skipLibCheck=true должен решать большинство проблем
```

## 🎯 Режимы работы

### Development
```bash
pnpm dev                           # Hot reload для разработки
```

### Production (готов к установке)
```bash
./build.sh                         # Оптимизированная сборка
# → dist/ готов для Chrome Extensions
```

### Clean build (при проблемах)
```bash
./build.sh clean                   # Полная очистка и пересборка
```

## ✅ Критерии успешной сборки

### Обязательные файлы:
- ✅ `dist/manifest.json`
- ✅ `dist/service-worker-loader.js` (содержит import)
- ✅ `dist/assets/js/index.ts.js` (>1KB кода)
- ✅ `dist/content-script/index-legacy.js`

### Валидация содержимого:
- ✅ service-worker-loader.js: `import './assets/js/index.ts.js';`
- ✅ Background script: реальный код, не пустышка
- ✅ Manifest: правильные пути к файлам

### Готовность к установке:
- ✅ Chrome Extensions DevTools не показывает ошибок
- ✅ Service Worker загружается
- ✅ Content Scripts инжектируются

## 🎉 Установка в Chrome

После успешной сборки:

1. Откройте `chrome://extensions/`
2. Включите **"Режим разработчика"**
3. Нажмите **"Загрузить распакованное расширение"**
4. Выберите папку **`dist`**
5. ✅ **Расширение установлено!**

---

_Процесс сборки упрощен и оптимизирован для максимальной надежности._

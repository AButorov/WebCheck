# Исправление ошибки "Cannot use import statement outside a module"

## Описание проблемы

При загрузке расширения возникает ошибка:
```
Uncaught SyntaxError: Cannot use import statement outside a module
assets/js/index.ts.js:1 (анонимные функции)
```

Эта ошибка происходит потому, что:
1. **Background script** компилируется как ES модуль, но пытается импортировать несуществующие зависимости
2. **Content script** компилируется как ES модуль, но content scripts в расширениях браузера НЕ МОГУТ использовать ES модули

## Решение проблемы

### Вариант 1: Быстрое исправление (если уже есть сборка)

```bash
# Применить исправления к существующей сборке
./fix-modules.sh
```

### Вариант 2: Полная пересборка с исправлениями

```bash
# Использовать исправленный скрипт сборки
./build-fixed.sh
```

### Вариант 3: Ручное исправление (если скрипты не работают)

1. **Исправить content script:**
   ```bash
   # Удалить ES модули из content script
   sed -i 's/import{[^}]*}from"[^"]*";//g' dist/assets/js/index-legacy.js.js
   sed -i 's/export{[^}]*};//g' dist/assets/js/index-legacy.js.js
   
   # Скопировать исходный файл
   mkdir -p dist/content-script
   cp src/content-script/index-legacy.js dist/content-script/index-legacy.js
   ```

2. **Исправить background script:**
   ```bash
   # Удалить проблемные import statements
   sed -i 's/import{[^}]*}from"[^"]*";//g' dist/assets/js/index.ts.js
   ```

3. **Исправить manifest.json:**
   ```bash
   # Исправить путь к content script
   sed -i 's|"assets/js/index-legacy\.js\.js"|"content-script/index-legacy.js"|g' dist/manifest.json
   ```

## Что исправляют скрипты

### `fix-modules.sh` (быстрое исправление):
- ✅ Удаляет проблемные ES import statements из скомпилированных файлов
- ✅ Копирует исходный content script без модулей
- ✅ Исправляет пути в manifest.json
- ✅ Объединяет зависимости background script в один файл

### `build-fixed.sh` (полная сборка):
- ✅ Выполняет обычную сборку
- ✅ Автоматически применяет все исправления
- ✅ Валидирует результат
- ✅ Копирует дополнительные файлы (иконки, offscreen)

## Проверка результата

После применения исправлений проверьте:

1. **Content script не содержит ES модули:**
   ```bash
   grep -q "^import\s*{" dist/content-script/index-legacy.js && echo "ОШИБКА: Содержит import" || echo "OK: Без import"
   ```

2. **Manifest указывает правильный путь:**
   ```bash
   grep -q "content-script/index-legacy.js" dist/manifest.json && echo "OK: Правильный путь" || echo "ОШИБКА: Неправильный путь"
   ```

3. **Все необходимые файлы существуют:**
   ```bash
   ls -la dist/content-script/index-legacy.js
   ls -la dist/manifest.json
   ls -la dist/service-worker-loader.js
   ```

## Причина проблемы

**Техническая причина:**
- Vite по умолчанию компилирует TypeScript файлы как ES модули
- Background scripts в Manifest V3 поддерживают ES модули
- Content scripts в расширениях браузера НЕ поддерживают ES модули
- Vite создает отдельные chunks с cross-imports, которые не работают в контексте расширения

**Долгосрочное решение:**
Нужно настроить Vite конфигурацию для правильной сборки content scripts как обычных скриптов:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Content script должен быть один файл без внешних зависимостей
        manualChunks: (id) => {
          if (id.includes('src/content-script/')) {
            return 'content-script'
          }
        },
        // Формат для content scripts
        format: 'iife', // Immediately Invoked Function Expression
      },
    },
  },
})
```

## После исправления

1. Откройте `chrome://extensions/`
2. Включите "Режим разработчика"
3. Нажмите "Загрузить распакованное расширение"
4. Выберите папку `dist`

Расширение должно загрузиться без ошибок.

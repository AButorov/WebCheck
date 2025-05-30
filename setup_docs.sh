#!/bin/zsh
# Скрипт для создания структуры документации Web Check

set -euo pipefail

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

print -P "${BLUE}🚀 Создание структуры документации Web Check${NC}"

# Создаём директории
print -P "${YELLOW}📁 Создание директорий...${NC}"
mkdir -p docs
mkdir -p archive

# Создание основных файлов документации
print -P "${YELLOW}📝 Создание файлов документации...${NC}"

# CLAUDE.md уже создан через artifact
print -P "${GREEN}✅ CLAUDE.md (создан через artifact)${NC}"

# CLAUDE_CONTEXT.md уже создан через artifact  
print -P "${GREEN}✅ CLAUDE_CONTEXT.md (создан через artifact)${NC}"

# Создание PROJECT_STATUS.md
cat > docs/PROJECT_STATUS.md << 'EOF'
# Web Check - Статус проекта

<current_phase>Финальная отладка системы фонового мониторинга</current_phase>

## 🚀 Текущий статус: 95% готовности

### ✅ Завершённые компоненты
- **Система Offscreen Documents API** - ПОЛНОСТЬЮ ЗАВЕРШЕНА
- **Система надёжности и автоматического восстановления** - ПОЛНОСТЬЮ ЗАВЕРШЕНА  
- **Система очередей задач** - ПОЛНОСТЬЮ ЗАВЕРШЕНА
- **Интерфейс управления задачами** - ПОЛНОСТЬЮ ЗАВЕРШЕН
- **CSP-совместимость Manifest V3** - ПОЛНОСТЬЮ ЗАВЕРШЕНА
- **Универсальный скрипт сборки** - ПОЛНОСТЬЮ ЗАВЕРШЕН

### 🔄 В процессе
- Комплексное тестирование фонового мониторинга
- Валидация работы на различных типах сайтов
- Оптимизация производительности очередей

### 📋 Следующие задачи
- [ ] Финальное тестирование системы надёжности
- [ ] Подготовка к релизу в Chrome Web Store
- [ ] Создание финальной документации для пользователей
- [ ] Полировка UI/UX интерфейса

<last_updated>$(date '+%d.%m.%Y %H:%M')</last_updated>
EOF

# Создание BUILD_PROCESS.md
cat > docs/BUILD_PROCESS.md << 'EOF'
# Web Check - Процесс сборки

## 🔨 Основные команды

### Базовая сборка
```bash
./build.sh                 # Production сборка
./build.sh dev             # Development сборка  
./build.sh debug           # Debug режим с подробным выводом
./build.sh clean           # Полная пересборка с очисткой
./build.sh icons           # Принудительная генерация иконок
./build.sh validate        # Только валидация без сборки
```

### Быстрые исправления
```bash
./quick_critical_fix.sh    # Критические исправления
./apply_architecture_fixes.sh  # Архитектурные исправления
./fix_reliability_issues.sh    # Исправления надёжности
```

## 📋 Процесс сборки

1. **Проверка требований** - Node.js, pnpm, зависимости
2. **Проверка структуры проекта** - обязательные файлы
3. **Генерация/проверка иконок** - PNG из SVG
4. **Vite сборка** - TypeScript → JavaScript
5. **Критические исправления** - дублирование переменных, ES модули
6. **Копирование файлов** - content scripts, offscreen, иконки
7. **Исправление manifest.json** - пути и CSP политики
8. **Валидация результата** - синтаксис, структура
9. **Создание архива** - ZIP для релиза (production)

## 🛠️ Требования

- Node.js 20.x LTS
- pnpm (рекомендуется)
- ImageMagick (опционально, для конвертации иконок)
- jq (опционально, для обработки JSON)
EOF

# Создание KNOWN_ISSUES.md
cat > docs/KNOWN_ISSUES.md << 'EOF'
# Web Check - Решённые проблемы

## ✅ Критические исправления

### 1. TypeError: Cannot read properties of undefined (reading 'id')
**Проблема**: Обращение к свойству `id` объектов task, которые могли быть `undefined`
**Решение**: Добавлены проверки валидности задач во всех критических модулях
```typescript
// ❌ Было
tasks.forEach(task => console.log(task.id));

// ✅ Стало  
tasks.filter(task => task?.id).forEach(task => console.log(task.id));
```

### 2. "Message channel closed before a response was received"
**Проблема**: Неправильная обработка асинхронных сообщений Chrome Extension API
**Решение**: Обязательный `return true` для асинхронных обработчиков
```typescript
// ❌ Было
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleAsync(msg).then(sendResponse);
});

// ✅ Стало
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleAsync(msg).then(sendResponse);
  return true; // КРИТИЧНО!
});
```

### 3. "Превышен лимит одновременных iframe"
**Проблема**: Offscreen API позволяет только 1 документ на всё расширение
**Решение**: Singleton паттерн для OffscreenManager + последовательная очередь
```typescript
// ✅ Singleton + очередь
const manager = OffscreenManager.getInstance();
await manager.processTaskSequentially(task);
```

### 4. Дублирование переменной Z в background script
**Проблема**: Конфликт переменных после минификации
**Решение**: Автоматическое исправление в build.sh
```javascript
// Исправление в fix_variable_duplication()
sed 's/Z=B;Z\.initDone=!1/StreamZ=B;StreamZ.initDone=!1/g'
```

## 🔧 Архитектурные решения

### Singleton OffscreenManager
- Гарантирует только один offscreen документ
- Последовательная обработка задач
- Автоматическое управление жизненным циклом

### Система надёжности
- Автоматическое восстановление при сбоях
- Проверки здоровья системы
- Детальная диагностика

### CSP-совместимость Manifest V3
- Отказ от eval() и динамических импортов
- Статическая компиляция Vue компонентов
- Строгий CSP: `script-src 'self'`

## 🐛 Частые проблемы и решения

### Проблема: "Расширение не загружается"
**Решение**: Проверить права доступа и пересобрать
```bash
./chmod_all.sh
./build.sh clean
```

### Проблема: "Service Worker не отвечает"
**Решение**: Проверить консоль Service Worker
```
DevTools → Application → Service Workers → Inspect
```

### Проблема: "Задачи не выполняются"
**Решение**: Проверить валидность задач
```typescript
if (!task || !task.id || !task.url) {
  console.warn('Invalid task:', task);
  return;
}
```
EOF

print -P "${GREEN}✅ Основные файлы документации созданы${NC}"

# Создание скрипта для перемещения старых файлов
print -P "${YELLOW}📦 Создание скрипта архивирования...${NC}"
cat > archive_old_docs.sh << 'EOF'
#!/bin/zsh
# Архивирование старых файлов документации

mkdir -p archive

# Список файлов для архивирования
old_files=(
  "ARCHITECTURE_FIX_INSTRUCTIONS.md"
  "ARCHITECTURE_SOLUTION.md" 
  "BUILD_GUIDE.md"
  "BUILD_GUIDE_UPDATED.md"
  "ES_MODULE_FIX.md"
  "FINAL_BUILD_SYSTEM.md"
  "FINAL_BUILD_SYSTEM_REPORT.md"
  "FINAL_COMPLETION.md"
  "FINAL_FIX_README.md"
  "FINAL_SUMMARY.md"
  "FIXES_SUMMARY.md"
  "GITHUB_SOLUTIONS.md"
  "PROBLEMS_FIXED.md"
  "PROBLEM_FIXED.md"
  "QUICK_SOLUTION.md"
  "QUICK_START.md"
  "QUICK_START_BUILD.md"
  "RELIABILITY_FIXES_SUMMARY.md"
  "RELIABILITY_TESTING.md"
  "TESTING_FIXES.md"
  "UPDATED_BUILD_SYSTEM.md"
  "todo_now.md"
)

echo "📦 Архивирование старых файлов документации..."
for file in $old_files; do
  if [[ -f "$file" ]]; then
    mv "$file" archive/
    echo "✅ $file → archive/"
  fi
done

echo "🎉 Архивирование завершено"
EOF

chmod +x archive_old_docs.sh

print -P "${BLUE}📋 Структура документации создана!${NC}"
print -P ""
print -P "${YELLOW}Следующие шаги:${NC}"
print -P "1. Скопировать CLAUDE.md и CLAUDE_CONTEXT.md из artifacts в docs/"
print -P "2. Запустить: ${BLUE}./archive_old_docs.sh${NC} для архивирования старых файлов"
print -P "3. Обновить README.md с ссылками на новую документацию"
print -P ""
print -P "${GREEN}✨ Документация готова для работы с Claude AI!${NC}"

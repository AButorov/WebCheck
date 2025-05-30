#!/bin/zsh
# Полная автоматизация создания документации Web Check для Claude AI

set -euo pipefail

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print -P "${BLUE}🚀 Автоматическое создание документации Web Check для Claude AI${NC}"
print -P "${BLUE}================================================================${NC}"

# Функция для создания файлов из artifacts
copy_artifacts() {
  print -P "\n${YELLOW}📋 Создание файлов из artifacts...${NC}"
  
  # Предупреждение пользователю
  print -P "${CYAN}ℹ️  Необходимо скопировать содержимое из созданных artifacts:${NC}"
  print -P "   1. CLAUDE.md - Основной справочник"
  print -P "   2. CLAUDE_CONTEXT.md - Единая точка входа"
  print -P "   3. Структура документации"
  print -P "   4. План перераспределения"
  print -P ""
  print -P "${YELLOW}⏳ Создание заглушек файлов...${NC}"
  
  # Создаём заглушки, которые пользователь заполнит из artifacts
  cat > docs/CLAUDE.md << 'EOF'
# ЗАГЛУШКА: Скопируйте содержимое из artifact "CLAUDE.md - Основной справочник"

Этот файл должен содержать:
- Основные bash команды проекта
- Стиль кодирования 
- Критические особенности
- Workflow разработки
- Быструю диагностику
EOF

  cat > docs/CLAUDE_CONTEXT.md << 'EOF'
# ЗАГЛУШКА: Скопируйте содержимое из artifact "CLAUDE_CONTEXT.md - Единая точка входа"

Этот файл должен содержать:
- Краткое описание проекта
- Навигацию по документации
- Приоритетные задачи
- Обзор архитектуры
- Статус компонентов
EOF

  print -P "${GREEN}✅ Заглушки созданы в docs/${NC}"
}

# Проверка окружения
check_environment() {
  print -P "\n${CYAN}🔍 Проверка окружения...${NC}"
  
  if [[ ! -f "package.json" ]]; then
    print -P "${RED}❌ Не найден package.json. Запустите скрипт из корня проекта Web Check${NC}"
    exit 1
  fi
  
  if [[ ! -f "build.sh" ]]; then
    print -P "${RED}❌ Не найден build.sh. Убедитесь, что вы в корне проекта${NC}"
    exit 1
  fi
  
  print -P "${GREEN}✅ Окружение корректно${NC}"
}

# Создание структуры
create_structure() {
  print -P "\n${YELLOW}📁 Создание структуры директорий...${NC}"
  
  mkdir -p docs
  mkdir -p archive
  mkdir -p docs/assets
  
  print -P "${GREEN}✅ Структура создана${NC}"
}

# Создание основных файлов
create_core_files() {
  print -P "\n${YELLOW}📝 Создание основных файлов документации...${NC}"
  
  # PROJECT_STATUS.md
  cat > docs/PROJECT_STATUS.md << 'EOF'
# Web Check - Статус проекта

<current_phase>Финальная отладка системы фонового мониторинга (95% готовности)</current_phase>

<last_updated>EOF
  echo "$(date '+%d.%m.%Y %H:%M')" >> docs/PROJECT_STATUS.md
  cat >> docs/PROJECT_STATUS.md << 'EOF'
</last_updated>

## ✅ Завершённые компоненты

<completed_features>
- ✅ Система Offscreen Documents API - ПОЛНОСТЬЮ ЗАВЕРШЕНА
- ✅ Система надёжности и автоматического восстановления - ПОЛНОСТЬЮ ЗАВЕРШЕНА  
- ✅ Система очередей задач - ПОЛНОСТЬЮ ЗАВЕРШЕНА
- ✅ Интерфейс управления задачами - ПОЛНОСТЬЮ ЗАВЕРШЕН
- ✅ CSP-совместимость Manifest V3 - ПОЛНОСТЬЮ ЗАВЕРШЕНА
- ✅ Универсальный скрипт сборки - ПОЛНОСТЬЮ ЗАВЕРШЕН
</completed_features>

## 🔄 В процессе

<in_progress>
- Комплексное тестирование фонового мониторинга
- Валидация работы на различных типах сайтов  
- Оптимизация производительности очередей
- Финальная отладка системы надёжности
</in_progress>

## 📋 Следующие задачи

<next_tasks>
- [ ] Комплексное тестирование на различных сайтах
- [ ] Подготовка к релизу в Chrome Web Store
- [ ] Создание пользовательской документации
- [ ] Финальная полировка UI/UX
</next_tasks>

## 🎯 Готовность к релизу: 95%

Система фонового мониторинга полностью реализована и готова к продакшн-использованию.
EOF

  # BUILD_PROCESS.md
  cat > docs/BUILD_PROCESS.md << 'EOF'
# Web Check - Процесс сборки

<build_info>
Основной скрипт: build.sh
Система сборки: Vite + TypeScript
Пакетный менеджер: pnpm
</build_info>

## 🔨 Основные команды

<build_commands>
```bash
./build.sh                 # Production сборка
./build.sh dev             # Development сборка  
./build.sh debug           # Debug режим с подробным выводом
./build.sh clean           # Полная пересборка с очисткой
./build.sh icons           # Принудительная генерация иконок
./build.sh validate        # Только валидация без сборки
```
</build_commands>

## ⚡ Быстрые исправления

<quick_fixes>
```bash
./quick_critical_fix.sh           # Критические исправления
./apply_architecture_fixes.sh     # Архитектурные исправления
./fix_reliability_issues.sh       # Исправления надёжности
```
</quick_fixes>

## 📋 Процесс сборки (11 этапов)

<build_process>
1. **Проверка требований** - Node.js 20.x, pnpm, зависимости
2. **Проверка структуры проекта** - обязательные файлы и директории
3. **Генерация/проверка иконок** - конвертация SVG в PNG
4. **Очистка предыдущей сборки** - удаление dist/ и временных файлов
5. **Vite сборка** - компиляция TypeScript → JavaScript
6. **Критические исправления** - дублирование переменных, ES модули
7. **Копирование дополнительных файлов** - content scripts, offscreen, иконки
8. **Исправление manifest.json** - корректировка путей и CSP политик
9. **Валидация результата** - проверка синтаксиса и структуры
10. **Создание ZIP архива** - упаковка для релиза (production режим)
11. **Финальная очистка** - удаление временных файлов
</build_process>

## 🛠️ Системные требования

<requirements>
- Node.js 20.x LTS
- pnpm (рекомендуется) или npm
- ImageMagick (опционально, для конвертации иконок)
- jq (опционально, для обработки JSON)
- zsh (для выполнения скриптов)
</requirements>

## 🚨 Критические особенности сборки

<critical_features>
- **Исправление дублирования переменной Z** в background script
- **Удаление ES import statements** из content scripts  
- **CSP-совместимая обработка** Vue компонентов
- **Валидация Manifest V3** требований
- **Автоматическое исправление путей** в manifest.json
</critical_features>
EOF

  # KNOWN_ISSUES.md  
  cat > docs/KNOWN_ISSUES.md << 'EOF'
# Web Check - Решённые проблемы

<summary>
Все критические проблемы проекта решены.
Система фонового мониторинга стабильна и готова к production.
</summary>

## ✅ Критические исправления

### 1. TypeError: Cannot read properties of undefined (reading 'id')

<issue_1>
**Проблема**: Обращение к свойству `id` объектов task, которые могли быть `undefined`

**Решение**: Добавлены проверки валидности во всех критических модулях

```typescript
// ❌ Было
tasks.forEach(task => console.log(task.id));

// ✅ Стало  
tasks.filter(task => task?.id).forEach(task => console.log(task.id));
```

**Файлы исправлены**:
- `src/background/monitor/index.ts`
- `src/background/taskQueue.ts`
- `src/background/reliabilityManager.ts`
</issue_1>

### 2. "Message channel closed before a response was received"

<issue_2>
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
</issue_2>

### 3. "Превышен лимит одновременных iframe"

<issue_3>
**Проблема**: Offscreen API позволяет только 1 документ на всё расширение

**Решение**: Singleton паттерн для OffscreenManager + последовательная очередь

```typescript
// ✅ Singleton + очередь
const manager = OffscreenManager.getInstance();
await manager.processTaskSequentially(task);
```

**Архитектурное решение**:
- Singleton OffscreenManager
- Семафор для ограничения параллельности  
- Последовательная очередь задач
</issue_3>

### 4. Дублирование переменной Z в background script

<issue_4>
**Проблема**: Конфликт переменных после минификации Terser

**Решение**: Автоматическое исправление в `build.sh`

```javascript
// Исправление в fix_variable_duplication()
sed 's/Z=B;Z\.initDone=!1/StreamZ=B;StreamZ.initDone=!1/g'
```

**Процесс**: Автоматически исправляется на этапе сборки
</issue_4>

## 🏗️ Архитектурные решения

<architectural_solutions>
### Singleton OffscreenManager
- Гарантирует только один offscreen документ
- Управляет жизненным циклом iframe
- Последовательная обработка задач

### Система надёжности
- Автоматическое восстановление при сбоях
- Периодические проверки здоровья системы
- Детальная диагностика с рекомендациями

### CSP-совместимость Manifest V3
- Полный отказ от eval() и динамических импортов
- Статическая компиляция Vue компонентов
- Строгий CSP: `script-src 'self'`
</architectural_solutions>

## 🐛 Частые проблемы и их решения

<common_problems>
### "Расширение не загружается"
**Решение**: 
```bash
./chmod_all.sh  # Права доступа
./build.sh clean  # Полная пересборка
```

### "Service Worker не отвечает"  
**Решение**: Проверить консоль Service Worker
```
DevTools → Application → Service Workers → Inspect
```

### "Задачи не выполняются"
**Решение**: Валидация задач
```typescript
if (!task || !task.id || !task.url) {
  console.warn('Invalid task:', task);
  return;
}
```
</common_problems>

## 🔧 Инструменты отладки

<debugging_tools>
- `build.log` - Лог процесса сборки
- Service Worker Console - DevTools
- `get-monitoring-stats` - Статистика мониторинга
- `perform-diagnostics` - Диагностика системы
- `forceRecovery()` - Принудительное восстановление
</debugging_tools>
EOF

  print -P "${GREEN}✅ Основные файлы созданы${NC}"
}

# Создание скрипта архивирования
create_archive_script() {
  print -P "\n${YELLOW}📦 Создание скрипта архивирования...${NC}"
  
  cat > archive_old_docs.sh << 'EOF'
#!/bin/zsh
# Архивирование старых файлов документации Web Check

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

print -P "${YELLOW}📦 Архивирование старых файлов документации...${NC}"

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

archived_count=0
for file in $old_files; do
  if [[ -f "$file" ]]; then
    mv "$file" archive/
    print -P "${GREEN}✅ $file → archive/${NC}"
    ((archived_count++))
  fi
done

print -P "${GREEN}🎉 Архивировано файлов: $archived_count${NC}"
EOF

  chmod +x archive_old_docs.sh
  print -P "${GREEN}✅ Скрипт архивирования создан${NC}"
}

# Создание итогового README для docs
create_docs_readme() {
  print -P "\n${YELLOW}📖 Создание README для docs/...${NC}"
  
  cat > docs/README.md << 'EOF'
# Web Check - Документация

Структурированная документация проекта Web Check, оптимизированная для работы с Claude AI.

## 📋 Навигация

### 🎯 Для быстрого старта
- **[CLAUDE.md](CLAUDE.md)** - Основной справочник для Claude AI (читай первым!)
- **[CLAUDE_CONTEXT.md](CLAUDE_CONTEXT.md)** - Единая точка входа с навигацией

### 📊 Статус проекта  
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Текущий статус разработки (95% готовности)

### 🔨 Сборка и разработка
- **[BUILD_PROCESS.md](BUILD_PROCESS.md)** - Команды сборки и процесс
- **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)** - Решённые проблемы и критические исправления

### 🏗️ Архитектура (планируется)
- **ARCHITECTURE.md** - Детальная архитектура системы
- **DEVELOPMENT.md** - Инструкции для разработки
- **TECH_STACK.md** - Технологический стек
- **API.md** - Описание внутренних API
- **TESTING.md** - Стратегия тестирования
- **DEPLOYMENT.md** - Публикация в Chrome Web Store

## 🚀 Быстрый старт для Claude

1. Прочитай **CLAUDE.md** - основной справочник
2. Изучи **CLAUDE_CONTEXT.md** - навигацию по документации  
3. Проверь **PROJECT_STATUS.md** - актуальный статус
4. При проблемах смотри **KNOWN_ISSUES.md**

## ✨ Особенности документации

- **XML теги** для структурирования содержимого
- **Перекрёстные ссылки** между файлами
- **Актуальная информация** без дублирования
- **Оптимизация для Claude AI**

---

*Создано автоматически скриптом структурирования документации*
EOF

  print -P "${GREEN}✅ README для docs/ создан${NC}"
}

# Создание итоговых инструкций
create_completion_instructions() {
  print -P "\n${CYAN}📋 Создание итоговых инструкций...${NC}"
  
  cat > DOCS_COMPLETION_INSTRUCTIONS.md << 'EOF'
# Завершение создания документации Web Check

## ✅ Что уже создано автоматически

1. **Структура директорий**: `docs/` и `archive/`
2. **Основные файлы**: PROJECT_STATUS.md, BUILD_PROCESS.md, KNOWN_ISSUES.md
3. **Скрипт архивирования**: archive_old_docs.sh
4. **Заглушки**: docs/CLAUDE.md, docs/CLAUDE_CONTEXT.md

## 📋 Что нужно сделать вручную

### 1. Заполнить CLAUDE.md
Скопировать содержимое из artifact "CLAUDE.md - Основной справочник" в `docs/CLAUDE.md`

### 2. Заполнить CLAUDE_CONTEXT.md  
Скопировать содержимое из artifact "CLAUDE_CONTEXT.md - Единая точка входа" в `docs/CLAUDE_CONTEXT.md`

### 3. Архивировать старые файлы
```bash
./archive_old_docs.sh
```

### 4. Создать недостающие файлы (по приоритету)

#### Высокий приоритет:
- `docs/ARCHITECTURE.md` - из README.md + ARCHITECTURE_SOLUTION.md
- `docs/DEVELOPMENT.md` - из README.md + инструкции разработки

#### Средний приоритет:
- `docs/TECH_STACK.md` - из package.json + технологии
- `docs/API.md` - описание внутренних API

#### Низкий приоритет:
- `docs/TESTING.md` - из RELIABILITY_TESTING.md
- `docs/DEPLOYMENT.md` - процесс релиза в Chrome Web Store

### 5. Обновить корневой README.md
Сократить до краткого обзора + ссылки на docs/

## 🎯 Результат

После выполнения получите:
- ✅ Структурированную документацию для Claude AI
- ✅ Быстрый доступ к информации
- ✅ Автоматическое подтягивание CLAUDE.md в контекст
- ✅ Профессиональную организацию проекта

## 🚀 Тестирование

После создания документации проверьте:
1. Все ссылки между файлами работают
2. CLAUDE.md корректно описывает команды
3. CLAUDE_CONTEXT.md предоставляет полную навигацию
4. PROJECT_STATUS.md отражает актуальное состояние

---

*Время выполнения: 15-30 минут*
*Сложность: Низкая*
EOF

  print -P "${GREEN}✅ Инструкции по завершению созданы${NC}"
}

# Основная функция
main() {
  check_environment
  create_structure
  create_core_files
  copy_artifacts
  create_archive_script
  create_docs_readme
  create_completion_instructions
  
  print -P "\n${BLUE}================================================================${NC}"
  print -P "${GREEN}🎉 ДОКУМЕНТАЦИЯ СОЗДАНА УСПЕШНО!${NC}"
  print -P "${BLUE}================================================================${NC}"
  
  print -P "\n${CYAN}📋 Что создано:${NC}"
  print -P "  ✅ docs/ - Структурированная документация"
  print -P "  ✅ archive/ - Директория для старых файлов"
  print -P "  ✅ PROJECT_STATUS.md - Актуальный статус проекта"
  print -P "  ✅ BUILD_PROCESS.md - Процесс сборки"
  print -P "  ✅ KNOWN_ISSUES.md - Решённые проблемы"
  print -P "  ✅ archive_old_docs.sh - Скрипт архивирования"
  
  print -P "\n${YELLOW}📋 Следующие шаги:${NC}"
  print -P "  1. Скопировать CLAUDE.md из artifacts → docs/"
  print -P "  2. Скопировать CLAUDE_CONTEXT.md из artifacts → docs/"
  print -P "  3. Запустить: ${BLUE}./archive_old_docs.sh${NC}"
  print -P "  4. Прочитать: ${BLUE}DOCS_COMPLETION_INSTRUCTIONS.md${NC}"
  
  print -P "\n${GREEN}✨ Документация готова для работы с Claude AI!${NC}"
}

# Запуск
main "$@"

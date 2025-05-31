# Web Check - Процесс сборки

<build_info>
Основной скрипт: npm run build (с автоматизацией)
Система сборки: Vite + TypeScript + Post-build автоматизация
Пакетный менеджер: npm
</build_info>

## 🔨 Основные команды

<build_commands>

```bash
# Рекомендуемые команды (автоматизированные):
npm run build              # Production сборка + post-build + валидация
./check_final.sh           # Быстрая проверка готовности
./status_check.sh          # Полная диагностика сборки

# Legacy команды:
./build.sh                 # Production сборка (старый метод)
./build.sh dev             # Development сборка
./build.sh debug           # Debug режим с подробным выводом
./build.sh clean           # Полная пересборка с очисткой
./build.sh validate        # Только валидация без сборки
```

</build_commands>

## 📋 Автоматизированный процесс сборки

<automated_build_process>

**npm run build** включает:

1. **Vite TypeScript сборка** - компиляция TS → JS, Vue → HTML/JS
2. **Post-build автоматизация** (`scripts/post-build.sh`):
   - Создание необходимых папок
   - Копирование content script
   - Копирование offscreen файлов  
   - Автоматическое исправление manifest.json
   - Валидация скопированных файлов
3. **Финальная проверка** (`final_check.sh`):
   - Проверка всех обязательных файлов
   - Валидация путей в manifest.json

</automated_build_process>

## 🎯 Структура готовой сборки

<build_structure>

```
dist/
├── manifest.json                    # Chrome Extension Manifest
├── service-worker-loader.js         # Background Service Worker
├── content-script/                  # Content Scripts
│   └── index-legacy.js              # Основной content script
├── offscreen/                       # Offscreen API
│   ├── offscreen.html               # Offscreen документ
│   ├── offscreen.js                 # Offscreen скрипт  
│   └── index.js                     # TypeScript сборка
├── src/ui/                          # Пользовательский интерфейс
│   ├── popup/                       # Popup расширения
│   └── options/                     # Страница настроек
├── assets/                          # Статические ресурсы
│   ├── css/style.css                # Стили
│   └── js/                          # JavaScript бандлы
└── icons/                           # Иконки расширения
```

</build_structure>

## 🛠️ Системные требования

<requirements>
- Node.js 18.x+ (рекомендуется 20.x LTS)
- npm (встроен в Node.js)
- ImageMagick (опционально, для конвертации иконок)
- jq (опционально, для обработки JSON)
- bash/zsh (для выполнения скриптов)
</requirements>

## 🚨 Автоматически решаемые проблемы

<auto_fixes>

**Post-build скрипт автоматически исправляет:**
- ✅ Копирование content script в правильное место
- ✅ Копирование offscreen файлов  
- ✅ Исправление путей в manifest.json
- ✅ Валидация всех критических файлов

**Legacy build.sh дополнительно обрабатывает:**
- ✅ Дублирование переменной Z в background script
- ✅ Удаление ES import statements из content scripts
- ✅ CSP-совместимая обработка Vue компонентов
- ✅ Валидация Manifest V3 требований

</auto_fixes>

## 🎊 Готовность к релизу

После успешного выполнения `npm run build` расширение готово к:
- Установке в Chrome для тестирования
- Публикации в Chrome Web Store
- Распространению как .zip архив

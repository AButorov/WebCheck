#!/bin/zsh

# Web Check - Простой скрипт сборки

set -e # Останавливаться при ошибках

echo "🔨 Web Check - Сборка проекта"
echo "============================="

# Параметры сборки
BUILD_MODE="${1:-production}"

case "$1" in
"clean")
  echo "🧹 Режим: Чистая сборка"
  echo ""
  echo "🧹 Полная очистка проекта..."

  # Удаляем все
  rm -rf node_modules/
  rm -rf dist/
  rm -rf .vite/
  rm -rf package-lock.json yarn.lock

  # Очищаем кэши
  if command -v pnpm &>/dev/null; then
    pnpm store prune 2>/dev/null || true
  fi
  if command -v npm &>/dev/null; then
    npm cache clean --force 2>/dev/null || true
  fi

  echo "  ✅ Проект очищен"

  # Переустанавливаем зависимости
  echo ""
  echo "📦 Переустановка зависимостей..."
  pnpm install
  echo "  ✅ Зависимости установлены"
  ;;
*)
  echo "🎯 Режим: Стандартная сборка"

  # Проверяем наличие зависимостей
  if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Установка зависимостей..."
    pnpm install
  fi
  ;;
esac

# Очищаем только кэш сборки
echo ""
echo "🧹 Очистка кэша сборки..."
rm -rf dist/
rm -rf .vite/

# Проверяем конфигурационные файлы
echo ""
echo "🔍 Проверка конфигурации..."
required_files=("package.json" "vite.config.ts" "tsconfig.json" "src/manifest.ts" "src/background/index.ts")
for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file отсутствует"
    exit 1
  fi
done

# Запускаем сборку
echo ""
echo "⚙️ Запуск Vite сборки..."

if node node_modules/vite/bin/vite.js build; then
  echo "✅ Vite сборка завершена успешно"
else
  echo "❌ Ошибка при сборке Vite"
  exit 1
fi

# Проверяем результат
echo ""
echo "🔍 Проверка результата сборки..."

if [ ! -f "dist/manifest.json" ]; then
  echo "❌ manifest.json не создан"
  exit 1
fi

if [ ! -f "dist/service-worker-loader.js" ]; then
  echo "❌ service-worker-loader.js не создан"
  exit 1
fi

# Проверяем service worker
if [ -f "dist/service-worker-loader.js" ]; then
  file_size=$(wc -c <"dist/service-worker-loader.js")

  if grep -q "import.*assets.*js.*index\.ts\.js" dist/service-worker-loader.js; then
    echo "✅ service-worker-loader.js содержит правильный импорт ($file_size байт)"

    if [ -f "dist/assets/js/index.ts.js" ]; then
      bg_file_size=$(wc -c <"dist/assets/js/index.ts.js")
      if [ $bg_file_size -gt 1000 ]; then
        echo "✅ Background script корректно сгенерирован ($bg_file_size байт)"
      else
        echo "❌ Background script слишком маленький ($bg_file_size байт)"
        exit 1
      fi
    else
      echo "❌ Импортируемый background script не найден"
      exit 1
    fi
  else
    echo "❌ service-worker-loader.js содержит неправильный код:"
    cat dist/service-worker-loader.js
    exit 1
  fi
fi

# Копируем content script
echo ""
echo "📋 Копирование дополнительных файлов..."

mkdir -p dist/content-script

if [ -f "src/content-script/index-legacy.js" ]; then
  cp src/content-script/index-legacy.js dist/content-script/index-legacy.js
  echo "✅ Content script скопирован"
else
  echo "❌ src/content-script/index-legacy.js не найден"
  exit 1
fi

# Проверяем корректность manifest.json
if [ -f "dist/manifest.json" ]; then
  if grep -q "content-script/index-legacy.js" dist/manifest.json; then
    echo "✅ Manifest.json ссылается на правильный content script"
  else
    echo "⚠️ Manifest.json может иметь неправильные пути"
  fi
fi

# Финальная проверка структуры
echo ""
echo "📂 Финальная структура dist/:"
if [ -d "dist" ]; then
  file_count=$(find dist -type f | wc -l)
  echo "  📊 Всего файлов: $file_count"

  echo "  📄 Основные файлы:"
  [ -f "dist/manifest.json" ] && echo "    ✅ manifest.json ($(wc -c <dist/manifest.json) байт)"
  [ -f "dist/service-worker-loader.js" ] && echo "    ✅ service-worker-loader.js ($(wc -c <dist/service-worker-loader.js) байт)"
  [ -f "dist/content-script/index-legacy.js" ] && echo "    ✅ content-script/index-legacy.js ($(wc -c <dist/content-script/index-legacy.js) байт)"

  [ -d "dist/src/ui/popup" ] && echo "    ✅ popup UI"
  [ -d "dist/src/ui/options" ] && echo "    ✅ options UI"
  [ -d "dist/offscreen" ] && echo "    ✅ offscreen files"
  [ -d "dist/assets" ] && echo "    ✅ assets ($(find dist/assets -type f | wc -l) файлов)"
  [ -d "dist/icons" ] && echo "    ✅ icons"
fi

echo ""
echo "🎉 СБОРКА ЗАВЕРШЕНА УСПЕШНО!"
echo ""
echo "📋 Результат:"
echo "  ✅ TypeScript скомпилирован"
echo "  ✅ Vue компоненты обработаны"
echo "  ✅ Content script скопирован"
echo "  ✅ Manifest.json сгенерирован"
echo "  ✅ Background script готов"
echo ""
echo "👉 Готово к загрузке в Chrome:"
echo "   1. Откройте chrome://extensions/"
echo "   2. Включите 'Режим разработчика'"
echo "   3. Нажмите 'Загрузить распакованное расширение'"
echo "   4. Выберите папку 'dist'"
echo ""
echo "✨ Расширение готово к использованию!"

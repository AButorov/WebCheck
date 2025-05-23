#!/bin/zsh

# Скрипт для пересборки проекта с исправлениями

echo "🔧 Пересборка проекта WebCheck с исправлениями"
echo ""

# Проверяем, что мы в правильной директории
if [[ ! -f "package.json" ]]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

echo "📁 Проверяем применённые исправления..."

# Проверяем, что исправления действительно применены
if grep -q "// Дополнительная проверка валидности задачи" src/background/monitor/index.ts; then
    echo "✅ Исправления TypeError undefined task.id применены"
else
    echo "⚠️  Предупреждение: Исправления могут быть не полностью применены"
fi

echo ""
echo "🧹 Очищаем предыдущую сборку..."
rm -rf dist/
rm -rf web-check-*.zip

echo ""
echo "📦 Запускаем сборку проекта..."

# Проверяем наличие build.sh
if [[ -f "build.sh" ]]; then
    echo "🔨 Используем существующий build.sh"
    chmod +x build.sh
    ./build.sh
    BUILD_EXIT_CODE=$?
else
    echo "🔨 build.sh не найден, используем альтернативную сборку"
    
    # Проверяем зависимости
    if [[ ! -d "node_modules" ]]; then
        echo "📥 Устанавливаем зависимости..."
        pnpm install || npm install
    fi
    
    # Сборка проекта
    echo "🏗️  Собираем проект..."
    pnpm build || npm run build
    BUILD_EXIT_CODE=$?
fi

echo ""
if [[ $BUILD_EXIT_CODE -eq 0 ]]; then
    echo "✅ Сборка завершена успешно!"
    
    # Проверяем наличие критических файлов
    echo ""
    echo "🔍 Проверяем структуру сборки..."
    
    REQUIRED_FILES=(
        "dist/manifest.json"
        "dist/background.js"
        "dist/offscreen/offscreen.html"
        "dist/offscreen/offscreen.js"
        "dist/content-script/element-selector.js"
    )
    
    ALL_GOOD=true
    for file in "${REQUIRED_FILES[@]}"; do
        if [[ -f "$file" ]]; then
            echo "✅ $file"
        else
            echo "❌ $file - ОТСУТСТВУЕТ"
            ALL_GOOD=false
        fi
    done
    
    if [[ "$ALL_GOOD" == "true" ]]; then
        echo ""
        echo "🎉 Проект успешно собран и готов к тестированию!"
        echo ""
        echo "📋 Следующие шаги для тестирования:"
        echo "1. Откройте chrome://extensions/"
        echo "2. Включите режим разработчика"
        echo "3. Нажмите 'Загрузить распакованное расширение'"
        echo "4. Выберите папку dist/"
        echo "5. Проверьте консоль Service Worker на отсутствие ошибок"
        echo ""
        echo "🔧 Для отладки:"
        echo "- Service Worker: chrome://extensions/ → WebCheck → 'Service worker'"
        echo "- Popup: F12 в popup-окне расширения"
        echo "- Тестирование: Создайте задачу мониторинга и проверьте логи"
        
    else
        echo ""
        echo "⚠️  Сборка завершена, но некоторые файлы отсутствуют"
        echo "Проверьте логи сборки выше для диагностики проблем"
    fi
    
else
    echo "❌ Ошибка сборки! Код возврата: $BUILD_EXIT_CODE"
    echo "Проверьте логи выше для диагностики проблем"
    exit 1
fi

echo ""
echo "🔧 Исправления применены и проект пересобран!"

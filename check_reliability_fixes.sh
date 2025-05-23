#!/bin/zsh

echo "🔍 Проверка применения исправлений системы надёжности"
echo "===================================================="

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

echo "✅ Находимся в корневой директории проекта"
echo ""

# Функция для проверки наличия кода в файле
check_code_in_file() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo "✅ $description найдено в $file"
        return 0
    else
        echo "❌ $description НЕ найдено в $file"
        return 1
    fi
}

# Счетчик ошибок
errors=0

echo "📝 Проверка исправлений в reliabilityManager.ts..."
echo "------------------------------------------------"

# Проверка импорта invalidateCache
if check_code_in_file "src/background/reliabilityManager.ts" "invalidateCache" "Импорт invalidateCache"; then
    :
else
    ((errors++))
fi

# Проверка вызова invalidateCache в performHealthCheck
if check_code_in_file "src/background/reliabilityManager.ts" "invalidateCache()" "Вызов invalidateCache()"; then
    :
else
    ((errors++))
fi

# Проверка улучшенной функции forceCloseDocument
if check_code_in_file "src/background/reliabilityManager.ts" "Document does not exist, skipping close" "Проверка существования документа перед закрытием"; then
    :
else
    ((errors++))
fi

echo ""
echo "📝 Проверка наличия safeMessaging.ts..."
echo "----------------------------------------"

if [ -f "src/background/safeMessaging.ts" ]; then
    echo "✅ Файл safeMessaging.ts существует"
    
    # Проверка содержимого
    if check_code_in_file "src/background/safeMessaging.ts" "sendMessageToPopup" "Функция sendMessageToPopup"; then
        :
    else
        ((errors++))
    fi
    
    if check_code_in_file "src/background/safeMessaging.ts" "isPopupOpen" "Функция isPopupOpen"; then
        :
    else
        ((errors++))
    fi
else
    echo "❌ Файл safeMessaging.ts НЕ найден"
    ((errors++))
fi

echo ""
echo "📝 Проверка offscreen.js..."
echo "---------------------------"

if check_code_in_file "src/offscreen/offscreen.js" "case 'PING':" "Обработчик PING"; then
    :
else
    ((errors++))
fi

echo ""
echo "📊 Результаты проверки"
echo "====================="

if [ $errors -eq 0 ]; then
    echo "✅ Все исправления успешно применены!"
    echo ""
    echo "🔨 Теперь можно выполнить сборку:"
    echo "  ./build.sh"
    echo ""
    echo "🧪 После сборки:"
    echo "  1. Откройте chrome://extensions/"
    echo "  2. Перезагрузите расширение"
    echo "  3. Откройте консоль Service Worker"
    echo "  4. Проверьте отсутствие ошибок"
else
    echo "❌ Обнаружено проблем: $errors"
    echo ""
    echo "⚠️  Необходимо применить исправления вручную!"
    echo ""
    echo "Используйте следующие команды:"
    echo "  1. chmod +x fix_reliability_issues.sh"
    echo "  2. ./fix_reliability_issues.sh"
fi

echo ""
echo "📝 Дополнительная документация:"
echo "  - RELIABILITY_FIXES_SUMMARY.md - сводка всех исправлений"
echo "  - readme.md - обновлён со статусом проекта"

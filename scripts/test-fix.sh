#!/bin/bash

# Скрипт для проверки исправления ошибки выбора элементов

echo "Проверка исправления ошибки выбора элементов..."
echo "1. Проверяем файлы..."

# Проверяем файл element-selector.js
if grep -q "setTimeout(selectCurrentElement, 100);" "/Users/butorov.ap/Documents/005_Programm/012_TS_vue/002_WebCheck/src/content-script/element-selector.js"; then
  echo "✅ Изменения в element-selector.js успешно применены"
else
  echo "❌ Изменения в element-selector.js не найдены!"
  exit 1
fi

echo "2. Сборка проекта..."
# Запускаем скрипт сборки в режиме отладки
chmod +x ./build.sh
./build.sh debug

# Проверяем, что сборка прошла успешно
if [ -d "dist" ] && [ -f "dist/content-script/element-selector.js" ]; then
  echo "✅ Сборка выполнена успешно"
else
  echo "❌ Сборка завершилась с ошибкой!"
  exit 1
fi

echo "3. Проверка копирования element-selector.js..."
# Проверяем содержимое скопированного файла
if grep -q "setTimeout(selectCurrentElement, 100);" "dist/content-script/element-selector.js"; then
  echo "✅ Исправленный element-selector.js успешно скопирован в dist"
else
  echo "❌ Исправленный файл не был скопирован в dist!"
  exit 1
fi

echo "✅ Проверка успешно завершена. Исправления применены и готовы к использованию."
echo ""
echo "Для установки расширения:"
echo "1. Откройте chrome://extensions/"
echo "2. Включите режим разработчика (переключатель в правом верхнем углу)"
echo "3. Нажмите 'Загрузить распакованное расширение'"
echo "4. Выберите папку dist"
echo "5. После установки рекомендуется перезапустить браузер"

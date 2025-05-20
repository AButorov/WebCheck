#!/bin/bash

# Функция для проверки JavaScript файла на синтаксические ошибки
check_js_syntax() {
  local file="$1"
  
  # Проверяем наличие node.js
  if ! command -v node &> /dev/null; then
    echo "Ошибка: Node.js не установлен"
    return 1
  }
  
  # Создаем временный файл для проверки
  local temp_file=$(mktemp)
  
  # Пишем простой скрипт для проверки синтаксиса
  cat > "$temp_file" <<EOF
try {
  const content = require('fs').readFileSync('$file', 'utf-8');
  // Пытаемся выполнить анализ синтаксиса
  new Function(content);
  console.log('Синтаксис JavaScript корректен');
  process.exit(0);
} catch (error) {
  console.error('Синтаксическая ошибка:', error.message);
  process.exit(1);
}
EOF
  
  # Запускаем скрипт проверки
  node "$temp_file"
  local exit_code=$?
  
  # Удаляем временный файл
  rm "$temp_file"
  
  return $exit_code
}

# Основной скрипт
echo "Проверка синтаксиса файла element-selector.js..."
if check_js_syntax "/Users/butorov.ap/Documents/005_Programm/012_TS_vue/002_WebCheck/src/content-script/element-selector.js"; then
  echo "Файл element-selector.js синтаксически корректен"
  
  echo "Запуск сборки проекта..."
  cd /Users/butorov.ap/Documents/005_Programm/012_TS_vue/002_WebCheck
  chmod +x ./build.sh
  ./build.sh debug
  
  if [ $? -eq 0 ]; then
    echo "Сборка успешно завершена"
    echo "Теперь необходимо установить расширение в Chrome:"
    echo "1. Откройте chrome://extensions/"
    echo "2. Включите режим разработчика"
    echo "3. Нажмите 'Загрузить распакованное расширение'"
    echo "4. Выберите папку dist"
    echo "5. После установки перезапустите браузер"
  else
    echo "Ошибка при сборке проекта"
  fi
else
  echo "Обнаружена синтаксическая ошибка в файле element-selector.js"
  echo "Пожалуйста, исправьте ошибку и повторите сборку"
fi

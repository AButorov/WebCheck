#!/bin/zsh
set -euo pipefail

# Тестовый скрипт для проверки генерации иконок
# Входные параметры: нет
# Выходные параметры: 0 - успешное выполнение, 1 - ошибка

echo "Начинаем тестирование генерации иконок..."

# Устанавливаем права на исполнение
chmod +x build.sh

# Запускаем генерацию иконок
./build.sh icons

# Проверяем наличие базовых SVG иконок
if [[ ! -f "public/icons/icon.svg" ]]; then
  echo "❌ ОШИБКА: Базовая иконка icon.svg не создана!"
  exit 1
fi

if [[ ! -f "public/icons/icon-changed.svg" ]]; then
  echo "❌ ОШИБКА: Иконка icon-changed.svg не создана!"
  exit 1
fi

# Проверяем наличие PNG иконок или символических ссылок
success=true
for size in 16 32 48 128; do
  if [[ ! -f "public/icons/icon-${size}.png" && ! -L "public/icons/icon-${size}.png" ]]; then
    echo "❌ ОШИБКА: Иконка icon-${size}.png не создана!"
    success=false
  fi
  
  if [[ ! -f "public/icons/icon-changed-${size}.png" && ! -L "public/icons/icon-changed-${size}.png" ]]; then
    echo "❌ ОШИБКА: Иконка icon-changed-${size}.png не создана!"
    success=false
  fi
done

if $success; then
  echo "✅ Все иконки успешно созданы!"
  exit 0
else
  echo "❌ ТЕСТ НЕ ПРОЙДЕН: Некоторые иконки не были созданы"
  exit 1
fi

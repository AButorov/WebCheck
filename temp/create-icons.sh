#!/bin/zsh
set -euo pipefail

# Проверка наличия ImageMagick
if ! command -v convert > /dev/null; then
  echo "Ошибка: ImageMagick не установлен. Установите его с помощью:"
  echo "brew install imagemagick"
  exit 1
fi

# Проверка наличия исходного SVG
SVG_FILE="./src/assets/icons/icon-changed.svg"
if [ ! -f "$SVG_FILE" ]; then
  echo "Ошибка: Исходный файл SVG не найден: $SVG_FILE"
  exit 1
fi

# Директория для иконок
ICONS_DIR="./src/assets/icons"
mkdir -p "$ICONS_DIR"

# Создание PNG иконок разных размеров
echo "Создание иконок из SVG..."

# Размеры иконок
SIZES=(16 32 48 128)

for SIZE in "${SIZES[@]}"; do
  OUTPUT="$ICONS_DIR/icon-changed-$SIZE.png"
  echo "Создание иконки размера ${SIZE}x${SIZE}..."
  
  convert -background none -size "${SIZE}x${SIZE}" "$SVG_FILE" "$OUTPUT"
  
  if [ $? -eq 0 ]; then
    echo "✓ Создан файл: $OUTPUT"
  else
    echo "✗ Ошибка при создании файла: $OUTPUT"
  fi
done

echo "Готово!"

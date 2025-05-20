#!/bin/bash

# Проверка на наличие необходимых зависимостей
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick не установлен. Установите его с помощью 'brew install imagemagick'."
    exit 1
fi

SRC_DIR="$(dirname "$(dirname "$0")")/src/assets/icons"
SIZES=(16 32 48 128)
STATES=("normal" "changed" "error")

# Создание директорий, если они не существуют
for SIZE in "${SIZES[@]}"; do
    mkdir -p "$SRC_DIR/$SIZE"
done

# Конвертация SVG в PNG для всех состояний и размеров
for STATE in "${STATES[@]}"; do
    for SIZE in "${SIZES[@]}"; do
        convert -background none -size "${SIZE}x${SIZE}" "$SRC_DIR/icon_${STATE}.svg" "$SRC_DIR/${SIZE}/icon_${STATE}.png"
        echo "Создан файл: $SRC_DIR/${SIZE}/icon_${STATE}.png"
    done
done

echo "Конвертация иконок завершена успешно."

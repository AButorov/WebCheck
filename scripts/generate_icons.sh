#!/bin/zsh
set -euo pipefail

echo "Скрипт конвертации иконок SVG в PNG для Web Check"
echo "================================================="

# Проверка на наличие необходимых утилит
CONVERT_CMD=""
if command -v magick &> /dev/null; then
    echo "✓ Найдена команда 'magick' (ImageMagick v7+)"
    CONVERT_CMD="magick"
elif command -v convert &> /dev/null; then
    echo "✓ Найдена команда 'convert' (ImageMagick v6 или ниже)"
    CONVERT_CMD="convert"
else
    echo "❌ Не найден ImageMagick. Использую запасной метод с SVG."
    # Запуск скрипта создания заглушек
    "$(dirname "$0")/fallback_icons.sh"
    exit 0
fi

# Директории
DIR="$(dirname "$0")"
ROOT_DIR="$(dirname "$DIR")"
SRC_DIR="$ROOT_DIR/public/icons"
DEST_DIR="$ROOT_DIR/public/icons"

# Размеры иконок
SIZES=(16 32 48 128)

# Проверка наличия SVG иконок
if [[ ! -f "$SRC_DIR/icon.svg" ]]; then
    echo "❌ Не найден файл $SRC_DIR/icon.svg"
    exit 1
fi

if [[ ! -f "$SRC_DIR/icon-changed.svg" ]]; then
    echo "❌ Не найден файл $SRC_DIR/icon-changed.svg"
    exit 1
fi

echo "Генерация иконок..."

# Создание иконок для обычного состояния
for SIZE in "${SIZES[@]}"; do
    if [[ "$CONVERT_CMD" == "magick" ]]; then
        # ImageMagick v7+ синтаксис
        $CONVERT_CMD "$SRC_DIR/icon.svg" -background none -resize ${SIZE}x${SIZE} "$DEST_DIR/icon-${SIZE}.png"
    else
        # ImageMagick v6 и ниже
        $CONVERT_CMD -background none -resize ${SIZE}x${SIZE} "$SRC_DIR/icon.svg" "$DEST_DIR/icon-${SIZE}.png"
    fi
    echo "✓ Создан файл icon-${SIZE}.png"
done

# Создание иконок для состояния с изменениями
for SIZE in "${SIZES[@]}"; do
    if [[ "$CONVERT_CMD" == "magick" ]]; then
        # ImageMagick v7+ синтаксис
        $CONVERT_CMD "$SRC_DIR/icon-changed.svg" -background none -resize ${SIZE}x${SIZE} "$DEST_DIR/icon-changed-${SIZE}.png"
    else
        # ImageMagick v6 и ниже
        $CONVERT_CMD -background none -resize ${SIZE}x${SIZE} "$SRC_DIR/icon-changed.svg" "$DEST_DIR/icon-changed-${SIZE}.png"
    fi
    echo "✓ Создан файл icon-changed-${SIZE}.png"
done

echo "✅ Все иконки успешно созданы!"

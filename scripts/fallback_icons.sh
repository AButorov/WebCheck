#!/bin/zsh
set -euo pipefail

echo "Создание заглушек PNG-иконок для Web Check"
echo "==========================================="

ICONS_DIR="$(dirname "$(dirname "$0")")/public/icons"

# Проверка наличия структуры директорий
for SIZE in 16 32 48 128; do
  if [[ ! -d "$ICONS_DIR/$SIZE" ]]; then
    mkdir -p "$ICONS_DIR/$SIZE"
    echo "✓ Создана директория $ICONS_DIR/$SIZE"
  fi
done

# Создание символических ссылок для обычных иконок
if [[ -f "$ICONS_DIR/icon.svg" ]]; then
  cp "$ICONS_DIR/icon.svg" "$ICONS_DIR/16/icon-16.svg"
  cp "$ICONS_DIR/icon.svg" "$ICONS_DIR/32/icon-32.svg"
  cp "$ICONS_DIR/icon.svg" "$ICONS_DIR/48/icon-48.svg"
  cp "$ICONS_DIR/icon.svg" "$ICONS_DIR/128/icon-128.svg"
  echo "✓ Созданы SVG-версии обычных иконок для всех размеров"
fi

# Создание символических ссылок для иконок с изменениями
if [[ -f "$ICONS_DIR/icon-changed.svg" ]]; then
  cp "$ICONS_DIR/icon-changed.svg" "$ICONS_DIR/16/icon-changed-16.svg"
  cp "$ICONS_DIR/icon-changed.svg" "$ICONS_DIR/32/icon-changed-32.svg"
  cp "$ICONS_DIR/icon-changed.svg" "$ICONS_DIR/48/icon-changed-48.svg"
  cp "$ICONS_DIR/icon-changed.svg" "$ICONS_DIR/128/icon-changed-128.svg"
  echo "✓ Созданы SVG-версии иконок с изменениями для всех размеров"
fi

# Линковка SVG к PNG для обратной совместимости
for SIZE in 16 32 48 128; do
  # Обычные иконки
  if [[ -f "$ICONS_DIR/$SIZE/icon-$SIZE.svg" && ! -f "$ICONS_DIR/icon-$SIZE.png" ]]; then
    ln -sf "$SIZE/icon-$SIZE.svg" "$ICONS_DIR/icon-$SIZE.png"
    echo "✓ Создана символическая ссылка для icon-$SIZE.png → $SIZE/icon-$SIZE.svg"
  fi

  # Иконки с изменениями
  if [[ -f "$ICONS_DIR/$SIZE/icon-changed-$SIZE.svg" && ! -f "$ICONS_DIR/icon-changed-$SIZE.png" ]]; then
    ln -sf "$SIZE/icon-changed-$SIZE.svg" "$ICONS_DIR/icon-changed-$SIZE.png"
    echo "✓ Создана символическая ссылка для icon-changed-$SIZE.png → $SIZE/icon-changed-$SIZE.svg"
  fi
done

echo "✅ Создание заглушек иконок завершено"

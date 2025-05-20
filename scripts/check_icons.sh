#!/bin/zsh
set -euo pipefail

echo "Проверка наличия и целостности иконок для Web Check"
echo "==================================================="

ICONS_DIR="$(dirname "$(dirname "$0")")/public/icons"
MISSING_ICONS=0

# Функция для проверки существования файла иконки
check_icon() {
  local path=$1
  if [[ ! -f "$path" && ! -L "$path" ]]; then
    echo "❌ Отсутствует: $path"
    MISSING_ICONS=$((MISSING_ICONS + 1))
    return 1
  else
    echo "✓ Найдена: $path"
    return 0
  fi
}

# Проверяем исходные SVG-иконки
check_icon "$ICONS_DIR/icon.svg"
check_icon "$ICONS_DIR/icon-changed.svg"

# Проверяем иконки для всех размеров
for SIZE in 16 32 48 128; do
  # Проверяем обычные иконки
  check_icon "$ICONS_DIR/icon-$SIZE.png" || true
  
  # Проверяем иконки с изменениями
  check_icon "$ICONS_DIR/icon-changed-$SIZE.png" || true
done

# Выводим итог проверки
if [ $MISSING_ICONS -gt 0 ]; then
  echo "⚠️ Обнаружено отсутствующих иконок: $MISSING_ICONS"
  echo "Для генерации иконок выполните: ./setup_icons.sh"
else
  echo "✅ Все иконки в наличии и готовы к использованию"
fi

exit 0

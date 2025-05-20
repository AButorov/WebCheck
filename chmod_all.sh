#!/bin/zsh
set -euo pipefail

# Установка прав на исполнение для всех скриптов в проекте
echo "Установка прав на исполнение..."

# Основные скрипты в корне проекта
for script in *.sh; do
  if [[ -f "$script" ]]; then
    chmod +x "$script"
    echo "✓ $script"
  fi
done

# Скрипты в директории scripts
if [[ -d "scripts" ]]; then
  for script in scripts/*.sh; do
    if [[ -f "$script" ]]; then
      chmod +x "$script"
      echo "✓ $script"
    fi
  done
fi

echo "✅ Права на исполнение установлены для всех скриптов"

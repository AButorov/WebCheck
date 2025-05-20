#!/bin/zsh
set -euo pipefail

# Запуск скрипта установки прав на исполнение
/bin/zsh scripts/set_permissions.sh

# Запуск скрипта генерации иконок
/bin/zsh scripts/generate_icons.sh
